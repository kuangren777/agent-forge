import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, getToken } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { DataSource, ExplorationJob } from '../api/types';

export function useSources() {
  return useQuery({ queryKey: ['sources'], queryFn: () => api.get<{ items: DataSource[] }>('/sources') });
}

export function useStartExplore() {
  return useMutation({
    mutationFn: (sourceId: string) => api.post<{ job_id: string }>(`/sources/${sourceId}/explore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
}

export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.get<ExplorationJob>(`/exploration-jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = (q.state.data as ExplorationJob | undefined)?.status;
      return s && s !== 'done' && s !== 'error' ? 1000 : false;
    },
  });
}

export interface StreamEvent { seq: number; type: string; payload: Record<string, unknown> }

/** Subscribe to an exploration job's SSE event stream. */
export function useExplorationStream(jobId: string | undefined): StreamEvent[] {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  useEffect(() => {
    if (!jobId) return;
    setEvents([]);
    const token = getToken();
    const url = `${api.base}/exploration-jobs/${jobId}/events${token ? `?token=${token}` : ''}`;
    const es = new EventSource(url);
    const onMsg = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setEvents((prev) => [...prev, { seq: Number(e.lastEventId || prev.length + 1), type: (e as MessageEvent).type, payload }]);
      } catch {
        /* ignore */
      }
    };
    for (const t of ['phase', 'op', 'rule', 'file', 'extract', 'chain', 'done', 'error', 'message']) {
      es.addEventListener(t, onMsg as EventListener);
    }
    es.addEventListener('close', () => es.close());
    es.onerror = () => es.close();
    return () => es.close();
  }, [jobId]);
  return events;
}
