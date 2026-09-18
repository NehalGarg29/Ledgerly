import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getRoleFromRequest } from "../../../../lib/getRoleFromRequest";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = getRoleFromRequest(request);
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can edit policy rules." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.policyRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Policy rule not found." }, { status: 404 });
  }

  const body = await request.json();
  const { isActive } = body as { isActive?: boolean };

  const rule = await prisma.policyRule.update({
    where: { id },
    data: {
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      entityType: "PolicyRule",
      entityId: rule.id,
      action: "policy_rule_updated",
      beforeState: { isActive: existing.isActive },
      afterState: { isActive: rule.isActive },
    },
  });

  return NextResponse.json({ rule });
}
