/**
 * AI-designed business card generator. When an attorney doesn't upload their
 * own card, Beacon generates a branded SVG card from their profile. Returned as
 * an SVG string; the API wraps it into a data URL for storage/preview.
 */

export interface CardInput {
  firmName: string;
  attorneyName: string;
  email: string;
  phone?: string;
  website?: string;
  stateCode?: string;
  practiceAreas?: string[];
  photoDataUrl?: string; // optional headshot/logo
}

function esc(s: string): string {
  return (s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

/** Standard 3.5in x 2in card at 300dpi → 1050 x 600 px. */
export function generateBusinessCardSvg(input: CardInput): string {
  const W = 1050, H = 600;
  const area = (input.practiceAreas ?? []).slice(0, 3).join("  ·  ");
  const photo = input.photoDataUrl
    ? `<clipPath id="pc"><circle cx="835" cy="180" r="92"/></clipPath>
       <image href="${input.photoDataUrl}" x="743" y="88" width="184" height="184" clip-path="url(#pc)" preserveAspectRatio="xMidYMid slice"/>
       <circle cx="835" cy="180" r="92" fill="none" stroke="#22d3ee" stroke-width="3"/>`
    : `<circle cx="835" cy="180" r="92" fill="#0b1220" stroke="#22d3ee" stroke-width="3"/>
       <text x="835" y="205" font-family="Arial, sans-serif" font-size="64" font-weight="800" fill="#e2e8f0" text-anchor="middle">${esc(
         input.attorneyName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
       )}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050810"/><stop offset="1" stop-color="#0b1220"/></linearGradient>
    <linearGradient id="ac" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="28" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="url(#ac)"/>
  ${photo}
  <text x="70" y="150" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="#ffffff">${esc(input.firmName)}</text>
  <text x="70" y="205" font-family="Arial, sans-serif" font-size="34" fill="#22d3ee">${esc(input.attorneyName)}${input.stateCode ? `, Esq. · ${esc(input.stateCode)}` : ", Esq."}</text>
  <rect x="70" y="235" width="620" height="2" fill="#1e293b"/>
  <text x="70" y="290" font-family="Arial, sans-serif" font-size="26" fill="#94a3b8">${esc(area || "Debt & Bankruptcy Attorney")}</text>
  <g font-family="Arial, sans-serif" font-size="28" fill="#e2e8f0">
    ${input.phone ? `<text x="70" y="410">📞  ${esc(input.phone)}</text>` : ""}
    <text x="70" y="460">✉️  ${esc(input.email)}</text>
    ${input.website ? `<text x="70" y="510">🌐  ${esc(input.website)}</text>` : ""}
  </g>
  <text x="${W - 40}" y="${H - 34}" font-family="Arial, sans-serif" font-size="20" fill="#475569" text-anchor="end">Featured on X Debt · advertisement</text>
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  // Base64 keeps it valid inside <img src> and DB text fields.
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(svg))) : Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
