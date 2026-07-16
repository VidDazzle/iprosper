"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Loader2,
  ShieldCheck,
  Circle,
  Square,
  FileText,
  Sparkles,
  Check,
  X,
  Paperclip,
  Download,
  MonitorUp,
  Link2,
  RotateCcw,
} from "lucide-react";
import {
  MeetingMesh,
  uploadMeetingAsset,
  type UploadProgress,
} from "@/lib/meeting-client";
import ScoreCard from "@/components/ScoreCard";

type Stage = "loading" | "prejoin" | "consent" | "room" | "notfound";

interface Consent {
  recording: boolean;
  transcription: boolean;
  summary: boolean;
  reports: boolean;
}

export default function MeetingRoom() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const [stage, setStage] = useState<Stage>("loading");
  const [meeting, setMeeting] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [consent, setConsent] = useState<Consent>({
    recording: false,
    transcription: false,
    summary: false,
    reports: false,
  });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/meetings/${roomId}`);
      if (res.status === 404) return setStage("notfound");
      const data = await res.json();
      setMeeting(data.meeting);
      setStage("prejoin");
    })();
  }, [roomId]);

  async function join() {
    if (!name.trim()) return;
    const res = await fetch(`/api/meetings/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: email || undefined }),
    });
    const data = await res.json();
    setParticipantId(data.participantId);
    setStage("consent");
  }

  async function submitConsent() {
    await fetch(`/api/meetings/${roomId}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, ...consent }),
    });
    setStage("room");
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (stage === "notfound") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-300">
        Meeting not found.
      </div>
    );
  }

  if (stage === "prejoin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-8">
          <div className="mb-1 flex items-center gap-2 text-blue-300">
            <Video className="h-5 w-5" /> <span className="text-sm">Evolve Meet</span>
          </div>
          <h1 className="mb-1 text-2xl font-bold">{meeting?.title}</h1>
          <p className="mb-6 text-sm text-gray-400">Room {meeting?.roomCode}</p>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-blue-500/60"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional — for your report)"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-blue-500/60"
            />
            <button
              onClick={join}
              className="w-full rounded-lg bg-white py-3 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "consent") {
    return (
      <ConsentGate
        meeting={meeting}
        consent={consent}
        setConsent={setConsent}
        onEnter={submitConsent}
        onDecline={() => (window.location.href = "/meetings")}
      />
    );
  }

  return (
    <Room
      roomId={roomId}
      meeting={meeting}
      participantId={participantId!}
      name={name}
      consent={consent}
    />
  );
}

// ---------------------------------------------------------------------------
// Consent / authorization screen — deliberately large and unmissable.
// ---------------------------------------------------------------------------
function ConsentGate({
  meeting,
  consent,
  setConsent,
  onEnter,
  onDecline,
}: {
  meeting: any;
  consent: Consent;
  setConsent: (c: Consent) => void;
  onEnter: () => void;
  onDecline: () => void;
}) {
  const items: { key: keyof Consent; title: string; desc: string; offered: boolean }[] = [
    {
      key: "recording",
      title: "Recording",
      desc: "Allow this meeting to be recorded while you're present.",
      offered: meeting?.recordingOffered !== false,
    },
    {
      key: "transcription",
      title: "Live transcription (dictation)",
      desc: "Allow your speech to be transcribed into the meeting notes.",
      offered: meeting?.transcriptionOffered !== false,
    },
    {
      key: "summary",
      title: "AI summary",
      desc: "Allow an AI summary of the discussion to be generated.",
      offered: meeting?.summaryOffered !== false,
    },
    {
      key: "reports",
      title: "Emailed report to me",
      desc: "Send the meeting notes/summary to my email afterward.",
      offered: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-yellow-500/30 bg-[#161616] p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-500/15">
            <ShieldCheck className="h-6 w-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Your permission, your choice</h1>
            <p className="text-sm text-gray-400">Nothing is on unless you turn it on.</p>
          </div>
        </div>

        <p className="mb-5 text-sm text-gray-300">
          Before you enter <span className="font-medium text-white">{meeting?.title}</span>, choose
          what you consent to. You start opted <span className="font-semibold text-yellow-300">out</span>{" "}
          of everything.
        </p>

        <div className="space-y-3">
          {items.map((it) => (
            <label
              key={it.key}
              className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 transition ${
                consent[it.key] ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]"
              } ${!it.offered ? "pointer-events-none opacity-40" : ""}`}
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {it.title}
                  {!it.offered && <span className="ml-2 text-xs text-gray-500">(disabled by host)</span>}
                </div>
                <div className="text-xs text-gray-400">{it.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={consent[it.key]}
                disabled={!it.offered}
                onChange={(e) => setConsent({ ...consent, [it.key]: e.target.checked })}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onEnter}
            className="flex-1 rounded-lg bg-white py-3 text-sm font-semibold text-black hover:bg-gray-200"
          >
            Enter meeting with these choices
          </button>
          <button
            onClick={onDecline}
            className="rounded-lg border border-white/15 px-4 py-3 text-sm text-gray-300 hover:bg-white/5"
          >
            Decline &amp; leave
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          You can leave at any time. Your choices are recorded with a timestamp.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------
function Room({
  roomId,
  meeting,
  participantId,
  name,
  consent,
}: {
  roomId: string;
  meeting: any;
  participantId: number;
  name: string;
  consent: Consent;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const meshRef = useRef<MeetingMesh | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const [remote, setRemote] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  // Acquire local media + start the mesh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const mesh = new MeetingMesh(roomId, `p${participantId}`, stream, {
          onRemoteStream: (id, s) =>
            setRemote((prev) => (prev.some((r) => r.id === id) ? prev : [...prev, { id, stream: s }])),
          onPeerLeave: (id) => setRemote((prev) => prev.filter((r) => r.id !== id)),
        });
        meshRef.current = mesh;
        mesh.start();
        fetch(`/api/meetings/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "live" }),
        }).catch(() => {});
      } catch {
        setMediaError("Camera/microphone unavailable or permission denied.");
      }
    })();
    return () => {
      cancelled = true;
      meshRef.current?.stop();
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      recognitionRef.current?.stop?.();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, participantId]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }
  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  }
  function leave() {
    meshRef.current?.stop();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    window.location.href = "/meetings";
  }

  // Screen share — replaces the outgoing video track on every peer, then
  // restores the camera when sharing stops (or the browser's Stop is clicked).
  async function toggleScreenShare() {
    if (sharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam) {
        meshRef.current?.replaceVideoTrack(cam);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      }
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = display;
      const screenTrack = display.getVideoTracks()[0];
      meshRef.current?.replaceVideoTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = display;
      screenTrack.onended = () => toggleScreenShare(); // handle browser "Stop sharing"
      setSharing(true);
    } catch {
      /* user cancelled the picker */
    }
  }

  // Recording (consent-gated) — records the local stream, offers a download.
  function toggleRecording() {
    if (!consent.recording) return;
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const stream = localStreamRef.current;
    if (!stream) return;
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting?.title || "meeting"}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);
  }

  // Dictation (consent-gated) — browser speech recognition → transcript API.
  function toggleDictation() {
    if (!consent.transcription) return;
    if (dictating) {
      recognitionRef.current?.stop?.();
      setDictating(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMediaError("Live dictation isn't supported in this browser.");
      return;
    }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = false;
    recog.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          if (!text) continue;
          setTranscript((prev) => [...prev, `${name}: ${text}`]);
          fetch(`/api/meetings/${roomId}/transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantName: name, text }),
          }).catch(() => {});
        }
      }
    };
    recog.onend = () => dictating && recog.start();
    recog.start();
    recognitionRef.current = recog;
    setDictating(true);
  }

  async function generateSummary() {
    setSummaryBusy(true);
    const res = await fetch(`/api/meetings/${roomId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sendReports: true }),
    });
    const data = await res.json();
    setSummary(data);
    setSummaryBusy(false);
  }

  const tileCount = remote.length + 1;
  const gridCols = tileCount <= 1 ? "grid-cols-1" : tileCount <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{meeting?.title}</h1>
            <p className="text-xs text-gray-500">
              {meeting?.roomCode} · {tileCount} on call
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {consent.recording && recording && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-red-300">
                <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" /> REC
              </span>
            )}
            <span className="rounded-full border border-white/10 px-2 py-1 text-gray-400">
              Consent: {Object.entries(consent).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}
            </span>
          </div>
        </div>

        {mediaError && (
          <div className="mb-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
            {mediaError}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Video area */}
          <div className="lg:col-span-2">
            <div className={`grid ${gridCols} gap-3`}>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">
                  {name} (you)
                </span>
              </div>
              {remote.map((r) => (
                <RemoteTile key={r.id} stream={r.stream} />
              ))}
            </div>

            {/* Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button onClick={toggleMic} className={`rounded-full p-3 ${micOn ? "bg-white/10" : "bg-red-500/80"}`}>
                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <button onClick={toggleCam} className={`rounded-full p-3 ${camOn ? "bg-white/10" : "bg-red-500/80"}`}>
                {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleScreenShare}
                title="Share your screen"
                className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm ${sharing ? "bg-blue-500/80" : "bg-white/10"}`}
              >
                <MonitorUp className="h-4 w-4" /> {sharing ? "Stop share" : "Share screen"}
              </button>
              {meeting?.recordingOffered !== false && (
                <button
                  onClick={toggleRecording}
                  disabled={!consent.recording}
                  title={consent.recording ? "" : "You didn't consent to recording"}
                  className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm ${
                    recording ? "bg-red-500/80" : "bg-white/10"
                  } disabled:opacity-40`}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  {recording ? "Stop" : "Record"}
                </button>
              )}
              {meeting?.transcriptionOffered !== false && (
                <button
                  onClick={toggleDictation}
                  disabled={!consent.transcription}
                  title={consent.transcription ? "" : "You didn't consent to transcription"}
                  className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm ${
                    dictating ? "bg-blue-500/80" : "bg-white/10"
                  } disabled:opacity-40`}
                >
                  <FileText className="h-4 w-4" /> {dictating ? "Stop dictation" : "Dictate"}
                </button>
              )}
              <button onClick={leave} className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-medium">
                <PhoneOff className="h-4 w-4" /> Leave
              </button>
            </div>

            {/* Live transcript */}
            {transcript.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                <div className="mb-1 text-xs font-medium text-gray-400">Live transcript</div>
                {transcript.map((t, i) => (
                  <p key={i} className="text-gray-300">{t}</p>
                ))}
              </div>
            )}

            {/* Summary */}
            {meeting?.summaryOffered !== false && (
              <div className="mt-4">
                <button
                  onClick={generateSummary}
                  disabled={summaryBusy}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-60"
                >
                  {summaryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-blue-400" />}
                  Generate AI summary &amp; email reports (consented recipients)
                </button>
                {summary?.summary && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                    <p className="text-gray-200">{summary.summary.overview}</p>
                    {summary.reports && (
                      <p className="mt-2 text-xs text-emerald-400">
                        Reports sent to: {summary.reports.sent.join(", ") || "no consented recipients"}
                        {summary.reports.skippedNoConsent.length > 0 &&
                          ` · skipped (no consent): ${summary.reports.skippedNoConsent.join(", ")}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shared assets + review workflow */}
          <div>
            <AssetPanel roomId={roomId} name={name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoteTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared assets: upload video/image/slideshow + per-revision approvals
// ---------------------------------------------------------------------------
function AssetPanel({ roomId, name }: { roomId: string; name: string }) {
  const [assets, setAssets] = useState<any[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/meetings/${roomId}/assets`);
    const data = await res.json();
    setAssets(data.assets || []);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  async function shareLink() {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setUploadError("Enter a valid http(s) link.");
      return;
    }
    setLinkBusy(true);
    setUploadError(null);
    const res = await fetch(`/api/meetings/${roomId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "link", url, title: url, uploadedByName: name }),
    });
    setLinkBusy(false);
    if (res.ok) {
      setLinkUrl("");
      load();
    } else {
      setUploadError("Could not share link.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploadPct(0);
    const kind = file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("image/")
      ? "image"
      : /presentation|powerpoint|slides/.test(file.type)
      ? "slideshow"
      : "document";
    try {
      await uploadMeetingAsset(roomId, file, { kind, uploadedByName: name }, (p: UploadProgress) => setUploadPct(p.pct));
      setUploadPct(null);
      load();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploadPct(null);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="h-4 w-4 text-blue-400" /> Shared work
        </h2>
        <label className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5">
          Upload
          <input type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {uploadPct !== null && (
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadPct}%` }} />
        </div>
      )}
      {uploadError && <p className="mb-2 text-xs text-red-400">{uploadError}</p>}

      {/* Share a link (project delivery URL, Voice AI agent, doc, etc.) */}
      <div className="mb-3 flex gap-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && shareLink()}
            placeholder="Paste a link to share…"
            className="w-full bg-transparent py-1.5 text-xs text-white placeholder-gray-500 outline-none"
          />
        </div>
        <button
          onClick={shareLink}
          disabled={linkBusy}
          className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          Share
        </button>
      </div>

      {assets.length === 0 ? (
        <p className="text-xs text-gray-500">
          Share a video, image, or slideshow. Each gets a notes box and Approve / Not-approved buttons per revision.
        </p>
      ) : (
        <div className="space-y-4">
          {assets.map((a) => (
            <AssetCard key={a.id} roomId={roomId} asset={a} name={name} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  roomId,
  asset,
  name,
  onChange,
}: {
  roomId: string;
  asset: any;
  name: string;
  onChange: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  async function review(decision: "approved" | "not_approved" | "revision_requested") {
    if (decision === "revision_requested" && !notes.trim()) {
      setReviewError("Describe the specific revision you're requesting.");
      return;
    }
    setBusy(true);
    setReviewError(null);
    const res = await fetch(`/api/meetings/${roomId}/assets/${asset.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewerName: name, decision, notes, revision: asset.revision }),
    });
    setBusy(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setReviewError(e.error || "Could not submit review.");
      return;
    }
    setNotes("");
    onChange();
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-white">{asset.title}</div>
          <div className="text-[11px] uppercase text-gray-500">
            {asset.kind} · rev {asset.revision} · {asset.status}
          </div>
        </div>
        {asset.downloadUrl && (
          <a href={asset.downloadUrl} target="_blank" className="text-gray-400 hover:text-blue-400">
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Preview for images */}
      {asset.kind === "image" && asset.downloadUrl && (
        <img src={asset.downloadUrl} alt={asset.title} className="mb-2 max-h-40 w-full rounded object-contain" />
      )}

      {/* Notes + approve buttons for THIS revision */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes, or the specific revision you're requesting…"
        rows={2}
        className="mb-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-white/30"
      />
      {reviewError && <p className="mb-2 text-xs text-red-400">{reviewError}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => review("approved")}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/80 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
        <button
          onClick={() => review("revision_requested")}
          disabled={busy}
          title="Requires details of the change"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-500/80 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Request revision
        </button>
        <button
          onClick={() => review("not_approved")}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-500/80 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Not approved
        </button>
      </div>

      {/* 1-10 work-card score */}
      <div className="mt-2 border-t border-white/5 pt-2">
        <ScoreCard targetType="meeting_asset" targetId={asset.id} category={asset.kind} reviewerName={name} label="Score this work" />
      </div>

      {/* Review history */}
      {asset.reviews?.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {asset.reviews.map((r: any) => (
            <div key={r.id} className="flex items-start gap-2 text-[11px]">
              <span
                className={`mt-0.5 rounded px-1.5 py-0.5 ${
                  r.decision === "approved"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : r.decision === "revision_requested"
                    ? "bg-amber-500/20 text-amber-300"
                    : r.decision === "not_approved"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-gray-500/20 text-gray-300"
                }`}
              >
                rev {r.revision} · {r.decision.replace(/_/g, " ")}
              </span>
              <span className="text-gray-400">
                <span className="text-gray-300">{r.reviewerName}</span>
                {r.notes ? `: ${r.notes}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
