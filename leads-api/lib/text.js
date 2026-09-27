// Text normalisation helpers shared by validation and formatting.

// C0/C1 control characters and Unicode bidi overrides (used for display spoofing).
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;
const CONTROL_EXCEPT_TAB_NEWLINE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const BIDI = /[‪-‮⁦-⁩]/g;

/** One line of text: control chars become spaces, whitespace runs collapse, trimmed. */
export function singleLine(value) {
  return value.replace(BIDI, '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
}

/** Free text: keeps newlines (max one blank line in a row), drops other control chars. */
export function multiLine(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(BIDI, '')
    .replace(CONTROL_EXCEPT_TAB_NEWLINE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Cuts to at most maxLength UTF-16 units without splitting a surrogate pair. */
export function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  let cut = value.slice(0, Math.max(0, maxLength));
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut;
}

/** Escapes text for Telegram's HTML parse mode (and HTML attributes). */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
