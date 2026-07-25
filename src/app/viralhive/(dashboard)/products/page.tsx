import { db } from "@/db";
import { viralhiveProducts } from "@/db/schema";
import { upsertProductAction } from "@/lib/viralhive/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ProductRowActions } from "./RowActions";

export default async function ProductsPage() {
  const products = await db.select().from(viralhiveProducts);

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Shoppable products</CardTitle>
          <CardDescription>Attach a product to a campaign to embed it in videos with a real checkout link.</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-white/50">No products yet — add one below.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stripe price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      {(p.priceCents / 100).toFixed(2)} {p.currency.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-white/60">{p.stripePriceId ?? "— (UTM link fallback)"}</TableCell>
                    <TableCell>
                      <ProductRowActions id={p.id} />
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
          <CardTitle className="text-base">Add / update a product</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertProductAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID">
              <Input name="id" required pattern="[a-z0-9_\-]+" placeholder="coaching_program" />
            </Field>
            <Field label="Name">
              <Input name="name" required placeholder="8-Week Shred Coaching Program" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea name="description" rows={3} required />
              </Field>
            </div>
            <Field label="Price (e.g. 199.00)">
              <Input name="price" type="number" step="0.01" min={0} required />
            </Field>
            <Field label="Currency">
              <Input name="currency" defaultValue="usd" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Image URLs (comma-separated)">
                <Input name="imageUrls" placeholder="https://.../product.jpg" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Stripe price ID (optional — falls back to a UTM-tagged link without it)">
                <Input name="stripePriceId" placeholder="price_..." />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save product</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-white/70">{label}</Label>
      {children}
    </div>
  );
}
