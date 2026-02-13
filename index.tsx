import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { inject } from '@vercel/analytics';
import App from './App';

console.log("Index.tsx: Starting application...");

// Initialize Vercel Web Analytics
try {
  inject();
} catch (e) {
  console.warn("Analytics failed to load", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Could not find root element to mount to");
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-white bg-red-900/80 min-h-screen font-mono">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <pre className="bg-black/50 p-4 rounded overflow-auto text-sm">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-white text-red-900 px-4 py-2 rounded font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

try {
  console.log("Index.tsx: Mounting React Root...");
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("Index.tsx: Mount called successfully.");
} catch (e) {
  console.error("Index.tsx: Failed to mount React app", e);
  rootElement.innerText = "Fatal Error: Failed to mount React application.";
}