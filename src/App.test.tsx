import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import App from './App';

function renderApp() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}

describe('App auth gate', () => {
  beforeEach(() => localStorage.clear());

  it('shows the login screen with password form and role choices when unauthenticated', () => {
    renderApp();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '管理员' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '员工' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '客户' })).toBeInTheDocument();
  });
});
