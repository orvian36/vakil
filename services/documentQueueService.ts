import { prisma } from "../lib/db";
import * as fs from "fs";
import { getDownloadUrl } from "../lib/storage/urls";
import { verifyAccessToken, refreshTokens } from "../middleware";
import PDFAnalysisService from "./pdfAnalysisService";

interface QueueItem {
  fileId: string;
  fileKey: string;
  caseId: string;
  userId: string;
  timestamp: number;
  userMessage?: string;
  accessToken: string;
  refreshToken: string;
}

class DocumentProcessingQueue {
  private queue: QueueItem[] = [];
  private concurrency = 10;
  private processingCount = 0;
  private userProcessingCount: Map<string, number> = new Map();
  private maxPerUser = 1;

  add(
    fileId: string,
    fileKey: string,
    caseId: string,
    userId: string,
    accessToken: string,
    refreshToken: string,
    userMessage?: string,
  ) {
    this.queue.push({
      fileId,
      fileKey,
      caseId,
      userId,
      timestamp: Date.now(),
      accessToken,
      refreshToken,
      userMessage,
    });
    this.processNext();
  }

  getStatus() {
    const userQueueCounts = new Map<string, number>();
    const userProcessingCounts = new Map<string, number>();

    this.queue.forEach((item) => {
      userQueueCounts.set(item.userId, (userQueueCounts.get(item.userId) || 0) + 1);
    });
    this.userProcessingCount.forEach((count, userId) => {
      userProcessingCounts.set(userId, count);
    });

    return {
      queueLength: this.queue.length,
      processingCount: this.processingCount,
      concurrency: this.concurrency,
      userQueueCounts: Object.fromEntries(userQueueCounts),
      userProcessingCounts: Object.fromEntries(userProcessingCounts),
    };
  }

  private async deletePDFFile(filePath: string, fileId: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Queue] Deleted PDF for file ${fileId}: ${filePath}`);
      }
    } catch (error) {
      console.error(`[Queue] Error deleting PDF for file ${fileId}:`, error);
    }
  }

  private getNextDocument(): QueueItem | null {
    if (this.queue.length === 0) return null;
    const usersInQueue = [...new Set(this.queue.map((item) => item.userId))];

    for (const userId of usersInQueue) {
      const userProcessingCount = this.userProcessingCount.get(userId) || 0;
      if (userProcessingCount < this.maxPerUser) {
        const userIndex = this.queue.findIndex((item) => item.userId === userId);
        if (userIndex !== -1) return this.queue.splice(userIndex, 1)[0];
      }
    }

    if (this.queue.length > 0) {
      const oldest = this.queue.reduce((o, c) => (c.timestamp < o.timestamp ? c : o));
      const oldestIndex = this.queue.findIndex((item) => item.fileId === oldest.fileId);
      return this.queue.splice(oldestIndex, 1)[0];
    }
    return null;
  }

  private processNext() {
    while (this.processingCount < this.concurrency && this.queue.length > 0) {
      const next = this.getNextDocument();
      if (!next) break;

      this.processingCount++;
      const userCount = this.userProcessingCount.get(next.userId) || 0;
      this.userProcessingCount.set(next.userId, userCount + 1);

      this.processDocument(
        next.fileId, next.fileKey, next.caseId, next.userId, next.accessToken, next.refreshToken, next.userMessage,
      ).finally(() => {
        this.processingCount--;
        const cur = this.userProcessingCount.get(next.userId) || 0;
        this.userProcessingCount.set(next.userId, Math.max(0, cur - 1));
        this.processNext();
      });
    }
  }

  private async processDocument(
    fileId: string,
    fileKey: string,
    caseId: string,
    userId: string,
    accessToken: string,
    refreshToken: string,
    userMessage?: string,
  ) {
    console.log(`[Queue] Starting processing for file ${fileId} in case ${caseId}`);

    const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });

    if (!fileRecord) {
      console.error(`[Queue] File record not found for fileId: ${fileId}`);
      return;
    }

    if (fileRecord.processingStatus === "completed") {
      console.log(`[Queue] File ${fileId} already completed; skipping.`);
      return;
    }

    if (fileRecord.processingStatus === "pending") {
      await prisma.file.update({
        where: { id: fileId },
        data: { processingStatus: "processing" },
      });
    }

    try {
      let currentAccessToken = accessToken;
      let currentRefreshToken = refreshToken;

      const downloadUrl = await getDownloadUrl(fileKey);

      const verification = await verifyAccessToken(currentAccessToken);
      if (!verification.valid) {
        if (currentRefreshToken) {
          const refreshResult = await refreshTokens(currentRefreshToken);
          if (refreshResult.success && refreshResult.access_token && refreshResult.refresh_token) {
            currentAccessToken = refreshResult.access_token;
            currentRefreshToken = refreshResult.refresh_token;
          } else {
            throw new Error("Failed to refresh access token.");
          }
        } else {
          throw new Error("Access token invalid and no refresh token available.");
        }
      }

      const pdfAnalysisService = new PDFAnalysisService();
      const analysisResult = await pdfAnalysisService.analyzePDFWithEntitiesAndDate(
        downloadUrl,
        currentAccessToken,
        fileRecord.type,
      );

      if (analysisResult.success) {
        await prisma.file.update({
          where: { id: fileId },
          data: {
            documentDate: analysisResult.documentDate ? new Date(analysisResult.documentDate) : null,
            entities: analysisResult.entities ? JSON.stringify(analysisResult.entities) : null,
            summary: analysisResult.documentSummary,
            processingStatus: "completed",
          },
        });
      } else {
        await prisma.file.update({
          where: { id: fileId },
          data: {
            processingStatus: "failed",
            errorMessage: (analysisResult.error || "Unknown PDF analysis error").toString(),
          },
        });
      }
    } catch (error) {
      console.error(`[Queue] Error processing file ${fileId}:`, error);
      await prisma.file.update({
        where: { id: fileId },
        data: {
          processingStatus: "failed",
          errorMessage: (error instanceof Error ? error.message : "Unknown error").toString(),
        },
      });
    }
  }
}

export const documentQueue = new DocumentProcessingQueue();
