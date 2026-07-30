import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { podDesigns, products } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { createPodProduct, COMMON_BLANKS, type PodProviderName } from '@/lib/prospecting/pod';

const now = () => new Date().toISOString();
const VALID_PROVIDERS: PodProviderName[] = ['printful', 'printify', 'gooten'];

// List designs and the available blank product types.
export async function GET() {
  try {
    const designs = await db.select().from(podDesigns).orderBy(desc(podDesigns.createdAt)).limit(100);
    return NextResponse.json({ designs, blanks: COMMON_BLANKS }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

// Take an operator image and put it on POD products. Records the design, calls
// the provider for each requested blank, and registers a promotable product row
// (source 'pod') for each successful creation so it flows into the promotion
// pipeline like any other product.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, imageUrl, provider, blanks } = body;
    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'name and imageUrl are required', code: 'MISSING_FIELDS' }, { status: 400 });
    }
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: `provider must be one of ${VALID_PROVIDERS.join(', ')}`, code: 'INVALID_PROVIDER' }, { status: 400 });
    }
    const blankIds: string[] = Array.isArray(blanks) && blanks.length ? blanks : ['unisex-tee'];

    const [design] = await db
      .insert(podDesigns)
      .values({ name: name.trim(), imageUrl, sourcePrompt: body.sourcePrompt ?? null, provider, createdAt: now() })
      .returning();

    const created: Array<{ blankId: string; ok: boolean; productId?: number; error?: string }> = [];

    for (const blankId of blankIds) {
      const label = COMMON_BLANKS.find((b) => b.blankId === blankId)?.label ?? blankId;
      const title = `${name} ${label}`;
      const result = await createPodProduct({ provider, imageUrl, blankId, title });

      if (result.ok) {
        const [prod] = await db
          .insert(products)
          .values({
            source: 'pod',
            title,
            description: `Print-on-demand ${label} featuring "${name}".`,
            category: 'print-on-demand',
            priceUsd: result.retailPriceUsd ?? null,
            imageUrl,
            podProvider: provider,
            podExternalId: result.externalId ?? null,
            active: true,
            createdAt: now(),
            updatedAt: now(),
          })
          .returning();
        created.push({ blankId, ok: true, productId: prod.id });
      } else {
        created.push({ blankId, ok: false, error: result.error });
      }
    }

    return NextResponse.json({ design, created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
