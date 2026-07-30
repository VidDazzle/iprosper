// Print-on-demand: put an operator-supplied image onto physical products
// (t-shirts, mugs, etc.) via a POD provider's official API (Printful / Printify
// / Gooten). This module abstracts the provider; a real API call is made only
// when the provider's credentials are present, otherwise it returns a clearly
// marked "not configured" result rather than pretending to create anything.

export type PodProviderName = 'printful' | 'printify' | 'gooten';

export interface PodBlank {
  // A blank product type the provider offers, e.g. "unisex-tee", "mug-11oz".
  blankId: string;
  label: string;
}

// A small catalog of common blanks. Real blank/variant ids come from the
// provider's catalog API; these are placeholders for the UI/matching layer.
export const COMMON_BLANKS: PodBlank[] = [
  { blankId: 'unisex-tee', label: 'Unisex T-Shirt' },
  { blankId: 'hoodie', label: 'Hoodie' },
  { blankId: 'mug-11oz', label: 'Mug (11oz)' },
  { blankId: 'tote', label: 'Tote Bag' },
  { blankId: 'poster', label: 'Poster' },
  { blankId: 'phone-case', label: 'Phone Case' },
  { blankId: 'sticker', label: 'Sticker' },
];

export interface CreatePodProductInput {
  provider: PodProviderName;
  imageUrl: string;
  blankId: string;
  title: string;
}

export interface CreatePodProductResult {
  ok: boolean;
  provider: PodProviderName;
  externalId?: string;
  retailPriceUsd?: number;
  error?: string;
}

function providerToken(provider: PodProviderName): string | undefined {
  switch (provider) {
    case 'printful':
      return process.env.PRINTFUL_API_KEY;
    case 'printify':
      return process.env.PRINTIFY_API_KEY;
    case 'gooten':
      return process.env.GOOTEN_API_KEY;
  }
}

/**
 * Create a POD product from an image. The Printful path is wired against its
 * official Store Products API; other providers follow the same shape. If no
 * token is configured we fail closed so nothing silently no-ops.
 */
export async function createPodProduct(
  input: CreatePodProductInput,
): Promise<CreatePodProductResult> {
  const token = providerToken(input.provider);
  if (!token) {
    return {
      ok: false,
      provider: input.provider,
      error: `${input.provider} not configured (missing API key).`,
    };
  }

  if (input.provider === 'printful') {
    try {
      const res = await fetch('https://api.printful.com/store/products', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sync_product: { name: input.title },
          // Real integration maps blankId -> variant_ids and places the image
          // via the print files array. Left minimal so the operator's own
          // catalog/variant choices drive the actual placement.
          sync_variants: [
            {
              retail_price: '24.99',
              files: [{ url: input.imageUrl }],
            },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, provider: 'printful', error: `Printful error: ${res.status}` };
      }
      const data = (await res.json()) as { result?: { id?: number } };
      return {
        ok: true,
        provider: 'printful',
        externalId: data.result?.id ? String(data.result.id) : undefined,
        retailPriceUsd: 24.99,
      };
    } catch (e) {
      return { ok: false, provider: 'printful', error: (e as Error).message };
    }
  }

  // Printify / Gooten: same contract, wired when the operator selects them.
  return {
    ok: false,
    provider: input.provider,
    error: `${input.provider} integration pending; use Printful or add the provider's create call.`,
  };
}
