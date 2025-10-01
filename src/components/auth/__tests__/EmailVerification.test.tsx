import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmailVerification from '../EmailVerification';

// Mock the auth context
const mockVerifyEmail = vi.fn();
const mockResendVerification = vi.fn();
const mockAuth = {
  verifyEmail: mockVerifyEmail,
  resendVerification: mockResendVerification,
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
  useSearchParams: () => [new URLSearchParams('?token=test-token&email=test@example.com')],
}));

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isLoading = false;
    mockAuth.error = null;
  });

  it('renders email verification form', () => {
    render(<EmailVerification />);
    
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(/we sent a verification link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('automatically verifies email when token is provided in URL', async () => {
    render(<EmailVerification />);
    
    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith('test-token');
    });
  });

  it('shows success message after successful verification', async () => {
    const mockVerifySuccess = vi.fn().mockResolvedValue({
      success: true,
      message: 'Email verified successfully'
    });
    mockAuth.verifyEmail = mockVerifySuccess;
    
    render(<EmailVerification />);
    
    await waitFor(() => {
      expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/you can now sign in/i)).toBeInTheDocument();
    });
  });

  it('shows error message when verification fails', async () => {
    mockAuth.error = 'Invalid verification token';
    
    render(<EmailVerification />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid verification token');
  });

  it('resends verification email', async () => {
    render(<EmailVerification />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('shows countdown after resending email', async () => {
    const mockResendSuccess = vi.fn().mockResolvedValue({
      success: true,
      message: 'Verification email sent'
    });
    mockAuth.resendVerification = mockResendSuccess;
    
    render(<EmailVerification />);
    
    const resendButton = screen.getByRole('button', { name: /resend verification email/i });
    fireEvent.click(resendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
      expect(screen.getByText(/resend in \d+ seconds/i)).toBeInTheDocument();
    });
  });

  it('disables resend button during loading', () => {
    mockAuth.isLoading = true;
    
    render(<EmailVerification />);
    
    const resendButton = screen.getByRole('button', { name: /sending/i });
    expect(resendButton).toBeDisabled();
  });

  it('redirects to login after successful verification', async () => {
    const mockVerifySuccess = vi.fn().mockResolvedValue({
      success: true,
      message: 'Email verified successfully'
    });
    mockAuth.verifyEmail = mockVerifySuccess;
    
    render(<EmailVerification />);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { 
        state: { message: 'Email verified successfully! You can now sign in.' }
      });
    }, { timeout: 3000 });
  });

  it('shows back to login link', () => {
    render(<EmailVerification />);
    
    const loginLink = screen.getByText(/back to login/i);
    expect(loginLink).toBeInTheDocument();
  });

  it('shows help text for token location', () => {
    render(<EmailVerification />);
    
    expect(screen.getByText(/check your email inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/the verification code is usually in the subject line/i)).toBeInTheDocument();
  });

  it('handles expired token gracefully', async () => {
    mockAuth.error = 'Verification token has expired';
    
    render(<EmailVerification />);
    
    expect(screen.getByText(/verification token has expired/i)).toBeInTheDocument();
    expect(screen.getByText(/please request a new verification email/i)).toBeInTheDocument();
  });
});