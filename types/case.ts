// Database case type (matches the database schema)

import { files } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";

// UI-friendly party type
export interface CaseParty {
    id: string; // Add unique identifier for React keys
    name: string;
    chineseName?: string | null; // optional
    role: "plaintiff" | "defendant";
    type: "person" | "company";
  }
  
  // UI-friendly case type
export interface Case {
    id: string;            // case UUID
    title: string;
    summary: string | null;      // optional background info
    caseType: "SOC" | "DEFENCE";
    status?: "draft" | "processing" | "completed"; // Optional status field
    createdAt: string;     // ISO timestamp
    updatedAt?: string; // ISO timestamp
    parties: CaseParty[];  // array of parties
    files?: CaseFile[]; // Array of associated files
    evidenceTypes?: CaseEvidenceType[]; // Array of evidence types
    court?: string;
    caseNumber?: string;
}

export interface CaseFile {
    id: string;         // Unique ID of the file
    type: string;       // Corresponds to evidenceType (e.g., "medical_records")
    fileName: string; // Original name of the file
    upload_timestamp?: Date;
    caseId: string;
    processing_status?: 'pending' | 'processing' | 'completed' | 'failed'; // Status of the file
    ocr_data?: string;
    error_message?: string;
    entities?: string[]; // Entities of the file
    documentDate?: string; // Document date of the file
    summary?: string; // Summary of the file
    created_at?: Date;
    updated_at?: Date;
    fileKey: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
}


export type FileRecord = InferSelectModel<typeof files> & {
    orderIndex?: number | null;
    itemNumber?: number;
    startPageNumber?: number;
    continuousItemNumber?: number;
    continuousPageStart?: number;
    continuousPageEnd?: number;
  }; // Define FileRecord from the schema

  export interface SplitSegment {
    id: string;
    from: number | '';
    to: number | '';
    name: string;
    category: string | '';
  }

export interface CaseEvidenceType {
    id: string;
    caseId: string;
    key: string;
    title: string;
    description?: string | null;
    isDefault: boolean;
    displayOrder: number;
    createdAt?: string;
}
  