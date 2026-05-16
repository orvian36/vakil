import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { documentQueue } from "@/services/documentQueueService";
import { cookies } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: fileId } = await params; // Extract fileId from the URL

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is missing' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Authentication tokens are missing' }, { status: 401 });
    }

    // Fetch file details from the database
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const userContext = req.headers.get("X-user-Context");
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "X-user-Context header is missing" },
        { status: 401 }
      );
    }
    const user = JSON.parse(userContext);
    const userId = user.id;


    const { fileKey, caseId } = fileRecord;

    if (!fileKey || !caseId || !userId) {
      return NextResponse.json({ error: 'Missing file details in database' }, { status: 500 });
    }

    // Update file status to pending before re-adding to queue
    await db.update(files).set({
      processingStatus: 'pending',
      errorMessage: null,
      ocrData: null,
      documentDate: null,
      entities: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(files.id, fileId));

    // Add to document processing queue
    documentQueue.add(fileId, fileKey, caseId, userId, accessToken, refreshToken, "");

    return NextResponse.json({ message: `File ${fileId} regeneration initiated` });
  } catch (error) {
    console.error('Error regenerating file:', error);
    return NextResponse.json({ error: 'Failed to initiate file regeneration' }, { status: 500 });
  }
}
