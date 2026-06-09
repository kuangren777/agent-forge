import { useQuery } from '@tanstack/react-query';
import { api } from '../api/http';
import type { Plugin } from '../api/types';

export function usePlugins() {
  return useQuery({ queryKey: ['plugins'], queryFn: () => api.get<{ items: Plugin[] }>('/plugins') });
}
