import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { selectIsAuthenticated } from '../../store/authSlice';
import Navigation from '../navigation/Navigation';
import useTokenRefresh from '../../hooks/useTokenRefresh';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout with navigation and token management
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  // Initialize token refresh mechanism
  useTokenRefresh();

  // Dashboard and Script Generator have their own custom layout
  if ((location.pathname === '/dashboard' || location.pathname === '/script-generator') && isAuthenticated) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    // For unauthenticated users, show content without navigation
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    );
  }

  // For authenticated users, show full layout with navigation
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Navigation Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="fixed w-64 h-full">
          <Navigation />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex-1">
            {/* Breadcrumb or page title could go here */}
          </div>

          {/* Top-right actions */}
          <div className="flex items-center space-x-4">
            {/* Additional header actions can go here */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;