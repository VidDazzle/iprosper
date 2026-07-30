"use client";

import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Radio, Users, Send, Ban, RefreshCw, TrendingUp, Lightbulb, Shirt, Bot } from "lucide-react";

type Json = Record<string, unknown>;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(((data as Json).error as string) ?? res.statusText);
  return data;
}

interface Outreach {
  id: number;
  prospectId: number;
  channel: string;
  draftBody: string;
  disclosureText: string | null;
  templateVariant: string | null;
  status: string;
}
interface Prospect {
  id: number;
  platform: string;
  authorHandle: string | null;
  score: number;
  topPainPoint: string | null;
  status: string;
}
interface ConnectorInfo {
  platform: string;
  implemented: boolean;
  credentialsPresent: boolean;
  policy: { automatedOutreachAllowed: boolean; requiresBotDisclosure: boolean; maxPublicRepliesPerDay: number; maxDmsPerDay: number };
  record: { status: string; displayName: string } | null;
}
interface Opportunity {
  id: number;
  kind: string;
  name: string;
  network: string | null;
  score: number;
  estRevenueLowUsd: number | null;
  estRevenueHighUsd: number | null;
  effortLevel: string | null;
  rationale: string | null;
  status: string;
}
interface Performance {
  productId: number;
  title: string;
  sent: number;
  conversions: number;
  revenueUsd: number;
  score: number;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function ProsperPilotConsole() {
  const [stats, setStats] = useState<Json | null>(null);
  const [queue, setQueue] = useState<Outreach[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  // Assistant state
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  // New-opportunity form
  const [oppName, setOppName] = useState("");
  const [oppKind, setOppKind] = useState("affiliate");
  const [oppNetwork, setOppNetwork] = useState("");

  // POD form
  const [podName, setPodName] = useState("");
  const [podImage, setPodImage] = useState("");
  const [podProvider, setPodProvider] = useState("printful");

  const refresh = useCallback(async () => {
    try {
      const [s, q, p, c, o] = await Promise.all([
        api("/api/prospecting/stats"),
        api("/api/prospecting/outreach?status=pending_review"),
        api("/api/prospecting/prospects?limit=25"),
        api("/api/prospecting/connectors"),
        api("/api/prospecting/opportunities"),
      ]);
      setStats(s as Json);
      setQueue(q as Outreach[]);
      setProspects(p as Prospect[]);
      setConnectors(c as ConnectorInfo[]);
      setOpportunities(o as Opportunity[]);
    } catch (e) {
      toast.error(`Load failed: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function review(id: number, action: "approve" | "reject" | "send") {
    try {
      await api("/api/prospecting/outreach", {
        method: "POST",
        body: JSON.stringify({ id, action, editedBody: edits[id], reviewer: "operator" }),
      });
      toast.success(`Message ${action}d`);
      refresh();
    } catch (e) {
      toast.error(`${action} failed: ${(e as Error).message}`);
    }
  }

  async function runStage(stage: string, platform?: string) {
    setLoading(true);
    try {
      const result = await api("/api/prospecting/pipeline", { method: "POST", body: JSON.stringify({ stage, platform }) });
      toast.success(`${stage} done`);
      console.log(stage, result);
      refresh();
    } catch (e) {
      toast.error(`${stage} failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  async function runOptimizer() {
    setLoading(true);
    try {
      const result = (await api("/api/prospecting/optimizer", { method: "POST" })) as { performance: Performance[]; paused: number; reactivated: number };
      setPerformance(result.performance ?? []);
      toast.success(`Optimizer: ${result.paused} paused, ${result.reactivated} reactivated`);
      refresh();
    } catch (e) {
      toast.error(`Optimizer failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  async function addOpportunity() {
    if (!oppName.trim()) return;
    try {
      await api("/api/prospecting/opportunities", {
        method: "POST",
        body: JSON.stringify({ kind: oppKind, name: oppName, network: oppNetwork || undefined }),
      });
      setOppName("");
      setOppNetwork("");
      toast.success("Opportunity evaluated");
      refresh();
    } catch (e) {
      toast.error(`Add failed: ${(e as Error).message}`);
    }
  }

  async function setOppStatus(id: number, status: string) {
    try {
      await api("/api/prospecting/opportunities", { method: "PATCH", body: JSON.stringify({ id, status }) });
      toast.success(`Marked ${status}`);
      refresh();
    } catch (e) {
      toast.error(`Update failed: ${(e as Error).message}`);
    }
  }

  async function createPod() {
    if (!podName.trim() || !podImage.trim()) return;
    try {
      const result = (await api("/api/prospecting/pod", {
        method: "POST",
        body: JSON.stringify({ name: podName, imageUrl: podImage, provider: podProvider, blanks: ["unisex-tee", "mug-11oz"] }),
      })) as { created: Array<{ ok: boolean; error?: string }> };
      const ok = result.created.filter((c) => c.ok).length;
      const failed = result.created.find((c) => !c.ok);
      if (ok > 0) toast.success(`${ok} POD product(s) created`);
      if (failed) toast.message(failed.error ?? "Some blanks failed");
      setPodName("");
      setPodImage("");
      refresh();
    } catch (e) {
      toast.error(`POD failed: ${(e as Error).message}`);
    }
  }

  async function sendChat() {
    const message = chatInput.trim();
    if (!message) return;
    const history = chat.slice(-8);
    setChat((c) => [...c, { role: "user", content: message }]);
    setChatInput("");
    setChatBusy(true);
    try {
      const result = (await api("/api/prospecting/assistant", { method: "POST", body: JSON.stringify({ message, history }) })) as { reply: string };
      setChat((c) => [...c, { role: "assistant", content: result.reply }]);
    } catch (e) {
      setChat((c) => [...c, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally {
      setChatBusy(false);
    }
  }

  const statBlocks = summarizeStats(stats);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />
      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8 text-orange-500" /> ProsperPilot
          </h1>
          <Button variant="outline" className="border-gray-600" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
        <p className="text-gray-400 mb-8 max-w-3xl">
          Autonomous, compliant prospecting copilot. Listens to public conversations across social
          platforms and blogs/forums via official APIs, scores buying intent, matches products and
          affiliate offers, optimizes toward what sells, and drafts disclosed outreach for your
          approval. AI-drafted, human-approved — never cloaked, never impersonating.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statBlocks.map((b) => (
            <Card key={b.label} className="bg-[#222] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{b.value}</div>
                <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">{b.icon}{b.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="bg-[#222] border border-gray-800 flex-wrap h-auto">
            <TabsTrigger value="queue">Review Queue</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="optimizer">Optimizer</TabsTrigger>
            <TabsTrigger value="pod">POD Studio</TabsTrigger>
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
            <TabsTrigger value="connectors">Connectors</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          {/* Review queue */}
          <TabsContent value="queue" className="mt-6 space-y-4">
            {queue.length === 0 && <p className="text-gray-500">No messages awaiting review.</p>}
            {queue.map((m) => (
              <Card key={m.id} className="bg-[#222] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="secondary">{m.channel}</Badge>
                    {m.templateVariant && <Badge variant="outline">variant: {m.templateVariant}</Badge>}
                    <span className="text-gray-500 text-sm">prospect #{m.prospectId}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    className="bg-[#1a1a1a] border-gray-700 min-h-24 text-sm"
                    defaultValue={m.draftBody}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  />
                  {m.disclosureText && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Disclosure enforced: {m.disclosureText}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review(m.id, "approve")}>Approve</Button>
                    <Button size="sm" variant="outline" className="border-gray-600" onClick={() => review(m.id, "send")}>
                      <Send className="w-3 h-3 mr-1" /> Approve &amp; Send
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => review(m.id, "reject")}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Prospects */}
          <TabsContent value="prospects" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardContent className="pt-6 space-y-2">
                {prospects.length === 0 && <p className="text-gray-500">No prospects yet.</p>}
                {prospects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-gray-800 py-2">
                    <div>
                      <div className="font-medium">{p.authorHandle ?? `#${p.id}`} <span className="text-gray-500 text-xs">{p.platform}</span></div>
                      <div className="text-sm text-gray-400 truncate max-w-lg">{p.topPainPoint}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={p.status === "converted" ? "default" : "secondary"}>{p.status}</Badge>
                      <span className="text-lg font-bold w-10 text-right">{Math.round(p.score)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities */}
          <TabsContent value="opportunities" className="mt-6 space-y-4">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Evaluate an opportunity</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2 items-center">
                <Input className="bg-[#1a1a1a] border-gray-700 w-56" placeholder="Program / opportunity name" value={oppName} onChange={(e) => setOppName(e.target.value)} />
                <select className="bg-[#1a1a1a] border border-gray-700 rounded-md px-3 py-2 text-sm" value={oppKind} onChange={(e) => setOppKind(e.target.value)}>
                  <option value="affiliate">affiliate</option>
                  <option value="business">business</option>
                  <option value="dropship_niche">dropship niche</option>
                </select>
                <Input className="bg-[#1a1a1a] border-gray-700 w-40" placeholder="Network (optional)" value={oppNetwork} onChange={(e) => setOppNetwork(e.target.value)} />
                <Button onClick={addOpportunity}>Evaluate</Button>
              </CardContent>
            </Card>
            {opportunities.length === 0 && <p className="text-gray-500">No opportunities yet. Evaluate one above.</p>}
            {opportunities.map((o) => (
              <Card key={o.id} className="bg-[#222] border-gray-800">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {o.name}
                        <Badge variant="outline">{o.kind}</Badge>
                        {o.network && <span className="text-gray-500 text-xs">{o.network}</span>}
                      </div>
                      <div className="text-sm text-gray-400 mt-1 max-w-2xl">{o.rationale}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        est ${o.estRevenueLowUsd ?? 0}–${o.estRevenueHighUsd ?? 0}/mo · effort {o.effortLevel ?? "?"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold">{Math.round(o.score)}</div>
                      <Badge variant={o.status === "enrolled" ? "default" : "secondary"}>{o.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="border-gray-600" onClick={() => setOppStatus(o.id, "reviewing")}>Review</Button>
                    <Button size="sm" onClick={() => setOppStatus(o.id, "enrolled")}>Mark enrolled</Button>
                    <Button size="sm" variant="destructive" onClick={() => setOppStatus(o.id, "rejected")}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Optimizer */}
          <TabsContent value="optimizer" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Autonomous performance optimizer</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-400">
                <p>Rescore products from real sales/click data, pause chronic non-sellers, and reactivate recovering ones. Winners get promoted more; losers get retired automatically.</p>
                <Button disabled={loading} onClick={runOptimizer}>Run optimizer now</Button>
                {performance.length > 0 && (
                  <div className="space-y-1 mt-4">
                    {performance.map((p) => (
                      <div key={p.productId} className="flex items-center justify-between border-b border-gray-800 py-1">
                        <span className="truncate max-w-md">{p.title}</span>
                        <span className="text-gray-500">{p.sent} sent · {p.conversions} conv · ${p.revenueUsd.toFixed(0)}</span>
                        <span className="font-bold w-10 text-right">{Math.round(p.score)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* POD Studio */}
          <TabsContent value="pod" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shirt className="w-4 h-4" /> Print-on-demand studio</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-400">
                <p>Put your image on physical products (tee + mug by default) via your POD provider. Successful items become promotable products automatically.</p>
                <Input className="bg-[#1a1a1a] border-gray-700" placeholder="Design name" value={podName} onChange={(e) => setPodName(e.target.value)} />
                <Input className="bg-[#1a1a1a] border-gray-700" placeholder="Image URL" value={podImage} onChange={(e) => setPodImage(e.target.value)} />
                <select className="bg-[#1a1a1a] border border-gray-700 rounded-md px-3 py-2 text-sm" value={podProvider} onChange={(e) => setPodProvider(e.target.value)}>
                  <option value="printful">printful</option>
                  <option value="printify">printify</option>
                  <option value="gooten">gooten</option>
                </select>
                <div><Button onClick={createPod}>Create POD products</Button></div>
                <p className="text-xs text-gray-600">Requires the provider&apos;s API key in env; otherwise creation reports &quot;not configured.&quot;</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assistant */}
          <TabsContent value="assistant" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> Talk to ProsperPilot</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="min-h-40 max-h-96 overflow-y-auto space-y-2 text-sm">
                  {chat.length === 0 && <p className="text-gray-500">Ask about your products, metrics, or which opportunities to pursue. This assistant is for you, the operator — it identifies as AI.</p>}
                  {chat.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                      <span className={`inline-block rounded-lg px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-orange-600/30" : "bg-[#1a1a1a] border border-gray-800"}`}>{m.content}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="bg-[#1a1a1a] border-gray-700"
                    placeholder="e.g. Which product should I push this week?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  />
                  <Button disabled={chatBusy} onClick={sendChat}>{chatBusy ? "…" : "Send"}</Button>
                </div>
                <p className="text-xs text-gray-600">Text now; the same endpoint backs voice and email adapters.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connectors */}
          <TabsContent value="connectors" className="mt-6 grid md:grid-cols-2 gap-4">
            {connectors.map((c) => (
              <Card key={c.platform} className="bg-[#222] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{c.platform}</span>
                    <div className="flex gap-2">
                      {c.implemented ? <Badge variant="secondary">connector ready</Badge> : <Badge variant="outline">planned</Badge>}
                      {c.credentialsPresent ? <Badge>credentials set</Badge> : <Badge variant="outline">no credentials</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400 space-y-1">
                  <div>Automated outreach: {c.policy.automatedOutreachAllowed ? <span className="text-green-400">allowed</span> : <span className="text-red-400">disabled by policy</span>}</div>
                  <div>Bot disclosure required: {c.policy.requiresBotDisclosure ? "yes" : "no"}</div>
                  <div>Caps: {c.policy.maxPublicRepliesPerDay}/day replies, {c.policy.maxDmsPerDay}/day DMs</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Pipeline controls */}
          <TabsContent value="pipeline" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Radio className="w-4 h-4" /> Run pipeline stages</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-400">
                <p>Stages run against configured connectors only. Ingest reads public posts, classify scores intent, draft fills the review queue. Nothing sends here.</p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={loading} onClick={() => runStage("cycle", "reddit")}>Run cycle · Reddit</Button>
                  <Button disabled={loading} onClick={() => runStage("cycle", "x")}>Run cycle · X</Button>
                  <Button disabled={loading} onClick={() => runStage("cycle", "web")}>Run cycle · Web/RSS</Button>
                  <Button disabled={loading} variant="outline" className="border-gray-600" onClick={() => runStage("classify")}>Classify pending</Button>
                  <Button disabled={loading} variant="outline" className="border-gray-600" onClick={() => runStage("draft")}>Draft for queue</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function summarizeStats(stats: Json | null) {
  const count = (arr: unknown): number => (Array.isArray(arr) ? arr.reduce((s, r) => s + Number((r as Json).count ?? 0), 0) : 0);
  return [
    { label: "Mentions captured", value: count(stats?.mentions), icon: <Radio className="w-3 h-3" /> },
    { label: "Prospects", value: count(stats?.prospects), icon: <Users className="w-3 h-3" /> },
    { label: "In review queue", value: statusCount(stats?.outreach, "pending_review"), icon: <Send className="w-3 h-3" /> },
    { label: "Suppressed", value: Number(stats?.suppressionTotal ?? 0), icon: <Ban className="w-3 h-3" /> },
  ];
}

function statusCount(arr: unknown, status: string): number {
  if (!Array.isArray(arr)) return 0;
  const row = arr.find((r) => (r as Json).status === status);
  return Number((row as Json | undefined)?.count ?? 0);
}
