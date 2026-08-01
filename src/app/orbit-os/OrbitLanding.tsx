"use client";
import { useEffect } from "react";

const CSS = `
  :root {
    --ground: #070A10;
    --surface: #0E141E;
    --surface-2: #131C29;
    --line: rgba(150, 175, 205, 0.12);
    --line-strong: rgba(150, 175, 205, 0.22);
    --ink: #EAF1F8;
    --ink-dim: #B4C2D4;
    --muted: #8494A8;

    --aqua: #38E4C9;
    --sky: #5BC8FF;
    --amber: #FFC46B;
    --orange: #FF8A3D;
    --rose: #FF6B8A;
    --violet: #8B7BFF;

    --accent: var(--aqua);
    --glow: 0 0 0 1px rgba(56,228,201,0.22), 0 24px 70px -26px rgba(91,200,255,0.40);

    --font-display: "Helvetica Neue", "Segoe UI", system-ui, -apple-system, sans-serif;
    --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    --maxw: 1160px;
    --r: 18px;
  }
  /* Dark is the default. Light is opt-in via the theme toggle (data-theme). */
  :root[data-theme="dark"]{ --ground:#070A10; --surface:#0E141E; --surface-2:#131C29; --line:rgba(150,175,205,0.12); --line-strong:rgba(150,175,205,0.22); --ink:#EAF1F8; --ink-dim:#B4C2D4; --muted:#8494A8; --aqua:#38E4C9; --sky:#5BC8FF; --amber:#FFC46B; --orange:#FF8A3D; --rose:#FF6B8A; --violet:#8B7BFF; --glow:0 0 0 1px rgba(56,228,201,0.22),0 24px 70px -26px rgba(91,200,255,0.40); }
  :root[data-theme="light"]{ --ground:#F5F8FC; --surface:#FFFFFF; --surface-2:#EEF3F9; --line:rgba(20,40,70,0.10); --line-strong:rgba(20,40,70,0.18); --ink:#0C1524; --ink-dim:#33435A; --muted:#5E7089; --aqua:#12A88F; --sky:#1E86C7; --amber:#C77D18; --orange:#E06A1F; --rose:#D84A6C; --violet:#5B49D6; --glow:0 0 0 1px rgba(30,134,199,0.18),0 24px 60px -28px rgba(30,134,199,0.30); }

  * { box-sizing: border-box; }
  .orbit-root { background: var(--ground); color: var(--ink); font-family: var(--font-display); line-height: 1.5; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .orbit-root a { color: inherit; text-decoration: none; }
  .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
  .mono { font-family: var(--font-mono); }
  .grad { background: linear-gradient(100deg, var(--aqua), var(--sky) 45%, var(--violet)); -webkit-background-clip: text; background-clip: text; color: transparent; }

  /* nav */
  .nav { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(14px); background: color-mix(in srgb, var(--ground) 78%, transparent); border-bottom: 1px solid var(--line); }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 66px; gap: 20px; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
  .brand .mark { width: 30px; height: 30px; }
  .nav-links { display: flex; gap: 26px; font-size: 14.5px; color: var(--ink-dim); }
  .nav-links a:hover { color: var(--ink); }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .theme-btn { width: 38px; height: 38px; border-radius: 11px; border: 1px solid var(--line-strong); background: var(--surface); color: var(--ink); font-size: 16px; cursor: pointer; }
  .btn { display: inline-flex; align-items: center; gap: 9px; padding: 11px 20px; border-radius: 12px; font-weight: 600; font-size: 14.5px; cursor: pointer; border: 1px solid transparent; transition: transform .15s ease, box-shadow .2s ease, background .2s ease; }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: linear-gradient(100deg, var(--aqua), var(--sky)); color: #04121a; box-shadow: var(--glow); }
  .btn-ghost { border-color: var(--line-strong); color: var(--ink); background: var(--surface); }
  @media (max-width: 780px){ .nav-links { display: none; } }

  /* hero */
  .hero { position: relative; padding: 74px 0 40px; overflow: hidden; }
  #field { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; }
  .hero-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(720px 420px at 22% 8%, color-mix(in srgb, var(--aqua) 16%, transparent), transparent 60%), radial-gradient(640px 460px at 88% 22%, color-mix(in srgb, var(--violet) 15%, transparent), transparent 62%); }
  .hero-inner { position: relative; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; }
  @media (max-width: 900px){ .hero-inner { grid-template-columns: 1fr; } }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sky); border: 1px solid var(--line-strong); padding: 6px 12px; border-radius: 999px; background: var(--surface); }
  .hero h1 { font-size: clamp(2.3rem, 5.4vw, 3.9rem); line-height: 1.03; letter-spacing: -0.03em; margin: 20px 0 0; }
  .hero .lede { color: var(--ink-dim); font-size: 1.16rem; max-width: 40ch; margin: 20px 0 26px; }
  .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
  .trust { margin-top: 22px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; color: var(--muted); font-size: 13px; }
  .chips { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
  .chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 12px; border: 1px solid var(--line-strong); background: var(--surface); font-size: 13.5px; font-weight: 500; }
  .chip svg { width: 17px; height: 17px; }

  /* hero orbital art */
  .orbit-art { position: relative; display: grid; place-items: center; min-height: 380px; }
  .orbit-art svg { width: 100%; max-width: 460px; height: auto; }
  .spin { transform-origin: 230px 230px; animation: spin 46s linear infinite; }
  .spin.rev { animation-duration: 60s; animation-direction: reverse; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce){ .spin { animation: none; } #field { display: none; } }

  /* section shells */
  section { position: relative; }
  .band { padding: 72px 0; border-top: 1px solid var(--line); }
  .kicker { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
  .band h2 { font-size: clamp(1.9rem, 3.8vw, 2.8rem); letter-spacing: -0.025em; margin: 10px 0 0; }
  .band .sub { color: var(--ink-dim); font-size: 1.08rem; max-width: 58ch; margin: 16px 0 0; }

  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 46px; align-items: center; }
  .split.rev .art { order: 2; }
  @media (max-width: 880px){ .split { grid-template-columns: 1fr; gap: 30px; } .split.rev .art { order: 0; } }
  .feature-list { list-style: none; padding: 0; margin: 22px 0 0; display: grid; gap: 14px; }
  .feature-list li { display: flex; gap: 12px; }
  .tick { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 8px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .tick svg { width: 15px; height: 15px; }
  .feature-list b { color: var(--ink); }
  .feature-list span span { color: var(--ink-dim); }

  .art { position: relative; }
  .art .panel { border: 1px solid var(--line-strong); border-radius: var(--r); background: linear-gradient(180deg, var(--surface), var(--surface-2)); padding: 22px; box-shadow: 0 30px 80px -40px rgba(0,0,0,0.7); }
  .art svg { display: block; width: 100%; height: auto; }

  /* moon grid */
  .moons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 34px; }
  @media (max-width: 900px){ .moons { grid-template-columns: repeat(2, 1fr); } }
  .moon { border: 1px solid var(--line); border-radius: 16px; background: var(--surface); padding: 20px; transition: border-color .2s ease, transform .2s ease; }
  .moon:hover { transform: translateY(-3px); border-color: var(--line-strong); }
  .moon .ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; margin-bottom: 12px; }
  .moon h4 { margin: 0 0 6px; font-size: 1.06rem; }
  .moon p { margin: 0; color: var(--ink-dim); font-size: 0.94rem; }

  /* stat band */
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  @media (max-width: 720px){ .stats { grid-template-columns: 1fr; } }
  .stat { border: 1px solid var(--line); border-radius: 16px; background: var(--surface); padding: 26px; text-align: center; }
  .stat .num { font-size: clamp(2.2rem, 4vw, 3rem); font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .stat .num .u { font-size: 0.5em; margin-left: 2px; color: var(--muted); }
  .stat .lbl { color: var(--muted); font-size: 0.92rem; margin-top: 6px; }

  /* privacy strip */
  .priv { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 30px; }
  @media (max-width: 820px){ .priv { grid-template-columns: 1fr; } }
  .pc { border: 1px solid var(--line); border-radius: 16px; background: var(--surface); padding: 22px; }
  .pc svg { width: 24px; height: 24px; color: var(--aqua); }
  .pc h4 { margin: 12px 0 6px; font-size: 1.02rem; }
  .pc p { margin: 0; color: var(--ink-dim); font-size: 0.92rem; }

  /* final */
  .final { text-align: center; padding: 92px 24px; overflow: hidden; }
  .final::before { content:""; position:absolute; inset:0; background: radial-gradient(760px 340px at 50% 0%, color-mix(in srgb, var(--sky) 16%, transparent), transparent 66%); pointer-events:none; }
  .final h2 { font-size: clamp(2rem, 4.6vw, 3.3rem); letter-spacing: -0.03em; position: relative; }
  .final p { color: var(--ink-dim); max-width: 52ch; margin: 18px auto 30px; font-size: 1.1rem; position: relative; }
  .final .hero-cta { justify-content: center; position: relative; }

  footer.foot { border-top: 1px solid var(--line); padding: 38px 0; }
  .foot-inner { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; color: var(--muted); font-size: 13px; }
  .foot-inner .brand { font-size: 16px; color: var(--ink); }

  .reveal { opacity: 0; transform: translateY(22px); transition: opacity .7s ease, transform .7s ease; }
  .reveal.in { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce){ .reveal { opacity: 1; transform: none; transition: none; } }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
`;

