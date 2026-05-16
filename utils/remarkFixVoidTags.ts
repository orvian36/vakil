// remarkFixBr.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import { remark } from 'remark';
import htmlTags from 'html-tags';



/**
 * Remark plugin to auto-close void HTML tags for MDX/JSX compatibility.
 * Handles: area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr
 */
export const remarkFixVoidTags: Plugin<[], Root> = () => {
  const voidTags = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'source', 'track', 'wbr'
  ].join('|');

  return (tree) => {
    visit(tree, 'html', (node: any) => {
      if (typeof node.value === 'string') {
        // Convert void tags to self-closing if not already
        const regex = new RegExp(`<(${voidTags})(\\s*[^/>]*?)>`, 'gi');
        node.value = node.value.replace(regex, '<$1$2 />');
      }
    });
  };
};

export function escapeNonTagText(rawMd: string): string {
  return rawMd.replace(/<([^>]+)>/g, (match, content) => {
    // Check if the content is a known tag; if not, escape it
    const knownTags = ['Hoverable', 'Citation', '/Hoverable', '/Citation', ...htmlTags];
    content = content.split(' ')[0];
    content = content.replace('/', '');
    //console.log(content);
    return knownTags.includes(content) ? match : `&lt;${content}&gt;`;
  });
}

export function extractFullTagsWithIndex(input: string, tagName: string): {
  fullTag: string;
  openingTag: string;
  closingTag: string;
  content: string;
  openingIndex: number;
  closingIndex: number;
  fullIndex: number;
}[] {
  const results: {
    fullTag: string;
    openingTag: string;
    closingTag: string;
    content: string;
    openingIndex: number;
    closingIndex: number;
    fullIndex: number;
  }[] = [];
  
  // Regex to match opening tag
  const openingRegex = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  let match;
  
  while ((match = openingRegex.exec(input)) !== null) {
    const openingTag = match[0];
    const openingIndex = match.index;
    
    // Find the corresponding closing tag
    const closingTagPattern = `</${tagName}>`;
    const closingIndex = input.indexOf(closingTagPattern, openingIndex + openingTag.length);
    
    if (closingIndex !== -1) {
      const closingTag = closingTagPattern;
      const content = input.substring(openingIndex + openingTag.length, closingIndex);
      const fullTag = input.substring(openingIndex, closingIndex + closingTag.length);
      
      results.push({
        fullTag,
        openingTag,
        closingTag,
        content,
        openingIndex,
        closingIndex,
        fullIndex: openingIndex
      });
    }
  }
  
  return results;
}

function findPipeInTag(tag: string): number[] {
  const pipes: number[] = [];
  for (let i = 0; i < tag.length; i++) {
    if (tag[i] === '|') {
      pipes.push(i);
    }
  }
  return pipes;
}
export function escapePipesAtIndices(input: string, indices: number[]): string {
  let result = input;
  
  // Sort indices in descending order to avoid index shifting
  const sortedIndices = [...indices].sort((a, b) => b - a);
  
  for (let index of sortedIndices) {
    if (index >= 0 && index < result.length) {
      result = result.slice(0, index) + '\\' + result.slice(index);
    }
  }
  
  return result;
}

export function escapePipe(input: string): string {
  let tags = extractFullTagsWithIndex(input, "Citation");
  //console.log(tags);
  let indices: number[] = [];
  for(const tag of tags) {
    const pipes = findPipeInTag(tag.fullTag);
    if(pipes.length === 0) continue;
    // Add each pipe index to the global indices array
    for(const pipe of pipes) {
      indices.push(tag.openingIndex + pipe);
    }
  }
  console.log(indices);
  let result = escapePipesAtIndices(input, indices);
  return result
}

export async function preProcessMD(input: string): Promise<string> {
  const file = await remark().use(remarkFixVoidTags).process(input);
  const processedMd = escapeNonTagText(String(file));
  const escapedPipe = escapePipe(processedMd);
  return escapedPipe;
}






const rawMd = `
  <br>
  <img src="https://via.placeholder.com/150" alt="Test Image" />
  <hr>
  <input type="text" />
  <MicroBiology/>
  <Hoverable>
    <span>Hoverable</span>
  </Hoverable>
  <Citation reference = "abc@gmail.com">
    <span>Citation</span>
  </Citation>
  <Citation reference = "abc1@gmail"com" id="citation1">
    <span>Citation</span>
  </Citation>
  `;
const test = async () => {
  let tmp = await remark().use(remarkFixVoidTags).process(rawMd);
  const processedMd = escapeNonTagText(String(tmp));
  console.log(processedMd);
}
//test();

