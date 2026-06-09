import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { Operation, OperationList } from '../api/types';

export function useOperations() {
  return useQuery({ queryKey: ['operations'], queryFn: () => api.get<OperationList>('/operations') });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['operations'] });
}

export function usePublishOperation() {
  return useMutation({
    mutationFn: (id: string) => api.post<Operation>(`/operations/${id}/publish`),
    onSuccess: invalidate,
  });
}

export function useDisableOperation() {
  return useMutation({
    mutationFn: (id: string) => api.post<Operation>(`/operations/${id}/disable`),
    onSuccess: invalidate,
  });
}
