export interface ParsedTransaction {
  accountId: string;
  date: string;
  amountCents: number;
  memo: string;
  sourceFormat: "csv" | "json" | "bai2";
}