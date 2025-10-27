import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

export const DebugApp = () => {
  return (
    <div>
      <h1>Firebase Debug Test</h1>
      <p>If you can see this, React is working.</p>
      
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <DataProvider>
              <HashRouter>
                <div style={{ direction: 'rtl', fontFamily: 'Tahoma' }}>
                  <h2>Testing HomePage Component</h2>
                  <HomePage />
                </div>
              </HashRouter>
            </DataProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<DebugApp />);
} else {
  console.error("Could not find root element");
}