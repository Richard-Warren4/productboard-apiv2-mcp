/**
 * Richtext Validation Utilities
 *
 * ProductBoard Entity APIs return 400 errors for unsupported HTML tags.
 * This module validates richtext content before submission.
 *
 * Supported tags (verified via live testing 2025-12-15):
 * b, i, s, u, br, a, code, img, p
 *
 * Rejected tags include: strong (use b), em (use i), div, span, h1-h6
 *
 * @module utils/richtext
 */

/**
 * Set of allowed HTML tags in ProductBoard richtext fields
 * (verified via live testing against ProductBoard API)
 */
const ALLOWED_TAGS = new Set([
  'b',    // Bold (NOT <strong>)
  'i',    // Italic (NOT <em>)
  's',    // Strikethrough
  'u',    // Underline
  'br',   // Line break
  'a',    // Links
  'code', // Inline code
  'img',  // Images
  'p',    // Paragraphs
]);

/**
 * Tags that have direct replacements
 */
const TAG_SUGGESTIONS: Record<string, string> = {
  'strong': 'b',
  'em': 'i',
  'div': 'p',
  'span': '',  // Just remove span, keep content
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
