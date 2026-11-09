const SUBJECT = "Contrast Grid – Feedback";

// RFC 6068 wants percent-encoding and CRLF; URLSearchParams would write spaces as "+".
export function feedbackHref(address, pageUrl) {
  const body = `\r\n\r\n\r\nPage: ${pageUrl}`;
  return `mailto:${address}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
}

// Kept current rather than set on click, as a middle click or the context menu fires no click.
export function keepFeedbackLinkCurrent(link, form) {
  const update = () => {
    form.syncUrl();
    link.href = feedbackHref(link.dataset.address, location.href);
  };

  update();
  for (const type of ["pointerenter", "focus", "click"]) {
    link.addEventListener(type, update);
  }
}