// small helpers for repeated SVG glyphs
const GOOGLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.2a7.1 7.1 0 0 1 0-4.5V6.6H1.3a12 12 0 0 0 0 10.8l4-3.2z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"/></svg>`;
const MSFT = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.3v9.3H2z"/><path fill="#7FBA00" d="M12.7 2H22v9.3h-9.3z"/><path fill="#00A4EF" d="M2 12.7h9.3V22H2z"/><path fill="#FFB900" d="M12.7 12.7H22V22h-9.3z"/></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const MARKUP = `<header class="nav">
  <div class="wrap nav-inner">
    <a href="#top" class="brand" aria-label="Orbit home">
      <svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="5" fill="url(#og)"/>
        <ellipse cx="16" cy="16" rx="13" ry="6.4" stroke="url(#og)" stroke-width="1.5" transform="rotate(28 16 16)"/>
        <circle cx="27" cy="10.5" r="2.1" fill="var(--sky)"/>
        <defs><linearGradient id="og" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#38E4C9"/><stop offset="0.5" stop-color="#5BC8FF"/><stop offset="1" stop-color="#8B7BFF"/></linearGradient></defs>
      </svg>
      Orbit
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="#sync">Calendar sync</a>
      <a href="#life">Life</a>
      <a href="#together">Together</a>
      <a href="#discover">Discover</a>
      <a href="#fitness">Fitness</a>
    </nav>
    <div class="nav-right">
      <button class="theme-btn" id="obThemeBtn" aria-label="Toggle color theme">◐</button>
      <a href="/home" class="btn btn-primary">Open Orbit</a>
    </div>
  </div>
