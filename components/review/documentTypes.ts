import tabsConfig from "@/config/tabs.json";

export type DocumentId =
  | "writ-of-summons"
  | "witness-statement"
  | "statement-of-claim"
  | "statement-of-damages"
  | "pre-action-letter";

export type DocumentStatus =
  | "pending"
  | "generating"
  | "drafted"
  | "failed";

export interface DocumentDef {
  id: DocumentId;
  label: string;
  title: string;
  apiEndpoint: string;
  generateEndpoint: string;
  exportFunction: string;
  promptFile: string;
}

export const DOCUMENTS = (tabsConfig as any).tabs as DocumentDef[];

/** Stable display order: matches config/tabs.json. */
export const DOCUMENT_ORDER: DocumentId[] = DOCUMENTS.map((d) => d.id as DocumentId);
