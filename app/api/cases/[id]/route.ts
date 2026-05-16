import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/services/caseService";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseData = await CaseService.getCaseById(id);
  if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  return NextResponse.json(caseData);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updates = await req.json();
  const updated = await CaseService.updateCase(id, updates);
  return NextResponse.json(updated);
}

  export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await CaseService.deleteCase(id);
  return NextResponse.json({ success: true });
}
