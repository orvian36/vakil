import { processDocumentWithOCR } from "../lib/ocr";

async function runOCR() {
  const result = await processDocumentWithOCR(
    "https://pdfobject.com/pdf/sample.pdf"
  );

  console.log("Total pages:", result.totalPages);
  console.log("Full text preview:\n", result.fullText.slice(0, 500));
}

runOCR();