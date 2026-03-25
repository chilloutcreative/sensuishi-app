import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            ⚠️ エラーが発生しました
          </h2>
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fca5a5', 
            borderRadius: '12px', 
            padding: '16px', 
            textAlign: 'left',
            fontSize: '13px',
            marginBottom: '16px',
            wordBreak: 'break-all'
          }}>
            <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              {this.state.error?.message}
            </p>
            <pre style={{ 
              fontSize: '11px', 
              color: '#6b7280', 
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflow: 'auto' 
            }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            再試行
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ホームに戻る
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
