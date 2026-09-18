import { prisma } from "./prisma";

export type FundNode = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  balanceCents: number;
  children: FundNode[];
};

export type AccountNode = {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  balanceCents: number;
  children: AccountNode[];
};

function rollUp<T extends { balanceCents: number; children: T[] }>(node: T): number {
  const childSum = node.children.reduce((sum, child) => sum + rollUp(child), 0);
  node.balanceCents += childSum;
  return node.balanceCents;
}

export async function getFundTree(companyId: string): Promise<FundNode[]> {
  const [funds, totals] = await Promise.all([
    prisma.fund.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
    prisma.gLEntry.groupBy({ by: ["fundId"], where: { companyId }, _sum: { amountCents: true } }),
  ]);

  const totalsByCode = new Map(totals.map((t) => [t.fundId, t._sum.amountCents ?? 0]));

  const nodesById = new Map<string, FundNode>();
  for (const f of funds) {
    nodesById.set(f.id, {
      id: f.id,
      code: f.code,
      name: f.name,
      isActive: f.isActive,
      balanceCents: totalsByCode.get(f.code) ?? 0,
      children: [],
    });
  }

  const roots: FundNode[] = [];
  for (const f of funds) {
    const node = nodesById.get(f.id)!;
    if (f.parentFundId && nodesById.has(f.parentFundId)) {
      nodesById.get(f.parentFundId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.forEach(rollUp);
  return roots;
}

export async function getAccountTree(companyId: string): Promise<AccountNode[]> {
  const [accounts, totals] = await Promise.all([
    prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
    prisma.gLEntry.groupBy({ by: ["accountCode"], where: { companyId }, _sum: { amountCents: true } }),
  ]);

  const totalsByCode = new Map(totals.map((t) => [t.accountCode, t._sum.amountCents ?? 0]));

  const nodesById = new Map<string, AccountNode>();
  for (const a of accounts) {
    nodesById.set(a.id, {
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      isActive: a.isActive,
      balanceCents: totalsByCode.get(a.code) ?? 0,
      children: [],
    });
  }

  const roots: AccountNode[] = [];
  for (const a of accounts) {
    const node = nodesById.get(a.id)!;
    if (a.parentAccountId && nodesById.has(a.parentAccountId)) {
      nodesById.get(a.parentAccountId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.forEach(rollUp);
  return roots;
}
