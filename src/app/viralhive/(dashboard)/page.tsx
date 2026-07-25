import { db } from "@/db";
import { viralhiveAccounts, viralhiveCampaigns, viralhiveProducts } from "@/db/schema";
import { listRecentPosts, tailLog, isAutopilotEnabled } from "@/lib/viralhive/dbState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function OverviewPage() {
  const [accounts, campaigns, products, recentPosts, log] = await Promise.all([
    db.select().from(viralhiveAccounts),
    db.select().from(viralhiveCampaigns),
    db.select().from(viralhiveProducts),
    listRecentPosts(20),
    tailLog(30),
  ]);

  const campaignAutopilot = await Promise.all(
    campaigns.map(async (c) => ({ id: c.id, name: c.name, enabled: await isAutopilotEnabled(c.id, c.autopilot) }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Accounts" value={accounts.length} />
        <StatCard label="Campaigns" value={campaigns.length} />
        <StatCard label="Products" value={products.length} />
        <StatCard label="Autopilot on" value={campaignAutopilot.filter((c) => c.enabled).length} />
      </div>

      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Campaign status</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignAutopilot.length === 0 ? (
            <EmptyState text="No campaigns yet — create one on the Campaigns page." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {campaignAutopilot.map((c) => (
                <Badge key={c.id} variant={c.enabled ? "default" : "secondary"}>
                  {c.name}: {c.enabled ? "autonomous" : "paused"}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Recent posts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length === 0 ? (
            <EmptyState text="Nothing posted yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Link / error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPosts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.accountId}</TableCell>
                    <TableCell className="capitalize">{p.platform}</TableCell>
                    <TableCell>
                      <Badge variant={p.success ? "default" : "destructive"}>{p.success ? "posted" : "failed"}</Badge>
                    </TableCell>
                    <TableCell className="text-white/60">{new Date(p.postedAt).toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate text-white/60">
                      {p.remoteUrl ? (
                        <a href={p.remoteUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                          {p.remoteUrl}
                        </a>
                      ) : (
                        p.error
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Run log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto font-mono text-xs">
            {log.length === 0 && <EmptyState text="No activity yet." />}
            {log.map((entry) => (
              <div key={entry.id} className="flex gap-2 text-white/70">
                <span className="text-white/40">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                <span
                  className={
                    entry.level === "error" ? "text-red-400" : entry.level === "warn" ? "text-amber-400" : "text-white/70"
                  }
                >
                  [{entry.level}]
                </span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="bg-[#161616] text-white border-white/10">
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-white/60">{label}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-white/50">{text}</p>;
}
