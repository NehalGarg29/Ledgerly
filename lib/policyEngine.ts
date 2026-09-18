import { prisma } from "./prisma";
import { formatCents } from "./format";

export type PolicyFlag = {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  severity: "block" | "warn";
  message: string;
};

export type PolicyCheckResult = {
  flags: PolicyFlag[];
  blocked: boolean;
};

export async function checkPolicyFlags(
  fundCode: string,
  accountCode?: string,
  amountCents?: number
): Promise<PolicyCheckResult> {
  const [rules, fund, account] = await Promise.all([
    prisma.policyRule.findMany({
      where: { isActive: true, OR: [{ fundCode: null }, { fundCode }] },
    }),
    prisma.fund.findUnique({ where: { code: fundCode } }),
    accountCode ? prisma.account.findUnique({ where: { code: accountCode } }) : Promise.resolve(null),
  ]);

  const flags: PolicyFlag[] = [];

  for (const rule of rules) {
    if (rule.ruleType === "max_amount") {
      if (
        amountCents !== undefined &&
        rule.thresholdCents !== null &&
        Math.abs(amountCents) >= rule.thresholdCents
      ) {
        flags.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          message: `${formatCents(Math.abs(amountCents))} meets or exceeds the "${rule.name}" threshold of ${formatCents(rule.thresholdCents)}.`,
        });
      }
    } else if (rule.ruleType === "inactive_fund_or_account") {
      if (fund && !fund.isActive) {
        flags.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          message: `Fund "${fund.name}" (${fund.code}) is deactivated.`,
        });
      }
      if (account && !account.isActive) {
        flags.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          message: `Account "${account.name}" (${account.code}) is deactivated.`,
        });
      }
    } else if (rule.ruleType === "restricted_account_type") {
      if (account && rule.allowedAccountTypes.length > 0 && !rule.allowedAccountTypes.includes(account.type)) {
        flags.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          severity: rule.severity,
          message: `"${rule.name}" only allows postings to ${rule.allowedAccountTypes.join(", ")} accounts, but "${account.name}" is ${account.type}.`,
        });
      }
    }
  }

  const blocked = flags.some((f) => f.severity === "block");
  return { flags, blocked };
}
