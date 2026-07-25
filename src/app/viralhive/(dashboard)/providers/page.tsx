import { db } from "@/db";
import { viralhiveProviders } from "@/db/schema";
import { upsertProviderAction } from "@/lib/viralhive/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProviderRowActions } from "./RowActions";

const KINDS = [
  { value: "llm-openai-compatible", label: "LLM — OpenAI-compatible (OpenAI, Groq, Ollama, etc.)" },
  { value: "llm-anthropic", label: "LLM — Anthropic" },
  { value: "higgsfield", label: "Higgsfield (video/image/virality)" },
  { value: "leonardo", label: "Leonardo.ai (image)" },
  { value: "elevenlabs", label: "ElevenLabs (voice)" },
];

export default async function ProvidersPage() {
  const providers = await db.select().from(viralhiveProviders);

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">AI providers</CardTitle>
          <CardDescription>Any AI platform, any LLM, any API key — this is the pluggable backend registry.</CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="text-sm text-white/50">No providers yet — add one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>{p.kind}</TableCell>
                    <TableCell className="text-white/60">{p.model ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-white/60">{p.baseUrl ?? "—"}</TableCell>
                    <TableCell>
                      <ProviderRowActions id={p.id} />
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
          <CardTitle className="text-base">Add / update a provider</CardTitle>
          <CardDescription>
            Reusing an existing ID updates it. Leave the API key blank on an update to keep the current key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertProviderAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID">
              <Input name="id" required pattern="[a-z0-9_\-]+" placeholder="openai_main" />
            </Field>
            <Field label="Kind">
              <select name="kind" required className={selectClass} defaultValue="llm-openai-compatible">
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <Input name="model" placeholder="gpt-4o-mini / claude-sonnet-5 / etc." />
            </Field>
            <Field label="Base URL (optional override)">
              <Input name="baseUrl" placeholder="https://api.openai.com/v1" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="API key">
                <Input name="apiKey" type="password" placeholder="sk-..." />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save provider</Button>
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
