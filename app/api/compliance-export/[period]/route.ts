import { NextRequest, NextResponse } from "next/server";
import { buildEvidencePackPdf } from "../../../../lib/complianceExport";

export async function GET(request: NextRequest, { params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;

  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Invalid period format, expected YYYY-MM." }, { status: 400 });
  }

  const pdfBuffer = await buildEvidencePackPdf(period);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ledgerly-evidence-pack-${period}.pdf"`,
    },
  });
}
