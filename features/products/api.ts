// features/products/api.ts — stub written for verification (the master plan
// references './api' with parseProducts but never prints this file).
// Pure parser, no React, matching the plan's architecture section.

export type Product = { id: number; name: string; price: number };

export function parseProducts(json: unknown): Product[] {
  if (!Array.isArray(json)) throw new Error('Expected an array of products');
  return json.filter(
    (p): p is Product =>
      typeof p?.id === 'number' &&
      typeof p?.name === 'string' &&
      typeof p?.price === 'number',
  );
}
