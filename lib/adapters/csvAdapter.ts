import { parse } from "csv-parse/sync";
import { ParsedTransaction } from "./types";

interface RawCsvRow {
  date: string;
  amount: string;
  memo: string;
  account: string;
}

export function parseCsvString(content: string): ParsedTransaction[] {
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as RawCsvRow[];

  return rows.map((row): ParsedTransaction => ({
    accountId: row.account,
    date: row.date,
    amountCents: Math.round(parseFloat(row.amount) * 100),
    memo: row.memo,
    sourceFormat: "csv",
  }));
}