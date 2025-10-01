import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from '../LoginForm';

// Mock the auth context
const mockLogin = vi.fn();
const mockAuth = {
  login: mockLogin,
  isLoading: false,
  error: null,
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isLoading = false;
    mockAuth.error = null;
  });

  it('renders login form with all required fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('validates email field on blur', async () => {
    render(<LoginForm />);
    
    const emailField = screen.getByLabelText(/email/i);
    
    // Test invalid email
    fireEvent.change(emailField, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailField);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
    
    // Test valid email
    fireEvent.change(emailField, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailField);
    
    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  it('validates password field on blur', async () => {
    render(<LoginForm />);
    
    const passwordField = screen.getByLabelText(/password/i);
    
    // Test short password
    fireEvent.change(passwordField, { target: { value: '123' } });
    fireEvent.blur(passwordField);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
    
    // Test valid password
    fireEvent.change(passwordField, { target: { value: 'validPassword123!' } });
    fireEvent.blur(passwordField);
    
    await waitFor(() => {
      expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument();
    });
  });

  it('disables submit button when form is invalid', () => {
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
    
    // Fill valid data
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'validPassword123!' } 
    });
    
    expect(submitButton).toBeEnabled();
  });

  it('calls login function with form data on submit', async () => {
    render(<LoginForm />);
    
    const emailField = screen.getByLabelText(/email/i);
    const passwordField = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailField, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordField, { target: { value: 'validPassword123!' } });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'validPassword123!',
      });
    });
  });

  it('shows loading state when authentication is in progress', () => {
    mockAuth.isLoading = true;
    
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error message when authentication fails', () => {
    mockAuth.error = 'Invalid credentials';
    
    render(<LoginForm />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows forgot password link', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });

  it('shows register link for new users', () => {
    render(<LoginForm />);
    
    const registerLink = screen.getByText(/sign up/i);
    expect(registerLink).toBeInTheDocument();
  });

  it('shows password visibility toggle', () => {
    render(<LoginForm />);
    
    const passwordField = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByLabelText(/toggle password visibility/i);
    
    expect(passwordField).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordField).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordField).toHaveAttribute('type', 'password');
  });
});