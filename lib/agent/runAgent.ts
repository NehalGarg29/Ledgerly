import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";
import {
  searchGlEntries,
  getTransactionHistory,
  checkPolicyFlags,
  proposeMatch,
  escalateToHuman,
} from "./tools";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TOOL_CALLS = 5;

const SYSTEM_PROMPT = `You are a reconciliation assistant for Ledgerly, a municipal treasury system. Your job is to investigate ONE unmatched bank transaction and either propose a General Ledger (GL) entry it corresponds to, or escalate it to a human if you cannot find sufficient evidence.

Rules you must follow:
- Never fabricate a GL entry ID. Only propose a glEntryId that was actually returned by search_gl_entries in this conversation.
- Always cite concrete evidence in your reasoning (amount, date, description similarity, historical pattern) — never propose a match on a hunch.
- If you are not reasonably confident (evidence is weak, ambiguous, or contradictory), call escalate_to_human instead of guessing. Escalating is the safe, correct choice when uncertain — it is not a failure.
- You have a limited number of tool calls. Use them efficiently: search first, check history or policy only if it would change your decision, then decide.
- You must end by calling exactly one of: propose_match or escalate_to_human. These are your only two ways to finish.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_gl_entries",
    description:
      "Search unmatched GL entries by amount range, date range, and/or fund. Use this first to find candidate entries near the transaction's amount and date.",
    input_schema: {
      type: "object",
      properties: {
        minAmountCents: { type: "number", description: "Minimum amount in cents (can be negative)" },
        maxAmountCents: { type: "number", description: "Maximum amount in cents (can be negative)" },
        dateFrom: { type: "string", description: "Earliest date, YYYY-MM-DD" },
        dateTo: { type: "string", description: "Latest date, YYYY-MM-DD" },
        fundId: { type: "string", description: "Fund ID to filter by, if known" },
      },
    },
  },
  {
    name: "get_transaction_history",
    description:
      "Look up how past bank transactions with a similar memo/vendor pattern were historically matched, to infer a likely GL mapping.",
    input_schema: {
      type: "object",
      properties: {
        vendorPattern: { type: "string", description: "A substring of the memo to search for, e.g. 'UTILITY'" },
      },
      required: ["vendorPattern"],
    },
  },
  {
    name: "check_policy_flags",
    description: "Check for compliance/policy constraints relevant to a fund.",
    input_schema: {
      type: "object",
      properties: {
        fundId: { type: "string" },
      },
      required: ["fundId"],
    },
  },
  {
    name: "propose_match",
    description:
      "Terminal action. Propose that this transaction matches a specific GL entry you found via search_gl_entries. This does NOT auto-approve the match — it always lands as pending_review for a human to confirm.",
    input_schema: {
      type: "object",
      properties: {
        glEntryId: {
          type: "string",
          description: "The exact id of a GL entry returned by search_gl_entries. Never invent one.",
        },
        confidence: { type: "number", description: "Your confidence from 0 to 1" },
        reasoning: { type: "string", description: "Concrete evidence supporting this match" },
      },
      required: ["glEntryId", "confidence", "reasoning"],
    },
  },
  {
    name: "escalate_to_human",
    description: "Terminal action. Give up and hand this transaction to a human reviewer, with no proposed match.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why you could not find a confident match" },
      },
      required: ["reason"],
    },
  },
];

type ToolCallLog = {
  step: number;
  tool: string;
  args: unknown;
  result: unknown;
};

export async function runAgentOnTransaction(bankTransactionId: string) {
  const txn = await prisma.bankTransaction.findUnique({ where: { id: bankTransactionId } });
  if (!txn) throw new Error("Transaction not found");

  const existingMatch = await prisma.match.findFirst({ where: { bankTransactionId } });
  if (existingMatch) throw new Error("Transaction already has a match — nothing for the agent to investigate");

  const toolCallLog: ToolCallLog[] = [];
  let finalAction: "propose_match" | "escalate_to_human" | "cap_reached" = "cap_reached";
  let finalReasoning: string | undefined;
  let proposedGlEntryId: string | undefined;
  let proposedConfidence: number | undefined;
  let matchId: string | undefined;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Investigate this unmatched bank transaction and decide what to do:

id: ${txn.id}
accountId: ${txn.accountId}
date: ${txn.date}
amountCents: ${txn.amountCents}
memo: "${txn.memo}"
sourceFormat: ${txn.sourceFormat}

Find the most likely GL entry, or escalate if you can't find one with real evidence.`,
    },
  ];

  let toolCallCount = 0;

  while (toolCallCount < MAX_TOOL_CALLS) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      toolCallCount++;
      let result: unknown;
      let isError = false;

      try {
        if (block.name === "search_gl_entries") {
          result = await searchGlEntries(block.input as Parameters<typeof searchGlEntries>[0]);
        } else if (block.name === "get_transaction_history") {
          const args = block.input as { vendorPattern: string };
          result = await getTransactionHistory(args.vendorPattern);
        } else if (block.name === "check_policy_flags") {
          const args = block.input as { fundId: string };
          result = await checkPolicyFlags(args.fundId);
        } else if (block.name === "propose_match") {
          const args = block.input as { glEntryId: string; confidence: number; reasoning: string };
          result = await proposeMatch(txn.id, args.glEntryId, args.confidence, args.reasoning);
          finalAction = "propose_match";
          finalReasoning = args.reasoning;
          proposedGlEntryId = args.glEntryId;
          proposedConfidence = args.confidence;
          matchId = (result as { matchId: string }).matchId;
        } else if (block.name === "escalate_to_human") {
          const args = block.input as { reason: string };
          result = await escalateToHuman(args.reason);
          finalAction = "escalate_to_human";
          finalReasoning = args.reason;
        } else {
          throw new Error(`Unknown tool: ${block.name}`);
        }
      } catch (err) {
        isError = true;
        result = { error: err instanceof Error ? err.message : "Unknown error" };
      }

      toolCallLog.push({ step: toolCallCount, tool: block.name, args: block.input, result });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
        is_error: isError,
      });

      if (finalAction === "propose_match" || finalAction === "escalate_to_human") {
        break;
      }
    }

    messages.push({ role: "user", content: toolResults });

    if (finalAction === "propose_match" || finalAction === "escalate_to_human") {
      break;
    }
  }

  if (finalAction === "cap_reached") {
    const result = await escalateToHuman(
      "Tool call limit reached without sufficient evidence for a confident match."
    );
    finalReasoning = result.reason;
  }

  const trace = await prisma.agentTrace.create({
    data: {
      bankTransactionId: txn.id,
      toolCalls: JSON.parse(JSON.stringify(toolCallLog)),
      finalAction,
      finalReasoning,
      proposedGlEntryId,
      proposedConfidence,
      matchId,
    },
  });

  return trace;
}