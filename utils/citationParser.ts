export interface ParsedCitation {
  reference: string;
  content: string;
  fullTag: string;
  startIndex: number;
  endIndex: number;
}

export interface CitationMaps {
  fullTagToContent: Map<string, string>;
  contentToFullTag: Map<string, string[]>;
  citations: ParsedCitation[];
}

/**
 * Cleans citation content by removing escape characters and normalizing the text
 */
export function cleanCitationContent(content: string): string {
  // Remove leading backslashes (common escape issue)
  let cleaned = content.replace(/^\\+/, '');
  
  // Remove other common escape characters
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\t/g, '\t');
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\\\/g, '\\');
  
  return cleaned.trim();
}

export function parseCitations(text: string, cleanContent: boolean = true): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  
  // Regular expression to match <Citation> tags with reference attribute
  const citationRegex = /<Citation\s+reference="([^"]+)"\s*>(.*?)<\/Citation>/g;
  
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const [fullTag, reference, content] = match;
    
    citations.push({
      reference: reference.trim(),
      content: cleanContent ? cleanCitationContent(content) : content.trim(),
      fullTag: fullTag,
      startIndex: match.index,
      endIndex: match.index + fullTag.length
    });
  }
  
  return citations;
}

export function parseCitationsWithMaps(text: string, cleanContent: boolean = true): CitationMaps {
  const citations = parseCitations(text, cleanContent);
  const fullTagToContent = new Map<string, string>();
  const contentToFullTag = new Map<string, string[]>();
  
  citations.forEach(citation => {
    fullTagToContent.set(citation.fullTag, citation.content);
    
    // Handle duplicate content by using arrays
    if (contentToFullTag.has(citation.content)) {
      contentToFullTag.get(citation.content)!.push(citation.fullTag);
    } else {
      contentToFullTag.set(citation.content, [citation.fullTag]);
    }
  });
  
  return {
    fullTagToContent,
    contentToFullTag,
    citations
  };
}

export function extractCitationReferences(text: string): string[] {
  const citations = parseCitations(text);
  return citations.map(citation => citation.reference);
}

export function getCitationCount(text: string): number {
  const citations = parseCitations(text);
  return citations.length;
}

export function replaceCitationsWithComponents(text: string): string {
  const citations = parseCitations(text);
  let result = text;
  
  // Process citations in reverse order to maintain correct indices
  for (let i = citations.length - 1; i >= 0; i--) {
    const citation = citations[i];
    const componentReplacement = `<Citation reference="${citation.reference}">${citation.content}</Citation>`;
    result = result.substring(0, citation.startIndex) + 
             componentReplacement + 
             result.substring(citation.endIndex);
  }
  
  return result;
}

export function getUniqueReferences(text: string): string[] {
  const citations = parseCitations(text);
  const uniqueRefs = new Set(citations.map(citation => citation.reference));
  return Array.from(uniqueRefs);
}

export function getCitationsByReference(text: string, reference: string): ParsedCitation[] {
  const citations = parseCitations(text);
  return citations.filter(citation => citation.reference === reference);
}
