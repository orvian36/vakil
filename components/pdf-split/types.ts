export interface AISuggestion {
  id: string;
  fromPage: number;
  toPage: number;
  suggestedName: string;
  suggestedCategory: string;
  confidence: number;
  description: string;
  documentType: string;
}

export interface AIAnalysisResult {
  success: boolean;
  data?: {
    totalPages: number;
    suggestedSegments: AISuggestion[];
    analysisConfidence: number;
  };
  error?: string;
}

/** A user-facing segment, derived from cut points + per-segment metadata. */
export interface Segment {
  id: string;
  fromPage: number;
  toPage: number;
  name: string;
  category: string;
  /** 0..1 if AI suggested, undefined if user-added */
  aiConfidence?: number;
}

export interface OversizedFile {
  name: string;
  size: number;
}
