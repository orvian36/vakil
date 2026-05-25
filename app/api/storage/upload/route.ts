import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";
import { documentQueue } from "@/services/documentQueueService";
import { getCurrentUser } from "@/lib/auth/session";

const { FileService } = await import("@/services/fileService");
const { uploadFile } = await import("@/lib/storage/upload");

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("files") as File | null;
    const caseId = formData.get("caseId") as string | null;
    const evidenceType = formData.get("evidenceType") as string | null;

    // ✅ Validate required fields
    if (!caseId || !evidenceType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: caseId and evidenceType",
        },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "File is required",
        },
        { status: 400 }
      );
    }

    // ✅ Generate unique fileId and safe path
    const fileId = uuidv4();
    const safeFileName = file.name.replace(/\s+/g, "_");
    const filePath = `${caseId}/${evidenceType}/${fileId}-${safeFileName}`;

    // ✅ Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // ✅ Upload to DigitalOcean Spaces
    const fileKey = await uploadFile(fileBuffer, filePath);

    // ✅ Save metadata in DB
    const dbRecord = await FileService.saveFileToDB(
      fileId,
      caseId,
      file.name,
      fileKey,
      evidenceType
    );

    // Extract userId from session
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Push to document queue
    documentQueue.add(fileId,fileKey, caseId, userId,accessToken,refreshToken??"","");

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        fileId,
        fileName: file.name,
        fileKey,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Access Denied")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Access denied to Digital Ocean Spaces. Check your credentials.",
          },
          { status: 403 }
        );
      }

      if (error.message.includes("NoSuchBucket")) {
        return NextResponse.json(
          {
            success: false,
            error: "Bucket not found. Check your bucket configuration.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "File upload failed due to an internal server error.",
      },
      { status: 500 }
    );
  }
}
