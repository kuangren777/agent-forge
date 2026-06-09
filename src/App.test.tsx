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

  it('shows the login screen with role choices when unauthenticated', () => {
    renderApp();
    expect(screen.getByText(/以「管理员」登录/)).toBeInTheDocument();
    expect(screen.getByText(/以「员工」登录/)).toBeInTheDocument();
    expect(screen.getByText(/以「客户」登录/)).toBeInTheDocument();
  });
});
