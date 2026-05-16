import { parseCitationsWithMaps } from './citationParser';

/**
 * Replaces fullTag citations with content wrapped in curly brackets for editing
 * @param text - Text containing Citation fullTags
 * @returns Text with fullTags replaced by {content}
 */
export const replaceFullTagWithContent = (text: string): string => {
  const citationMaps = parseCitationsWithMaps(text);
  let result = text;
  
  // Replace each fullTag with its content wrapped in curly brackets
  citationMaps.fullTagToContent.forEach((content, fullTag) => {
    result = result.replace(fullTag, content);
  });
  
  return result;
};

/**
 * Replaces content wrapped in curly brackets with fullTag citations after editing
 * @param text - Text containing {content} wrapped citations
 * @param originalText - Original text with fullTags for reference
 * @returns Text with {content} replaced by fullTags
 */
export const replaceContentWithFullTag = (text: string, originalText: string): string => {
  const citationMaps = parseCitationsWithMaps(originalText);
  let result = text;
  
  // Replace each content (with curly brackets) with its corresponding fullTag
  citationMaps.contentToFullTag.forEach((fullTags, content) => {
    // Use the first fullTag if there are multiple (most common case)
    const fullTag = fullTags[0];
    // Remove curly brackets and replace with fullTag
    result = result.replace(content, fullTag);
  });
  
  return result;
};
