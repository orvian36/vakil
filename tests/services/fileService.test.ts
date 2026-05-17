import { describe, it, expect } from "vitest";
import { testPrisma } from "../helpers/testDb";
import { FileService, getFileById } from "@/services/fileService";

async function makeCase() {
  return testPrisma.case.create({ data: { userId: "u1", title: "T", caseType: "SOC" } });
}

describe("FileService", () => {
  it("saves, lists, updates status, deletes", async () => {
    const c = await makeCase();
    const f = await FileService.saveFileToDB("f1", c.id, "a.pdf", "k/a.pdf", "medical_records");
    expect(f.processingStatus).toBe("pending");

    const list = await FileService.listFilesByCase(c.id);
    expect(list).toHaveLength(1);

    const updated = await FileService.updateFileStatus(f.id, "completed");
    expect(updated.processingStatus).toBe("completed");

    expect((await getFileById(f.id))?.id).toBe(f.id);

    await FileService.deleteFile(f.id);
    expect(await FileService.listFilesByCase(c.id)).toHaveLength(0);
  });

  it("getPendingFiles returns pending rows respecting limit", async () => {
    const c = await makeCase();
    await FileService.saveFileToDB("f1", c.id, "a.pdf", "k/a.pdf", "t");
    await FileService.saveFileToDB("f2", c.id, "b.pdf", "k/b.pdf", "t");
    const pending = await FileService.getPendingFiles(10);
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });
});
