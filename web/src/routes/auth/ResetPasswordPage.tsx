import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authAPI } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset(token, password);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch {
      toast.error('Invalid or expired reset token');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Helmet>
          <title>Reset Password - ExamPrep</title>
          <meta name="description" content="This password reset link is invalid or has expired." />
        </Helmet>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Reset Link</h1>
            <p className="mt-2 text-gray-500">This password reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="mt-4 inline-block font-medium text-primary-600 hover:text-primary-700">
              Request a new reset link
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reset Password - ExamPrep</title>
        <meta name="description" content="Set a new password for your ExamPrep account." />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
            <p className="mt-2 text-sm text-gray-500">Enter your new password below.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
