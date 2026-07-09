import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/http';
import type { PolicyCompileResult, PolicyList, PolicyRule } from '../api/types';

const KEY = ['policies'] as const;

export function usePolicies() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<PolicyList>('/policies') });
}

export function useCompilePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nlText: string) =>
      api.post<PolicyCompileResult>('/policies/compile', { nl_text: nlText }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCompileAndApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nlText: string) =>
      api.post<PolicyCompileResult>('/policies/compile/apply', { nl_text: nlText }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Partial<PolicyRule>) =>
      api.post<PolicyRule>('/policies', rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTogglePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      api.patch<PolicyRule>(`/policies/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<void>(`/policies/${id}`, {}).then(() => undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
