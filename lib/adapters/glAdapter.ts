import { parse } from "csv-parse/sync";

interface RawGlRow {
  fundId: string;
  accountCode: string;
  amount: string;
  date: string;
  description: string;
}

export interface ParsedGLEntry {
  fundId: string;
  accountCode: string;
  amountCents: number;
  date: string;
  description: string;
}

export function parseGlCsvString(content: string): ParsedGLEntry[] {
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as RawGlRow[];

  return rows.map((row): ParsedGLEntry => ({
    fundId: row.fundId,
    accountCode: row.accountCode,
    amountCents: Math.round(parseFloat(row.amount) * 100),
    date: row.date,
    description: row.description,
  }));
}