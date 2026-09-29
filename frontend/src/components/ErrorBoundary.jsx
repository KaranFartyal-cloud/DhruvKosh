import { Component } from 'react';
import ThemeContext from '../context/ThemeContext';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ThemeContext.Consumer>
          {({ isLight }) => (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? 'bg-[#F4F7FB] text-[#0B1B33]' : 'bg-[#05080F] text-[#EAF0F8]'}`}>
              <div className={`max-w-md w-full p-8 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0D1422] border-white/10 shadow-xl'} text-center`}>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                <p className={`text-sm mb-6 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  We encountered an unexpected error rendering this page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isLight
                      ? 'bg-[#0A7C8C] text-white hover:bg-[#086370]'
                      : 'bg-ncpor-accent text-[#05080F] hover:bg-ncpor-accentBright'
                  }`}
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}
        </ThemeContext.Consumer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
