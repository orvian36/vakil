import { Mistral } from "@mistralai/mistralai";

export interface OcrPage {
  markdown: string;
  pageNumber: number;
}

export interface OcrResult {
  pages: OcrPage[];
  fullText: string;
  totalPages: number;
}

export async function processDocumentWithOCR(documentUrl: string): Promise<OcrResult> {
  if (!documentUrl || !/^https?:\/\//.test(documentUrl)) {
    throw new Error("A valid document URL is required for OCR");
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY environment variable is not set");
  }

  console.log("🔍 [OCRService] Starting OCR for:", documentUrl);

  try {
    const client = new Mistral({ apiKey });

    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl,
      },
      includeImageBase64: false, // ⚡ avoid bloat unless you need images
    });

    if (!ocrResponse.pages || ocrResponse.pages.length === 0) {
      throw new Error("OCR returned no pages");
    }

    // ✅ Normalize + add page identifiers
    const pages = ocrResponse.pages.map((page, index) => ({
      markdown: page.markdown?.trim() || "",
      pageNumber: index + 1,
    }));

    const pagesWithIdentifiers = pages.map(
      (page) => `==== PAGE ${page.pageNumber} ====\n${page.markdown}`
    );

    const fullText = pagesWithIdentifiers.join("\n\n");

    console.log(`✅ [OCRService] OCR complete: ${pages.length} pages processed`);

    return {
      pages,
      fullText,
      totalPages: pages.length,
    };
  } catch (err) {
    console.error("❌ [OCRService] Error during OCR:", err);
    if (err instanceof Error) {
      throw new Error(`OCR failed: ${err.message}`);
    }
    throw new Error("OCR failed due to an unknown error");
  }
}
