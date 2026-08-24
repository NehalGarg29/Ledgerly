import { ParsedTransaction } from "./types";

interface RawJsonFeed {
  accountNumber: string;
  transactions: {
    postedDate: string;
    amountUsd: number;
    description: string;
  }[];
}

export function parseJsonString(content: string): ParsedTransaction[] {
  const data: RawJsonFeed = JSON.parse(content);

  return data.transactions.map((txn): ParsedTransaction => ({
    accountId: data.accountNumber,
    date: txn.postedDate,
    amountCents: Math.round(txn.amountUsd * 100),
    memo: txn.description,
    sourceFormat: "json",
  }));
}