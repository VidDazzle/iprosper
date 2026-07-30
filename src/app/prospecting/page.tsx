"use client";

import { useCallback, useEffect, useState } from "react";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, Radio, Users, Send, Ban, RefreshCw } from "lucide-react";

type Json = Record<string, unknown>;

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as Json).error as string ?? res.statusText);
  return data;
}

interface Outreach {
  id: number;
  prospectId: number;
  productId: number | null;
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
  policy: {
    automatedOutreachAllowed: boolean;
    requiresBotDisclosure: boolean;
    maxPublicRepliesPerDay: number;
    maxDmsPerDay: number;
  };
  record: { status: string; displayName: string } | null;
}

export default function ProspectingDashboard() {
  const [stats, setStats] = useState<Json | null>(null);
  const [queue, setQueue] = useState<Outreach[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, q, p, c] = await Promise.all([
        api("/api/prospecting/stats"),
        api("/api/prospecting/outreach?status=pending_review"),
        api("/api/prospecting/prospects?limit=25"),
        api("/api/prospecting/connectors"),
      ]);
      setStats(s as Json);
      setQueue(q as Outreach[]);
      setProspects(p as Prospect[]);
      setConnectors(c as ConnectorInfo[]);
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
      const result = await api("/api/prospecting/pipeline", {
        method: "POST",
        body: JSON.stringify({ stage, platform }),
      });
      toast.success(`${stage} done`);
      console.log(stage, result);
      refresh();
    } catch (e) {
      toast.error(`${stage} failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  const statBlocks = summarizeStats(stats);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />
      <main className="container mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold">Prospecting Console</h1>
          <Button variant="outline" className="border-gray-600" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
        <p className="text-gray-400 mb-8 max-w-3xl">
          Compliant social listening &amp; outreach. Public content only, via official
          platform APIs. Every message is AI-drafted with required disclosure and waits
          for your approval before anything is sent.
        </p>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statBlocks.map((b) => (
            <Card key={b.label} className="bg-[#222] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold">{b.value}</div>
                <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                  {b.icon}
                  {b.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="queue">
          <TabsList className="bg-[#222] border border-gray-800">
            <TabsTrigger value="queue">Review Queue</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
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
                      <div className="font-medium">
                        {p.authorHandle ?? `#${p.id}`}{" "}
                        <span className="text-gray-500 text-xs">{p.platform}</span>
                      </div>
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

          {/* Connectors */}
          <TabsContent value="connectors" className="mt-6 grid md:grid-cols-2 gap-4">
            {connectors.map((c) => (
              <Card key={c.platform} className="bg-[#222] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{c.platform}</span>
                    <div className="flex gap-2">
                      {c.implemented ? (
                        <Badge variant="secondary">connector ready</Badge>
                      ) : (
                        <Badge variant="outline">planned</Badge>
                      )}
                      {c.credentialsPresent ? (
                        <Badge>credentials set</Badge>
                      ) : (
                        <Badge variant="outline">no credentials</Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400 space-y-1">
                  <div>
                    Automated outreach:{" "}
                    {c.policy.automatedOutreachAllowed ? (
                      <span className="text-green-400">allowed</span>
                    ) : (
                      <span className="text-red-400">disabled by policy</span>
                    )}
                  </div>
                  <div>Bot disclosure required: {c.policy.requiresBotDisclosure ? "yes" : "no"}</div>
                  <div>
                    Caps: {c.policy.maxPublicRepliesPerDay}/day replies, {c.policy.maxDmsPerDay}/day DMs
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Pipeline controls */}
          <TabsContent value="pipeline" className="mt-6">
            <Card className="bg-[#222] border-gray-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Radio className="w-4 h-4" /> Run pipeline stages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-400">
                <p>
                  Stages run against configured connectors only. Ingest reads public posts,
                  classify scores intent, draft fills the review queue. Nothing sends here.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={loading} onClick={() => runStage("cycle", "reddit")}>
                    Run full cycle · Reddit
                  </Button>
                  <Button disabled={loading} onClick={() => runStage("cycle", "x")}>
                    Run full cycle · X
                  </Button>
                  <Button disabled={loading} variant="outline" className="border-gray-600" onClick={() => runStage("classify")}>
                    Classify pending
                  </Button>
                  <Button disabled={loading} variant="outline" className="border-gray-600" onClick={() => runStage("draft")}>
                    Draft for queue
                  </Button>
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
  const count = (arr: unknown): number =>
    Array.isArray(arr) ? arr.reduce((s, r) => s + Number((r as Json).count ?? 0), 0) : 0;
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
