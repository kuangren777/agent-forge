import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { LlmProfile, LlmProfiles } from '../api/types';

export function useLlmProfiles() {
  return useQuery({ queryKey: ['llm-profiles'], queryFn: () => api.get<LlmProfiles>('/llm-profiles') });
}

/** Gateway model catalogue (admin); enabled only when explicitly fetched. */
export function useLlmModels(enabled: boolean) {
  return useQuery({
    queryKey: ['llm-models'],
    queryFn: () => api.get<{ models: string[] }>('/llm-models'),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function usePatchProfile() {
  return useMutation({
    mutationFn: ({ role, body }: { role: string; body: Partial<LlmProfile> }) =>
      api.patch<LlmProfile>(`/llm-profiles/${role}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['llm-profiles'] }),
  });
}
