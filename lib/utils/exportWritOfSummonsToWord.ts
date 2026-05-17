import { Case } from "@/types/case";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

export interface WritOfSummonsExportOptions {
  caseData: Case;
  content: string;
  filename: string;
  title?: string;
  court?: string;
  plaintiffName?: string;
}

export async function downloadWritOfSummonsAsWord(options: WritOfSummonsExportOptions): Promise<void> {
  try {
    // Parse markdown content into paragraphs
    const paragraphs = parseMarkdownToParagraphs(options.content);
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1.25 * 1440,
              right: 1.25 * 1440,
              bottom: 1.25 * 1440,
              left: 1.25 * 1440
            }
          }
        },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: {
              line: 500,
              lineRule: "exact"
            },
            children: [
              new TextRun({
                text: "DCCJ",
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: "       ",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Court information
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: options.court ? `IN THE ${options.court} OF THE` : "IN THE DISTRICT COURT OF THE",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "HONG KONG SPECIAL ADMINISTRATIVE REGION",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "Vakil ACTION NO.",
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: "               OF ",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Empty line
          new Paragraph({
            children: [new TextRun({ text: "" })]
          }),
          
          // Content paragraphs
          ...paragraphs,
        ],
      }],
    });

    // Create download link
    const url = URL.createObjectURL(await Packer.toBlob(doc));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.filename}.docx`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting Writ of Summons to Word:', error);
    throw new Error('Failed to export Writ of Summons document to Word format');
  }
}

function parseMarkdownToParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: "" })]
      }));
      continue;
    }
    
    // Check for headers
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: trimmedLine.substring(2),
            bold: true,
            font: "Times New Roman",
            size: 28,
          }),
        ],
      }));
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: trimmedLine.substring(3),
            bold: true,
            font: "Times New Roman",
            size: 24,
          }),
        ],
      }));
    } else {
      // Regular paragraph with inline markdown support
      const textRuns = parseInlineMarkdown(trimmedLine, 24);
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        children: textRuns,
      }));
    }
  }
  
  return paragraphs;
}

function parseInlineMarkdown(text: string, fontSize: number): TextRun[] {
  const textRuns: TextRun[] = [];
  let currentText = text;
  let position = 0;
  
  while (position < currentText.length) {
    // Look for bold text **text**
    const boldMatch = currentText.substring(position).match(/\*\*(.*?)\*\*/);
    
    if (boldMatch && boldMatch.index !== undefined) {
      // Add text before bold
      if (boldMatch.index > 0) {
        textRuns.push(new TextRun({
          text: currentText.substring(position, position + boldMatch.index),
          font: "Times New Roman",
          size: fontSize,
        }));
      }
      
      // Add bold text
      textRuns.push(new TextRun({
        text: boldMatch[1],
        bold: true,
        font: "Times New Roman",
        size: fontSize,
      }));
      
      position += boldMatch.index + boldMatch[0].length;
    } else {
      // No more bold text, add remaining text
      textRuns.push(new TextRun({
        text: currentText.substring(position),
        font: "Times New Roman",
        size: fontSize,
      }));
      break;
    }
  }
  
  return textRuns.length > 0 ? textRuns : [new TextRun({
    text: text,
    font: "Times New Roman",
    size: fontSize,
  })];
}
