/**
 * Richtext Validation Utilities
 *
 * ProductBoard Entity APIs return 400 errors for unsupported HTML tags.
 * This module validates richtext content before submission.
 *
 * Supported tags: h1, h2, p, hr, pre, blockquote, b, i, u, s, code, ul, ol, li, a
 *
 * @module utils/richtext
 */

/**
 * Set of allowed HTML tags in ProductBoard richtext fields
 */
const ALLOWED_TAGS = new Set([
  'h1',
  'h2',
  'p',
  'hr',
  'pre',
  'blockquote',
  'b',
  'i',
  'u',
  's',
  'code',
  'ul',
  'ol',
  'li',
  'a',
]);

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
  message?: string;
}

/**
 * Validate richtext content for ProductBoard Entity APIs
 *
 * @param html - HTML string to validate
 * @returns Validation result with invalid tags if any
 */
export function validateRichtext(html: string): RichtextValidationResult {
  if (!html || html.trim() === '') {
    return { valid: true, invalidTags: [] };
  }

  const invalidTags: string[] = [];
  let match;

  // Reset regex state
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      if (!invalidTags.includes(tagName)) {
        invalidTags.push(tagName);
      }
    }
  }

  if (invalidTags.length > 0) {
    return {
      valid: false,
      invalidTags,
      message: `Unsupported HTML tags: ${invalidTags.join(', ')}. ` +
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
