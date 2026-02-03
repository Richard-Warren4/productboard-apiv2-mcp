/**
 * Richtext Validation Utilities
 *
 * ProductBoard Entity APIs return 400 errors for unsupported HTML tags.
 * This module validates richtext content before submission.
 *
 * Supported tags (per official docs https://developer.productboard.com/v2.0.0/reference/richtext):
 * h1, h2, p, b, i, u, code, ul, ol, li, a, hr, pre, blockquote, s
 *
 * Additionally supported (common HTML): br, img
 *
 * Rejected tags include: strong (use b), em (use i), div, span, h3-h6
 *
 * @module utils/richtext
 */

/**
 * Set of allowed HTML tags in ProductBoard richtext fields
 * (per official API documentation 2026-02-02)
 */
const ALLOWED_TAGS = new Set([
  // Headers (official docs show h1, h2)
  'h1',
  'h2',
  // Text formatting
  'p',          // Paragraphs
  'b',          // Bold (NOT <strong>)
  'i',          // Italic (NOT <em>)
  's',          // Strikethrough
  'u',          // Underline
  'code',       // Inline code
  'pre',        // Code block
  'blockquote', // Block quote
  // Lists
  'ul',         // Unordered list
  'ol',         // Ordered list
  'li',         // List item
  // Other
  'a',          // Links
  'hr',         // Horizontal line
  'br',         // Line break (common HTML)
  'img',        // Images (common HTML)
]);

/**
 * Tags that have direct replacements
 */
const TAG_SUGGESTIONS: Record<string, string> = {
  'strong': 'b',
  'em': 'i',
  'h3': 'h2',   // h3-h6 not supported, suggest h2
  'h4': 'h2',
  'h5': 'h2',
  'h6': 'h2',
  'div': 'p',
  'span': '',   // Just remove span, keep content
};

/**
 * Regex to match HTML tags (opening, closing, and self-closing)
 */
const TAG_REGEX = /<\/?([a-zA-Z][a-zA-Z0-9]*)\s*[^>]*\/?>/g;

/**
 * Result of richtext validation
 */
export interface RichtextValidationResult {
  valid: boolean;
  invalidTags: string[];
  suggestions?: Record<string, string>;
  message?: string;
}

/**
 * Validate richtext content for ProductBoard Entity APIs
 *
 * @param html - HTML string to validate
 * @returns Validation result with invalid tags and suggestions if any
 */
export function validateRichtext(html: string): RichtextValidationResult {
  if (!html || html.trim() === '') {
    return { valid: true, invalidTags: [] };
  }

  const invalidTags: string[] = [];
  const suggestions: Record<string, string> = {};
  let match;

  // Reset regex state
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      if (!invalidTags.includes(tagName)) {
        invalidTags.push(tagName);
        // Check if there's a suggested replacement
        if (TAG_SUGGESTIONS[tagName]) {
          suggestions[tagName] = TAG_SUGGESTIONS[tagName];
        }
      }
    }
  }

  if (invalidTags.length > 0) {
    // Build helpful message with suggestions
    const suggestionParts: string[] = [];
    for (const [tag, replacement] of Object.entries(suggestions)) {
      if (replacement) {
        suggestionParts.push(`<${tag}> → <${replacement}>`);
      } else {
        suggestionParts.push(`<${tag}> → remove`);
      }
    }

    const suggestionText = suggestionParts.length > 0
      ? ` Suggestions: ${suggestionParts.join(', ')}.`
      : '';

    return {
      valid: false,
      invalidTags,
      suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined,
      message: `Unsupported HTML tags: ${invalidTags.join(', ')}.${suggestionText} ` +
        `Allowed tags: ${Array.from(ALLOWED_TAGS).join(', ')}`,
    };
  }

  return { valid: true, invalidTags: [] };
}

/**
 * Strip unsupported HTML tags from richtext
 *
 * This is a fallback for when validation fails and you want to
 * attempt to clean the content. Use with caution as it may
 * alter the intended formatting.
 *
 * @param html - HTML string to clean
 * @returns Cleaned HTML with only allowed tags
 */
export function stripInvalidTags(html: string): string {
  if (!html) {
    return '';
  }

  // Replace invalid tags with their content (strip tags, keep content)
  return html.replace(TAG_REGEX, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (ALLOWED_TAGS.has(tag)) {
      return match; // Keep allowed tags
    }
    return ''; // Remove invalid tags
  });
}

/**
 * Convert unsupported HTML tags to supported equivalents where possible.
 *
 * Conversions:
 * - <strong> → <b>
 * - <em> → <i>
 * - <div> → <p>
 * - <span> → removed (content preserved)
 *
 * @param html - HTML string to convert
 * @returns HTML with converted tags
 */
export function convertTags(html: string): string {
  if (!html) {
    return '';
  }

  let result = html;

  // Convert <strong> to <b>
  result = result.replace(/<strong(\s[^>]*)?>|<\/strong>/gi, (match) => {
    return match.toLowerCase().includes('</') ? '</b>' : '<b>';
  });

  // Convert <em> to <i>
  result = result.replace(/<em(\s[^>]*)?>|<\/em>/gi, (match) => {
    return match.toLowerCase().includes('</') ? '</i>' : '<i>';
  });

  // Convert <div> to <p>
  result = result.replace(/<div(\s[^>]*)?>|<\/div>/gi, (match) => {
    return match.toLowerCase().includes('</') ? '</p>' : '<p>';
  });

  // Remove <span> tags (keep content)
  result = result.replace(/<\/?span(\s[^>]*)?>/gi, '');

  return result;
}

/**
 * Check if a string contains any HTML
 */
export function containsHtml(text: string): boolean {
  return /<[^>]+>/.test(text);
}

/**
 * Convert plain text to simple HTML paragraph
 */
export function textToHtml(text: string): string {
  if (!text) {
    return '';
  }

  // If already contains HTML, validate it
  if (containsHtml(text)) {
    return text;
  }

  // Convert newlines to paragraphs
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtml(p.replace(/\n/g, '<br/>'))}</p>`);

  return paragraphs.join('');
}

/**
 * Escape HTML special characters in plain text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get list of allowed HTML tags
 */
export function getAllowedTags(): string[] {
  return Array.from(ALLOWED_TAGS);
}
