import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LandingPage } from './components/LandingPage';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';

type AppView = 
  | 'landing'
  | 'login' 
  | 'register' 
  | 'forgot-password'
  | 'dashboard'
  | 'admin';

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('landing');

  // Handle navigation based on authentication state
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // If user is authenticated and we're on auth pages, redirect to dashboard
        if (['landing', 'login', 'register', 'forgot-password'].includes(currentView)) {
          setCurrentView('dashboard');
        }
      } else {
        // If user is not authenticated and we're on protected pages, redirect to landing
        if (['dashboard', 'admin'].includes(currentView)) {
          setCurrentView('landing');
        }
      }
    }
  }, [isAuthenticated, isLoading, currentView]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-2">Loading...</div>
          <div className="text-gray-600">Please wait while we initialize your session</div>
        </div>
      </div>
    );
  }

  // Navigation handlers
  const navigateToLanding = () => setCurrentView('landing');
  const navigateToLogin = () => setCurrentView('login');
  const navigateToRegister = () => setCurrentView('register');
  const navigateToForgotPassword = () => setCurrentView('forgot-password');
  const navigateToDashboard = () => setCurrentView('dashboard');
  const navigateToAdmin = () => setCurrentView('admin');

  // Render current view
  switch (currentView) {
    case 'landing':
      return (
        <LandingPage
          onNavigateToLogin={navigateToLogin}
          onNavigateToRegister={navigateToRegister}
        />
      );

    case 'login':
      return (
        <LoginForm
          onNavigateToRegister={navigateToRegister}
          onNavigateToForgotPassword={navigateToForgotPassword}
          onNavigateToLanding={navigateToLanding}
        />
      );

    case 'register':
      return (
        <RegisterForm
          onNavigateToLogin={navigateToLogin}
          onNavigateToLanding={navigateToLanding}
        />
      );

    case 'forgot-password':
      return (
        <ForgotPasswordForm
          onNavigateToLogin={navigateToLogin}
          onNavigateToLanding={navigateToLanding}
        />
      );

    case 'dashboard':
      return (
        <Dashboard
          onNavigateToAdmin={user?.is_admin ? navigateToAdmin : undefined}
        />
      );

    case 'admin':
      return (
        <AdminPanel
          onNavigateToDashboard={navigateToDashboard}
        />
      );

    default:
      return (
        <LandingPage
          onNavigateToLogin={navigateToLogin}
          onNavigateToRegister={navigateToRegister}
        />
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;