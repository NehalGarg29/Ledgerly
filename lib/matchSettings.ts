import { prisma } from "./prisma";

const DEFAULTS = { autoApproveThreshold: 0.9, suggestThreshold: 0.5 };

export async function getMatchSettings() {
  const settings = await prisma.matchSettings.findUnique({ where: { id: "singleton" } });
  return settings ?? DEFAULTS;
}
