import { NextRequest, NextResponse } from "next/server";
import { buildEvidencePackPdf } from "../../../../lib/complianceExport";
import { getCompanyIdFromRequest } from "../../../../lib/getRoleFromRequest";

export async function GET(request: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  const companyId = getCompanyIdFromRequest(request);
  if (!companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { period } = await params;

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Invalid period format, expected YYYY-MM." }, { status: 400 });
  }

  const pdfBuffer = await buildEvidencePackPdf(companyId, period);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ledgerly-evidence-pack-${period}.pdf"`,
    },
  });
}
