import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Globe,
  BarChart3,
  User,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser } from '../../store/authSlice';

/**
 * Main navigation component with authentication-aware links
 */
const Navigation: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(state => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; }> = ({ to, icon, label }) => (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActiveRoute(to)
          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );

  const UserMenu: React.FC = () => (
    <div className="flex items-center space-x-3 p-3 border-t border-gray-200">
      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
        <User className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user?.name || 'User'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {user?.email}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <nav className="bg-white shadow-sm border-r border-gray-200">
        <div className="p-4">
          <Link to="/" className="flex items-center space-x-2">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">ChatLite</span>
          </Link>
        </div>
        <div className="px-4 py-2 space-y-1">
          <Link
            to="/demo"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Home className="w-4 h-4" />
            <span>Demo</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <User className="w-4 h-4" />
            <span>Login</span>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">ChatLite</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-4 space-y-1">
        <NavLink
          to="/dashboard"
          icon={<Home className="w-4 h-4" />}
          label="Dashboard"
        />


        <NavLink
          to="/session-management"
          icon={<MessageSquare className="w-4 h-4" />}
          label="Sessions"
        />

      </div>

      {/* User Menu */}
      <UserMenu />
    </nav>
  );
};

export default Navigation;