import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authAPI } from '@/lib/api/auth';
import toast from 'react-hot-toast';
import FormInput from '@/components/ui/FormInput';

const planOptions = [
  { id: 'free', name: 'Free', price: 'Free', desc: '10 sessions/day, daily quiz, coding', highlight: false },
  { id: 'pro', name: 'Pro', price: '₹149/mo', desc: 'Unlimited practice, AI features, 90d analytics', highlight: true },
  { id: 'premium', name: 'Premium', price: '₹199/mo', desc: 'Everything + PDF export, topper comparison', highlight: false },
];

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: 'w-0' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-select plan from URL query (e.g., /register?plan=pro)
  useState(() => {
    const planFromUrl = searchParams.get('plan');
    if (planFromUrl && ['free', 'pro', 'premium'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
    }
  });

  const validators: Record<string, (value: string) => string | undefined> = {
    fullName: (v) => {
      if (!v.trim()) return 'Full name is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return undefined;
    },
    email: (v) => {
      if (!v) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
      return undefined;
    },
    phone: (v) => {
      if (!v) return undefined; // optional
      if (!/^\+?[0-9]{10,15}$/.test(v.replace(/[\s-]/g, ''))) return 'Enter a valid phone number';
      return undefined;
    },
    password: (v) => {
      if (!v) return 'Password is required';
      if (v.length < 8) return 'Password must be at least 8 characters';
      return undefined;
    },
    confirmPassword: (v) => {
      if (!v) return 'Please confirm your password';
      if (v !== password) return 'Passwords do not match';
      return undefined;
    },
  };

  const validateField = (field: string, value: string) => {
    const validate = validators[field];
    return validate ? validate(value) : undefined;
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      fullName: validateField('fullName', fullName),
      email: validateField('email', email),
      phone: validateField('phone', phone),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleSendOtp = async () => {
    const emailError = validateField('email', email);
    if (emailError) { setErrors(prev => ({ ...prev, email: emailError })); return; }
    setSendingOtp(true);
    try {
      const res = await authAPI.sendOtp(email);
      setOtpSent(true);
      toast.success('OTP sent to your email!');
      // In dev mode, auto-fill OTP
      if (res.data?.data?.otp) setOtp(res.data.data.otp);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to send OTP');
    } finally { setSendingOtp(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    try {
      await authAPI.verifyOtp(email, otp);
      setOtpVerified(true);
      toast.success('Email verified!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Invalid OTP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, phone: true, password: true, confirmPassword: true });
    if (!validateAll()) return;
    if (!otpVerified) { toast.error('Please verify your email first'); return; }

    setLoading(true);
    try {
      await authAPI.register({ email, password, full_name: fullName });
      toast.success('Account created! Please log in.');
      navigate(selectedPlan !== 'free' ? `/login?redirect=/subscription` : '/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const strength = getPasswordStrength(password);

  return (
    <>
      <Helmet>
        <title>Register - ExamPrep</title>
        <meta name="description" content="Create your free ExamPrep account and start preparing for competitive exams with AI-powered practice." />
      </Helmet>

      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link to="/" className="mb-6 inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">EP</div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">ExamPrep</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">Log in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-5" noValidate>
            <FormInput
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => handleChange('fullName', e.target.value, setFullName)}
              onBlur={() => handleBlur('fullName', fullName)}
              error={touched.fullName ? errors.fullName : undefined}
              placeholder="Rahul Kumar"
            />

            <div>
              <FormInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => { handleChange('email', e.target.value, setEmail); setOtpVerified(false); setOtpSent(false); }}
                onBlur={() => handleBlur('email', email)}
                error={touched.email ? errors.email : undefined}
                placeholder="you@example.com"
                disabled={otpVerified}
              />
              {!otpVerified && (
                <div className="mt-2 flex gap-2">
                  {!otpSent ? (
                    <button type="button" onClick={handleSendOtp} disabled={sendingOtp || !email || !!errors.email}
                      className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                      {sendingOtp ? 'Sending...' : 'Send OTP'}
                    </button>
                  ) : (
                    <>
                      <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP" maxLength={6}
                        className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      <button type="button" onClick={handleVerifyOtp} disabled={otp.length !== 6}
                        className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                        Verify
                      </button>
                      <button type="button" onClick={handleSendOtp} disabled={sendingOtp}
                        className="text-xs text-primary-600 hover:underline">Resend</button>
                    </>
                  )}
                </div>
              )}
              {otpVerified && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Email verified
                </p>
              )}
            </div>

            <FormInput
              label="Phone (optional)"
              type="tel"
              value={phone}
              onChange={(e) => handleChange('phone', e.target.value, setPhone)}
              onBlur={() => handleBlur('phone', phone)}
              error={touched.phone ? errors.phone : undefined}
              placeholder="+91 9876543210"
              helpText="We'll only use this for account recovery"
            />

            <div>
              <FormInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  handleChange('password', e.target.value, setPassword);
                  // Re-validate confirm password if already touched
                  if (touched.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', confirmPassword) }));
                  }
                }}
                onBlur={() => handleBlur('password', password)}
                error={touched.password ? errors.password : undefined}
                placeholder="Min. 8 characters"
              />
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className={`h-1.5 rounded-full transition-all ${strength.color} ${strength.width}`} />
                  </div>
                  <p className={`mt-1 text-xs ${
                    strength.label === 'Weak' ? 'text-red-500' :
                    strength.label === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <FormInput
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
              onBlur={() => handleBlur('confirmPassword', confirmPassword)}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              placeholder="Re-enter your password"
            />

            {/* Plan Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Choose your plan</label>
              <div className="grid grid-cols-3 gap-2">
                {planOptions.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                      selectedPlan === plan.id
                        ? plan.id === 'premium' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}
                  >
                    {plan.highlight && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">Popular</span>
                    )}
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{plan.name}</p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">{plan.price}</p>
                    <p className="mt-1 text-[10px] leading-tight text-gray-500">{plan.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : selectedPlan === 'free' ? 'Create Free Account' : `Create Account & Pay ${selectedPlan === 'pro' ? '₹149' : '₹199'}`}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
