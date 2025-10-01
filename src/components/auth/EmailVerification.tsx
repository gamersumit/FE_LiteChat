import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAppSelector } from '../../store';
import { selectAuthLoading, selectAuthError } from '../../store/authSlice';
import { apiService } from '../../services/centralizedApi';

const EmailVerification: React.FC = () => {
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'error' | 'manual'>('verifying');
  const [manualToken, setManualToken] = useState('');
  const [manualErrors, setManualErrors] = useState<{ token?: string }>({});
  const [, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerifyEmail(tokenFromUrl);
    } else {
      setVerificationState('manual');
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerifyEmail = async (token: string) => {
    try {
      setVerificationState('verifying');
      const result = await apiService.verifyEmail(token);

      if (result.success) {
        setVerificationState('success');
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Email verified successfully! You can now sign in.' }
          });
        }, 2000);
      } else {
        setVerificationState('error');
      }
    } catch (error) {
      setVerificationState('error');
    }
  };

  const validateToken = (token: string) => {
    const errors: { token?: string } = {};
    
    if (!token.trim()) {
      errors.token = 'Please enter verification code';
    } else if (token.length < 6) {
      errors.token = 'Verification code must be at least 6 characters';
    }
    
    setManualErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateToken(manualToken)) {
      return;
    }
    
    await handleVerifyEmail(manualToken);
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s/g, '');
    setManualToken(value);
    validateToken(value);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;

    try {
      const email = emailFromUrl || '';
      const result = await apiService.resendVerification(email);

      if (result.success) {
        setResendMessage(result.message || 'Verification email sent');
        setResendCount(prev => prev + 1);
        setResendCooldown(60);

        setTimeout(() => {
          setResendMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to resend verification:', error);
    }
  };

  const renderVerifyingState = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Verifying your email</h3>
      <p className="mt-2 text-sm text-gray-500">
        Please wait while we verify your email address...
      </p>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Email Verified!</h3>
      <p className="mt-2 text-sm text-gray-500">
        Email verified successfully! You can now sign in.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Redirecting to login page...
      </p>
    </div>
  );

  const renderErrorState = () => {
    const isExpiredToken = error?.includes('expired');
    
    return (
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Failed</h3>
        <p className="mt-2 text-sm text-gray-500">
          {isExpiredToken 
            ? 'Verification token has expired. Please request a new verification email.'
            : error || 'Unable to verify your email address.'
          }
        </p>
        
        {emailFromUrl && (
          <div className="mt-6">
            <button
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown} seconds`
                : isLoading 
                ? 'Sending...'
                : 'Resend Verification Email'
              }
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderManualState = () => (
    <div>
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Verify Your Email</h3>
        <p className="mt-2 text-sm text-gray-500">
          We sent a verification link to your email address. Check your email inbox and click the link, 
          or enter the verification code below.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex">
          <Mail className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3 text-sm text-blue-700">
            <p className="font-medium">Check your email inbox</p>
            <p className="mt-1">The verification code is usually in the subject line or body of the email.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleManualVerification} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            id="token"
            name="token"
            type="text"
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              manualErrors.token ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your verification code"
            value={manualToken}
            onChange={handleTokenChange}
          />
          {manualErrors.token && (
            <p className="mt-1 text-sm text-red-600">{manualErrors.token}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!manualToken || Object.keys(manualErrors).length > 0 || isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </button>
      </form>

      {emailFromUrl && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-4">Didn't receive the email?</p>
          
          {resendMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">{resendMessage}</p>
            </div>
          )}
          
          <button
            onClick={handleResendVerification}
            disabled={resendCooldown > 0 || isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown} seconds`
              : isLoading 
              ? 'Sending...'
              : 'Resend Verification Email'
            }
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {verificationState === 'verifying' && renderVerifyingState()}
          {verificationState === 'success' && renderSuccessState()}
          {verificationState === 'error' && renderErrorState()}
          {verificationState === 'manual' && renderManualState()}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;