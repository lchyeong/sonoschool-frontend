import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import '@/styles/globals.scss';

import App from './App.tsx';

const bootstrap = (): void => {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element (#root) not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

bootstrap();
