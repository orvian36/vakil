import type { File as PrismaFile } from "@prisma/client";

export interface CaseParty {
  id: string;
  name: string;
  bengaliName?: string | null;
  role: "plaintiff" | "defendant";
  type: "person" | "company";
}

export interface Case {
  id: string;
  title: string;
  summary: string | null;
  caseType: "SOC" | "DEFENCE";
  status?: "draft" | "processing" | "completed";
  createdAt: string;
  updatedAt?: string;
  parties: CaseParty[];
  files?: CaseFile[];
  evidenceTypes?: CaseEvidenceType[];
  court?: string;
  caseNumber?: string;
}

export interface CaseFile {
  id: string;
  type: string;
  fileName: string;
  upload_timestamp?: Date;
  caseId: string;
  processing_status?: "pending" | "processing" | "completed" | "failed";
  ocr_data?: string;
  error_message?: string;
  entities?: string[];
  documentDate?: string;
  summary?: string;
  created_at?: Date;
  updated_at?: Date;
  fileKey: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

export type FileRecord = PrismaFile & {
  orderIndex?: number | null;
  itemNumber?: number;
  startPageNumber?: number;
  continuousItemNumber?: number;
  continuousPageStart?: number;
  continuousPageEnd?: number;
};

export interface SplitSegment {
  id: string;
  from: number | "";
  to: number | "";
  name: string;
  category: string | "";
}

export interface CaseEvidenceType {
  id: string;
  caseId: string;
  key: string;
  title: string;
  description?: string | null;
  isDefault: boolean;
  displayOrder: number;
  createdAt?: string | Date;
}
