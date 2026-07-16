"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import {
  Mail,
  Lock,
  Sparkles,
  Loader2,
  Star,
  Send,
  Inbox,
  ShieldCheck,
  RefreshCw,
  X,
  Trash2,
  Paperclip,
  Download,
  FileText,
  Film,
} from "lucide-react";
import {
  uploadAttachment,
  downloadAttachment,
  formatBytes,
  type UploadProgress,
} from "@/lib/upload-client";

interface Message {
  id: number;
  from: string;
  to: string[];
  subject: string;
  body?: string;
  preview: string | null;
  status: string;
  starred: boolean;
  priority: string;
  category: string | null;
  direction: string;
  source: string;
  createdAt: string;
  attachments?: MailAttachment[];
}

interface MailAttachment {
  id: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sizeHuman?: string;
}

interface UploadItem {
  localId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  pct: number;
  status: "uploading" | "done" | "error";
  attachmentId?: number;
}

function attachmentIcon(mimeType: string) {
  if (mimeType.startsWith("video/")) return Film;
  return FileText;
}

const priorityColor: Record<string, string> = {
  high: "text-red-400",
  normal: "text-gray-400",
  low: "text-gray-600",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function Mailbox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mailbox, setMailbox] = useState("");
  const [loading, setLoading] = useState(true);
  const [encError, setEncError] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const direction = folder === "inbox" ? "inbound" : "outbound";
    const res = await fetch(`/api/mail/messages?direction=${direction}&limit=100`);
    if (res.status === 503) {
      setEncError(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMessages(data.messages || []);
    if (data.mailbox) setMailbox(data.mailbox);
    setLoading(false);
  }, [folder]);

  useEffect(() => {
    load();
  }, [load]);

  async function openMessage(m: Message) {
    const res = await fetch(`/api/mail/messages/${m.id}`);
    const data = await res.json();
    setSelected(data.message);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "read" } : x)));
  }

  async function toggleStar(m: Message, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/mail/messages/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !m.starred }),
    });
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, starred: !x.starred } : x)));
  }

  async function trash(m: Message, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/mail/messages/${m.id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    if (selected?.id === m.id) setSelected(null);
  }

  if (encError) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white">
        <Navigation />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <Lock className="mx-auto mb-6 h-12 w-12 text-yellow-400" />
          <h1 className="mb-3 text-2xl font-bold">Encryption key not configured</h1>
          <p className="text-gray-400">
            Set the <code className="rounded bg-white/10 px-1.5 py-0.5">MAIL_ENCRYPTION_KEY</code>{" "}
            environment variable to unlock the encrypted mailbox. Generate one with:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-black/60 p-4 text-left text-xs text-emerald-300">
            node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> AES-256-GCM encrypted at rest
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Encrypted Mail</h1>
            <p className="mt-2 text-gray-400">
              {mailbox ? (
                <>
                  Mailbox <span className="text-white">{mailbox}</span> · AI-triaged · voice-agent
                  connected
                </>
              ) : (
                "Your private, AI-run inbox."
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setComposing(true)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              <Sparkles className="h-4 w-4" /> Compose
            </button>
          </div>
        </div>

        {/* Folder tabs */}
        <div className="mb-4 flex gap-2">
          {(["inbox", "sent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFolder(f);
                setSelected(null);
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm capitalize ${
                folder === f ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {f === "inbox" ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />} {f}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500">
                <Mail className="mx-auto mb-3 h-8 w-8 opacity-40" />
                Nothing here yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {messages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => openMessage(m)}
                    className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                      selected?.id === m.id
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    } ${m.status === "unread" ? "border-l-2 border-l-emerald-400" : ""}`}
                  >
                    <button onClick={(e) => toggleStar(m, e)} className="mt-0.5">
                      <Star
                        className={`h-4 w-4 ${
                          m.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            m.status === "unread" ? "font-semibold text-white" : "text-gray-300"
                          }`}
                        >
                          {folder === "inbox" ? m.from : m.to.join(", ")}
                        </span>
                        <span className="shrink-0 text-xs text-gray-500">{timeAgo(m.createdAt)}</span>
                      </div>
                      <div className="truncate text-sm text-gray-400">{m.subject}</div>
                      <div className="truncate text-xs text-gray-600">{m.preview}</div>
                      <div className="mt-1 flex items-center gap-2">
                        {m.priority === "high" && (
                          <span className={`text-[10px] font-medium ${priorityColor.high}`}>
                            ● HIGH
                          </span>
                        )}
                        {m.category && (
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
                            {m.category}
                          </span>
                        )}
                        {m.source === "voice_agent" && (
                          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                            voice
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => trash(m, e)}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-gray-600 hover:text-red-400" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reading pane */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-4 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-semibold">{selected.subject}</h2>
                  <div className="mt-2 text-sm text-gray-400">
                    <span className="text-gray-300">{selected.from}</span> →{" "}
                    {selected.to.join(", ")}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <Lock className="h-3 w-3 text-emerald-400" /> Decrypted just now ·{" "}
                    {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                  {selected.body}
                </div>

                {selected.attachments && selected.attachments.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-400">
                      <Paperclip className="h-3.5 w-3.5" /> {selected.attachments.length} attachment
                      {selected.attachments.length > 1 ? "s" : ""}
                    </div>
                    <div className="space-y-2">
                      {selected.attachments.map((a) => {
                        const Icon = attachmentIcon(a.mimeType);
                        return (
                          <button
                            key={a.id}
                            onClick={() => downloadAttachment(a.id)}
                            className="group flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left hover:border-emerald-500/40"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-emerald-400" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-white">{a.filename}</div>
                              <div className="text-xs text-gray-500">
                                {a.sizeHuman || formatBytes(a.sizeBytes)}
                              </div>
                            </div>
                            <Download className="h-4 w-4 text-gray-500 group-hover:text-emerald-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-white/10 text-gray-600">
                Select a message to read it (decrypted on open)
              </div>
            )}
          </div>
        </div>
      </main>

      {composing && <ComposeModal mailbox={mailbox} onClose={() => setComposing(false)} onSent={load} />}
    </div>
  );
}

function ComposeModal({
  mailbox,
  onClose,
  onSent,
}: {
  mailbox: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [instruction, setInstruction] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      const localId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [
        ...prev,
        { localId, filename: file.name, sizeBytes: file.size, mimeType: file.type, pct: 0, status: "uploading" },
      ]);
      try {
        const attachmentId = await uploadAttachment(file, (p: UploadProgress) =>
          setUploads((prev) => prev.map((u) => (u.localId === localId ? { ...u, pct: p.pct } : u))),
        );
        setUploads((prev) =>
          prev.map((u) => (u.localId === localId ? { ...u, attachmentId, pct: 100, status: "done" } : u)),
        );
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
        setUploads((prev) =>
          prev.map((u) => (u.localId === localId ? { ...u, status: "error" } : u)),
        );
      }
    }
  }

  async function removeUpload(u: UploadItem) {
    if (u.attachmentId) {
      await fetch(`/api/mail/attachments/${u.attachmentId}`, { method: "DELETE" }).catch(() => {});
    }
    setUploads((prev) => prev.filter((x) => x.localId !== u.localId));
  }

  async function aiDraft() {
    if (!instruction.trim()) return;
    setDrafting(true);
    const res = await fetch("/api/mail/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    const data = await res.json();
    if (data.draft) {
      setSubject(data.draft.subject);
      setBody(data.draft.body);
    }
    setDrafting(false);
  }

  async function send() {
    if (!to.trim() || !body.trim()) return;
    const attachmentIds = uploads
      .filter((u) => u.status === "done" && u.attachmentId)
      .map((u) => u.attachmentId as number);
    setSending(true);
    await fetch("/api/mail/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: "outbound",
        to: to.split(",").map((s) => s.trim()),
        subject,
        body,
        attachmentIds,
      }),
    });
    setSending(false);
    onSent();
    onClose();
  }

  const anyUploading = uploads.some((u) => u.status === "uploading");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#161616] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">New encrypted message</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-200">
            <Sparkles className="h-3.5 w-3.5" /> Let AI write it
          </label>
          <div className="flex gap-2">
            <input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='e.g. "thank them for the demo and propose a follow-up next week"'
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500/60"
            />
            <button
              onClick={aiDraft}
              disabled={drafting}
              className="flex items-center gap-1.5 rounded-lg bg-purple-500/80 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-60"
            >
              {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Draft
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs text-gray-500">From: {mailbox || "your mailbox"}</div>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To (comma-separated)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            rows={6}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
          />

          {/* Attachments — direct chunked upload to storage, any size */}
          <div>
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5">
              <Paperclip className="h-4 w-4" /> Attach files
              <span className="text-xs text-gray-500">(documents, video — any size)</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onFilesChosen(e.target.files)}
              />
            </label>
            {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
            {uploads.length > 0 && (
              <div className="mt-2 space-y-2">
                {uploads.map((u) => {
                  const Icon = attachmentIcon(u.mimeType);
                  return (
                    <div
                      key={u.localId}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-white">{u.filename}</span>
                          <span className="shrink-0 text-xs text-gray-500">{formatBytes(u.sizeBytes)}</span>
                        </div>
                        {u.status === "uploading" && (
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${u.pct}%` }}
                            />
                          </div>
                        )}
                        {u.status === "done" && (
                          <span className="text-xs text-emerald-400">Uploaded · encrypted at rest</span>
                        )}
                        {u.status === "error" && <span className="text-xs text-red-400">Failed</span>}
                      </div>
                      <button onClick={() => removeUpload(u)} className="text-gray-500 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Lock className="h-3 w-3" /> Encrypted before storage
          </span>
          <button
            onClick={send}
            disabled={sending || anyUploading}
            className="flex items-center gap-2 rounded-lg bg-white px-6 py-2 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {anyUploading ? "Uploading…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
