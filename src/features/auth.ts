import { useMutation, useQuery } from '@tanstack/react-query';
import { api, getToken, setToken } from '../api/http';
import { queryClient } from '../api/queryClient';
import type { Me, Role } from '../api/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/me'),
    enabled: !!getToken(),
    retry: false,
    staleTime: Infinity,
  });
}

/** Demo auth: log in as the seeded user holding `role`. Role switch = re-login. */
export async function login(role: Role): Promise<void> {
  const res = await api.post<{ token: string }>('/auth/login', { role });
  setToken(res.token);
  await queryClient.invalidateQueries();
}

/** Production auth: email + password. */
export async function passwordLogin(email: string, password: string): Promise<void> {
  const res = await api.post<{ token: string }>('/auth/token', { email, password });
  setToken(res.token);
  await queryClient.invalidateQueries();
}

export function useLogin() {
  return useMutation({ mutationFn: (role: Role) => login(role) });
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    setToken(null);
    queryClient.clear();
  }
}
