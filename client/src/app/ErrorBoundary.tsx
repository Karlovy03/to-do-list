import { Component, type ReactNode } from 'react';
import { t } from '@/shared/lib/texts';
import { ErrorState } from '@/shared/ui';

/** Збій рендеру не лишає білий екран */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error(err);
  }
  render() {
    return this.state.failed ? <ErrorState message={t('app.common.error')} onRetry={() => window.location.reload()} /> : this.props.children;
  }
}
