import { useEffect, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';

import AppErrorBoundary from '@/app/AppErrorBoundary';
import { ToastViewport } from '@/components/feedback/Toast/ToastViewport';
import { createQueryClient } from '@/query/queryClient';
import { router } from '@/routes/router';
import { useThemeStore } from '@/stores/useThemeStore';

const AppProviders = () => {
  const theme = useThemeStore((state) => state.theme);
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastViewport />
        {__DEV__ ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default AppProviders;
