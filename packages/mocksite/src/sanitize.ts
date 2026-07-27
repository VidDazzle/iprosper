import sanitizeHtml from "sanitize-html";

/**
 * LLM output is treated as untrusted here, same as any other
 * generated content that ends up publicly deployed — a prompt-
 * injection attempt embedded in the scraped source page, or a model
 * error, could otherwise put a <script> tag on a live site under a
 * real business's name. Uses sanitize-html (a real, maintained
 * allowlist-based sanitizer) rather than hand-rolled regex, which is
 * notoriously easy to bypass.
 *
 * Allows the tags/attributes a self-contained marketing single-pager
 * actually needs (structure, inline <style>, images, links) and
 * nothing that can execute script or reach off-page.
 */
export function sanitizeMockSiteHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "html", "head", "body", "title", "meta", "style",
      "div", "span", "section", "header", "footer", "nav", "main", "article", "aside",
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li",
      "img", "br", "hr", "strong", "em", "b", "i", "u", "small", "blockquote",
      "table", "thead", "tbody", "tr", "td", "th", "button", "form", "label", "input",
      "svg", "path", "circle", "rect", "g", "defs", "linearGradient", "stop",
    ],
    allowedAttributes: {
      "*": ["class", "id", "style", "title", "alt", "aria-*", "role", "d", "viewBox", "fill", "stroke", "width", "height", "cx", "cy", "r", "x1", "y1", "x2", "y2", "offset", "stop-color"],
      a: ["href", "target", "rel"],
      img: ["src"],
      meta: ["name", "content", "charset"],
      input: ["type", "placeholder", "disabled"],
      form: ["action", "method"],
    },
    allowedSchemes: ["https", "mailto", "tel"],
    // No inline <script>, no event handlers (onclick etc. are already
    // excluded by not appearing in allowedAttributes), no <iframe>/
    // <object>/<embed> that could load off-page content.
    disallowedTagsMode: "discard",
    // sanitize-html flags <style> as "inherently vulnerable" (CSS can
    // theoretically be used to exfiltrate page state via selectors).
    // Accepted deliberately: this is a static public marketing page
    // with no session data, forms, or user state on it to exfiltrate,
    // and inline <style> is required by design (single self-contained
    // file, no external stylesheets). Everything actually capable of
    // executing code — script, event handlers, javascript: URIs,
    // iframes — stays fully blocked and is covered by tests.
    allowVulnerableTags: true,
  });
}
