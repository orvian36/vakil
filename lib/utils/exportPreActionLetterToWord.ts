import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export interface ExportOptions {
  title: string;
  content: string;
  filename: string;
}

export function convertMarkdownToWord(options: ExportOptions): Promise<Blob> {
  const { title, content, filename } = options;
  
  // Parse markdown content and convert to Word format
  const paragraphs = parseMarkdownToParagraphs(content);
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        
        // Empty line
        new Paragraph({
          children: [new TextRun({ text: "" })],
        }),
        
        // Content paragraphs
        ...paragraphs,
      ],
    }],
  });

  return Packer.toBlob(doc);
}

function parseMarkdownToParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      // Empty line
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: "" })],
      }));
      continue;
    }
    
    // Check for headers
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.substring(2),
            bold: true,
            size: 28,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.substring(3),
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: line.substring(4),
            bold: true,
            size: 20,
          }),
        ],
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith('- ')) {
      // Bullet point
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `• ${line.substring(2)}`,
            size: 18,
          }),
        ],
        bullet: {
          level: 0,
        },
      }));
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      const match = line.match(/^(\d+)\.\s(.+)$/);
      if (match) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `${match[1]}. `,
              bold: true,
              size: 18,
            }),
            ...parseInlineMarkdown(match[2], 18),
          ],
        }));
      }
    } else {
      // Regular paragraph with inline markdown support
      paragraphs.push(new Paragraph({
        children: parseInlineMarkdown(line, 18),
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
    
    if (boldMatch) {
      // Add text before bold
      if (boldMatch.index! > 0) {
        textRuns.push(new TextRun({
          text: currentText.substring(position, position + boldMatch.index!),
          size: fontSize,
        }));
      }
      
      // Add bold text
      textRuns.push(new TextRun({
        text: boldMatch[1],
        bold: true,
        size: fontSize,
      }));
      
      position += boldMatch.index! + boldMatch[0].length;
    } else {
      // No more bold text, add remaining text
      textRuns.push(new TextRun({
        text: currentText.substring(position),
        size: fontSize,
      }));
      break;
    }
  }
  
  return textRuns;
}

export async function downloadPreActionLetterAsWord(options: ExportOptions): Promise<void> {
  try {
    const blob = await convertMarkdownToWord(options);
    
    // Create download link
    const url = URL.createObjectURL(blob);
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
    console.error('Error exporting PreActionLetter to Word:', error);
    throw new Error('Failed to export document to Word format');
  }
}
