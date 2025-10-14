import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoreProvider } from './store/Provider';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import EmailVerification from './components/auth/EmailVerification';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastContainer from './components/common/ToastContainer';
import ApiErrorHandler from './components/common/ApiErrorHandler';
import AuthInitializer from './components/auth/AuthInitializer';

// Lazy load heavy pages for better performance
const Landing = React.lazy(() => import('./pages/Landing'));
const DemoPage = React.lazy(() => import('./pages/DemoPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard'));
const SessionHistory = React.lazy(() => import('./pages/SessionHistory'));
const SessionHandoff = React.lazy(() => import('./pages/SessionHandoff'));
const SessionManagement = React.lazy(() => import('./pages/SessionManagement'));
const WidgetTest = React.lazy(() => import('./pages/WidgetTest'));
const WebsiteDetails = React.lazy(() => import('./pages/WebsiteDetails'));
const WebsiteRegistrationWizard = React.lazy(() => import('./components/website/WebsiteRegistrationWizard'));
const ScriptGenerator = React.lazy(() => import('./components/script/ScriptGenerator'));

function AppRoutes() {

  // All other routes use AppLayout with Error Boundary
  return (
    <ErrorBoundary>
      <AppLayout>
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        }>
          <Routes>
          {/* Auth routes (redirect to dashboard if already authenticated) */}
          <Route path="/login" element={
            <ProtectedRoute requireAuth={false}>
              <LoginForm />
            </ProtectedRoute>
          } />
          <Route path="/register" element={
            <ProtectedRoute requireAuth={false}>
              <RegisterForm />
            </ProtectedRoute>
          } />
          <Route path="/verify-email" element={
            <ProtectedRoute requireAuth={false}>
              <EmailVerification />
            </ProtectedRoute>
          } />

          {/* Protected routes (require authentication) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/website/:websiteId" element={
            <ProtectedRoute>
              <WebsiteDetails />
            </ProtectedRoute>
          } />
          <Route path="/analytics/:websiteId" element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/session-history/:sessionToken" element={
            <ProtectedRoute>
              <SessionHistory />
            </ProtectedRoute>
          } />
          <Route path="/session-handoff" element={
            <ProtectedRoute>
              <SessionHandoff />
            </ProtectedRoute>
          } />
          <Route path="/session-management" element={
            <ProtectedRoute>
              <SessionManagement />
            </ProtectedRoute>
          } />
          <Route path="/register-website" element={
            <ProtectedRoute>
              <WebsiteRegistrationWizard />
            </ProtectedRoute>
          } />
          <Route path="/script-generator" element={
            <ProtectedRoute>
              <ScriptGenerator />
            </ProtectedRoute>
          } />
          <Route path="/widget-test" element={
            <ProtectedRoute>
              <WidgetTest />
            </ProtectedRoute>
          } />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        {/* Global error and notification handlers */}
        <ApiErrorHandler />
        <ToastContainer />
      </AppLayout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <StoreProvider>
      <AuthInitializer>
        <ThemeProvider>
          <Router>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            }>
              <Routes>
                {/* Landing page - no layout */}
                <Route path="/" element={<Landing />} />

                {/* Demo page - no layout, no auth required */}
                <Route path="/demo/:demoId" element={<DemoPage />} />

                {/* All other routes with AppLayout */}
                <Route path="/*" element={<AppRoutes />} />
              </Routes>
            </Suspense>
          </Router>
        </ThemeProvider>
      </AuthInitializer>
    </StoreProvider>
  );
}

export default App;