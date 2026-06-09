import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // don't retry auth/permission failures — only transient ones
      retry: (count, err) => {
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401 || status === 403 || status === 404) return false;
        return count < 1;
      },
    },
  },
});
