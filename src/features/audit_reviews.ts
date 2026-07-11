import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/http';

interface AuditReviewItem {
  id: string;
  trace_id: string | null;
  event_type: string;
  op_key: string | null;
  matched_rule_id: string | null;
  status: 'pending' | 'confirmed' | 'overridden';
  reviewed_by: string | null;
  decision: string | null;
  comment: string | null;
  context_json: Record<string, unknown>;
  refinement_hint: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ReviewStats {
  pending: number;
  confirmed: number;
  overridden: number;
  total: number;
  needs_attention: { rule_id: string; override_count: number; action: string }[];
}

const KEY = ['audit-reviews'] as const;

export function useAuditReviews(status?: string) {
  const params = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: [...KEY, status],
    queryFn: () => api.get<{ items: AuditReviewItem[]; total: number }>(`/audit-reviews${params}`),
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: [...KEY, 'stats'],
    queryFn: () => api.get<ReviewStats>('/audit-reviews/stats'),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: string; comment?: string }) =>
      api.post<AuditReviewItem>(`/audit-reviews/${id}/review`, { decision, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
