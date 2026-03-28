import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '@/lib/store/authStore';
import { authAPI } from '@/lib/api/auth';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';
import FormInput from '@/components/ui/FormInput';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    if (field === 'password') setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await authAPI.login({ email, password });
      const { access_token, refresh_token } = res.data.data;
      setTokens(access_token, refresh_token);

      // Fetch user profile
      const userRes = await apiClient.get('/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setUser(userRes.data.data.user);

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - ExamPrep</title>
        <meta name="description" content="Log in to your ExamPrep account to continue your exam preparation journey." />
      </Helmet>

      <div className="flex min-h-screen">
        {/* Left panel */}
        <div className="hidden w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 lg:flex lg:items-center lg:justify-center">
          <div className="max-w-md px-8 text-center">
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white">
              EP
            </div>
            <h2 className="text-3xl font-bold text-white">Welcome to ExamPrep</h2>
            <p className="mt-4 text-primary-100">
              AI-powered exam preparation for UPSC, JEE, SSC, Banking and more.
              Practice smarter, not harder.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex w-full items-center justify-center px-4 lg:w-1/2">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">EP</div>
                <span className="text-xl font-bold">ExamPrep</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log in to your account</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  Sign up free
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <FormInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
                }}
                onBlur={() => handleBlur('email')}
                error={touched.email ? errors.email : undefined}
                placeholder="you@example.com"
              />

              <FormInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password) setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
                }}
                onBlur={() => handleBlur('password')}
                error={touched.password ? errors.password : undefined}
                placeholder="Enter your password"
              />

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
