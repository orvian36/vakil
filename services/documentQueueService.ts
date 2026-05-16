import { db } from "../db";
import * as fs from 'fs';
import { getDownloadUrl } from "../lib/storage/urls";
import { verifyAccessToken, refreshTokens } from "../middleware";
import { eq } from "drizzle-orm";
import { files } from "../db/schema"; // Import the files schema
import PDFAnalysisService from "./pdfAnalysisService";

interface QueueItem {
  fileId: string;
  fileKey: string;
  caseId: string;
  userId: string;
  timestamp: number; // For tracking when document was added
  userMessage?: string; // Optional user message for regeneration
  accessToken: string;
  refreshToken: string;
}

class DocumentProcessingQueue {
  private queue: QueueItem[] = [];
  private concurrency = 10; // Increased from 5 to handle more users
  private processingCount = 0;
  private userProcessingCount: Map<string, number> = new Map(); // Track per-user processing
  private maxPerUser = 1; // Reduced from 2 to ensure more users get served

  add(fileId: string, fileKey: string, caseId: string, userId: string, accessToken: string, refreshToken: string, userMessage?: string) {
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

  // Get current queue status with per-user breakdown
  getStatus() {
    const userQueueCounts = new Map<string, number>();
    const userProcessingCounts = new Map<string, number>();
    
    // Count documents in queue per user
    this.queue.forEach(item => {
      userQueueCounts.set(item.userId, (userQueueCounts.get(item.userId) || 0) + 1);
    });
    
    // Get current processing counts per user
    this.userProcessingCount.forEach((count, userId) => {
      userProcessingCounts.set(userId, count);
    });

    return {
      queueLength: this.queue.length,
      processingCount: this.processingCount,
      concurrency: this.concurrency,
      userQueueCounts: Object.fromEntries(userQueueCounts),
      userProcessingCounts: Object.fromEntries(userProcessingCounts)
    };
  }

  // Delete PDF file after processing
  private async deletePDFFile(filePath: string, fileId: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Queue] Successfully deleted PDF file for file ${fileId}: ${filePath}`);
        // Update database to remove file_path reference
        // await db.update(db.schema.files).set({ filePath: null }).where(eq(db.schema.files.id, fileId));
        console.log(`[Queue] Updated database to remove file_path for file ${fileId}`);
      } else {
        console.log(`[Queue] PDF file already deleted or not found for file ${fileId}: ${filePath}`);
      }
    } catch (error) {
      console.error(`[Queue] Error deleting PDF file for file ${fileId}:`, error);
      // Don't throw error - file deletion failure shouldn't break the process
    }
  }

  // Fair scheduling: Round-robin among users
  private getNextDocument(): QueueItem | null {
    if (this.queue.length === 0) return null;

    // Get unique users in queue
    const usersInQueue = [...new Set(this.queue.map(item => item.userId))];
    
    // Try to find a document from a user who isn't at their processing limit
    for (const userId of usersInQueue) {
      const userProcessingCount = this.userProcessingCount.get(userId) || 0;
      
      if (userProcessingCount < this.maxPerUser) {
        // Find the oldest document from this user
        const userIndex = this.queue.findIndex(item => item.userId === userId);
        if (userIndex !== -1) {
          return this.queue.splice(userIndex, 1)[0];
        }
      }
    }

    // If all users are at their limit, find the user with the oldest document
    if (this.queue.length > 0) {
      const oldestDocument = this.queue.reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest
      );
      const oldestIndex = this.queue.findIndex(item => 
        item.fileId === oldestDocument.fileId
      );
      return this.queue.splice(oldestIndex, 1)[0];
    }

    return null;
  }

  // Start as many jobs as possible up to the concurrency limit
  private processNext() {
    while (this.processingCount < this.concurrency && this.queue.length > 0) {
      const nextDocument = this.getNextDocument();
      if (!nextDocument) break;

      this.processingCount++;
      const userProcessingCount = this.userProcessingCount.get(nextDocument.userId) || 0;
      this.userProcessingCount.set(nextDocument.userId, userProcessingCount + 1);

      this.processDocument(nextDocument.fileId, nextDocument.fileKey, nextDocument.caseId, nextDocument.userId, nextDocument.accessToken, nextDocument.refreshToken, nextDocument.userMessage)
        .finally(() => {
          this.processingCount--;
          const currentUserCount = this.userProcessingCount.get(nextDocument.userId) || 0;
          this.userProcessingCount.set(nextDocument.userId, Math.max(0, currentUserCount - 1));
          this.processNext(); // Try to start another if available
        });
    }
  }

  // The actual document processing logic (moved from old processNext)
  private async processDocument(fileId: string, fileKey: string, caseId: string, userId: string, accessToken: string, refreshToken: string, userMessage?: string) {
    console.log(`[Queue] Starting dummy processing for file ${fileId} in case ${caseId} (${this.queue.length} remaining in queue)`);

    // Fetch the current file record to check its status
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!fileRecord) {
      console.error(`[Queue] File record not found for fileId: ${fileId}. Skipping processing.`);
      return; // Cannot process if file record doesn't exist
    }

    if (fileRecord.processingStatus === 'completed') {
      console.log(`[Queue] File ${fileId} is already completed. Skipping processing.`);
      return; // Skip if already completed
    }

    // If status is pending, update to processing
    if (fileRecord.processingStatus === 'pending') {
      await db.update(files).set({
        processingStatus: 'processing',
        updatedAt: new Date().toISOString()
      }).where(eq(files.id, fileId));
      console.log(`[Queue] Updated file ${fileId} status to 'processing'.`);
    }

    try {
      let currentAccessToken = accessToken;
      let currentRefreshToken = refreshToken;

      const downloadUrl = await getDownloadUrl(fileKey);
      console.log(`[Queue] Download URL for file ${fileId}: ${downloadUrl}`);

      // Verify access token
      let verification = await verifyAccessToken(currentAccessToken);

      if (!verification.valid) {
        console.log("[Queue] Access token invalid, attempting to refresh...");
        if (currentRefreshToken) {
          const refreshResult = await refreshTokens(currentRefreshToken);
          if (refreshResult.success && refreshResult.access_token && refreshResult.refresh_token) {
            console.log("[Queue] Tokens refreshed successfully.");
            currentAccessToken = refreshResult.access_token;
            currentRefreshToken = refreshResult.refresh_token;
          } else {
            console.error("[Queue] Token refresh failed.");
            // Handle error, maybe mark document processing as failed
            throw new Error("Failed to refresh access token.");
          }
        } else {
          console.error("[Queue] No refresh token available, cannot refresh.");
          // Handle error
          throw new Error("Access token invalid and no refresh token available.");
        }
      }
     
      // Use the new PDF analysis service with entities and date extraction
      // Pass the evidence type (fileRecord.type) to use the appropriate prompt
      const pdfAnalysisService = new PDFAnalysisService();
      const analysisResult = await pdfAnalysisService.analyzePDFWithEntitiesAndDate(downloadUrl, currentAccessToken, fileRecord.type);

      if (analysisResult.success) {
        console.log(`[Queue] PDF analysis completed for file ${fileId}`);
        console.log(`[Queue] Entities found: ${analysisResult.entities?.length || 0}`);
        console.log(`[Queue] Document date: ${analysisResult.documentDate || 'Not found'}`);

        await db.update(files).set({
          documentDate: analysisResult.documentDate,
          entities: analysisResult.entities,
          summary: analysisResult.documentSummary,
          processingStatus: 'completed',
          updatedAt: new Date().toISOString()
        }).where(eq(files.id, fileId));

        console.log(`[Queue] Successfully updated file ${fileId} in DB with PDF analysis results.`);
      } else {
        console.error(`[Queue] PDF analysis failed for file ${fileId}: ${analysisResult.error}`);
        await db.update(files).set({
          processingStatus: 'failed',
          errorMessage: (analysisResult.error || 'Unknown PDF analysis error').toString(),
          updatedAt: new Date().toISOString()
        }).where(eq(files.id, fileId));
      }
    } catch (error) {
      console.error(`[Queue] Error processing file ${fileId}:`, error);
      await db.update(files).set({
        processingStatus: 'failed',
        errorMessage: (error instanceof Error ? error.message : 'Unknown error').toString(),
        updatedAt: new Date().toISOString() // Add updatedAt for general processing errors
      }).where(eq(files.id, fileId));
    }
    // No file deletion in dummy, but it would go here
  }
}
// Export singleton instance
export const documentQueue = new DocumentProcessingQueue();
