import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '1',
    title: 'Choose Your Exam',
    description: 'Pick from UPSC, JEE, SSC CGL, Banking, and more. We tailor everything to your target exam.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    number: '2',
    title: 'Practice with AI',
    description: 'Get AI-generated, exam-level questions that adapt to your strengths and weaknesses in real time.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    number: '3',
    title: 'Track & Improve',
    description: 'Monitor your accuracy, speed, and topic mastery with detailed analytics. Watch yourself improve daily.',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

const stats = [
  { label: 'Questions', value: '50,000+' },
  { label: 'Exams Covered', value: '4' },
  { label: 'Active Aspirants', value: '10,000+' },
  { label: 'AI-Powered', value: '100%' },
];

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About ExamPrep - AI-Powered Exam Preparation Platform</title>
        <meta name="description" content="Learn about ExamPrep, built by SOLON India Pvt Ltd. We use AI to help aspirants crack UPSC, JEE, SSC, and Banking exams with adaptive learning and smart analytics." />
      </Helmet>

      {/* Mission */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Our Mission: Make Quality Exam Prep{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Accessible to All
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
              We believe every aspirant deserves access to world-class preparation tools, regardless
              of their location or budget. ExamPrep combines cutting-edge AI with proven pedagogy to
              level the playing field for competitive exam preparation in India.
            </p>
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-xl font-bold text-white">
              S
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Built by SOLON India Pvt Ltd
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              SOLON India is a technology company focused on building AI-powered education tools.
              Our team of engineers, educators, and exam toppers understand the challenges aspirants
              face because we have been through the same journey. We are building ExamPrep to be the
              preparation platform we wish we had.
            </p>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              We combine large language models, adaptive learning algorithms, and expert-curated
              content to deliver a preparation experience that is personalized, efficient, and
              effective. Every question, explanation, and study plan is designed to maximize your
              chances of success.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              Three simple steps to accelerate your preparation
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="card text-center">
                <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                  {step.number}
                </div>
                <div className="mb-3 flex justify-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              ExamPrep by the Numbers
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card text-center">
                <p className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            Join Thousands of Aspirants Today
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Start practicing for free. No credit card required.
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