</header>

<main id="top">

  <!-- HERO -->
  <section class="hero">
    <canvas id="field" aria-hidden="true"></canvas>
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">Your personal OS</span>
        <h1>Your life,<br><span class="grad">in perfect sync.</span></h1>
        <p class="lede">Orbit connects the calendar you already live by — Google or Outlook — then quietly plans everything else around your real, free time.</p>
        <div class="hero-cta">
          <a href="/home" class="btn btn-primary">Open Orbit</a>
          <a href="#sync" class="btn btn-ghost">See how sync works</a>
        </div>
        <div class="chips" aria-label="Works with">
          <span class="chip">${GOOGLE} Google Calendar</span>
          <span class="chip">${MSFT} Microsoft Outlook</span>
        </div>
        <div class="trust"><span>Separate from work.</span><span>·</span><span>On your computer and your phone.</span><span>·</span><span>Always in sync.</span></div>
      </div>

      <div class="orbit-art reveal" aria-hidden="true">
        <svg viewBox="0 0 460 460" fill="none" role="img" aria-label="A calendar core with life moons orbiting">
          <defs>
            <linearGradient id="core" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#38E4C9"/><stop offset="1" stop-color="#5BC8FF"/></linearGradient>
            <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop stop-color="#5BC8FF" stop-opacity="0.28"/><stop offset="1" stop-color="#5BC8FF" stop-opacity="0"/></radialGradient>
          </defs>
          <circle cx="230" cy="230" r="180" fill="url(#halo)"/>
          <g class="spin">
            <ellipse cx="230" cy="230" rx="180" ry="92" stroke="var(--line-strong)" stroke-width="1.4" transform="rotate(-18 230 230)"/>
            <ellipse cx="230" cy="230" rx="150" ry="150" stroke="var(--line)" stroke-width="1.4"/>
            <ellipse cx="230" cy="230" rx="110" ry="170" stroke="var(--line-strong)" stroke-width="1.4" transform="rotate(24 230 230)"/>
          </g>
          <g class="spin rev">
            <g transform="translate(410 230)"><circle r="15" fill="#38E4C9"/><path d="M-6 0h12M0 -6v12" stroke="#04121a" stroke-width="2" stroke-linecap="round"/></g>
            <g transform="translate(88 168)"><circle r="15" fill="#FF8A3D"/><path d="M-5 3l3-8 3 8M-2 -1h6" stroke="#150a02" stroke-width="2" stroke-linecap="round"/></g>
            <g transform="translate(150 372)"><circle r="15" fill="#FF6B8A"/><path d="M0 6c-6-4-8-8-5-11 2-2 5 0 5 2 0-2 3-4 5-2 3 3 1 7-5 11z" fill="#1a0208"/></g>
            <g transform="translate(360 350)"><circle r="15" fill="#5BC8FF"/><circle r="5" cy="-1" fill="none" stroke="#03121c" stroke-width="2"/><path d="M3 3l4 4" stroke="#03121c" stroke-width="2" stroke-linecap="round"/></g>
          </g>
          <!-- calendar core -->
          <g transform="translate(230 230)">
            <rect x="-46" y="-42" width="92" height="86" rx="16" fill="url(#core)"/>
            <rect x="-46" y="-42" width="92" height="26" rx="16" fill="#04121a" opacity="0.22"/>
            <g stroke="#04121a" stroke-width="3.2" stroke-linecap="round" opacity="0.85">
              <path d="M-26 -50v14M26 -50v14"/>
            </g>
            <g fill="#04121a" opacity="0.85"><circle cx="-24" cy="-2" r="4"/><circle cx="0" cy="-2" r="4"/><circle cx="24" cy="-2" r="4"/><circle cx="-24" cy="20" r="4"/><circle cx="0" cy="20" r="4"/><circle cx="24" cy="20" r="4"/></g>
          </g>
        </svg>
      </div>
    </div>
  </section>

  <!-- CALENDAR SYNC -->
  <section class="band" id="sync">
    <div class="wrap">
      <span class="kicker">Bring what you already use</span>
      <h2>Connect Google or Outlook.<br><span class="grad">Orbit does the rest.</span></h2>
      <p class="sub">One tap links the calendar you live by. Orbit reads it as busy time — so nothing it suggests ever lands on top of a meeting, a flight, or dinner plans. Turn on two-way sync and the events Orbit makes for you appear right back in Google or Outlook.</p>
      <div class="split" style="margin-top:38px">
        <div class="copy reveal">
          <ul class="feature-list">
            <li><span class="tick">${CHECK}</span><span><b>One-tap connect.</b> <span>Secure OAuth to Google Calendar or Microsoft 365 — no passwords, revoke anytime.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Never double-books.</b> <span>Your existing events become busy blocks, so every plan Orbit proposes fits your actual free time.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Two-way, if you want it.</b> <span>Push Orbit's dates, workouts, and reminders back into the calendar the rest of your world sees.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Private by design.</b> <span>Tokens are sealed at rest and Orbit stores only your free/busy — never a copy of your calendar's contents.</span></span></li>
          </ul>
        </div>
        <div class="art reveal">
          <div class="panel">
            <svg viewBox="0 0 420 300" role="img" aria-label="Google and Outlook calendars merging into Orbit">
              <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#38E4C9"/><stop offset="1" stop-color="#5BC8FF"/></linearGradient></defs>
              <g transform="translate(28 60)"><rect width="120" height="150" rx="14" fill="var(--surface-2)" stroke="var(--line-strong)"/><rect width="120" height="34" rx="14" fill="#4285F4" opacity="0.9"/><g fill="var(--muted)"><rect x="16" y="52" width="88" height="9" rx="4"/><rect x="16" y="72" width="64" height="9" rx="4"/><rect x="16" y="92" width="80" height="9" rx="4"/><rect x="16" y="112" width="52" height="9" rx="4"/></g><g transform="translate(20 12)">${GOOGLE}</g></g>
              <g transform="translate(272 60)"><rect width="120" height="150" rx="14" fill="var(--surface-2)" stroke="var(--line-strong)"/><rect width="120" height="34" rx="14" fill="#00A4EF" opacity="0.9"/><g fill="var(--muted)"><rect x="16" y="52" width="88" height="9" rx="4"/><rect x="16" y="72" width="64" height="9" rx="4"/><rect x="16" y="92" width="80" height="9" rx="4"/><rect x="16" y="112" width="52" height="9" rx="4"/></g><g transform="translate(20 12)">${MSFT}</g></g>
              <path d="M150 135 C 190 135, 190 150, 208 150" stroke="url(#mg)" stroke-width="2.4" fill="none" stroke-dasharray="4 5"/>
              <path d="M270 135 C 230 135, 230 150, 212 150" stroke="url(#mg)" stroke-width="2.4" fill="none" stroke-dasharray="4 5"/>
              <circle cx="210" cy="150" r="30" fill="url(#mg)"/>
              <g transform="translate(210 150)" stroke="#04121a" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M-9 -2a9 9 0 0 1 16 -4"/><path d="M9 2a9 9 0 0 1 -16 4"/><path d="M6 -10v6h-6M-6 10v-6h6"/></g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- LIFE -->
  <section class="band" id="life">
    <div class="wrap">
      <div class="split rev">
        <div class="art reveal">
          <div class="panel">
            <svg viewBox="0 0 420 300" role="img" aria-label="A concierge suggesting places on a map">
              <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#38E4C9"/><stop offset="1" stop-color="#12A88F"/></linearGradient></defs>
              <rect x="24" y="30" width="372" height="240" rx="16" fill="var(--surface-2)" stroke="var(--line-strong)"/>
              <path d="M24 210 L120 150 L200 190 L300 120 L396 170" stroke="var(--line-strong)" stroke-width="1.5" fill="none"/>
              <g fill="url(#lg)"><path d="M120 150c-9-14 4-26 0-26s13 12 0 26z" transform="translate(0 -18)"/></g>
              <g transform="translate(180 92)"><circle r="16" fill="url(#lg)"/><path d="M-6 0l4 4 8-9" stroke="#04121a" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
              <g transform="translate(300 120)"><circle r="8" fill="var(--rose)"/></g>
              <g transform="translate(120 150)"><circle r="8" fill="var(--amber)"/></g>
              <rect x="48" y="216" width="150" height="34" rx="10" fill="var(--surface)" stroke="var(--line-strong)"/>
              <g fill="var(--muted)"><rect x="62" y="228" width="90" height="8" rx="4"/></g>
              <circle cx="180" cy="233" r="8" fill="url(#lg)"/>
            </svg>
          </div>
        </div>
        <div class="copy reveal">
          <span class="kicker">Orbit Life</span>
          <h2>A concierge that knows your taste.</h2>
          <p class="sub">Tell it once what you love — movies, teams, the fishing and hunting seasons you follow, the food you crave, the places you keep going back to. Then just ask: "find me a movie tonight," "closest Sprouts," "is the trout run on?" It answers around your free time and reminds you the way you choose — text, email, push, or a call.</p>
          <ul class="feature-list">
            <li><span class="tick">${CHECK}</span><span><b>Availability-aware.</b> <span>Suggestions land only when you're actually free.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Seasonal & local.</b> <span>Hunting/fishing seasons, showtimes, and nearby spots on a free map.</span></span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- TOGETHER -->
  <section class="band" id="together">
    <div class="wrap">
      <div class="split">
        <div class="copy reveal">
          <span class="kicker">Orbit Together</span>
          <h2>Two lives, one shared orbit.</h2>
          <p class="sub">Link with the person who matters most — even a thousand miles apart. See each other's availability, plan a date by proposing, accepting, or countering a time, and share the moments you choose behind identity-verified privacy.</p>
          <ul class="feature-list">
            <li><span class="tick">${CHECK}</span><span><b>Mutual availability.</b> <span>Orbit finds the windows you both have open.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Propose · accept · counter.</b> <span>Agree on a plan, and it lands on both calendars.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Verified sharing.</b> <span>Photo sharing is gated behind real identity verification.</span></span></li>
          </ul>
        </div>
        <div class="art reveal">
          <div class="panel">
            <svg viewBox="0 0 420 300" role="img" aria-label="Two calendars overlapping to find a shared free time">
              <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FF6B8A"/><stop offset="1" stop-color="#8B7BFF"/></linearGradient></defs>
              <g transform="translate(56 70)"><rect width="150" height="160" rx="14" fill="var(--surface-2)" stroke="var(--line-strong)"/><g fill="var(--rose)" opacity="0.55"><rect x="18" y="30" width="40" height="20" rx="5"/><rect x="18" y="86" width="40" height="20" rx="5"/></g></g>
              <g transform="translate(214 70)"><rect width="150" height="160" rx="14" fill="var(--surface-2)" stroke="var(--line-strong)"/><g fill="var(--violet)" opacity="0.55"><rect x="92" y="30" width="40" height="20" rx="5"/><rect x="92" y="118" width="40" height="20" rx="5"/></g></g>
              <g transform="translate(185 128)"><circle r="34" fill="url(#tg)"/><path d="M0 16c-11-7-16-14-10-21 4-4 10 0 10 4 0-4 6-8 10-4 6 7 1 14-10 21z" fill="#1a0210"/></g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- DISCOVER -->
  <section class="band" id="discover">
    <div class="wrap">
      <div class="split rev">
        <div class="art reveal">
          <div class="panel">
            <svg viewBox="0 0 420 300" role="img" aria-label="People with shared interests within a nearby radius">
              <defs><radialGradient id="dg" cx="0.5" cy="0.5" r="0.5"><stop stop-color="#5BC8FF" stop-opacity="0.3"/><stop offset="1" stop-color="#5BC8FF" stop-opacity="0"/></radialGradient></defs>
              <circle cx="210" cy="150" r="118" fill="url(#dg)"/>
              <circle cx="210" cy="150" r="118" stroke="var(--line-strong)" stroke-dasharray="4 6" fill="none"/>
              <circle cx="210" cy="150" r="70" stroke="var(--line)" stroke-dasharray="3 6" fill="none"/>
              <g transform="translate(210 150)"><circle r="20" fill="#5BC8FF"/><circle cy="-6" r="6" fill="#03121c"/><path d="M-9 9a9 9 0 0 1 18 0z" fill="#03121c"/></g>
              <g fill="var(--aqua)"><circle cx="120" cy="96" r="11"/><circle cx="300" cy="110" r="11"/><circle cx="150" cy="216" r="11"/><circle cx="292" cy="206" r="11"/></g>
              <g stroke="var(--sky)" stroke-width="1.6" opacity="0.6"><path d="M210 150L120 96M210 150L300 110"/></g>
            </svg>
          </div>
        </div>
        <div class="copy reveal">
          <span class="kicker">Orbit Discover</span>
          <h2>Meet people nearby — safely.</h2>
          <p class="sub">Opt in to a roughly five-mile radius of people who share your interests. A tap only reveals your photo to that one person; when you both tap, it's a match — and only then can you choose to share a number and pick a time to meet.</p>
          <ul class="feature-list">
            <li><span class="tick">${CHECK}</span><span><b>Mutual-only reveals.</b> <span>Nothing is shared unless interest goes both ways.</span></span></li>
            <li><span class="tick">${CHECK}</span><span><b>Verified & screened.</b> <span>18+ identity check and background screening gate every profile.</span></span></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- FITNESS + MOONS -->
  <section class="band" id="fitness">
    <div class="wrap">
      <span class="kicker">One life, many moons</span>
      <h2>Everything that makes up your week — in one orbit.</h2>
      <p class="sub">Orbit is the hub; each part pulls its weight and stays in sync with your calendar, your phone, and your desktop.</p>
      <div class="moons">
        <div class="moon reveal"><div class="ic" style="background:rgba(255,138,61,0.16)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FF8A3D" stroke-width="1.8" stroke-linecap="round"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg></div><h4>Fitness</h4><p>Lose-weight, muscle, cardio, or both — with a tracker for goals, streaks, and PRs, and a "schedule this plan" button that drops sessions onto Orbit.</p></div>
        <div class="moon reveal"><div class="ic" style="background:rgba(56,228,201,0.16)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38E4C9" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4"/></svg></div><h4>Reminders</h4><p>Health, work, errands, entertainment — nudged on the channel you pick, once, right before they matter.</p></div>
        <div class="moon reveal"><div class="ic" style="background:rgba(255,107,138,0.16)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FF6B8A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-6-4-9-8-9-12a5 5 0 0 1 9-2 5 5 0 0 1 9 2c0 4-3 8-9 12z"/></svg></div><h4>Together</h4><p>Plan dates by mutual availability and share verified moments with the person you're closest to.</p></div>
        <div class="moon reveal"><div class="ic" style="background:rgba(91,200,255,0.16)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#5BC8FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg></div><h4>Discover</h4><p>Interest-matched people within a few miles, with mutual-only reveals and a safety-screened community.</p></div>
      </div>
      <div class="stats" style="margin-top:34px">
        <div class="stat reveal"><div class="num" data-count="2" data-suffix="-way">0</div><div class="lbl">Google & Outlook sync</div></div>
        <div class="stat reveal"><div class="num" data-count="5" data-suffix="mi">0</div><div class="lbl">Discover radius, opt-in</div></div>
        <div class="stat reveal"><div class="num" data-count="100" data-suffix="%">0</div><div class="lbl">Separate from your work life</div></div>
      </div>
    </div>
  </section>

  <!-- PRIVACY / SYNC -->
  <section class="band">
    <div class="wrap">
      <span class="kicker">Built to be trusted</span>
      <h2>On every device. Yours alone.</h2>
      <p class="sub">Orbit lives on your home computer and in your pocket, the two always in sync — and it keeps your personal life walled off from anything to do with work.</p>
      <div class="priv">
        <div class="pc reveal"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.6"/></svg><h4>Verified & screened</h4><p>Discover requires an 18+ identity check and a background screen — an anti-trafficking, offender-blocking gate.</p></div>
        <div class="pc reveal"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.6"/></svg><h4>Sealed at rest</h4><p>Calendar tokens are encrypted; Orbit keeps only your free/busy, never a copy of your events.</p></div>
        <div class="pc reveal"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" stroke="currentColor" stroke-width="1.6"/></svg><h4>Work stays at work</h4><p>Orbit is fully separate from the Evolve business calendar — sync the two only if you choose to.</p></div>
      </div>
    </div>
  </section>

  <!-- FINAL -->
  <section class="final" id="get">
    <h2>Get your life in orbit.</h2>
    <p>Connect the calendar you already use and let everything else fall into a rhythm that fits your real, free time.</p>
    <div class="hero-cta">
      <a href="/home" class="btn btn-primary">Open Orbit</a>
      <a href="#sync" class="btn btn-ghost">See calendar sync</a>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot-inner">
    <span class="brand">Orbit</span>
    <span>Calendar sync · Life · Together · Discover · Fitness</span>
    <span>Your personal OS — separate from work</span>
  </div>
