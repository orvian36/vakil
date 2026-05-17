import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { documentQueue } from "@/services/documentQueueService";
import { cookies } from "next/headers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: fileId } = await params;

  if (!fileId) {
    return NextResponse.json({ error: "File ID is missing" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "Authentication tokens are missing" }, { status: 401 });
    }

    const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const userContext = req.headers.get("X-user-Context");
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "X-user-Context header is missing" },
        { status: 401 },
      );
    }
    const user = JSON.parse(userContext);
    const userId = user.id;

    const { fileKey, caseId } = fileRecord;

    if (!fileKey || !caseId || !userId) {
      return NextResponse.json({ error: "Missing file details in database" }, { status: 500 });
    }

    await prisma.file.update({
      where: { id: fileId },
      data: {
        processingStatus: "pending",
        errorMessage: null,
        ocrData: null,
        documentDate: null,
        entities: null,
      },
    });

    documentQueue.add(fileId, fileKey, caseId, userId, accessToken, refreshToken, "");

    return NextResponse.json({ message: `File ${fileId} regeneration initiated` });
  } catch (error) {
    console.error("Error regenerating file:", error);
    return NextResponse.json({ error: "Failed to initiate file regeneration" }, { status: 500 });
  }
}
