import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const tiers = [
  {
    name: 'Free',
    priceUSD: '$0',
    priceINR: 'Free',
    period: '',
    description: 'Get started with the essentials.',
    cta: 'Start Free',
    ctaLink: '/register',
    highlighted: false,
    features: [
      '50 questions per day',
      'Basic performance analytics',
      'Leaderboard access',
      'Community support',
      'Mistake book (last 50)',
    ],
  },
  {
    name: 'Pro',
    priceUSD: '$9.99',
    priceINR: '\u20B9499',
    period: '/mo',
    description: 'Unlock your full potential.',
    cta: 'Upgrade to Pro',
    ctaLink: '/register',
    highlighted: true,
    features: [
      'Unlimited questions',
      'Advanced analytics & insights',
      'Adaptive learning engine',
      'All mock tests included',
      'Priority AI explanations',
      'Full mistake book',
      'Topic-wise practice',
    ],
  },
  {
    name: 'Premium',
    priceUSD: '$19.99',
    priceINR: '\u20B9999',
    period: '/mo',
    description: 'The ultimate preparation package.',
    cta: 'Go Premium',
    ctaLink: '/register',
    highlighted: false,
    features: [
      'Everything in Pro',
      'Personal AI study planner',
      '1-on-1 mentoring sessions',
      'Offline access',
      'Priority support',
      'Early access to new exams',
      'Custom mock test builder',
    ],
  },
];

const comparisonFeatures = [
  { name: 'Daily questions', free: '50', pro: 'Unlimited', premium: 'Unlimited' },
  { name: 'Performance analytics', free: 'Basic', pro: 'Advanced', premium: 'Advanced' },
  { name: 'Leaderboard', free: true, pro: true, premium: true },
  { name: 'Adaptive learning', free: false, pro: true, premium: true },
  { name: 'Mock tests', free: 'Limited', pro: 'All', premium: 'All + Custom' },
  { name: 'AI explanations', free: 'Standard', pro: 'Priority', premium: 'Priority' },
  { name: 'Study planner', free: false, pro: false, premium: true },
  { name: '1-on-1 mentoring', free: false, pro: false, premium: true },
  { name: 'Offline access', free: false, pro: false, premium: true },
  { name: 'Priority support', free: false, pro: false, premium: true },
];

const faqs = [
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features. When downgrading, the change takes effect at the end of your current billing cycle.',
  },
  {
    question: 'Is there a refund policy?',
    answer: 'We offer a 7-day money-back guarantee on all paid plans. If you are not satisfied, contact support within 7 days of purchase for a full refund.',
  },
  {
    question: 'Do you offer student discounts?',
    answer: 'Yes! Students with a valid .edu email or college ID can get 20% off any paid plan. Contact support with your student verification to avail the discount.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, UPI, net banking, and popular wallets. For Indian users, all plans are billed in INR with no hidden charges.',
  },
  {
    question: 'Can I use ExamPrep on multiple devices?',
    answer: 'Yes, your account works across all devices. Free and Pro plans support up to 2 simultaneous sessions, while Premium supports up to 5.',
  },
];

export default function PricingPage() {
  const [showINR, setShowINR] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Helmet>
        <title>Pricing - ExamPrep | Affordable AI Exam Preparation Plans</title>
        <meta name="description" content="Choose your ExamPrep plan. Start free with 50 questions/day or unlock unlimited practice, advanced analytics, and AI-powered learning with Pro or Premium." />
      </Helmet>

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Simple,{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Transparent
              </span>{' '}
              Pricing
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              Start free and upgrade when you are ready. No hidden fees, cancel anytime.
            </p>
            {/* Currency toggle */}
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => setShowINR(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${showINR ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                INR (\u20B9)
              </button>
              <button
                onClick={() => setShowINR(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!showINR ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`card relative flex flex-col ${tier.highlighted ? 'ring-2 ring-primary-600 dark:ring-primary-500' : ''}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tier.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {showINR ? tier.priceINR : tier.priceUSD}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-gray-500">{tier.period}</span>
                  )}
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to={tier.ctaLink}
                  className={`block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Feature Comparison
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              See exactly what you get with each plan
            </p>
          </div>
          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="pb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Free</th>
                  <th className="pb-4 text-center text-sm font-semibold text-primary-600 dark:text-primary-400">Pro</th>
                  <th className="pb-4 text-center text-sm font-semibold text-gray-900 dark:text-white">Premium</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.name} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{feature.name}</td>
                    {(['free', 'pro', 'premium'] as const).map((plan) => (
                      <td key={plan} className="py-3 text-center text-sm">
                        {typeof feature[plan] === 'boolean' ? (
                          feature[plan] ? (
                            <svg className="mx-auto h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">{feature[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="card">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {faq.question}
                  </span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Start Preparing Today
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Begin with 50 free questions daily. Upgrade anytime.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-primary-600 shadow-sm transition-colors hover:bg-primary-50"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
