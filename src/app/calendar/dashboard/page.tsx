"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  Video,
  RefreshCw,
  Mic,
  CheckCircle2,
} from "lucide-react";

interface Event {
  id: number;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: string;
  attendees: string | null;
  meetingUrl: string | null;
  source: string;
  agentNotes: string | null;
}

interface Slot {
  start: string;
  end: string;
}

function fmt(iso: string, tz = "America/New_York") {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const sourceBadge: Record<string, string> = {
  voice_agent: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  ai: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  manual: "bg-gray-500/20 text-gray-300 border-gray-500/40",
  api: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function CalendarDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [nlText, setNlText] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const from = new Date().toISOString();
    const res = await fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&order=asc`);
    const data = await res.json();
    setEvents((data.events || []).filter((e: Event) => e.status !== "cancelled"));
  }, []);

  const loadSlots = useCallback(async () => {
    const res = await fetch(`/api/calendar/availability?limit=8`);
    const data = await res.json();
    setSlots(data.slots || []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadEvents(), loadSlots()]);
    setLoading(false);
  }, [loadEvents, loadSlots]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSchedule() {
    if (!nlText.trim()) return;
    setScheduling(true);
    setMessage(null);
    try {
      const res = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlText, book: true }),
      });
      const data = await res.json();
      if (data.scheduled && data.event) {
        setMessage(`✓ Booked "${data.event.title}" for ${fmt(data.event.startsAt, data.event.timezone)}`);
        setNlText("");
        await refresh();
      } else {
        setMessage(data.reason || "Couldn't find a matching slot. Try being more specific.");
      }
    } catch {
      setMessage("Something went wrong scheduling that.");
    } finally {
      setScheduling(false);
    }
  }

  async function bookSlot(slot: Slot) {
    await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Available slot booking",
        startsAt: slot.start,
        endsAt: slot.end,
        source: "manual",
      }),
    });
    await refresh();
  }

  async function cancelEvent(id: number) {
    await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
              <Mic className="h-3.5 w-3.5" /> Voice-agent connected
            </div>
            <h1 className="text-4xl font-bold tracking-tight">AI Calendar</h1>
            <p className="mt-2 max-w-2xl text-gray-400">
              Your autonomous scheduling command center. The voice agent books, reschedules, and
              cancels through the same engine you see here.
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Natural language scheduler */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-purple-200">
            <Sparkles className="h-4 w-4" /> Ask the AI scheduler
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSchedule()}
              placeholder='e.g. "Book a 30 minute demo with jordan@acme.com next Tuesday afternoon"'
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/60"
            />
            <button
              onClick={handleSchedule}
              disabled={scheduling}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60"
            >
              {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Schedule
            </button>
          </div>
          {message && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> {message}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upcoming events */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-purple-400" /> Upcoming ({events.length})
            </h2>
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500">
                No upcoming meetings. Ask the AI scheduler above to book one.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="group flex items-start justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{ev.title}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            sourceBadge[ev.source] || sourceBadge.manual
                          }`}
                        >
                          {ev.source.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {fmt(ev.startsAt, ev.timezone)}
                        </span>
                        {ev.attendees && <span className="truncate">{ev.attendees}</span>}
                        {ev.meetingUrl && (
                          <a
                            href={ev.meetingUrl}
                            className="flex items-center gap-1 text-blue-400 hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" /> Join
                          </a>
                        )}
                      </div>
                      {ev.agentNotes && (
                        <p className="mt-2 line-clamp-2 text-xs italic text-gray-500">“{ev.agentNotes}”</p>
                      )}
                    </div>
                    <button
                      onClick={() => cancelEvent(ev.id)}
                      className="ml-4 rounded-lg p-2 text-gray-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      title="Cancel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open slots */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-emerald-400" /> Open slots
            </h2>
            <div className="space-y-2">
              {slots.length === 0 && !loading && (
                <p className="text-sm text-gray-500">No open slots in the next two weeks.</p>
              )}
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => bookSlot(slot)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-sm hover:border-emerald-500/50 hover:bg-emerald-500/5"
                >
                  <span>{fmt(slot.start)}</span>
                  <span className="text-xs text-emerald-400">Book</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
