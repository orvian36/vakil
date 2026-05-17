-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "caseType" TEXT NOT NULL,
    "court" TEXT,
    "caseNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "case_parties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bengaliName" TEXT,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'person',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_parties_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "ocrData" TEXT,
    "errorMessage" TEXT,
    "summary" TEXT,
    "entities" TEXT,
    "documentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "case_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "analysisStatus" TEXT NOT NULL DEFAULT 'pending',
    "resultPath" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "case_analyses_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "soc_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseAnalysisId" TEXT NOT NULL,
    "allFileOcr" TEXT,
    "particularsJson" TEXT,
    "chronologyJson" TEXT,
    "writOfSummons" TEXT,
    "statementOfClaim" TEXT,
    "statementOfDamages" TEXT,
    "preActionLetter" TEXT,
    "witnessStatement" TEXT,
    "witnessStatementBengali" TEXT,
    "particularsMarkdown" TEXT,
    "chronologyMarkdown" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "soc_analyses_caseAnalysisId_fkey" FOREIGN KEY ("caseAnalysisId") REFERENCES "case_analyses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "case_evidence_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_evidence_types_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "cases_userId_idx" ON "cases"("userId");

-- CreateIndex
CREATE INDEX "cases_createdAt_idx" ON "cases"("createdAt");

-- CreateIndex
CREATE INDEX "case_parties_caseId_idx" ON "case_parties"("caseId");

-- CreateIndex
CREATE INDEX "case_parties_role_idx" ON "case_parties"("role");

-- CreateIndex
CREATE INDEX "case_parties_type_idx" ON "case_parties"("type");

-- CreateIndex
CREATE INDEX "files_caseId_idx" ON "files"("caseId");

-- CreateIndex
CREATE INDEX "files_processingStatus_idx" ON "files"("processingStatus");

-- CreateIndex
CREATE INDEX "files_documentDate_idx" ON "files"("documentDate");

-- CreateIndex
CREATE INDEX "case_analyses_caseId_idx" ON "case_analyses"("caseId");

-- CreateIndex
CREATE INDEX "case_analyses_analysisType_idx" ON "case_analyses"("analysisType");

-- CreateIndex
CREATE UNIQUE INDEX "case_analyses_caseId_analysisType_key" ON "case_analyses"("caseId", "analysisType");

-- CreateIndex
CREATE UNIQUE INDEX "soc_analyses_caseAnalysisId_key" ON "soc_analyses"("caseAnalysisId");

-- CreateIndex
CREATE INDEX "soc_analyses_caseAnalysisId_idx" ON "soc_analyses"("caseAnalysisId");

-- CreateIndex
CREATE INDEX "case_evidence_types_caseId_idx" ON "case_evidence_types"("caseId");

-- CreateIndex
CREATE INDEX "case_evidence_types_key_idx" ON "case_evidence_types"("key");

-- CreateIndex
CREATE INDEX "case_evidence_types_displayOrder_idx" ON "case_evidence_types"("displayOrder");
