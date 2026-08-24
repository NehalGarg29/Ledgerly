import { ParsedTransaction } from "./types";

const DEBIT_TYPE_CODE = "451";

function toIsoDate(yyyymmdd: string): string {
  const year = yyyymmdd.substring(0, 4);
  const month = yyyymmdd.substring(4, 6);
  const day = yyyymmdd.substring(6, 8);
  return `${year}-${month}-${day}`;
}

export function parseBai2String(content: string): ParsedTransaction[] {
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  let accountId = "";
  let statementDate = "";
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const withoutTerminator = line.replace(/\/$/, "");
    const fields = withoutTerminator.split(",");
    const recordType = fields[0];

    if (recordType === "01") {
      accountId = fields[2];
      statementDate = toIsoDate(fields[3]);
    } else if (recordType === "16") {
      const typeCode = fields[1];
      const unsignedAmountCents = parseInt(fields[2], 10);
      const description = fields[4] ?? "";
      const amountCents = typeCode === DEBIT_TYPE_CODE ? -unsignedAmountCents : unsignedAmountCents;
      transactions.push({
        accountId,
        date: statementDate,
        amountCents,
        memo: description,
        sourceFormat: "bai2",
      });
    }
  }
  return transactions;
}