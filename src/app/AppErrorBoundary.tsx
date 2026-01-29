import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import UnexpectedErrorPage from '@/pages/UnexpectedErrorPage/UnexpectedErrorPage';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) console.error('[AppErrorBoundary]', error, errorInfo);
  }

  private resetError = (): void => {
    this.setState({ error: null });
  };

  public override render(): ReactNode {
    const { error } = this.state;
    if (error) return <UnexpectedErrorPage error={error} onReset={this.resetError} />;

    return this.props.children;
  }
}

export default AppErrorBoundary;