</footer>`;

const SCRIPT = `
  (function () {
    var root = document.documentElement;
    var btn = document.getElementById('obThemeBtn');
    if (btn) btn.addEventListener('click', function () {
      // Dark is the default when no explicit theme is set.
      var cur = root.getAttribute('data-theme') || 'dark';
      root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });
  })();

  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function(e){e.classList.add('in');}); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.16 });
    els.forEach(function (e) { io.observe(e); });
  })();

  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nums = document.querySelectorAll('.num[data-count]');
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.innerHTML = target + '<span class="u">' + suffix + '</span>'; return; }
      var start = null, dur = 1100;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.innerHTML = Math.round(target * eased) + '<span class="u">' + suffix + '</span>';
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  })();

  (function () {
    var canvas = document.getElementById('field');
    if (!canvas) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    var ctx = canvas.getContext('2d');
    var w, h, dpr, nodes = [], raf;
    var hues = ['56,228,201', '91,200,255', '139,123,255'];
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      size();
      var count = Math.min(58, Math.floor(w / 26));
      nodes = [];
      for (var i = 0; i < count; i++) nodes.push({ x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.24, vy: (Math.random()-0.5)*0.24, hue: hues[i%hues.length], r: Math.random()*1.5+0.6 });
    }
    function frame() {
      ctx.clearRect(0,0,w,h);
      for (var i=0;i<nodes.length;i++){ var n=nodes[i]; n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>w)n.vx*=-1; if(n.y<0||n.y>h)n.vy*=-1;
        for (var j=i+1;j<nodes.length;j++){ var m=nodes[j],dx=n.x-m.x,dy=n.y-m.y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<120){ ctx.strokeStyle='rgba('+n.hue+','+(0.11*(1-d/120))+')'; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(m.x,m.y); ctx.stroke(); } }
        ctx.fillStyle='rgba('+n.hue+',0.85)'; ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    var t;
    window.addEventListener('resize', function(){ clearTimeout(t); t=setTimeout(function(){ init(); }, 180); });
    init(); frame();
  })();
`;

export default function OrbitLanding() {
  useEffect(() => {
    const el = document.createElement("script");
    el.textContent = SCRIPT;
    el.setAttribute("data-orbit", "1");
    document.body.appendChild(el);
    return () => { el.remove(); };
  }, []);

  return (
    <div className="orbit-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </div>
  );
}
