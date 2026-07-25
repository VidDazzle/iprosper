import { db } from "@/db";
import { viralhiveAccounts, viralhiveCampaigns, viralhiveProducts, viralhiveProviders } from "@/db/schema";
import { upsertCampaignAction } from "@/lib/viralhive/actions";
import { isAutopilotEnabled } from "@/lib/viralhive/dbState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CampaignRowActions } from "./RowActions";

export default async function CampaignsPage() {
  const [campaigns, accounts, products, providers] = await Promise.all([
    db.select().from(viralhiveCampaigns),
    db.select().from(viralhiveAccounts),
    db.select().from(viralhiveProducts),
    db.select().from(viralhiveProviders),
  ]);

  const campaignRows = await Promise.all(
    campaigns.map(async (c) => ({ ...c, autopilotActive: await isAutopilotEnabled(c.id, c.autopilot) }))
  );

  const llmProviders = providers.filter((p) => p.kind === "llm-openai-compatible" || p.kind === "llm-anthropic");
  const videoProviders = providers.filter((p) => p.kind === "higgsfield");
  const imageProviders = providers.filter((p) => p.kind === "higgsfield" || p.kind === "leonardo");
  const voiceProviders = providers.filter((p) => p.kind === "elevenlabs");
  const viralityProviders = providers.filter((p) => p.kind === "higgsfield");

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignRows.length === 0 ? (
            <p className="text-sm text-white/50">No campaigns yet — create one below (needs at least one account and one LLM/video provider first).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignRows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-white/60">{JSON.parse(c.accountIds).length}</TableCell>
                    <TableCell>{c.qualityThreshold}/10</TableCell>
                    <TableCell>
                      <CampaignRowActions id={c.id} autopilot={c.autopilotActive} />
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
          <CardTitle className="text-base">Add / update a campaign</CardTitle>
          <CardDescription>Reusing an existing ID updates it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertCampaignAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID">
              <Input name="id" required pattern="[a-z0-9_\-]+" placeholder="daily_fitness_shorts" />
            </Field>
            <Field label="Name">
              <Input name="name" required placeholder="Daily fitness motivation shorts" />
            </Field>
            <Field label="Niche">
              <Input name="niche" required placeholder="fitness motivation" />
            </Field>
            <Field label="Goal">
              <Input name="goal" required placeholder="Grow followers and drive checkout conversions" />
            </Field>
            <Field label="Tone keywords (comma-separated)">
              <Input name="toneKeywords" placeholder="high energy, encouraging" />
            </Field>
            <Field label="Banned topics (comma-separated)">
              <Input name="bannedTopics" placeholder="medical claims, extreme dieting" />
            </Field>

            <div className="sm:col-span-2">
              <Label className="text-white/70">Target accounts</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {accounts.length === 0 && <p className="text-sm text-white/50">Add accounts first.</p>}
                {accounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="accountIds" value={a.id} className="size-4" />
                    {a.displayName} ({a.platform})
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-white/70">Script/LLM providers (checked = failover chain, in order)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {llmProviders.length === 0 && <p className="text-sm text-white/50">Add an LLM provider first.</p>}
                {llmProviders.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="scriptProviderIds" value={p.id} className="size-4" />
                    {p.id}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-white/70">Video providers (checked = failover chain, in order)</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {videoProviders.length === 0 && <p className="text-sm text-white/50">Add a Higgsfield provider first.</p>}
                {videoProviders.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="videoProviderIds" value={p.id} className="size-4" />
                    {p.id}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Image provider (optional)">
              <select name="imageProviderId" className={selectClass} defaultValue="">
                <option value="">— none —</option>
                {imageProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Voice provider (optional)">
              <select name="voiceProviderId" className={selectClass} defaultValue="">
                <option value="">— none —</option>
                {voiceProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Virality predictor (optional)">
              <select name="viralityProviderId" className={selectClass} defaultValue="">
                <option value="">— none —</option>
                {viralityProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product to feature (optional — makes it shoppable)">
              <select name="productId" className={selectClass} defaultValue="">
                <option value="">— none —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quality threshold (0-10)">
              <Input name="qualityThreshold" type="number" step="0.1" min={0} max={10} defaultValue={9.2} />
            </Field>
            <Field label="Max regeneration attempts">
              <Input name="maxRegenerationAttempts" type="number" min={1} max={10} defaultValue={4} />
            </Field>
            <Field label="Video length (seconds)">
              <Input name="videoLengthSeconds" type="number" min={5} max={180} defaultValue={30} />
            </Field>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="autopilot" defaultChecked className="size-4" />
                Autopilot (fully unattended)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="smartScheduling" defaultChecked className="size-4" />
                Smart scheduling (learn best times)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="engagementAutoReply" defaultChecked className="size-4" />
                Auto-reply to comments
              </label>
            </div>

            <div className="sm:col-span-2">
              <Button type="submit">Save campaign</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const selectClass =
  "border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-white/70">{label}</Label>
      {children}
    </div>
  );
}
