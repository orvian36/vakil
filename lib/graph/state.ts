import { Annotation } from "@langchain/langgraph";

export interface FileSummary {
  id: string;
  fileName: string;
  type: string;
  summary?: string | null;
  ocrData?: string | null;
}

export const DocumentsState = Annotation.Root({
  caseId:                  Annotation<string>(),
  userId:                  Annotation<string>(),
  userComment:             Annotation<string | undefined>({ default: () => undefined, reducer: (_, n) => n }),

  // fetched
  chronology:              Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  particulars:             Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  writOfSummonsFiles:      Annotation<FileSummary[]>({ default: () => [], reducer: (_, n) => n }),

  // generated
  writOfSummons:           Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  witnessStatement:        Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  statementOfClaim:        Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  statementOfDamages:      Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  preActionLetter:         Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  witnessStatementBengali: Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
});

export type DocumentsStateType = typeof DocumentsState.State;

export const SingleDocState = Annotation.Root({
  caseId:      Annotation<string>(),
  userId:      Annotation<string>(),
  userComment: Annotation<string | undefined>({ default: () => undefined, reducer: (_, n) => n }),
  ocrText:     Annotation<string>(),
  content:     Annotation<string | null>({ default: () => null, reducer: (_, n) => n }),
  attempts:    Annotation<number>({ default: () => 0, reducer: (a, n) => (n ?? a) }),
  valid:       Annotation<boolean>({ default: () => false, reducer: (_, n) => n }),
});

export type SingleDocStateType = typeof SingleDocState.State;
