import { db } from "@/db";
import { viralhiveSettings } from "@/db/schema";
import { updateSettingsAction } from "@/lib/viralhive/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const rows = await db.select().from(viralhiveSettings);
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Commerce</CardTitle>
          <CardDescription>
            Powers checkout links on shoppable campaigns. Without a Stripe key, links fall back to a plain
            UTM-tagged URL to your checkout base URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="flex flex-col gap-4 max-w-md">
            <div className="flex flex-col gap-2">
              <Label className="text-white/70">Stripe secret key (leave blank to keep current)</Label>
              <Input name="stripeSecretKey" type="password" placeholder="sk_live_..." />
              <p className="text-xs text-white/40">
                {settings.stripeSecretKeyEncrypted ? "A key is currently set." : "No key set yet."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-white/70">Checkout base URL</Label>
              <Input
                name="checkoutBaseUrl"
                placeholder="https://buy.yourbrand.com"
                defaultValue={settings.checkoutBaseUrl ?? ""}
              />
            </div>
            <div>
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Account &amp; deployment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-white/70">
          <p>
            The admin password and encryption keys are set as deployment environment variables, not editable here —
            see <code className="rounded bg-black/40 px-1">VIRALHIVE_ADMIN_PASSWORD</code>,{" "}
            <code className="rounded bg-black/40 px-1">VIRALHIVE_ENCRYPTION_KEY</code>, and{" "}
            <code className="rounded bg-black/40 px-1">CRON_SECRET</code> in the deployment docs.
          </p>
          <p>
            Autonomous posting runs on a schedule triggered by Vercel Cron (see <code className="rounded bg-black/40 px-1">vercel.json</code>)
            — it fires whether or not this dashboard is open, on any device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
