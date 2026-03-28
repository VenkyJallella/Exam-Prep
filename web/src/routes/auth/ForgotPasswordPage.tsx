import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authAPI } from '@/lib/api/auth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.requestPasswordReset(email);
      setResetToken(res.data.data.token);
      setSubmitted(true);
      toast.success('Check your email for reset instructions');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <Helmet><title>Password Reset - ExamPrep</title></Helmet>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl dark:bg-green-900/30">
                &#x2713;
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check Your Email</h1>
              <p className="mt-2 text-sm text-gray-500">
                If an account with that email exists, we've sent password reset instructions.
              </p>
            </div>
            {resetToken && (
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Dev mode: Use this token to reset your password
                </p>
                <Link
                  to={`/reset-password?token=${resetToken}`}
                  className="mt-2 block text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Reset Password &rarr;
                </Link>
              </div>
            )}
            <Link to="/login" className="block text-center text-sm font-medium text-primary-600 hover:text-primary-700">
              Back to Login
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Forgot Password - ExamPrep</title></Helmet>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter your email and we'll send you reset instructions.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
