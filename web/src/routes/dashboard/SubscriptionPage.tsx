import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '@/lib/api/client';
import toast from 'react-hot-toast';

interface UsageData {
  plan: string;
  limits: Record<string, number>;
  features: Record<string, boolean>;
  usage_today: { sessions: number; sessions_limit: number };
  is_free: boolean;
}

const plans = [
  {
    id: 'free', name: 'Free', price: 0, period: '',
    badge: 'Current Plan',
    features: [
      { text: '3 practice sessions/day', included: true },
      { text: '10 questions per session', included: true },
      { text: 'Daily Quiz', included: true },
      { text: '5 coding problems', included: true },
      { text: '7-day analytics', included: true },
      { text: 'Last 20 mistakes', included: true },
      { text: '1 mock test', included: true },
      { text: 'AI question generation', included: false },
      { text: 'AI explanations', included: false },
      { text: 'Topper comparison', included: false },
      { text: 'PDF download', included: false },
      { text: 'Ad-free', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 499, period: '/month',
    badge: 'Most Popular',
    features: [
      { text: 'Unlimited practice sessions', included: true },
      { text: '30 questions per session', included: true },
      { text: 'Daily Quiz', included: true },
      { text: 'All coding problems', included: true },
      { text: '90-day analytics', included: true },
      { text: 'Unlimited mistakes', included: true },
      { text: 'All mock tests', included: true },
      { text: 'AI question generation', included: true },
      { text: 'AI explanations', included: true },
      { text: 'Sectional analysis', included: true },
      { text: 'Topper comparison', included: false },
      { text: 'PDF download', included: false },
    ],
  },
  {
    id: 'premium', name: 'Premium', price: 999, period: '/month',
    badge: 'Best Value',
    features: [
      { text: 'Unlimited practice sessions', included: true },
      { text: '50 questions per session', included: true },
      { text: 'Daily Quiz', included: true },
      { text: 'All coding problems', included: true },
      { text: '1-year analytics', included: true },
      { text: 'Unlimited mistakes', included: true },
      { text: 'All mock tests', included: true },
      { text: 'AI question generation', included: true },
      { text: 'AI detailed explanations', included: true },
      { text: 'Detailed sectional analysis', included: true },
      { text: 'Topper comparison', included: true },
      { text: 'PDF download', included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/payments/usage').then(r => { setUsage(r.data.data); setCurrentPlan(r.data.data.plan); }),
      apiClient.get('/payments/subscription').then(r => { if (r.data.data?.plan) setCurrentPlan(r.data.data.plan); }),
    ]).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free' || planId === currentPlan) return;
    setUpgrading(planId);
    try {
      const orderRes = await apiClient.post('/payments/orders', { plan: planId });
      const { payment_id } = orderRes.data.data;

      // In dev mode: auto-verify. In production: integrate Razorpay checkout
      await apiClient.post('/payments/verify', { payment_id });
      toast.success(`Upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);

      // Refresh usage
      const usageRes = await apiClient.get('/payments/usage');
      setUsage(usageRes.data.data);
      setCurrentPlan(usageRes.data.data.plan);
    } catch { toast.error('Upgrade failed. Please try again.'); }
    finally { setUpgrading(null); }
  };

  const handleDowngrade = async () => {
    if (!confirm('Switch to Free plan? You will lose access to premium features at the end of your current billing period.')) return;
    try {
      // Deactivate current subscription
      await apiClient.post('/payments/orders', { plan: 'free' }).catch(() => {});
      // Refresh
      const usageRes = await apiClient.get('/payments/usage');
      setUsage(usageRes.data.data);
      setCurrentPlan(usageRes.data.data.plan);
      toast.success('Switched to Free plan');
    } catch { toast.error('Failed to switch plan'); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  return (
    <>
      <Helmet>
        <title>Subscription - ExamPrep</title>
        <meta name="description" content="Choose your ExamPrep plan. Unlock unlimited practice, AI features, and advanced analytics." />
      </Helmet>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h1>
          <p className="mt-1 text-sm text-gray-500">Unlock your full potential with Pro or Premium</p>
        </div>

        {/* Current usage card */}
        {usage && (
          <div className="card bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Current Plan</p>
                <p className="text-xl font-bold capitalize text-gray-900 dark:text-white">{usage.plan}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Today's Usage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {usage.usage_today.sessions}/{usage.usage_today.sessions_limit === 999 ? '∞' : usage.usage_today.sessions_limit} sessions
                </p>
              </div>
            </div>
            {usage.is_free && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, (usage.usage_today.sessions / usage.usage_today.sessions_limit) * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Plans grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isPopular = plan.id === 'pro';
            const isPremium = plan.id === 'premium';

            return (
              <div key={plan.id} className={`relative rounded-2xl border-2 bg-white p-6 dark:bg-gray-950 ${
                isCurrent ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' :
                isPopular ? 'border-primary-300' :
                isPremium ? 'border-purple-300' :
                'border-gray-200 dark:border-gray-800'
              }`}>
                {/* Badge */}
                {(isPopular || isPremium) && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold text-white ${isPopular ? 'bg-primary-600' : 'bg-purple-600'}`}>
                    {plan.badge}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                    Current Plan
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price === 0 ? (
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">Free</p>
                    ) : (
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        ₹{plan.price}<span className="text-base font-normal text-gray-500">{plan.period}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2 text-sm">
                      {f.included ? (
                        <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-6">
                  {isCurrent ? (
                    <button disabled className="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-500 dark:bg-gray-800">
                      Current Plan
                    </button>
                  ) : plan.id === 'free' && currentPlan !== 'free' ? (
                    <button
                      onClick={() => handleDowngrade()}
                      className="w-full rounded-lg border-2 border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Switch to Free
                    </button>
                  ) : plan.id === 'free' ? (
                    <button disabled className="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-500 dark:bg-gray-800">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgrading === plan.id}
                      className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
                        isPremium ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary-600 hover:bg-primary-700'
                      } disabled:opacity-50`}
                    >
                      {upgrading === plan.id ? 'Processing...' : currentPlan !== 'free' && plan.price < (plans.find(p => p.id === currentPlan)?.price || 0) ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-4">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription anytime. Your plan will remain active until the end of the billing period.' },
              { q: 'What payment methods are accepted?', a: 'We accept UPI, credit/debit cards, net banking, and wallets through Razorpay.' },
              { q: 'Is there a refund policy?', a: 'We offer a 7-day refund policy. If you are not satisfied, contact support within 7 days of purchase.' },
              { q: 'Can I switch between plans?', a: 'Yes, you can upgrade or downgrade anytime. When upgrading, you pay the difference. When downgrading, the change takes effect at the next billing cycle.' },
            ].map((faq) => (
              <div key={faq.q}>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{faq.q}</p>
                <p className="mt-1 text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
