// features/products/useProductSearch.ts — B9 (transcribed verbatim from the master plan)
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFetchJson } from '@/hooks/useFetchJson';
import { parseProducts } from './api';

export function useProductSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const url =
    debounced.length >= 2
      ? `/api/products?q=${encodeURIComponent(debounced)}`
      : null;
  return useFetchJson(url, parseProducts);
}
