import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/shared/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { LiveProvider } from './live/LiveProvider';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <LiveProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </LiveProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
