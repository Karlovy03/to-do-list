import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/shared/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
