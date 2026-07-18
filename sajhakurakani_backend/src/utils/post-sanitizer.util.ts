const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

const SCRIPT_BLOCK_REGEX =
  /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"'`]/g, (character) => HTML_ESCAPE_MAP[character]);

export const sanitizePostText = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const sanitized = value
    // input validation & sanitization
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(SCRIPT_BLOCK_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .trim();

  if (!sanitized) {
    return undefined;
  }

  return escapeHtml(sanitized);
};
