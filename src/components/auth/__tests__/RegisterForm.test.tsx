import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterForm from '../RegisterForm';

// Mock the auth context
const mockRegister = vi.fn();
const mockAuth = {
  register: mockRegister,
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
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isLoading = false;
    mockAuth.error = null;
  });

  it('renders registration form with all required fields', () => {
    render(<RegisterForm />);
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('validates name field', async () => {
    render(<RegisterForm />);
    
    const nameField = screen.getByLabelText(/full name/i);
    
    // Test empty name
    fireEvent.blur(nameField);
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    
    // Test short name
    fireEvent.change(nameField, { target: { value: 'Jo' } });
    fireEvent.blur(nameField);
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
    
    // Test valid name
    fireEvent.change(nameField, { target: { value: 'John Doe' } });
    fireEvent.blur(nameField);
    await waitFor(() => {
      expect(screen.queryByText(/name must be at least 2 characters/i)).not.toBeInTheDocument();
    });
  });

  it('validates email field', async () => {
    render(<RegisterForm />);
    
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

  it('validates password strength', async () => {
    render(<RegisterForm />);
    
    const passwordField = screen.getByLabelText(/^password/i);
    
    // Test weak password
    fireEvent.change(passwordField, { target: { value: '123' } });
    fireEvent.blur(passwordField);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
    
    // Test password without special characters
    fireEvent.change(passwordField, { target: { value: 'password123' } });
    fireEvent.blur(passwordField);
    
    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument();
    });
    
    // Test strong password
    fireEvent.change(passwordField, { target: { value: 'StrongPassword123!' } });
    fireEvent.blur(passwordField);
    
    await waitFor(() => {
      expect(screen.queryByText(/password must contain/i)).not.toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    render(<RegisterForm />);
    
    const passwordField = screen.getByLabelText(/^password/i);
    const confirmPasswordField = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(passwordField, { target: { value: 'StrongPassword123!' } });
    fireEvent.change(confirmPasswordField, { target: { value: 'DifferentPassword123!' } });
    fireEvent.blur(confirmPasswordField);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    
    // Test matching passwords
    fireEvent.change(confirmPasswordField, { target: { value: 'StrongPassword123!' } });
    fireEvent.blur(confirmPasswordField);
    
    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
  });

  it('shows password strength indicator', () => {
    render(<RegisterForm />);
    
    const passwordField = screen.getByLabelText(/^password/i);
    
    // Test weak password
    fireEvent.change(passwordField, { target: { value: '123' } });
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
    
    // Test medium password
    fireEvent.change(passwordField, { target: { value: 'password123' } });
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    
    // Test strong password
    fireEvent.change(passwordField, { target: { value: 'StrongPassword123!' } });
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('requires terms and conditions acceptance', async () => {
    render(<RegisterForm />);
    
    // Fill all fields except terms checkbox
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPassword123!' } });
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
    
    // Check terms checkbox
    const termsCheckbox = screen.getByLabelText(/i agree to the terms and conditions/i);
    fireEvent.click(termsCheckbox);
    
    expect(submitButton).toBeEnabled();
  });

  it('calls register function with form data on submit', async () => {
    render(<RegisterForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.click(screen.getByLabelText(/i agree to the terms and conditions/i));
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'test@example.com',
        password: 'StrongPassword123!',
      });
    });
  });

  it('shows loading state during registration', () => {
    mockAuth.isLoading = true;
    
    render(<RegisterForm />);
    
    const submitButton = screen.getByRole('button', { name: /creating account/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error message when registration fails', () => {
    mockAuth.error = 'Email already exists';
    
    render(<RegisterForm />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Email already exists');
  });

  it('shows login link for existing users', () => {
    render(<RegisterForm />);
    
    const loginLink = screen.getByText(/sign in/i);
    expect(loginLink).toBeInTheDocument();
  });

  it('shows email verification message after successful registration', async () => {
    const mockRegisterSuccess = vi.fn().mockResolvedValue({
      success: true,
      message: 'Please check your email to verify your account'
    });
    mockAuth.register = mockRegisterSuccess;
    
    render(<RegisterForm />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'StrongPassword123!' } });
    fireEvent.click(screen.getByLabelText(/i agree to the terms and conditions/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please check your email to verify your account/i)).toBeInTheDocument();
    });
  });
});