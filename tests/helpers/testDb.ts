import { beforeEach, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const TEST_DB = path.resolve(process.cwd(), "prisma/test.db");
process.env.DATABASE_URL = `file:${TEST_DB}`;

if (!fs.existsSync(TEST_DB)) {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
    stdio: "inherit",
  });
}

export const testPrisma = new PrismaClient();

beforeEach(async () => {
  await testPrisma.socAnalysis.deleteMany();
  await testPrisma.caseAnalysis.deleteMany();
  await testPrisma.file.deleteMany();
  await testPrisma.caseParty.deleteMany();
  await testPrisma.caseEvidenceType.deleteMany();
  await testPrisma.case.deleteMany();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
