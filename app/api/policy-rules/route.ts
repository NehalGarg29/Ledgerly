import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getRoleFromRequest } from "../../../lib/getRoleFromRequest";

const RULE_TYPES = ["max_amount", "inactive_fund_or_account", "restricted_account_type"] as const;
const SEVERITIES = ["block", "warn"] as const;
const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;

export async function GET() {
  const rules = await prisma.policyRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can add policy rules." }, { status: 403 });
  }

  const body = await request.json();
  const { name, ruleType, severity, fundCode, thresholdCents, allowedAccountTypes } = body as {
    name?: string;
    ruleType?: string;
    severity?: string;
    fundCode?: string | null;
    thresholdCents?: number | null;
    allowedAccountTypes?: string[];
  };

  if (!name || !ruleType) {
    return NextResponse.json({ error: "Name and rule type are required." }, { status: 400 });
  }
  if (!RULE_TYPES.includes(ruleType as (typeof RULE_TYPES)[number])) {
    return NextResponse.json({ error: `Rule type must be one of: ${RULE_TYPES.join(", ")}.` }, { status: 400 });
  }
  if (severity && !SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) {
    return NextResponse.json({ error: `Severity must be one of: ${SEVERITIES.join(", ")}.` }, { status: 400 });
  }

  if (ruleType === "max_amount" && (typeof thresholdCents !== "number" || thresholdCents <= 0)) {
    return NextResponse.json(
      { error: "max_amount rules require a positive thresholdCents." },
      { status: 400 }
    );
  }

  if (ruleType === "restricted_account_type") {
    if (!allowedAccountTypes || allowedAccountTypes.length === 0) {
      return NextResponse.json(
        { error: "restricted_account_type rules require at least one allowed account type." },
        { status: 400 }
      );
    }
    const invalid = allowedAccountTypes.filter(
      (t) => !ACCOUNT_TYPES.includes(t as (typeof ACCOUNT_TYPES)[number])
    );
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid account type(s): ${invalid.join(", ")}.` }, { status: 400 });
    }
  }

  if (fundCode) {
    const fund = await prisma.fund.findUnique({ where: { code: fundCode } });
    if (!fund) {
      return NextResponse.json({ error: `Fund "${fundCode}" not found.` }, { status: 400 });
    }
  }

  const rule = await prisma.policyRule.create({
    data: {
      name,
      ruleType: ruleType as (typeof RULE_TYPES)[number],
      severity: (severity as (typeof SEVERITIES)[number]) ?? "warn",
      fundCode: fundCode || null,
      thresholdCents: ruleType === "max_amount" ? thresholdCents : null,
      allowedAccountTypes:
        ruleType === "restricted_account_type"
          ? (allowedAccountTypes as (typeof ACCOUNT_TYPES)[number][])
          : [],
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "PolicyRule",
      entityId: rule.id,
      action: "policy_rule_created",
      afterState: {
        name: rule.name,
        ruleType: rule.ruleType,
        severity: rule.severity,
        fundCode: rule.fundCode,
        thresholdCents: rule.thresholdCents,
        allowedAccountTypes: rule.allowedAccountTypes,
      },
    },
  });

  return NextResponse.json({ rule });
}
