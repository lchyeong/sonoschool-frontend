import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { env } from '@/config/env';
import '@/styles/globals.scss';

import App from './App.tsx';

const bootstrap = async (): Promise<void> => {
  if (__DEV__ && env.VITE_ENABLE_MOCK) {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element (#root) not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void bootstrap();
