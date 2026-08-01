"use client";
import { useEffect } from "react";

const CSS = `
  :root {
    /* neutrals — cool, blue-biased, chosen not defaulted */
    --ground: #070A10;
    --surface: #0E141E;
    --surface-2: #131C29;
    --line: rgba(150, 175, 205, 0.12);
    --line-strong: rgba(150, 175, 205, 0.22);
    --ink: #EAF1F8;
    --ink-dim: #B4C2D4;
    --muted: #8494A8;

    /* signal hues — one per instrument */
    --aqua: #38E4C9;      /* Mail */
    --amber: #FFC46B;     /* Calendar */
    --violet: #8B7BFF;    /* Meet */
    --aqua-soft: rgba(56, 228, 201, 0.14);
    --amber-soft: rgba(255, 196, 107, 0.14);
    --violet-soft: rgba(139, 123, 255, 0.16);

    --accent: var(--aqua);
    --glow: 0 0 0 1px rgba(56,228,201,0.25), 0 20px 60px -20px rgba(56,228,201,0.35);

    --font-display: "Helvetica Neue", "Segoe UI", system-ui, -apple-system, sans-serif;
    --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace;

    --maxw: 1180px;
    --r: 16px;
  }

  /* Dark is the default. Light is opt-in via the theme toggle (data-theme). */
  :root[data-theme="dark"] {
    --ground: #070A10; --surface: #0E141E; --surface-2: #131C29;
    --line: rgba(150,175,205,0.12); --line-strong: rgba(150,175,205,0.22);
    --ink: #EAF1F8; --ink-dim: #B4C2D4; --muted: #8494A8;
    --aqua: #38E4C9; --amber: #FFC46B; --violet: #8B7BFF;
    --aqua-soft: rgba(56,228,201,0.14); --amber-soft: rgba(255,196,107,0.14); --violet-soft: rgba(139,123,255,0.16);
    --glow: 0 0 0 1px rgba(56,228,201,0.25), 0 20px 60px -20px rgba(56,228,201,0.35);
  }
  :root[data-theme="light"] {
    --ground: #F4F7FB; --surface: #FFFFFF; --surface-2: #EEF3F9;
    --line: rgba(20,40,70,0.10); --line-strong: rgba(20,40,70,0.18);
    --ink: #0C1524; --ink-dim: #33435A; --muted: #5E7089;
    --aqua: #0F9E88; --amber: #C77D18; --violet: #5B49D6;
    --aqua-soft: rgba(15,158,136,0.10); --amber-soft: rgba(199,125,24,0.12); --violet-soft: rgba(91,73,214,0.10);
    --glow: 0 0 0 1px rgba(15,158,136,0.20), 0 24px 60px -24px rgba(15,158,136,0.28);
  }

  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--font-display);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }

  a { color: inherit; text-decoration: none; }

  .mono { font-family: var(--font-mono); }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .eyebrow::before {
    content: "";
    width: 22px; height: 1px;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
  }

  h1, h2, h3 { text-wrap: balance; margin: 0; font-weight: 700; letter-spacing: -0.02em; }

  /* ---------- top nav ---------- */
  header.nav {
    position: sticky; top: 0; z-index: 50;
    backdrop-filter: blur(14px);
    background: color-mix(in srgb, var(--ground) 72%, transparent);
    border-bottom: 1px solid var(--line);
  }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
  .brand { display: flex; align-items: center; gap: 11px; font-weight: 700; letter-spacing: -0.01em; font-size: 18px; }
  .brand .mark { width: 26px; height: 26px; }
  .nav-links { display: flex; gap: 30px; font-size: 14px; color: var(--ink-dim); }
  .nav-links a { transition: color .2s; }
  .nav-links a:hover { color: var(--ink); }
  .nav-right { display: flex; align-items: center; gap: 14px; }
  .theme-btn {
    width: 34px; height: 34px; border-radius: 9px; cursor: pointer;
    background: var(--surface); border: 1px solid var(--line-strong); color: var(--ink-dim);
    display: grid; place-items: center; font-size: 15px; transition: .2s;
  }
  .theme-btn:hover { color: var(--ink); border-color: var(--accent); }
  .btn {
    font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.02em;
    padding: 10px 18px; border-radius: 10px; cursor: pointer; transition: .2s;
    border: 1px solid transparent; white-space: nowrap;
  }
  .btn-primary {
    background: var(--accent); color: #04120F; font-weight: 600;
    box-shadow: 0 8px 30px -10px var(--accent);
  }
  :root[data-theme="light"] .btn-primary, @media (prefers-color-scheme: light) { }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 34px -10px var(--accent); }
  .btn-ghost { background: transparent; border-color: var(--line-strong); color: var(--ink); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .nav-links, .nav .btn-ghost { }
  @media (max-width: 820px){ .nav-links { display: none; } }

  /* ---------- hero ---------- */
  .hero { position: relative; padding: 96px 0 72px; overflow: hidden; }
  #field { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; opacity: .9; }
  .hero-grid-overlay {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(1000px 520px at 72% -10%, var(--aqua-soft), transparent 60%),
      radial-gradient(760px 460px at 8% 110%, var(--violet-soft), transparent 60%);
  }
  .hero-inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; }
  @media (max-width: 940px){ .hero-inner { grid-template-columns: 1fr; gap: 40px; } }

  .hero h1 {
    font-size: clamp(2.6rem, 6vw, 4.6rem);
    line-height: 1.02;
    margin: 22px 0 20px;
  }
  .hero h1 .grad {
    background: linear-gradient(100deg, var(--aqua), var(--amber) 55%, var(--violet));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .hero p.lede { font-size: clamp(1.05rem, 1.6vw, 1.28rem); color: var(--ink-dim); max-width: 46ch; margin: 0 0 30px; }
  .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
  .hero-meta { margin-top: 34px; display: flex; gap: 26px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 12.5px; color: var(--muted); }
  .hero-meta span { display: inline-flex; align-items: center; gap: 8px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }

  /* console card in hero */
  .console {
    position: relative; border: 1px solid var(--line-strong); border-radius: 18px;
    background: linear-gradient(180deg, var(--surface), var(--surface-2));
    padding: 20px; box-shadow: 0 40px 80px -40px rgba(0,0,0,.6);
  }
  .console::before {
    content: ""; position: absolute; inset: 0; border-radius: 18px; padding: 1px;
    background: linear-gradient(140deg, var(--aqua), transparent 40%, var(--violet));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude; opacity: .5; pointer-events: none;
  }
  .console-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .console-head .lights { display: flex; gap: 6px; }
  .console-head .lights i { width: 9px; height: 9px; border-radius: 50%; display: block; background: var(--line-strong); }
  .console-head .lights i:nth-child(1){ background: var(--aqua); }
  .console-head .lights i:nth-child(2){ background: var(--amber); }
  .console-head .lights i:nth-child(3){ background: var(--violet); }
  .console-head .tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: .16em; color: var(--muted); text-transform: uppercase; }
  .console-rows { display: grid; gap: 10px; }
  .crow {
    display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px; background: var(--surface-2);
    border: 1px solid var(--line); font-size: 14px;
  }
  .crow .ic { width: 26px; height: 26px; }
  .crow .label { color: var(--ink); font-weight: 600; }
  .crow .sub { color: var(--muted); font-family: var(--font-mono); font-size: 11.5px; }
  .crow .status { font-family: var(--font-mono); font-size: 11px; letter-spacing: .08em; padding: 4px 9px; border-radius: 999px; }
  .st-aqua { color: var(--aqua); background: var(--aqua-soft); }
  .st-amber { color: var(--amber); background: var(--amber-soft); }
  .st-violet { color: var(--violet); background: var(--violet-soft); }
  .console-foot { margin-top: 16px; display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); font-size: 11.5px; color: var(--muted); }
  .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--aqua); box-shadow: 0 0 0 0 var(--aqua); animation: pulse 2.4s infinite; }
  @keyframes pulse { 0%{ box-shadow: 0 0 0 0 rgba(56,228,201,.5);} 70%{ box-shadow: 0 0 0 10px rgba(56,228,201,0);} 100%{ box-shadow:0 0 0 0 rgba(56,228,201,0);} }
  @media (prefers-reduced-motion: reduce){ .pulse { animation: none; } }

  /* ---------- telemetry / results strip ---------- */
  .telemetry { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--surface); }
  .tele-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 820px){ .tele-grid { grid-template-columns: repeat(2, 1fr); } }
  .tele {
    padding: 34px 26px; border-right: 1px solid var(--line);
  }
  .tele:last-child { border-right: none; }
  @media (max-width: 820px){ .tele:nth-child(2){ border-right: none; } .tele { border-bottom: 1px solid var(--line);} }
  .tele .num { font-size: clamp(2rem, 4vw, 2.9rem); font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .tele .num .u { color: var(--accent); }
  .tele .cap { margin-top: 6px; font-family: var(--font-mono); font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }

  /* ---------- sections ---------- */
  section { position: relative; }
  .sec-pad { padding: 92px 0; }
  .sec-head { max-width: 720px; margin-bottom: 54px; }
  .sec-head h2 { font-size: clamp(1.9rem, 3.6vw, 2.9rem); margin: 18px 0 16px; }
  .sec-head p { color: var(--ink-dim); font-size: 1.08rem; margin: 0; }

  /* product bay */
  .bay { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; padding: 46px 0; }
  .bay + .bay { border-top: 1px solid var(--line); }
  .bay.flip .bay-media { order: 2; }
  @media (max-width: 900px){ .bay { grid-template-columns: 1fr; gap: 34px; } .bay.flip .bay-media { order: 0; } }

  .bay-kicker { font-family: var(--font-mono); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--hue); display: flex; align-items: center; gap: 10px; }
  .bay-kicker .chip { padding: 3px 9px; border-radius: 6px; background: var(--hue-soft); color: var(--hue); }
  .bay h3 { font-size: clamp(1.6rem, 3vw, 2.3rem); margin: 16px 0 14px; }
  .bay p.desc { color: var(--ink-dim); font-size: 1.05rem; margin: 0 0 24px; max-width: 46ch; }
  .feat { list-style: none; padding: 0; margin: 0; display: grid; gap: 13px; }
  .feat li { display: grid; grid-template-columns: 22px 1fr; gap: 12px; align-items: start; font-size: 14.5px; color: var(--ink-dim); }
  .feat li b { color: var(--ink); font-weight: 600; }
  .feat li .tick { width: 22px; height: 22px; border-radius: 6px; background: var(--hue-soft); display: grid; place-items: center; margin-top: 1px; }
  .feat li .tick svg { width: 13px; height: 13px; }

  .bay-media { position: relative; }
  .glass {
    position: relative; border-radius: 20px; border: 1px solid var(--line-strong);
    background: linear-gradient(170deg, var(--surface), var(--surface-2));
    padding: 28px; overflow: hidden; box-shadow: 0 40px 80px -46px rgba(0,0,0,.55);
  }
  .glass::after {
    content: ""; position: absolute; inset: -40% -10% auto -10%; height: 70%;
    background: radial-gradient(60% 100% at 50% 0%, var(--hue-soft), transparent 70%);
    pointer-events: none;
  }
  .glass svg { display: block; width: 100%; height: auto; position: relative; }

  /* autonomy orbit */
  .autonomy { background: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .orbit-wrap { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 56px; align-items: center; }
  @media (max-width: 900px){ .orbit-wrap { grid-template-columns: 1fr; gap: 36px; } }
  .loop-list { display: grid; gap: 16px; }
  .loop-item { display: grid; grid-template-columns: auto 1fr; gap: 16px; padding: 18px 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface-2); }
  .loop-item .n { font-family: var(--font-mono); font-size: 12px; color: var(--accent); padding-top: 3px; }
  .loop-item h4 { margin: 0 0 5px; font-size: 15.5px; }
  .loop-item p { margin: 0; font-size: 13.5px; color: var(--muted); }

  /* outcomes grid */
  .outcomes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  @media (max-width: 860px){ .outcomes { grid-template-columns: 1fr; } }
  .oc {
    padding: 26px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface);
    transition: transform .25s, border-color .25s;
  }
  .oc:hover { transform: translateY(-4px); border-color: var(--line-strong); }
  .oc .ico { width: 30px; height: 30px; margin-bottom: 16px; color: var(--accent); }
  .oc h4 { font-size: 16px; margin: 0 0 8px; }
  .oc p { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.55; }

  /* final cta */
  .final { text-align: center; padding: 96px 24px; position: relative; overflow: hidden; }
  .final::before {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(700px 340px at 50% 0%, var(--aqua-soft), transparent 65%);
    pointer-events: none;
  }
  .final h2 { font-size: clamp(2rem, 4.5vw, 3.4rem); position: relative; }
  .final p { color: var(--ink-dim); max-width: 52ch; margin: 18px auto 32px; position: relative; font-size: 1.1rem; }
  .final .hero-cta { justify-content: center; position: relative; }

  footer.foot { border-top: 1px solid var(--line); padding: 40px 0; }
  .foot-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; font-size: 13px; color: var(--muted); }
  .foot-inner .brand { font-size: 16px; color: var(--ink); }

  /* reveal */
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
  .reveal.in { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce){ .reveal { opacity: 1; transform: none; transition: none; } }

  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
`;
const MARKUP = `<header class="nav">
  <div class="wrap nav-inner">
    <a href="#top" class="brand" aria-label="Evolve home">
      <svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" stroke="url(#bg)" stroke-width="1.5"/>
        <path d="M16 6 L25 11 V21 L16 26 L7 21 V11 Z" stroke="url(#bg)" stroke-width="1.5" fill="none"/>
        <path d="M16 11 L20.5 13.5 V18.5 L16 21 L11.5 18.5 V13.5 Z" fill="url(#bg)" opacity="0.85"/>
        <defs><linearGradient id="bg" x1="0" y1="0" x2="32" y2="32">
          <stop stop-color="#38E4C9"/><stop offset="0.5" stop-color="#FFC46B"/><stop offset="1" stop-color="#8B7BFF"/>
        </linearGradient></defs>
      </svg>
      Evolve
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="#mail">Mail</a>
      <a href="#calendar">Calendar</a>
      <a href="#meet">Meet</a>
      <a href="#autonomy">Autonomy</a>
      <a href="#results">Results</a>
    </nav>
    <div class="nav-right">
      <button class="theme-btn" id="themeBtn" aria-label="Toggle color theme">◐</button>
      <a href="#access" class="btn btn-primary">Request access</a>
    </div>
  </div>
</header>

<main id="top">

  <!-- ================= HERO ================= -->
  <section class="hero">
    <canvas id="field" aria-hidden="true"></canvas>
    <div class="hero-grid-overlay" aria-hidden="true"></div>
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">Autonomous Business OS</span>
        <h1>Three instruments.<br><span class="grad">One brain that runs itself.</span></h1>
        <p class="lede">Encrypted Mail, self-scheduling Calendar, and consent-first Meet — wired into a single autonomous core that heals, optimizes, and secures itself around the clock.</p>
        <div class="hero-cta">
          <a href="#access" class="btn btn-primary">Request access</a>
          <a href="#mail" class="btn btn-ghost">See the instruments ↓</a>
        </div>
        <div class="hero-meta">
          <span><i class="dot"></i>AES-256-GCM at rest</span>
          <span><i class="dot"></i>Self-healing core</span>
          <span><i class="dot"></i>Consent-first by design</span>
        </div>
      </div>

      <div class="console reveal" aria-label="Live system console">
        <div class="console-head">
          <div class="lights"><i></i><i></i><i></i></div>
          <div class="tag">evolve · core status</div>
        </div>
        <div class="console-rows">
          <div class="crow">
            <svg class="ic" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#38E4C9" stroke-width="1.6"/><path d="M4 7l8 6 8-6" stroke="#38E4C9" stroke-width="1.6"/></svg>
            <div><div class="label">Evolve Mail</div><div class="sub">encrypted · inbound triaged</div></div>
            <div class="status st-aqua">SECURE</div>
          </div>
          <div class="crow">
            <svg class="ic" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" stroke="#FFC46B" stroke-width="1.6"/><path d="M3 9h18M8 2v4M16 2v4" stroke="#FFC46B" stroke-width="1.6"/></svg>
            <div><div class="label">Evolve Calendar</div><div class="sub">15 slots · timezone-aware</div></div>
            <div class="status st-amber">BOOKING</div>
          </div>
          <div class="crow">
            <svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M3 8a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#8B7BFF" stroke-width="1.6"/><path d="M16 10l5-3v10l-5-3" stroke="#8B7BFF" stroke-width="1.6"/></svg>
            <div><div class="label">Evolve Meet</div><div class="sub">consent-gated · recording</div></div>
            <div class="status st-violet">LIVE</div>
          </div>
        </div>
        <div class="console-foot">
          <span>self-heal · optimize · patch</span>
          <span style="display:inline-flex;align-items:center;gap:8px;"><i class="pulse"></i>all systems nominal</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ================= TELEMETRY ================= -->
  <section class="telemetry" id="results">
    <div class="wrap">
      <div class="tele-grid">
        <div class="tele reveal"><div class="num" data-count="256" data-suffix="-bit">0</div><div class="cap">GCM encryption at rest</div></div>
        <div class="tele reveal"><div class="num" data-count="24" data-suffix="/7">0</div><div class="cap">Autonomous operation</div></div>
        <div class="tele reveal"><div class="num" data-count="100" data-suffix="%">0</div><div class="cap">Consent-gated recording</div></div>
        <div class="tele reveal"><div class="num">3<span class="u">→</span>1</div><div class="cap">Apps on one brain</div></div>
      </div>
    </div>
  </section>

  <!-- ================= PRODUCT BAYS ================= -->
  <section class="sec-pad wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">The Instruments</span>
      <h2>Purpose-built for the work you actually do.</h2>
      <p>Each instrument is autonomous on its own and unstoppable together — sharing one identity, one encrypted store, and one self-improving core.</p>
    </div>

    <!-- MAIL -->
    <div class="bay reveal" id="mail" style="--hue:var(--aqua); --hue-soft:var(--aqua-soft);">
      <div class="bay-copy">
        <div class="bay-kicker"><span class="chip">01</span> Evolve Mail</div>
        <h3>Encrypted email that reads its own inbox.</h3>
        <p class="desc">A private mailbox that replaces your old provider — every message sealed with AES-256-GCM at rest, triaged the moment it lands, and answered in your voice.</p>
        <ul class="feat">
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--aqua)" stroke-width="2.4"/></svg></span><span><b>End-to-end encryption at rest.</b> Bodies and attachments sealed with envelope keys — even the operator can't read the vault without your key.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--aqua)" stroke-width="2.4"/></svg></span><span><b>AI triage &amp; drafting.</b> Inbound mail is sorted by priority and intent, with reply drafts ready before you open it.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--aqua)" stroke-width="2.4"/></svg></span><span><b>Massive attachments.</b> Documents and full-length video move through presigned multipart uploads — no size ceiling to work around.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--aqua)" stroke-width="2.4"/></svg></span><span><b>A personality that lands.</b> A witty, privacy-safe sign-off on every send — and an optional birthday surprise for the people who opt in.</span></li>
        </ul>
      </div>
      <div class="bay-media">
        <div class="glass">
          <!-- encrypted mail lattice graphic -->
          <svg viewBox="0 0 420 300" fill="none" role="img" aria-label="Encrypted envelope over a data lattice">
            <defs>
              <linearGradient id="mailG" x1="0" y1="0" x2="420" y2="300"><stop stop-color="#38E4C9"/><stop offset="1" stop-color="#1f8f7f"/></linearGradient>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#38E4C9" stroke-opacity="0.12"/></pattern>
            </defs>
            <rect x="0" y="0" width="420" height="300" fill="url(#grid)"/>
            <g transform="translate(110 70)">
              <rect x="0" y="0" width="200" height="140" rx="14" fill="#0c1a1a" stroke="url(#mailG)" stroke-width="2"/>
              <path d="M8 14l92 66 92-66" stroke="url(#mailG)" stroke-width="2" fill="none"/>
              <g transform="translate(78 92)">
                <rect x="0" y="18" width="44" height="34" rx="6" fill="url(#mailG)"/>
                <path d="M6 18v-8a16 16 0 0132 0v8" stroke="url(#mailG)" stroke-width="4" fill="none"/>
                <circle cx="22" cy="34" r="5" fill="#04120f"/>
              </g>
            </g>
            <circle cx="60" cy="60" r="4" fill="#38E4C9"/><circle cx="360" cy="240" r="4" fill="#38E4C9"/>
            <circle cx="360" cy="60" r="3" fill="#38E4C9" opacity=".6"/><circle cx="60" cy="240" r="3" fill="#38E4C9" opacity=".6"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- CALENDAR -->
    <div class="bay flip reveal" id="calendar" style="--hue:var(--amber); --hue-soft:var(--amber-soft);">
      <div class="bay-media">
        <div class="glass">
          <!-- orbital scheduling graphic -->
          <svg viewBox="0 0 420 300" fill="none" role="img" aria-label="Orbital scheduling rings">
            <defs><linearGradient id="calG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFC46B"/><stop offset="1" stop-color="#c9821f"/></linearGradient></defs>
            <g transform="translate(210 150)">
              <ellipse cx="0" cy="0" rx="150" ry="60" stroke="#FFC46B" stroke-opacity=".25" stroke-width="1.5"/>
              <ellipse cx="0" cy="0" rx="110" ry="44" stroke="#FFC46B" stroke-opacity=".4" stroke-width="1.5"/>
              <ellipse cx="0" cy="0" rx="70" ry="28" stroke="#FFC46B" stroke-opacity=".6" stroke-width="1.5"/>
              <circle cx="0" cy="0" r="26" fill="url(#calG)"/>
              <path d="M-9 0l6 6 12-13" stroke="#241704" stroke-width="3.2" fill="none"/>
              <circle cx="150" cy="0" r="6" fill="#FFC46B"/>
              <circle cx="-95" cy="26" r="5" fill="#FFC46B" opacity=".85"/>
              <circle cx="55" cy="-24" r="5" fill="#FFC46B" opacity=".7"/>
              <circle cx="-58" cy="-20" r="4" fill="#FFC46B" opacity=".5"/>
            </g>
            <g font-family="ui-monospace, monospace" font-size="11" fill="#FFC46B" opacity=".8">
              <text x="24" y="40">09:00</text><text x="342" y="40">14:30</text><text x="24" y="268">FREE</text><text x="330" y="268">BOOKED</text>
            </g>
          </svg>
        </div>
      </div>
      <div class="bay-copy">
        <div class="bay-kicker"><span class="chip">02</span> Evolve Calendar</div>
        <h3>A calendar the voice agent books for you.</h3>
        <p class="desc">Natural-language scheduling that understands availability, timezones, and conflicts — and hands clean, subscribable events straight to your existing calendar apps.</p>
        <ul class="feat">
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--amber)" stroke-width="2.4"/></svg></span><span><b>Talk to it, it books it.</b> The autonomous voice agent turns "next Tuesday afternoon" into a conflict-checked, timezone-correct event.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--amber)" stroke-width="2.4"/></svg></span><span><b>Never double-books.</b> Availability rules and live conflict guards mean the only slots offered are the ones that are truly open.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--amber)" stroke-width="2.4"/></svg></span><span><b>Reminders that fire themselves.</b> Attendees are nudged automatically, once per event, before it starts.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--amber)" stroke-width="2.4"/></svg></span><span><b>Works with what you have.</b> Per-event <span class="mono">.ics</span> downloads and a subscribable feed drop into Apple, Google, and Outlook.</span></li>
        </ul>
      </div>
    </div>

    <!-- MEET -->
    <div class="bay reveal" id="meet" style="--hue:var(--violet); --hue-soft:var(--violet-soft);">
      <div class="bay-copy">
        <div class="bay-kicker"><span class="chip">03</span> Evolve Meet</div>
        <h3>Video meetings &amp; webinars, consent-first.</h3>
        <p class="desc">Multi-party rooms that record, transcribe, and summarize — but only after a very visible authorization screen where every participant opts in or out, option by option.</p>
        <ul class="feat">
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--violet)" stroke-width="2.4"/></svg></span><span><b>Consent before capture.</b> Recording, transcription, summary, and report-sharing each require an explicit, visible opt-in — no surprises, ever.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--violet)" stroke-width="2.4"/></svg></span><span><b>Live dictation &amp; AI summaries.</b> Rooms transcribe as you speak and produce a summary plus reports — delivered only to those who granted permission.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--violet)" stroke-width="2.4"/></svg></span><span><b>Share, review, approve.</b> Screen share, asset transfer, and client delivery with an Approve / Request-Revision box that captures exactly what to change.</span></li>
          <li><span class="tick"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="var(--violet)" stroke-width="2.4"/></svg></span><span><b>Webinars that convert.</b> Public registration feeds your CRM and a pinned buy-CTA lets attendees purchase live, in the room.</span></li>
        </ul>
      </div>
      <div class="bay-media">
        <div class="glass">
          <!-- broadcast / consent graphic -->
          <svg viewBox="0 0 420 300" fill="none" role="img" aria-label="Broadcast waves with consent shield">
            <defs><linearGradient id="meetG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8B7BFF"/><stop offset="1" stop-color="#5b49d6"/></linearGradient></defs>
            <g transform="translate(150 150)">
              <path d="M0 0 A70 70 0 0 1 0 0" />
              <circle r="30" fill="url(#meetG)"/>
              <path d="M-11 -8h16a4 4 0 014 4v8a4 4 0 01-4 4h-16z" fill="#160f2e"/>
              <path d="M11 -4l9 -5v18l-9 -5z" fill="#160f2e"/>
              <g stroke="#8B7BFF" fill="none">
                <path d="M46 -34a58 58 0 010 68" stroke-opacity=".7" stroke-width="2"/>
                <path d="M64 -50a84 84 0 010 100" stroke-opacity=".45" stroke-width="2"/>
                <path d="M82 -66a110 110 0 010 132" stroke-opacity=".25" stroke-width="2"/>
              </g>
            </g>
            <g transform="translate(300 96)">
              <path d="M0 0l30 10v22c0 18-14 30-30 38-16-8-30-20-30-38V10z" fill="#160f2e" stroke="url(#meetG)" stroke-width="2"/>
              <path d="M-12 34l8 8 18-20" stroke="#8B7BFF" stroke-width="3" fill="none"/>
            </g>
            <g font-family="ui-monospace, monospace" font-size="10" fill="#8B7BFF" opacity=".85">
              <text x="250" y="200">CONSENT ✓ REC</text><text x="250" y="216">CONSENT ✓ SUMMARY</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </section>

  <!-- ================= AUTONOMY ================= -->
  <section class="autonomy sec-pad" id="autonomy">
    <div class="wrap orbit-wrap">
      <div class="reveal">
        <span class="eyebrow">The Core</span>
        <h2 style="font-size:clamp(1.9rem,3.6vw,2.8rem);margin:18px 0 16px;">It runs, repairs, and hardens itself.</h2>
        <p style="color:var(--ink-dim);margin:0 0 26px;max-width:44ch;">Underneath all three instruments is one closed loop that never sleeps — watching itself, fixing what drifts, tuning what's slow, and patching what's exposed.</p>
        <div class="glass" style="--hue:var(--aqua);--hue-soft:var(--aqua-soft);padding:22px;">
          <svg viewBox="0 0 300 240" fill="none" role="img" aria-label="Autonomous self-healing loop">
            <defs><linearGradient id="loopG" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#38E4C9"/><stop offset=".5" stop-color="#FFC46B"/><stop offset="1" stop-color="#8B7BFF"/></linearGradient></defs>
            <circle cx="150" cy="120" r="86" fill="none" stroke="url(#loopG)" stroke-width="2" stroke-dasharray="5 7"/>
            <circle cx="150" cy="120" r="40" fill="none" stroke="url(#loopG)" stroke-width="1.5"/>
            <text x="150" y="118" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="var(--ink)">CORE</text>
            <text x="150" y="132" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" fill="var(--muted)">always on</text>
            <g font-family="ui-monospace,monospace" font-size="10" fill="var(--ink-dim)">
              <circle cx="150" cy="34" r="6" fill="#38E4C9"/><text x="150" y="22" text-anchor="middle">HEAL</text>
              <circle cx="224" cy="120" r="6" fill="#FFC46B"/><text x="236" y="124" text-anchor="start">OPTIMIZE</text>
              <circle cx="150" cy="206" r="6" fill="#8B7BFF"/><text x="150" y="226" text-anchor="middle">PATCH</text>
              <circle cx="76" cy="120" r="6" fill="#38E4C9"/><text x="64" y="124" text-anchor="end">AUDIT</text>
            </g>
          </svg>
        </div>
      </div>
      <div class="loop-list reveal">
        <div class="loop-item"><div class="n">01</div><div><h4>Self-healing</h4><p>Detects failures and broken state, then repairs them automatically before they reach a customer.</p></div></div>
        <div class="loop-item"><div class="n">02</div><div><h4>Self-optimizing</h4><p>Watches its own latency and cost, and continuously tunes for faster, leaner operation.</p></div></div>
        <div class="loop-item"><div class="n">03</div><div><h4>Self-securing</h4><p>Runs scheduled security audits and applies updates against new threats on a recurring cron.</p></div></div>
        <div class="loop-item"><div class="n">04</div><div><h4>Profit-guarded</h4><p>A built-in margin floor refuses to run any price that would lose money — the business can't operate at a loss.</p></div></div>
      </div>
    </div>
  </section>

  <!-- ================= OUTCOMES ================= -->
  <section class="sec-pad wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">The Results</span>
      <h2>What you get, not what it costs.</h2>
      <p>Outcomes the suite delivers out of the box — verified end-to-end before it ever ships.</p>
    </div>
    <div class="outcomes">
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.6"/></svg><h4>Private by default</h4><p>Every message and file is encrypted at rest — tamper is detected, not tolerated.</p></div>
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M12 2v6M12 22v-6M2 12h6M22 12h-6" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/></svg><h4>Runs without you</h4><p>The voice agent books, the inbox triages, and the core maintains itself 24/7.</p></div>
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="1.8"/></svg><h4>Consent you can prove</h4><p>Recording and reports only happen after a visible, per-option opt-in — logged and auditable.</p></div>
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M3 17l6-6 4 4 8-8" stroke="currentColor" stroke-width="1.8"/><path d="M15 7h6v6" stroke="currentColor" stroke-width="1.8"/></svg><h4>Always in the black</h4><p>A hard margin floor guarantees every action is priced to profit — you can't lose money.</p></div>
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.6"/></svg><h4>Nothing falls through</h4><p>Reminders fire, leads get followed up, and stale deals surface — automatically.</p></div>
      <div class="oc reveal"><svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" stroke="currentColor" stroke-width="1.6"/></svg><h4>One brain, three tools</h4><p>Mail, Calendar, and Meet share identity, data, and intelligence — install it once.</p></div>
    </div>
  </section>

  <!-- ================= FINAL CTA ================= -->
  <section class="final" id="access">
    <h2>Stop managing tools.<br>Start running an autonomous business.</h2>
    <p>Evolve replaces your inbox, your scheduler, and your meeting room with one system that works while you don't.</p>
    <div class="hero-cta">
      <a href="#top" class="btn btn-primary">Request access</a>
      <a href="#mail" class="btn btn-ghost">Explore the suite</a>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot-inner">
    <span class="brand">Evolve</span>
    <span>Encrypted Mail · Autonomous Calendar · Consent-first Meet</span>
    <span>The Autonomous Business OS</span>
  </div>
</footer>`;
const SCRIPT = `
  // ---- theme toggle ----
  (function () {
    var root = document.documentElement;
    var btn = document.getElementById('themeBtn');
    btn.addEventListener('click', function () {
      // Dark is the default when no explicit theme is set.
      var cur = root.getAttribute('data-theme') || 'dark';
      root.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
    });
  })();

  // ---- reveal on scroll ----
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function(e){e.classList.add('in');}); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.16 });
    els.forEach(function (e) { io.observe(e); });
  })();

  // ---- count up ----
  (function () {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nums = document.querySelectorAll('.num[data-count]');
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduce) { el.innerHTML = target + '<span class="u">' + suffix + '</span>'; return; }
      var start = null, dur = 1200;
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

  // ---- ambient signal field ----
  (function () {
    var canvas = document.getElementById('field');
    if (!canvas) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = canvas.getContext('2d');
    var w, h, dpr, nodes = [], raf;
    var hues = ['56,228,201', '255,196,107', '139,123,255'];

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function init() {
      size();
      var count = Math.min(64, Math.floor(w / 22));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          hue: hues[i % hues.length], r: Math.random() * 1.6 + 0.6
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j], dx = n.x - m.x, dy = n.y - m.y, d = Math.sqrt(dx*dx + dy*dy);
          if (d < 116) {
            ctx.strokeStyle = 'rgba(' + n.hue + ',' + (0.12 * (1 - d/116)) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(' + n.hue + ',0.9)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { cancelAnimationFrame(raf); init(); if (!reduce) frame(); else { init(); drawStatic(); } }
    function drawStatic() {
      ctx.clearRect(0,0,w,h);
      nodes.forEach(function (n) { ctx.fillStyle = 'rgba(' + n.hue + ',0.7)'; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2); ctx.fill(); });
    }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(start, 180); });
    start();
  })();
`;

export default function SuiteLanding() {
  useEffect(() => {
    const el = document.createElement("script");
    el.textContent = SCRIPT;
    el.setAttribute("data-suite", "1");
    document.body.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </>
  );
}
