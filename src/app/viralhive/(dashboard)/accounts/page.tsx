import { db } from "@/db";
import { viralhiveAccounts } from "@/db/schema";
import { upsertAccountAction } from "@/lib/viralhive/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AccountRowActions } from "./RowActions";

const PLATFORMS = ["tiktok", "instagram", "facebook", "youtube", "x", "linkedin", "pinterest", "webhook"];

export default async function AccountsPage() {
  const accounts = await db.select().from(viralhiveAccounts);

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Connected accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-white/50">No accounts yet — add one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Posts/day</TableHead>
                  <TableHead>Windows</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.id}</TableCell>
                    <TableCell className="capitalize">{a.platform}</TableCell>
                    <TableCell>{a.displayName}</TableCell>
                    <TableCell>{a.postsPerDay}</TableCell>
                    <TableCell className="text-white/60">{JSON.parse(a.postingWindow).join(", ")}</TableCell>
                    <TableCell>
                      <AccountRowActions id={a.id} enabled={a.enabled} />
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
          <CardTitle className="text-base">Add / update an account</CardTitle>
          <CardDescription>
            Using the same ID as an existing account updates it. Credentials are encrypted at rest and never shown
            again after saving — leave that field blank on an update to keep the current values unchanged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertAccountAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID (e.g. tiktok_main)">
              <Input name="id" required pattern="[a-z0-9_\-]+" placeholder="tiktok_main" />
            </Field>
            <Field label="Platform">
              <select name="platform" required className={selectClass} defaultValue="tiktok">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Display name">
              <Input name="displayName" required placeholder="@yourbrand on TikTok" />
            </Field>
            <Field label="Niche">
              <Input name="niche" placeholder="fitness motivation" />
            </Field>
            <Field label="Posts per day">
              <Input name="postsPerDay" type="number" min={0} max={24} defaultValue={1} />
            </Field>
            <Field label="Posting window (comma-separated HH:mm)">
              <Input name="postingWindow" placeholder="09:00, 18:30" defaultValue="09:00" />
            </Field>
            <Field label="Timezone">
              <Input name="timezone" placeholder="America/New_York" defaultValue="UTC" />
            </Field>
            <Field label="Webhook URL (only for platform=webhook)">
              <Input name="webhookUrl" placeholder="https://hooks.zapier.com/..." />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Credentials — one per line, key=value (e.g. accessToken=abc123)">
                <Textarea name="credentials" rows={4} placeholder={"accessToken=...\nigUserId=..."} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked className="size-4" />
              Enabled
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">Save account</Button>
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
