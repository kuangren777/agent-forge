import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { ApprovalRequest } from '../api/types';

export function useApprovals(status?: string) {
  return useQuery({
    queryKey: ['approvals', status],
    queryFn: () => api.get<{ items: ApprovalRequest[] }>(`/approval-requests${status ? `?status=${status}` : ''}`),
  });
}

export function useVote(requestId: string) {
  return useMutation({
    mutationFn: (body: { decision: string; comment?: string }) =>
      api.post<ApprovalRequest>(`/approval-requests/${requestId}/votes`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['traces'] });
    },
  });
}
