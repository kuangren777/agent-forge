import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { queryClient } from './api/queryClient';
import { AppProvider } from './lib/appContext';

async function bootstrap() {
  if (import.meta.env.VITE_DEMO === '1') {
    const { installDemo } = await import('./demo/install');
    installDemo();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <App />
        </AppProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

bootstrap();
