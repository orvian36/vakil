import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

export class FileService {
    static async saveFileToDB(
      fileId: string,
      caseId: string,
      fileName: string,
      fileKey: string,
      type: string
    ) {
      const [file] = await db
        .insert(files)
        .values({ id: fileId, caseId, fileName, fileKey, type })
        .returning();
      return file;
    }
  
    static async listFilesByCase(caseId: string) {
      return await db.query.files.findMany({
        where: eq(files.caseId, caseId),
        orderBy: (f: typeof files, { desc }: { desc: any }) => [desc(f.createdAt)],
      });
    }
  
    static async updateFileStatus(
      fileId: string,
      processingStatus: "pending" | "processing" | "completed" | "failed",
      errorMessage?: string
    ) {
      const [updated] = await db
        .update(files)
        .set({
          processingStatus,
          errorMessage,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(files.id, fileId))
        .returning();
      return updated;
    }

    static async getPendingFiles(limit: number, userId?: string) {
      return await db.query.files.findMany({
        where: (f: typeof files, { and, eq }: { and: any; eq: any }) =>
          userId
            ? and(eq(f.processingStatus, "pending"), eq(f.caseId, userId))
            : eq(f.processingStatus, "pending"),
        limit,
      });
    }
  
    static async deleteFile(fileId: string) {
      await db.delete(files).where(eq(files.id, fileId));
    }
  }

export async function getFileById(fileId: string) {
  return await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
}