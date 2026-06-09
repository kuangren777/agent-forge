import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { Execution, TraceAudit, TraceFlow, TraceSummary } from '../api/types';

export function useTraces() {
  return useQuery({
    queryKey: ['traces'],
    queryFn: () => api.get<{ items: TraceSummary[] }>('/traces'),
  });
}

export function useTraceFlow(traceId: string | undefined) {
  return useQuery({
    queryKey: ['trace', traceId, 'flow'],
    queryFn: () => api.get<TraceFlow>(`/traces/${traceId}/flow`),
    enabled: !!traceId,
  });
}

export function useTraceAudit(traceId: string | undefined) {
  return useQuery({
    queryKey: ['trace', traceId, 'audit'],
    queryFn: () => api.get<TraceAudit>(`/traces/${traceId}/audit`),
    enabled: !!traceId,
  });
}

export function useExecutions(traceId: string | undefined) {
  return useQuery({
    queryKey: ['trace', traceId, 'executions'],
    queryFn: () => api.get<{ items: Execution[] }>(`/traces/${traceId}/executions`),
    enabled: !!traceId,
  });
}

export function useRollback(traceId: string | undefined) {
  return useMutation({
    mutationFn: (executionId: string) => api.post(`/executions/${executionId}/rollback`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trace', traceId] });
    },
  });
}
