import { NextResponse } from "next/server";
import { CaseService } from "@/services/caseService";

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const userId = (await params).userId;
  const cases = await CaseService.listCasesByUser(userId);
  return NextResponse.json(cases);
}
