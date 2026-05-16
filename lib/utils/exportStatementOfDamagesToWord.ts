import { Case } from "@/types/case";
import { Document, Packer, Paragraph, TextRun, Table, MathSuperScript, LevelFormat,UnderlineType, MathRun, TableCell, TableRow, AlignmentType, WidthType, VerticalAlign, VerticalMerge, HeightRule, BorderStyle, HeadingLevel, NumberFormat, Footer, PageNumber } from 'docx';
import { Math as Math_2 } from 'docx';



export interface SummaryExportOptions {
  caseData: Case;
  content: string;
  filename: string;
  caseId?: string;
}

interface LegalDocumentData {
    caseData: Case;
    plaintiffName?: string;
    caseCode?: string;
    content?: string;
    title?: string;
    filename?: string;
    court?: string;
    includeFormattingExamples?: boolean;
  }
  
  // Removed DefenceDocument, DefenceParagraph, and DmcClause interfaces
  // since we're using markdown parsing for defence documents
  
  function extractCaseDetails(caseNumber: string): { caseNumberExtracted: string | null; year: string | null } {
    const match = caseNumber.match(/DCCJ (\d+)\/(\d{4})/);
    if (match) {
        const [, caseNumberExtracted, year] = match;
        return { caseNumberExtracted, year };
    } else {
        return { caseNumberExtracted: null, year: null };
    }
  }
  
  
  
  // Helper: Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num: number): string {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}
  
  
  
  // Helper function to create custom formatted paragraphs
  function createCustomFormattedParagraph(text: string, options: {
    fontSize?: number;
    lineSpacing?: number;
    spaceBefore?: number;
    spaceAfter?: number;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    bold?: boolean;
    italic?: boolean;
    indent?: { left?: number; right?: number; hanging?: number; firstLine?: number };
  }) {
    return new Paragraph({
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: {
        line: options.lineSpacing || 276, // Default 1.15 line spacing
        before: options.spaceBefore || 0,
        after: options.spaceAfter || 200,
        lineRule: "auto"
      },
      indent: options.indent || {},
      children: [
        new TextRun({
          text: text,
          font: "Times New Roman",
          size: options.fontSize || 24,
          bold: options.bold || false,
          italics: options.italic || false
        })
      ]
    });
  }
  
  // Advanced formatting demonstration function
  function createAdvancedFormattingExamples(data: LegalDocumentData) {
    return [
      // Page break before examples
      new Paragraph({
        pageBreakBefore: true,
        children: [new TextRun({ text: "" })]
      }),
      
      // Title with custom formatting
      createCustomFormattedParagraph("ADVANCED FORMATTING EXAMPLES", {
        fontSize: 28,
        lineSpacing: 360, // 1.5 line spacing
        spaceBefore: 800,
        spaceAfter: 600,
        alignment: AlignmentType.CENTER,
        bold: true
      }),
      
      // Single line spacing example
      createCustomFormattedParagraph("This paragraph demonstrates single line spacing (1.0). Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", {
        fontSize: 24,
        lineSpacing: 240, // Single spacing
        spaceAfter: 300
      }),
      
      // 1.5 line spacing example
      createCustomFormattedParagraph("This paragraph demonstrates 1.5 line spacing. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.", {
        fontSize: 24,
        lineSpacing: 360, // 1.5 spacing
        spaceAfter: 300
      }),
      
      // Double line spacing example
      createCustomFormattedParagraph("This paragraph demonstrates double line spacing (2.0). Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.", {
        fontSize: 24,
        lineSpacing: 480, // Double spacing
        spaceAfter: 300
      }),
      
      // Indented paragraph
      createCustomFormattedParagraph("This paragraph is indented from the left margin by 1 inch. It demonstrates how to control paragraph indentation for quotes or special sections.", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 300,
        indent: { left: 1440 } // 1 inch left indent
      }),
      
      // Hanging indent (like a bibliography entry)
      createCustomFormattedParagraph("This paragraph has a hanging indent, commonly used for bibliography entries or legal citations. The first line starts at the margin, but subsequent lines are indented.", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 300,
        indent: { left: 720, hanging: 720 } // 0.5 inch hanging indent
      }),
      
      // Right-aligned paragraph
      createCustomFormattedParagraph("This paragraph is right-aligned and demonstrates text alignment options available in the docx library.", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 300,
        alignment: AlignmentType.RIGHT
      }),
      
      // Justified paragraph
      createCustomFormattedParagraph("This paragraph is justified, meaning the text is aligned to both the left and right margins. This creates a clean, professional appearance often used in legal documents.", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 300,
        alignment: AlignmentType.JUSTIFIED
      }),
      
      // Different font sizes
      createCustomFormattedParagraph("Large text (16pt) for headings or emphasis", {
        fontSize: 32,
        lineSpacing: 400,
        spaceAfter: 200,
        bold: true
      }),
      
      createCustomFormattedParagraph("Normal text (12pt) for body content", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 200
      }),
      
      createCustomFormattedParagraph("Small text (10pt) for footnotes or fine print", {
        fontSize: 20,
        lineSpacing: 240,
        spaceAfter: 300
      }),
      
      // Complex paragraph with multiple text runs
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: "This paragraph contains ",
            font: "Times New Roman",
            size: 24
          }),
          new TextRun({
            text: "bold text",
            font: "Times New Roman",
            size: 24,
            bold: true
          }),
          new TextRun({
            text: ", ",
            font: "Times New Roman",
            size: 24
          }),
          new TextRun({
            text: "italic text",
            font: "Times New Roman",
            size: 24,
            italics: true
          }),
          new TextRun({
            text: ", ",
            font: "Times New Roman",
            size: 24
          }),
          new TextRun({
            text: "underlined text",
            font: "Times New Roman",
            size: 24,
            underline: { type: "single" }
          }),
          new TextRun({
            text: ", and ",
            font: "Times New Roman",
            size: 24
          }),
          new TextRun({
            text: "highlighted text",
            font: "Times New Roman",
            size: 24,
            highlight: "yellow"
          }),
          new TextRun({
            text: " all in one paragraph.",
            font: "Times New Roman",
            size: 24
          })
        ]
      })
    ];
  }
  
  // Function to create a table with custom formatting
  function createFormattedTable(data: LegalDocumentData) {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
      rows: [
        // Header row with custom formatting
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { fill: "E6E6E6" }, // Light gray background
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Property Details",
                      bold: true,
                      font: "Times New Roman",
                      size: 24
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              shading: { fill: "E6E6E6" },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Information",
                      bold: true,
                      font: "Times New Roman",
                      size: 24
                    })
                  ]
                })
              ]
            })
          ]
        }),
        // Data rows
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Property Name",
                      font: "Times New Roman",
                      size: 22
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "",
                      font: "Times New Roman",
                      size: 22
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Address",
                      font: "Times New Roman",
                      size: 22
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `  `,
                      font: "Times New Roman",
                      size: 22
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  }
  
  // Function to demonstrate document modification capabilities
  function createDocumentModificationExample(data: LegalDocumentData) {
    return [
      new Paragraph({
        pageBreakBefore: true,
        children: [new TextRun({ text: "" })]
      }),
      
      createCustomFormattedParagraph("DOCUMENT MODIFICATION CAPABILITIES", {
        fontSize: 28,
        lineSpacing: 360,
        spaceBefore: 800,
        spaceAfter: 600,
        alignment: AlignmentType.CENTER,
        bold: true
      }),
      
      createCustomFormattedParagraph("The docx library allows you to:", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 400,
        bold: true
      }),
      
      // Bullet points with custom formatting
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Add pages at the beginning or end of documents",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Control line spacing (single, 1.5, double, or custom)",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Adjust paragraph spacing (before and after)",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Set custom indentation (left, right, hanging, first line)",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Apply text formatting (bold, italic, underline, highlight)",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Change font sizes and families",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Control text alignment (left, center, right, justified)",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Create and format tables with borders and shading",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Add page breaks and section breaks",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      new Paragraph({
        spacing: { after: 400 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: "• Insert headers, footers, and page numbers",
            font: "Times New Roman",
            size: 24
          })
        ]
      }),
      
      createCustomFormattedParagraph("Code Example:", {
        fontSize: 24,
        lineSpacing: 276,
        spaceAfter: 200,
        bold: true
      }),
      
      // Code example with monospace font
      new Paragraph({
        spacing: { after: 400 },
        indent: { left: 720 },
        children: [
          new TextRun({
            text: `// Create a custom formatted paragraph
  const customParagraph = new Paragraph({
    spacing: {
      line: 360,        // 1.5 line spacing
      before: 200,      // Space before paragraph
      after: 300        // Space after paragraph
    },
    indent: {
      left: 720,        // Left indent (0.5 inch)
      hanging: 360      // Hanging indent (0.25 inch)
    },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: "Your text here",
        font: "Times New Roman",
        size: 24,
        bold: true
      })
    ]
  });`,
            font: "Courier New",
            size: 20
          })
        ]
      })
    ];
  }
  
  
  
  
  
  /**
   * Parse a markdown table starting from the given line index
   * @param {Array} lines - All lines from the markdown
   * @param {number} startIndex - Starting line index
   * @returns {Object} Parsed table data and next index
   */
  function parseMarkdownTable(lines: string[], startIndex: number): { table: any | null; nextIndex: number } {
    const tableLines: string[] = [];
    let currentIndex = startIndex;
    
    // Collect all consecutive table lines
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      if (!line) break;
      
      if (line.includes('|')) {
        tableLines.push(line);
        currentIndex++;
      } else {
        break;
      }
    }
    
    // Need at least 2 lines for a valid table (header + separator or header + data)
    if (tableLines.length < 2) {
      return { table: null, nextIndex: startIndex + 1 };
    }
    
    // Parse table structure
    const tableData: string[][] = [];
    let hasHeaderSeparator = false;
    let headerRow: string[] | null = null;
    
    for (let i = 0; i < tableLines.length; i++) {
      const line = tableLines[i];
      
      // Check if this is a header separator line (|---|---| or |:---|:---|)
      if (line.match(/^\s*\|?[\s\-\|:]+\|?\s*$/) || line.match(/^\s*\|?[\s\-\|:]+\|?\s*\|?\s*$/)) {
        hasHeaderSeparator = true;
        continue;
      }
      
      // Parse table row
      let cells = line.split('|').map(cell => cell.trim());
      
      // Remove empty cells from start and end (but keep internal empty cells)
      if (cells.length > 0 && cells[0] === '') {
        cells = cells.slice(1);
      }
      if (cells.length > 0 && cells[cells.length - 1] === '') {
        cells = cells.slice(0, -1);
      }
      
      if (cells.length > 0) {
        if (!headerRow && !hasHeaderSeparator) {
          headerRow = cells;
        } else {
          tableData.push(cells);
        }
      }
    }
    
    // If we found a header row, add it to the beginning of tableData
    if (headerRow) {
      tableData.unshift(headerRow);
    }
    
    // Ensure all rows have the same number of columns
    if (tableData.length > 0) {
      const maxColumns = Math.max(...tableData.map(row => row.length));
      tableData.forEach(row => {
        while (row.length < maxColumns) {
          row.push('');
        }
      });
    }
    
    if (tableData.length === 0) {
      return { table: null, nextIndex: startIndex + 1 };
    }
    
    return {
      table: {
        type: 'table',
        headers: hasHeaderSeparator ? tableData[0] : null,
        rows: hasHeaderSeparator ? tableData.slice(1) : tableData,
        hasHeaders: hasHeaderSeparator
      },
      nextIndex: currentIndex
    };
  }

  /**
   * Create a dynamic table from parsed markdown table data
   * @param {Object} tableData - Parsed table data
   * @returns {Table} Word table element
   */
  function createMarkdownTable(tableData: any): Table {
    const { headers, rows, hasHeaders } = tableData;
    const allRows = hasHeaders ? [headers, ...rows] : rows;
    
    if (allRows.length === 0) {
      return new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ 
                        text: "Empty table", 
                        font: "Times New Roman", 
                        size: 24 
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      });
    }
    
    // Calculate column widths dynamically
    const numColumns = allRows[0].length;
    const columnWidth = Math.floor(100 / numColumns);
    
    const tableRows = allRows.map((rowData: string[], rowIndex: number) => {
      const isHeaderRow = hasHeaders && rowIndex === 0;
      
      return new TableRow({
        children: rowData.map(cellData => 
          new TableCell({
            children: [new Paragraph({
              children: parseMarkdownFormatting(cellData || '').map(info => 
                new TextRun({
                  text: info.text,
                  bold: info.bold || isHeaderRow,
                  italics: info.italic,
                  font: "Times New Roman",
                  size: 24
                })
              ),
              alignment: AlignmentType.LEFT
            })],
            width: { size: columnWidth, type: WidthType.PERCENTAGE },
            shading: isHeaderRow ? { fill: "E8E8E8" } : undefined,
            margins: {
              top: 100,
              bottom: 100,
              left: 150,
              right: 150
            }
          })
        )
      });
    });

    return new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
      },
      margins: {
        top: 200,
        bottom: 200
      }
    });
  }

  // Function to parse markdown content into formatted paragraphs and tables
  function parseMarkdownToFormattedParagraphs(markdown: string, customLineSpacing: number = 360): (Paragraph | Table)[] {
    const lines = markdown.split('\n');
    const paragraphs: (Paragraph | Table)[] = [];
    //console.log("markdown",markdown);
    let currentParagraphLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines but use them to break paragraphs
      if (!line) {
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        continue;
      }
      
      // Check for headings
      if (line.startsWith('#')) {
        // Finish current paragraph if any
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        
        const headingLevel = line.match(/^#+/)?.[0].length || 1;
        const headingText = line.replace(/^#+\s*/, '');
        const headingFormatInfos = parseMarkdownFormatting(headingText);
        
        // Make all heading text runs bold and adjust size
        const formattedHeadingRuns = headingFormatInfos.map(info => 
          new TextRun({
            text: info.text,
            bold: true, // Force bold for headings
            italics: info.italic,
            font: "Times New Roman",
            size: Math.max(32 - (headingLevel * 2), 24) // Decreasing size for deeper headings
          })
        );
        
        paragraphs.push(new Paragraph({
          spacing: { 
            line: customLineSpacing,
            before: 400,
            after: 300
          },
          children: formattedHeadingRuns
        }));
        continue;
      }
      
      // Check for tables
      if (line.includes('|') && !line.startsWith('|--')) {
        // Finish current paragraph if any
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        
        const tableData = parseMarkdownTable(lines, i);
        if (tableData.table) {
          paragraphs.push(createMarkdownTable(tableData.table));
          i = tableData.nextIndex - 1; // Skip processed table lines
        } else {
          // Not a valid table, treat as paragraph
          currentParagraphLines.push(line);
        }
        continue;
      }
      
      // Check for numbered paragraphs (main level: 53., 54., etc.)
      if (line.match(/^\d+\.\s+/)) {
        // Finish current paragraph if any
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        
        paragraphs.push(createNumberedParagraph(line, customLineSpacing, 0));
        continue;
      }
      
      // Check for sub-numbered items (a), (b), (c), etc.
      if (line.match(/^\([a-z]\)\s+/)) {
        // Finish current paragraph if any
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        
        paragraphs.push(createSubNumberedParagraph(line, customLineSpacing));
        continue;
      }
      
      // Check for bullet points
      if (line.match(/^[-*+]\s+/)) {
        // Finish current paragraph if any
        if (currentParagraphLines.length > 0) {
          paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
          currentParagraphLines = [];
        }
        
        paragraphs.push(createBulletParagraph(line, customLineSpacing));
        continue;
      }
      
      // Regular text line - accumulate for paragraph
      currentParagraphLines.push(line);
    }
    
    // Handle remaining content
    if (currentParagraphLines.length > 0) {
      paragraphs.push(createFormattedParagraphFromLines(currentParagraphLines, customLineSpacing));
    }
    //console.log("paragraphs",paragraphs);
    return paragraphs;
  }
  
  // Function to create a numbered paragraph (53., 54., etc.)
  function createNumberedParagraph(line: string, lineSpacing: number, indentLevel: number = 0): Paragraph {
    const match = line.match(/^(\d+\.\s+)(.*)$/);
    if (!match) {
      return createFormattedParagraphFromLines([line], lineSpacing);
    }
    
    const number = match[1];
    const text = match[2];
    const formatInfos = parseMarkdownFormatting(text);
    const textRuns = createTextRunsFromFormatInfo(formatInfos, 24);
    
    const allTextRuns = [
      new TextRun({
        text: number,
        font: "Times New Roman",
        size: 24
      }),
      ...textRuns
    ];
    
    return new Paragraph({
      spacing: { 
        line: lineSpacing,
        after: 200
      },
      indent: { 
        left: 720 * indentLevel, // Base indent
        hanging: 360 // Hanging indent for number
      },
      children: allTextRuns
    });
  }
  
  // Function to create a sub-numbered paragraph ((a), (b), etc.)
  function createSubNumberedParagraph(line: string, lineSpacing: number): Paragraph {
    const match = line.match(/^(\([a-z]\)\s+)(.*)$/);
    if (!match) {
      return createFormattedParagraphFromLines([line], lineSpacing);
    }
    
    const subNumber = match[1];
    const text = match[2];
    const formatInfos = parseMarkdownFormatting(text);
    const textRuns = createTextRunsFromFormatInfo(formatInfos, 24);
    
    const allTextRuns = [
      new TextRun({
        text: subNumber,
        font: "Times New Roman",
        size: 24
      }),
      ...textRuns
    ];
    
    return new Paragraph({
      spacing: { 
        line: lineSpacing,
        after: 200
      },
      indent: { 
        left: 720, // Indent for sub-items
        hanging: 360 // Hanging indent for sub-number
      },
      children: allTextRuns
    });
  }
  
  // Function to create a bullet paragraph
  function createBulletParagraph(line: string, lineSpacing: number): Paragraph {
    const text = line.replace(/^[-*+]\s+/, '');
    const formatInfos = parseMarkdownFormatting(text);
    const textRuns = createTextRunsFromFormatInfo(formatInfos, 24);
    
    const allTextRuns = [
      new TextRun({
        text: '• ',
        font: "Times New Roman",
        size: 24
      }),
      ...textRuns
    ];
    
    return new Paragraph({
      spacing: { 
        line: lineSpacing,
        after: 150
      },
      indent: { 
        left: 720, // Indent for bullet items
        hanging: 360 // Hanging indent for bullet
      },
      children: allTextRuns
    });
  }
  
  // Helper function to create a formatted paragraph from multiple lines
  function createFormattedParagraphFromLines(lines: string[], lineSpacing: number): Paragraph {
    const text = lines.join(' ');
    const formatInfos = parseMarkdownFormatting(text);
    const textRuns = createTextRunsFromFormatInfo(formatInfos, 24);
    
    return new Paragraph({
      spacing: { 
        line: lineSpacing,
        after: 200
      },
      alignment: AlignmentType.JUSTIFIED,
      children: textRuns
    });
  }
  
  // Interface for text formatting information
  interface TextFormatInfo {
    text: string;
    bold?: boolean;
    italic?: boolean;
  }
  

  // Helper function to create party table rows
function createPartyTableRows(plaintiffs: any[], defendants: any[]) {
    const rows = [];
    
    // Add plaintiffs
    plaintiffs.forEach((plaintiff, index) => {
      rows.push(
        new TableRow({
          height: {
            value: 0.41 * 1000,
            rule: "exact"
          },
          children: [
            new TableCell({
              width: {
                size: 15,
                type: WidthType.PERCENTAGE,
              },
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              width: {
                size: 60,
                type: WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: plaintiff.name,
                      font: "Times New Roman",
                      size: 26
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              width: {
                size: 25,
                type: WidthType.PERCENTAGE,
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: plaintiffs.length > 1 ? `${index + 1}${getOrdinalSuffix(index + 1)} Plaintiff` : "Plaintiff",
                      font: "Times New Roman",
                      size: 24
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
            height: {
              value: 0.41 * 1000,
              rule: "exact"
            },
            children: [
              new TableCell({
                width: {
                  size: 15,
                  type: WidthType.PERCENTAGE,
                },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: {
                  size: 60,
                  type: WidthType.PERCENTAGE,
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: plaintiff.chineseName!==null ? `(${plaintiff.chineseName})` : ' ',
                        font: "Noto Sans SC",
                        size: 26
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: {
                  size: 25,
                  type: WidthType.PERCENTAGE,
                },
                children: []
              })
            ]
          })
      );
      
      // Add empty row between plaintiffs (except after the last one)
      if (index < plaintiffs.length - 1) {
        rows.push(
          new TableRow({
            height: {
              value: 0.41 * 1000,
              rule: "exact"
            },
            children: [
              new TableCell({
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [] })]
              })
            ]
          })
        );
      }
    });
    
    // Add "and" row if there are both plaintiffs and defendants
    if (plaintiffs.length > 0 && defendants.length > 0) {
      rows.push(
        new TableRow({
          height: {
            value: 0.41 * 1000,
            rule: "exact"
          },
          children: [
            new TableCell({
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              margins: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 720
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: "and    ",
                      font: "Times New Roman",
                      size: 24
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [new Paragraph({ children: [] })]
            })
          ]
        }),
        // Empty row after "and"
        
      );
    }

    //console.log("defendants",defendants);
    
    // Add defendants
    defendants.forEach((defendant, index) => {
      rows.push(
        new TableRow({
          height: {
            value: 0.41 * 1000,
            rule: "exact"
          },
          children: [
            new TableCell({
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: defendant.name,
                      font: "Times New Roman",
                      size: 26
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: defendants.length > 1 ? `${index + 1}${getOrdinalSuffix(index + 1)} Defendant` : "Defendant",
                      font: "Times New Roman",
                      size: 24
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
            height: {
              value: 0.41 * 1000,
              rule: "exact"
            },
            children: [
              new TableCell({
                width: {
                  size: 15,
                  type: WidthType.PERCENTAGE,
                },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: {
                  size: 60,
                  type: WidthType.PERCENTAGE,
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: defendant.chineseName!==null ? `(${defendant.chineseName})` : ' ',
                        font: "Noto Sans SC",
                        size: 26
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: {
                  size: 25,
                  type: WidthType.PERCENTAGE,
                },
                children: []
              })
            ]
          })
      );
      
      // Add empty row between defendants (except after the last one)
      if (index < defendants.length - 1) {
        rows.push(
          new TableRow({
            height: {
              value: 0.41 * 1000,
              rule: "exact"
            },
            children: [
              new TableCell({
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [] })]
              })
            ]
          })
        );
      }
    });
    
    return rows;
  }
  // Function to parse markdown formatting and return formatting info
  function parseMarkdownFormatting(text: string): TextFormatInfo[] {
    const formatInfos: TextFormatInfo[] = [];
    
    // Regular expressions for markdown formatting
    const boldPattern = /\*\*(.*?)\*\*/g;
    const italicPattern = /\*(.*?)\*/g;
    
    // Find all bold text first
    const boldMatches: Array<{start: number, end: number, text: string, isBold: boolean}> = [];
    let match: RegExpExecArray | null;
    
    // Reset regex
    boldPattern.lastIndex = 0;
    while ((match = boldPattern.exec(text)) !== null) {
      boldMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        isBold: true
      });
    }
    
    // Find all italic text (but exclude those already marked as bold)
    italicPattern.lastIndex = 0;
    while ((match = italicPattern.exec(text)) !== null) {
      // Check if this italic is not part of a bold pattern
      const isPartOfBold = boldMatches.some(bold => 
        match!.index >= bold.start && match!.index + match![0].length <= bold.end
      );
      
      if (!isPartOfBold) {
        boldMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1],
          isBold: false
        });
      }
    }
    
    // Sort matches by start position
    boldMatches.sort((a, b) => a.start - b.start);
    
    // Build format info
    let lastEnd = 0;
    
    for (const formatting of boldMatches) {
      // Add normal text before this formatting
      if (formatting.start > lastEnd) {
        const normalText = text.substring(lastEnd, formatting.start);
        if (normalText) {
          formatInfos.push({
            text: normalText,
            bold: false,
            italic: false
          });
        }
      }
      
      // Add formatted text
      formatInfos.push({
        text: formatting.text,
        bold: formatting.isBold,
        italic: !formatting.isBold // If not bold, then it's italic
      });
      
      lastEnd = formatting.end;
    }
    
    // Add remaining normal text
    if (lastEnd < text.length) {
      const remainingText = text.substring(lastEnd);
      if (remainingText) {
        formatInfos.push({
          text: remainingText,
          bold: false,
          italic: false
        });
      }
    }
    
    // If no formatting was found, return the original text
    if (formatInfos.length === 0) {
      formatInfos.push({
        text: text,
        bold: false,
        italic: false
      });
    }
    
    return formatInfos;
  }
  
  // Function to convert format info to TextRuns
  function createTextRunsFromFormatInfo(formatInfos: TextFormatInfo[], fontSize: number = 24): TextRun[] {
    return formatInfos.map(info => new TextRun({
      text: info.text,
      font: "Times New Roman",
      size: fontSize,
      bold: info.bold,
      italics: info.italic
    }));
  }

  

  // Helper: Format party role label
