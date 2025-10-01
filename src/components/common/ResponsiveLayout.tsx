import React, { type ReactNode } from 'react';
import { Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store';
import { selectUser, logoutUser } from '../../store/authSlice';
import { useTheme } from '../../contexts/ThemeContext';

interface ResponsiveLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
  title?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  showNavigation = false, 
  title = "LiteChat" 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { setTheme, isDarkMode } = useTheme();


  const logout = () => {
    dispatch(logoutUser());
  };
  const location = useLocation();
  
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Script', href: '/script-generator' },
    { name: 'Sessions', href: '/session-management' },
  ].map(item => ({
    ...item,
    current: location.pathname === item.href
  }));

  return (
    <div className="min-h-screen bg-gray-900">
      {showNavigation && user && (
        <>
          {/* Desktop Navigation */}
          <nav className="hidden md:block bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link to="/dashboard" className="flex items-center">
                    <span className="text-xl font-bold text-indigo-600">{title}</span>
                  </Link>
                  <div className="ml-10 flex items-baseline space-x-8">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          item.current
                            ? 'bg-indigo-900 text-indigo-300'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleTheme}
                    className="text-gray-400 hover:text-gray-200 p-2"
                  >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-300 hover:text-gray-100 px-3 py-1 border border-gray-600 rounded"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Navigation */}
          <nav className="md:hidden bg-gray-800 border-b border-gray-700">
            <div className="px-4 sm:px-6">
              <div className="flex justify-between items-center h-16">
                <Link to="/dashboard" className="flex items-center">
                  <span className="text-xl font-bold text-indigo-600">{title}</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="border-t border-gray-700 bg-gray-800">
                <div className="px-4 pt-2 pb-3 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        item.current
                          ? 'bg-indigo-900 text-indigo-300'
                          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="px-4 space-y-1">
                    <div className="text-base font-medium text-gray-800 dark:text-gray-200">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  <div className="mt-3 px-4 space-y-1">
                    <button
                      onClick={() => {
                        toggleTheme();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-base font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-700 transition-colors duration-200"
                    >
                      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                      <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className={showNavigation && user ? 'h-[calc(100vh-4rem)]' : ''}>
        {children}
      </main>
    </div>
  );
};

export default ResponsiveLayout;