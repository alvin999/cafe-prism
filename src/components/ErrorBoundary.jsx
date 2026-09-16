import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          maxWidth: '640px',
          margin: '40px auto',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}>
          <div className="prism-card prism-card-highlight" style={{
            borderColor: 'var(--prism-danger-border)',
            background: 'rgba(192, 80, 64, 0.08)',
            padding: '32px 28px',
          }}>
            <div style={{ fontSize: '38px', marginBottom: '12px' }}>☕⚠️</div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              color: 'var(--prism-text-primary)',
              fontWeight: 600,
            }}>
              應用程式遇到了非預期的萃取錯誤
            </h2>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '13px',
              color: 'var(--prism-text-muted)',
              lineHeight: 1.6,
            }}>
              {this.state.error?.message || '頁面渲染時發生未預期的例外，請嘗試重整或重設介面狀態。'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReset}
                className="prism-btn prism-btn-ghost"
              >
                重試當前元件
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="prism-btn prism-btn-primary"
              >
                重新載入頁面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
