import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { paymentsAPI } from '@/lib/api/payments';
import toast from 'react-hot-toast';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['50 questions/day', 'Basic analytics', 'Leaderboard access', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    popular: true,
    features: ['Unlimited questions', 'Advanced analytics', 'Adaptive learning', 'All mock tests', 'AI explanations', 'Priority support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    features: ['Everything in Pro', 'Personal study planner', 'Performance reports', 'Offline access', 'Dedicated support', 'Early access features'],
  },
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    paymentsAPI.getSubscription()
      .then(res => setSubscription(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: string) => {
    setProcessing(plan);
    try {
      const res = await paymentsAPI.createOrder(plan);
      const order = res.data.data;

      // In production: Open Razorpay checkout
      // For dev: Auto-verify
      const verifyRes = await paymentsAPI.verifyPayment({
        payment_id: order.payment_id,
      });

      setSubscription({ plan, is_active: true, expires_at: verifyRes.data.data.expires_at });
      toast.success(`Upgraded to ${plan} plan!`);
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Subscription - ExamPrep</title>
        <meta name="description" content="Choose the right plan for your exam preparation. Free, Pro, and Premium plans available." />
      </Helmet>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h1>
          <p className="mt-2 text-gray-500">Upgrade to unlock all features</p>
          {subscription && subscription.plan !== 'free' && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              Current plan: {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
              {subscription.expires_at && ` (expires ${new Date(subscription.expires_at).toLocaleDateString()})`}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-white p-6 shadow-sm dark:bg-gray-800 ${
                  plan.popular ? 'border-primary-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white">
                    Most Popular
                  </span>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : `\u20B9${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-gray-500">/month</span>}
                  </div>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="h-4 w-4 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && plan.id !== 'free' && handleUpgrade(plan.id)}
                  disabled={isCurrent || processing !== null}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                      : plan.popular
                        ? 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 disabled:opacity-50'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : processing === plan.id ? 'Processing...' : plan.price === 0 ? 'Free Forever' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
