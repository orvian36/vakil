import { describe, it, expect } from "vitest";
import { DocumentsState, SingleDocState } from "@/lib/graph/state";

describe("state annotations", () => {
  it("DocumentsState is defined with channels", () => {
    expect(DocumentsState.spec).toBeDefined();
  });
  it("SingleDocState is defined with channels", () => {
    expect(SingleDocState.spec).toBeDefined();
  });
});
