import { NextResponse } from "next/server";
import { FileService } from "@/services/fileService";

export async function GET(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const files = await FileService.listFilesByCase(caseId);
  return NextResponse.json(files);
}