function getRoleLabel(party: any, plaintiffs: any[], defendants: any[],index: number): (TextRun | Math_2)[] {

    //console.log("party and index",party,index);
    if (party.role === "plaintiff") {
        if (plaintiffs.length === 1) {
            return [new TextRun({ text: "Plaintiff", size: 22, font: "Times New Roman" })];
        } else {
            return [
                new Math_2({
                    children: [
                        new MathSuperScript({
                            children: [new MathRun(`${index + 1}`)],
                            superScript: [new MathRun(getOrdinalSuffix(index + 1))],
                        }),
                    ],
                }),
                new TextRun({
                    text: " Plaintiff",
                    size: 22,
                    font: "Times New Roman",
                }),
            ];
        }
    } else { // Defendant
        if (defendants.length === 1) {
            return [new TextRun({ text: "Defendant", size: 22, font: "Times New Roman" })];
        } else {
            return [
                new Math_2({
                    children: [
                        new MathSuperScript({
                            children: [new MathRun(`${index + 1}`)],
                            superScript: [new MathRun(getOrdinalSuffix(index + 1))],
                        }),
                    ],  
                }),
                new TextRun({
                    text: " Defendant",
                    size: 22,
                    font: "Times New Roman",
                }),
            ];
        }
    }
}
  
  // Legacy function removed - replaced with specific paragraph creation functions
  
  // Function to generate the Statement of Damages document
  function generateStatementOfDamages(data: LegalDocumentData, caseData: Case) {
    //console.log("summery content",data.content);
    //console.log("caseData",caseData);
    
    
    // Parse the markdown content from background_summary if available
    const bodyParagraphs = data.content 
      ? parseMarkdownToFormattedParagraphs(extractSOCContent(data.content), 360) // Default 1.5 line spacing
      : [];
  
      const plaintiffs = caseData.parties
        .filter(p => p.role === "plaintiff");

    const defendants = caseData.parties
        .filter(p => p.role === "defendant");
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt = 24 half-points
            },
            paragraph: {
              spacing: {
                line: 276, // Equivalent to 1.15 times the font size
              },
            },
          },
        },
      },
      numbering: {
        config: [
          {
            reference: "legal-numbering",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: 340, hanging: 340 }
                  }
                }
              }
            ]
          }
        ]
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1.25 * 1440, // 1.25 inches in twips (1440 twips = 1 inch)
              right: 1.25 * 1440,
              bottom: 1.25 * 1440,
              left: 1.25 * 1440
            }
          }
        },
        children: [
  
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: {
              line: 500, // 25pt = 500 twips (20 twips = 1pt)
              lineRule: "exact" // Exactly 25pt
            },
            children: [
              new TextRun({
                text: "DCCJ",
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: "        " ,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Court information (centered)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: "IN THE " + data.court + " OF THE",
                
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
                text: "PERSONAL INJURY ACTION NO.",
                
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: "              OF " + "",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // BETWEEN section
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BETWEEN",
                
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Parties table
          new Table({
            alignment: AlignmentType.LEFT,
            width: { size: 90, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE, size: 0 },
                bottom: { style: BorderStyle.NONE, size: 0 },
                left: { style: BorderStyle.NONE, size: 0 },
                right: { style: BorderStyle.NONE, size: 0 },
                insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                insideVertical: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
                ...plaintiffs.map((plaintiff,index) =>
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 60, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.LEFT,
                                        spacing: { after: 180 },
                                        children: [
                                            new TextRun({
                                                text: plaintiff.name.toUpperCase(),
                                                size: 22,
                                                font: "Times New Roman",
                                            }),
                                            ...(plaintiff.chineseName
                                                ? [
                                                    new TextRun({
                                                        text: ` (${plaintiff.chineseName})`,
                                                        size: 22,
                                                        font: "Noto Sans SC",
                                                    })
                                                ]
                                                : []
                                            )
                                        ],
                                    }),
                                ],
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                            }),
                            new TableCell({
                                width: { size: 40, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { after: 180 },
                                        children: getRoleLabel(plaintiff, plaintiffs, defendants,index),
                                    }),
                                ],
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                            }),
                        ],
                    })
                ),

                // "and" row
                new TableRow({
                    children: [
                        new TableCell({
                            columnSpan: 2,
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 180 },
                                    children: [
                                        new TextRun({
                                            text: "and",
                                            size: 22,
                                            font: "Times New Roman",
                                        }),
                                    ],
                                }),
                            ],
                            borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                        }),
                    ],
                }),

                // Defendants
                ...defendants.map((defendant,index) =>
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.LEFT,
                                        spacing: { after: 180 },
                                        children: [
                                            new TextRun({
                                                text: `${defendant.name.toUpperCase()} ${defendant.chineseName === null ? ' ' : `(${defendant.chineseName})`}`,
                                                size: 22,
                                                font: "Times New Roman",
                                            }),
                                        ],
                                    }),
                                ],
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                            }),
                            new TableCell({
                                width: { size: 35, type: WidthType.PERCENTAGE },
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        spacing: { after: 180 },
                                        children: getRoleLabel(defendant, plaintiffs, defendants,index),
                                    }),
                                ],
                                borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
                            }),
                        ],
                    })
                ),
            ],
        }),



          // Empty line
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          // Dividing line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "_____________________________",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // STATEMENT OF DAMAGES
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "STATEMENT OF DAMAGES",
                bold: true,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Dividing line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "_____________________________",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Writ issue date
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              line: 400, // 20pt = 400 twips (20 twips = 1pt)
              lineRule: "exact" // Exactly 20pt
            },
            children: [
              new TextRun("(Writ issued on the"),
              new TextRun({
                text: " " + "       " + " day of " + "         " + " " + "     )",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
  
          // Empty line
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
  
          // Start of Body Content - Use parsed markdown paragraphs
          ...bodyParagraphs,
          
          // End of Body Content

          // statement of truth section start here

          // first add  page break
          new Paragraph({
            pageBreakBefore: true,
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Statement of Truth Section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "STATEMENT OF TRUTH",
                font: "Times New Roman",
                size: 32,
                bold: true,
                color: "000000"
              })
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Plaintiff's Declaration - English
          new Paragraph({
            children: [
              new TextRun({
                text: "I believe that the facts stated in this Statement of Damages are true.",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Plaintiff's Declaration - Chinese
          new Paragraph({
            children: [
              new TextRun({
                text: "本人相信本損害陳述書所述事實屬實。",
                font: "Noto Sans SC",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Date line
          new Paragraph({
            children: [
              new TextRun({
                text: "Dated the      day of ",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              }),
              new TextRun({
                text: "    ",
                font: "Times New Roman",
                size: 24,
                color: "000000",
                underline: {
                  type: UnderlineType.SINGLE
                }
              })
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Signature line
          new Paragraph({
            children: [
              new TextRun({
                text: "________________________",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Plaintiff name
          new Paragraph({
            children: [
              new TextRun({
                text: `${data.plaintiffName?.toUpperCase()} ${data.caseData.parties[0].chineseName!==null ? `(${data.caseData.parties[0].chineseName})` : ' '}`,
                font: "Times New Roman",
                size: 24,
                bold: true,
                color: "000000"
              })
            ]
          }),

          // Plaintiff role
          new Paragraph({
            children: [
              new TextRun({
                text: "The Plaintiff",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Plaintiff role in Chinese
          new Paragraph({
            children: [
              new TextRun({
                text: "原告人",
                font: "Noto Sans SC",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Solicitor's Certification
          new Paragraph({
            children: [
              new TextRun({
                text: "I certify that I, [SOLICITOR_NAME] of Messrs. [SOLICITOR_FIRM] of [SOLICITOR_ADDRESS], have read over the contents of this document and the statement of truth to the person signing the statement of truth who appeared to understand (a) the document and approved its content as accurate and (b) the statement of truth and the consequences of making a false statement, and made her signature in my presence.",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Solicitor's date line
          new Paragraph({
            children: [
              new TextRun({
                text: "Dated        the day of  ",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              }),
            
            ]
          }),

          // Spacing
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),

          // Solicitor's signature line
          new Paragraph({
            children: [
              new TextRun({
                text: "________________________",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Solicitor's name
          new Paragraph({
            children: [
              new TextRun({
                text: "[SOLICITOR_NAME]",
                font: "Times New Roman",
                size: 24,
                bold: true,
                color: "000000"
              })
            ]
          }),

          // Solicitor's role
          new Paragraph({
            children: [
              new TextRun({
                text: "Solicitor",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),

          // Solicitor's firm
          new Paragraph({
            children: [
              new TextRun({
                text: "[SOLICITOR_FIRM]",
                font: "Times New Roman",
                size: 24,
                color: "000000"
              })
            ]
          }),
          
          //Page Break
          new Paragraph({
            pageBreakBefore: true,
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),
          
          // Date section
          new Paragraph({
            spacing: { before: 400, after: 400 },
            children: [
              new TextRun({
                text: "Dated the " + "     " + " day of " + "         " + " " + "     " + ".",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          // Solicitor information
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1200 },
            children: [
              new TextRun({
                text: "[Law Firm Name]",
                
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Solicitors for the Plaintiff",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
  
  
          new Paragraph({
            pageBreakBefore: true,
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
  
                  // Header section with case number
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: {
                      line: 500, // 25pt = 500 twips (20 twips = 1pt)
                      lineRule: "exact" // Exactly 25pt
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
                  
                  // Court information (centered)
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    indent: { left: 2880 }, // 1.33 inches
                    spacing: { before: 400, after: 200 },
                    children: [
                      new TextRun({
                        text: "IN THE " + data.court + " OF THE",
                        
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    indent: { left: 2000 }, // 1.33 inches
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
                    indent: { left: 2800 }, // 2 inches
                    spacing: { after: 400 },
                    children: [
                      new TextRun({
                        text: "PERSONAL INJURY ACTION NO.",
                        
                        font: "Times New Roman",
                        size: 24
                      }),
                      new TextRun({
                        text: "             OF ",
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  
                  
                  // Parties table
                  new Table({
                    width: {
                      size: 100,
                      type: WidthType.PERCENTAGE,
                    },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      insideHorizontal: { style: BorderStyle.NONE },
                      insideVertical: { style: BorderStyle.NONE },
                    },
                    rows: createPartyTableRows(plaintiffs, defendants)
                  }),
                  // Empty line
                  new Paragraph({
                    indent: { left: 2880 }, // 2 inches
                    children: [
                      new TextRun({
                        text: "",
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  // Dividing line
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    indent: { left: 2160 }, // 2 inches
                    children: [
                      new TextRun({
                        text: "*********************************************",
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  new Paragraph({
                    indent: { left: 2160 }, // 2 inches
                    children: [
                      new TextRun({
                        text: "",
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  
                  // STATEMENT OF DAMAGES
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    indent: { left: 2160 }, // 2 inches
                    children: [
                      new TextRun({
                        text: "STATEMENT OF DAMAGES",
                        bold: true,
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
                  
                  // Dividing line
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    indent: { left: 2160 }, // 2 inches
                    children: [
                      new TextRun({
                        text: "*********************************************",
                        font: "Times New Roman",
                        size: 24
                      })
                    ]
                  }),
  
          // Solicitor information
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 2160 }, // 2 inches
            spacing: { before: 1200 },
            children: [
              new TextRun({
                text: "[Law Firm Name]",
                
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 2160 }, // 2 inches
            children: [
              new TextRun({
                text: "Solicitors for the Plaintiff",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
  
          //Empty line
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                font: "Times New Roman",
                size: 24,
              })
            ]
          }),
          
          
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 2160 }, // 2 inches
            children: [
              new TextRun({
                text: "[Law Firm Address]",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 2160 }, // 2 inches
            children: [
              new TextRun({
                text: "Tel: " + "[Law Firm Tel]" + " Fax: " + "[Law Firm Fax]",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: 2160 }, // 2 inches
            children: [
              new TextRun({
                text: data.caseCode,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
  
  
          // Add formatting examples (optional - can be controlled by a flag)
          ...(data.includeFormattingExamples ? createAdvancedFormattingExamples(data) : []),
          
          // Add formatted table example
          ...(data.includeFormattingExamples ? [
            new Paragraph({
              pageBreakBefore: true,
              children: [new TextRun({ text: "" })]
            }),
            createCustomFormattedParagraph("FORMATTED TABLE EXAMPLE", {
              fontSize: 28,
              lineSpacing: 360,
              spaceBefore: 800,
              spaceAfter: 600,
              alignment: AlignmentType.CENTER,
              bold: true
            }),
            createFormattedTable(data)
                   ] : []),
  
          // Add document modification examples
          ...(data.includeFormattingExamples ? createDocumentModificationExample(data) : []),
  
  
        ]
      }]
    });
    
    return doc;
  }

  // Function to extract Statement of Damages content between markers
function extractSOCContent(text: string): string {
    const socMarker = '# Statement of Damages\n';
    //const datedMarker = '\nDated';
  
    const startIndex = text.indexOf(socMarker);
    if (startIndex === -1) return ''; // BEGIN marker not found
  
    const afterSOC = text.substring(startIndex + socMarker.length);
    //const endIndex = afterSOC.indexOf(datedMarker);
    const endIndex = -1;
  
    if (endIndex === -1) return afterSOC.trim(); // END marker not found
  
    return afterSOC.substring(0, endIndex).trim(); // final cleaned result
  }

  



// function createLegalDocumentData(options: SummaryExportOptions): LegalDocumentData {
//     const result: LegalDocumentData= {
//         caseData: options.caseData,
//         year: options.caseData.year,
//         writDay: options.caseData.writDay,
//         writMonth: options.caseData.writMonth,
//         filingDay: options.caseData.filingDay,
//         filingMonth: options.caseData.filingMonth,
//         plaintiffs: options.caseData.parties.filter(p => p.role === "plaintiff"),
//         defendants: options.caseData.parties.filter(p => p.role === "defendant"),
//         propertyNumber: options.caseData.propertyNumber,
//         propertyName: options.caseData.propertyName,
//         propertyStreetNumber: options.caseData.propertyStreetNumber,
//         propertyStreet: options.caseData.propertyStreet,
//         propertyDistrict: options.caseData.propertyDistrict,
//         propertyRegion: options.caseData.propertyRegion,
//         solicitorFirm: options.caseData.solicitorFirm,
//         solicitorRooms: options.caseData.solicitorRooms,
//         solicitorFloor: options.caseData.solicitorFloor,
//         solicitorBuilding: options.caseData.solicitorBuilding,
//         solicitorAddress: options.caseData.solicitorAddress,
//         solicitorTel: options.caseData.solicitorTel,
//         solicitorFax: options.caseData.solicitorFax,
//         solicitorRef: options.caseData.solicitorRef,
//         caseCode: options.caseData.caseCode,
//         includeFormattingExamples: options.includeFormattingExamples,
//         content: options.content,
//         title: options.title,
//         filename: options.filename,
//         caseId: options.caseId
//     }
//     return result;
// }





export async function downloadStatementOfDamagesAsWord(options: LegalDocumentData): Promise<void> {
    //const data = createLegalDocumentData(options);
  try {
    const blob = await generateStatementOfDamages(options,options.caseData);

    
    // Create download link
    const url = URL.createObjectURL(await Packer.toBlob(blob));
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
    console.error('Error exporting Statement of Damages to Word:', error);
    throw new Error('Failed to export Statement of Damages document to Word format');
  }
}
