import { prisma } from "@/lib/db";

type Status = "pending" | "processing" | "completed" | "failed";

export class FileService {
  static async saveFileToDB(
    fileId: string,
    caseId: string,
    fileName: string,
    fileKey: string,
    type: string,
  ) {
    return prisma.file.create({
      data: { id: fileId, caseId, fileName, fileKey, type },
    });
  }

  static async listFilesByCase(caseId: string) {
    return prisma.file.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async updateFileStatus(
    fileId: string,
    processingStatus: Status,
    errorMessage?: string,
  ) {
    return prisma.file.update({
      where: { id: fileId },
      data: { processingStatus, errorMessage },
    });
  }

  static async getPendingFiles(limit: number, userId?: string) {
    // NOTE: legacy signature — the `userId` arg used to filter by caseId.
    // Left as-is until Phase 2 introduces a real `User` model and we can filter
    // through `case.userId`.
    return prisma.file.findMany({
      where: userId
        ? { processingStatus: "pending", caseId: userId }
        : { processingStatus: "pending" },
      take: limit,
    });
  }

  static async deleteFile(fileId: string) {
    await prisma.file.delete({ where: { id: fileId } });
  }
}

export async function getFileById(fileId: string) {
  return prisma.file.findUnique({ where: { id: fileId } });
}
