import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkMdx from "remark-mdx"
import remarkGfm from "remark-gfm"
import remarkFrontmatter from "remark-frontmatter"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"



/**
 * Verify if a Markdown/MDX string is syntactically valid.
 * Handles standard Markdown, HTML tags, and JSX components.
 */
export function verifyMarkdown(mdx: string): boolean {
    try {
      unified()
        // Parse regular markdown
        .use(remarkParse)
        // Support GitHub-flavored markdown (tables, strikethrough, etc.)
        .use(remarkGfm)
        // Allow YAML or TOML frontmatter if present
        .use(remarkFrontmatter, ['yaml', 'toml'])
        // Enable MDX / JSX parsing (for <Custom /> components)
        .use(remarkMdx)
        // Enable KaTeX for math rendering
        .use(remarkMath)
        .use(rehypeKatex)
        // Parse the markdown into AST
        .parse(mdx)
        
      return true // ✅ Parsed successfully
    } catch (err: any){
      console.error("❌ Invalid Markdown/MDX syntax:", err.message)
      return false
    }
  }


export default verifyMarkdown;