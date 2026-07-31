"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Loader2, Sparkles, Mail, CalendarClock, Video, Heart, Compass,
  MessageSquare, Bell, Clock, MapPin, ArrowRight, Users2, LayoutGrid, Dumbbell,
} from "lucide-react";

interface Home {
  me: { name: string; timezone: string; onboarded: boolean };
  todaysEvents: { id: number; title: string; startsAt: string; location: string | null }[];
  unreadMail: number;
  upcomingReminders: { id: number; title: string; whenAt: string }[];
  notifications: number;
  hasPartner: boolean;
  discover: { matches: number; tappedYou: number; nearby: number };
  unreadChats: number;
}

function timeOnly(iso: string, tz: string) { return new Date(iso).toLocaleString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }); }
function when(iso: string, tz: string) { return new Date(iso).toLocaleString("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }); }

const MODULES = [
  { href: "/mail", label: "Mail", icon: Mail, hue: "#38E4C9", desc: "Encrypted inbox" },
  { href: "/calendar/dashboard", label: "Calendar", icon: CalendarClock, hue: "#FFC46B", desc: "AI scheduling" },
  { href: "/meetings", label: "Meet", icon: Video, hue: "#8B7BFF", desc: "Video + webinars" },
  { href: "/life", label: "Life", icon: Sparkles, hue: "#38E4C9", desc: "Personal concierge" },
  { href: "/fitness", label: "Fitness", icon: Dumbbell, hue: "#FF8A3D", desc: "Goals + tracker" },
  { href: "/together", label: "Together", icon: Heart, hue: "#FF6B8A", desc: "You + your partner" },
  { href: "/discover", label: "Discover", icon: Compass, hue: "#5BC8FF", desc: "Meet people nearby" },
  { href: "/chat", label: "Messages", icon: MessageSquare, hue: "#38E4C9", desc: "Chat" },
  { href: "/crm", label: "CRM", icon: Users2, hue: "#FFC46B", desc: "Pipeline + deals" },
];

export default function HomePage() {
  const [data, setData] = useState<Home | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await (await fetch("/api/home")).json()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tz = data?.me.timezone || "America/New_York";
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans"><Navigation />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center gap-2 mb-1"><LayoutGrid className="w-5 h-5 text-emerald-400" /><span className="text-xs font-mono uppercase tracking-widest text-slate-500">Evolve Home</span></div>
        <h1 className="text-3xl font-bold tracking-tight mb-8">{greeting}{data?.me.name ? `, ${data.me.name.split("@")[0].split(" ")[0]}` : ""}.</h1>

        {loading || !data ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div> : (
          <div className="space-y-8">
            {/* stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat icon={Mail} label="Unread mail" value={data.unreadMail} href="/mail" hue="#38E4C9" />
              <Stat icon={Bell} label="Notifications" value={data.notifications} href="/notifications" hue="#FFC46B" />
              <Stat icon={MessageSquare} label="Unread chats" value={data.unreadChats} href="/chat" hue="#8B7BFF" />
              <Stat icon={Heart} label="Matches" value={data.discover.matches} href="/discover" hue="#FF6B8A" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* today's agenda */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-amber-300" /> Today</h3>
                  <a href="/calendar/dashboard" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Calendar <ArrowRight className="w-3 h-3" /></a>
                </div>
                {data.todaysEvents.length === 0 ? <p className="text-sm text-slate-500">Nothing on the calendar today — wide open.</p>
                  : <div className="space-y-2">
                      {data.todaysEvents.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 rounded-lg bg-black/30 border border-white/10 p-2.5">
                          <div className="text-xs font-mono text-amber-200 w-16 shrink-0">{timeOnly(e.startsAt, tz)}</div>
                          <div className="min-w-0"><div className="text-sm font-medium truncate">{e.title}</div>{e.location && <div className="text-xs text-slate-500 truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</div>}</div>
                        </div>
                      ))}
                    </div>}
              </div>

              {/* reminders + discover */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-400" /> Upcoming reminders</h3>
                    <a href="/life" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">Life <ArrowRight className="w-3 h-3" /></a>
                  </div>
                  {data.upcomingReminders.length === 0 ? <p className="text-sm text-slate-500">No reminders in the next few days.</p>
                    : <div className="space-y-2">{data.upcomingReminders.map((r) => (
                        <div key={r.id} className="flex justify-between gap-2 text-sm rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                          <span className="truncate">{r.title}</span><span className="text-xs text-slate-500 font-mono shrink-0">{when(r.whenAt, tz)}</span>
                        </div>
                      ))}</div>}
                </div>

                {(data.discover.tappedYou > 0 || data.discover.matches > 0) && (
                  <a href="/discover" className="block rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 hover:border-cyan-400/40">
                    <div className="flex items-center gap-2 mb-1"><Compass className="w-4 h-4 text-cyan-400" /><h3 className="font-semibold">Discover</h3></div>
                    <p className="text-sm text-slate-300">
                      {data.discover.tappedYou > 0 && <><span className="text-cyan-300 font-medium">{data.discover.tappedYou}</span> {data.discover.tappedYou === 1 ? "person is" : "people are"} interested in you. </>}
                      {data.discover.matches > 0 && <><span className="text-rose-300 font-medium">{data.discover.matches}</span> {data.discover.matches === 1 ? "match" : "matches"}. </>}
                      {data.discover.nearby} nearby with shared interests.
                    </p>
                  </a>
                )}
              </div>
            </div>

            {/* module launcher */}
            <div>
              <h3 className="font-semibold mb-4 text-slate-300">Your apps</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MODULES.map((m) => (
                  <a key={m.href} href={m.href} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/25 transition">
                    <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${m.hue}22` }}><m.icon className="w-5 h-5" style={{ color: m.hue }} /></div>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-slate-500">{m.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, href, hue }: { icon: typeof Mail; label: string; value: number; href: string; hue: string }) {
  return (
    <a href={href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/25 transition block">
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4" style={{ color: hue }} />
        <span className="text-2xl font-bold tabular-nums" style={{ color: value > 0 ? hue : undefined }}>{value}</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </a>
  );
}
