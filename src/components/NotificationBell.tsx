"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

// Only show the bell inside the app (not on marketing pages).
const APP_PREFIXES = ["/home", "/mail", "/calendar", "/meetings", "/life", "/fitness", "/together", "/discover", "/chat", "/crm", "/plans", "/notifications", "/insights", "/maintenance", "/deliverables", "/products"];

interface Note { id: number; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string; }

const ICON: Record<string, string> = { reminder: "⏰", tap: "👋", match: "🎉", meetup: "📅", message: "💬", system: "⚙️", general: "🔔" };

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inApp = APP_PREFIXES.some((p) => pathname?.startsWith(p));

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.notifications || []); setUnread(d.unread || 0);
    } catch { /* offline: ignore */ }
  }, []);

  useEffect(() => { if (!inApp) return; load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, [load, inApp]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick); return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!inApp) return null;

  const markAll = async () => { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }); load(); };
  const openNote = async (n: Note) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
    if (n.link) window.location.href = n.link; else load();
  };

  return (
    <div ref={ref} style={{ position: "fixed", top: 12, right: 12, zIndex: 60 }}>
      <button onClick={() => { setOpen((o) => !o); if (!open) load(); }} aria-label="Notifications"
        style={{ position: "relative", width: 40, height: 40, borderRadius: 12, background: "rgba(13,19,28,0.9)", border: "1px solid rgba(150,175,205,0.22)", color: "#eaf1f8", display: "grid", placeItems: "center", cursor: "pointer", backdropFilter: "blur(8px)" }}>
        <Bell size={18} />
        {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: "#ff5c7a", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", fontFamily: "ui-monospace, monospace" }}>{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div style={{ position: "absolute", top: 48, right: 0, width: 340, maxHeight: 460, overflowY: "auto", background: "#0d131c", border: "1px solid rgba(150,175,205,0.2)", borderRadius: 14, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)", color: "#eaf1f8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid rgba(150,175,205,0.12)" }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            {unread > 0 && <button onClick={markAll} style={{ background: "none", border: "none", color: "#38e4c9", fontSize: 12, cursor: "pointer" }}>Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#8494a8", fontSize: 13 }}>You're all caught up.</div>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => openNote(n)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", background: n.readAt ? "transparent" : "rgba(56,228,201,0.06)", border: "none", borderBottom: "1px solid rgba(150,175,205,0.08)", color: "inherit", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 9 }}>
                <span aria-hidden style={{ fontSize: 15 }}>{ICON[n.type] || "🔔"}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                    <span style={{ color: "#8494a8", fontWeight: 400, fontSize: 11, flexShrink: 0, fontFamily: "ui-monospace, monospace" }}>{ago(n.createdAt)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 12.5, color: "#b4c2d4", marginTop: 2 }}>{n.body}</div>}
                </div>
              </div>
            </button>
          ))}
          <a href="/notifications" style={{ display: "block", textAlign: "center", padding: "10px", fontSize: 12.5, color: "#8494a8", textDecoration: "none", borderTop: "1px solid rgba(150,175,205,0.12)" }}>See all</a>
        </div>
      )}
    </div>
  );
}
