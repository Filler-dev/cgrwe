const SUBJECT = "Contrast Grid – Feedback";

// RFC 6068 wants percent-encoding and CRLF; URLSearchParams would write spaces as "+".
export function feedbackHref(address, pageUrl) {
  const body = `\r\n\r\n\r\nPage: ${pageUrl}`;
  return `mailto:${address}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
}
