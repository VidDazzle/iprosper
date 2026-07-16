"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navigation from "@/components/sections/navigation";
import { Video, Plus, Loader2, ArrowRight, ShieldCheck, Sparkles, FileCheck2 } from "lucide-react";

interface Meeting {
  id: number;
  roomCode: string;
  title: string;
  status: string;
  createdAt: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/meetings");
    const data = await res.json();
    setMeetings(data.meetings || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, hostName: hostName || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    setTitle("");
    if (data.meeting) window.location.href = `/meetings/${data.meeting.roomCode}`;
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <Video className="h-3.5 w-3.5" /> Evolve Meet — AI video meetings
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Meetings</h1>
          <p className="mt-2 max-w-2xl text-gray-400">
            Consent-first video with live dictation, recording, AI summaries, and per-revision
            approvals on shared work. Two or more participants, on any device.
          </p>
        </div>

        {/* Feature chips */}
        <div className="mb-8 flex flex-wrap gap-2 text-xs text-gray-400">
          {[
            { icon: ShieldCheck, label: "Express-consent authorization screen" },
            { icon: Sparkles, label: "AI dictation + summaries" },
            { icon: FileCheck2, label: "Approve / Not-approved per revision" },
          ].map((f) => (
            <span key={f.label} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5">
              <f.icon className="h-3.5 w-3.5 text-blue-400" /> {f.label}
            </span>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Create */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-purple-500/5 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-200">
                <Plus className="h-4 w-4" /> Start a new meeting
              </h2>
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Meeting title (e.g. Acme design review)"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/60"
                />
                <input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Your name (host)"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/60"
                />
                <button
                  onClick={create}
                  disabled={creating}
                  className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Create & enter room
                </button>
              </div>
            </div>
          </div>

          {/* Join */}
          <div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="mb-3 text-sm font-medium text-gray-300">Join by code</h2>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.trim())}
                  placeholder="evolve-xxxx-xx"
                  className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
                />
                <Link
                  href={joinCode ? `/meetings/${joinCode}` : "#"}
                  className="flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recent */}
        <h2 className="mb-4 mt-10 text-lg font-semibold">Recent meetings</h2>
        {loading ? (
          <div className="flex h-24 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <p className="text-sm text-gray-500">No meetings yet.</p>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => (
              <Link
                key={m.id}
                href={`/meetings/${m.roomCode}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-white/20"
              >
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500">
                    {m.roomCode} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                    m.status === "live"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : m.status === "ended"
                      ? "border-gray-600 bg-gray-500/10 text-gray-400"
                      : "border-blue-500/40 bg-blue-500/10 text-blue-300"
                  }`}
                >
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
