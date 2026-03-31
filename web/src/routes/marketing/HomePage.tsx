import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/api/client';

const exams = [
  { name: 'UPSC', slug: 'upsc', description: 'Civil Services Examination', color: 'from-blue-500 to-blue-600', icon: '🏛️' },
  { name: 'JEE', slug: 'jee', description: 'Engineering Entrance', color: 'from-green-500 to-emerald-600', icon: '⚙️' },
  { name: 'SSC CGL', slug: 'ssc-cgl', description: 'Government Jobs', color: 'from-purple-500 to-purple-600', icon: '📋' },
  { name: 'Banking', slug: 'banking', description: 'IBPS PO/Clerk, SBI', color: 'from-orange-500 to-red-500', icon: '🏦' },
  { name: 'NEET', slug: 'neet', description: 'Medical Entrance', color: 'from-pink-500 to-rose-600', icon: '🩺' },
  { name: 'GATE CS', slug: 'gate-cs', description: 'M.Tech & PSU', color: 'from-cyan-500 to-blue-600', icon: '💻' },
  { name: 'CAT', slug: 'cat', description: 'MBA Entrance', color: 'from-amber-500 to-orange-600', icon: '📊' },
  { name: 'Coding', slug: 'coding', description: 'IT & Placements', color: 'from-indigo-500 to-violet-600', icon: '🖥️' },
];

const features = [
  { title: 'AI-Powered Questions', desc: 'Gemini AI generates exam-level questions adapted to your difficulty. Never run out of practice material.', icon: '🤖' },
  { title: 'Adaptive Learning', desc: 'Get harder questions when you are doing well, easier when you need practice. Your personal difficulty curve.', icon: '📈' },
  { title: 'Daily Quiz', desc: '20 fresh questions every day with a 20-minute timer. Compete on the daily leaderboard.', icon: '⚡' },
  { title: 'Coding Practice', desc: 'LeetCode-style problems with an in-browser code editor. Run test cases and track submissions.', icon: '💻' },
  { title: 'AI Chatbot Tutor', desc: 'Ask "How is my performance?" and get data-driven answers. Your personal AI tutor with full access to your stats.', icon: '💬' },
  { title: 'Mistake Book', desc: 'Auto-tracks every wrong answer. Flashcard review mode. Never repeat the same mistake twice.', icon: '📓' },
  { title: 'Study Planner', desc: 'AI generates a weekly schedule based on your exam date and daily hours. Track progress with milestones.', icon: '📅' },
  { title: 'Mock Tests', desc: 'Full-length timed tests with real exam simulation. Sectional timing for banking exams.', icon: '📝' },
  { title: 'Performance Analytics', desc: 'Track accuracy, speed, topic mastery, and 90-day activity heatmap. Know exactly where to improve.', icon: '📊' },
  { title: 'Leaderboard & XP', desc: 'Earn XP, maintain streaks, unlock badges, and compete with aspirants across India.', icon: '🏆' },
  { title: 'Weekly Challenges', desc: 'Complete weekly goals to earn bonus XP. Answer 50 questions, maintain 70% accuracy, or practice 5 days.', icon: '🎯' },
  { title: 'Export PDF', desc: 'Generate printable question papers for offline practice. Include or exclude answer keys.', icon: '📄' },
];

const testimonials = [
  { name: 'Priya Sharma', exam: 'UPSC 2025', text: 'The adaptive difficulty is amazing. It keeps pushing me just enough. My accuracy improved from 45% to 72% in 2 months.', avatar: 'P' },
  { name: 'Rahul Kumar', exam: 'JEE Main 2025', text: 'Daily quiz is addictive! I never miss a day. The AI-generated questions are genuinely exam-level.', avatar: 'R' },
  { name: 'Sneha Reddy', exam: 'Banking PO', text: 'The mistake book with flashcard review changed my preparation. I finally stopped repeating the same errors.', avatar: 'S' },
];

const EXAM_COLORS: Record<string, { color: string; icon: string }> = {
  upsc: { color: 'from-blue-500 to-blue-600', icon: '🏛️' },
  jee: { color: 'from-green-500 to-emerald-600', icon: '⚙️' },
  'ssc-cgl': { color: 'from-purple-500 to-purple-600', icon: '📋' },
  banking: { color: 'from-orange-500 to-red-500', icon: '🏦' },
  neet: { color: 'from-pink-500 to-rose-600', icon: '🩺' },
  'gate-cs': { color: 'from-cyan-500 to-blue-600', icon: '💻' },
  cat: { color: 'from-amber-500 to-orange-600', icon: '📊' },
  coding: { color: 'from-indigo-500 to-violet-600', icon: '🖥️' },
};

function formatCount(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 1000)}K+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K+`;
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`;
  return String(n);
}

export default function HomePage() {
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [dynamicExams, setDynamicExams] = useState(exams);
  const [stats, setStats] = useState([
    { value: '1,500+', label: 'Questions' },
    { value: '8', label: 'Exam Types' },
    { value: '50+', label: 'Topics' },
    { value: '100%', label: 'AI-Powered' },
  ]);
  const [prices, setPrices] = useState({ pro: 149, premium: 199 });

  useEffect(() => {
    // Fetch real stats
    apiClient.get('/exams/stats').then(r => {
      const d = r.data.data;
      setStats([
        { value: formatCount(d.questions), label: 'Questions' },
        { value: String(d.exams), label: 'Exam Types' },
        { value: formatCount(d.topics), label: 'Topics' },
        { value: '100%', label: 'AI-Powered' },
      ]);
    }).catch(() => {});

    // Fetch real exams
    apiClient.get('/exams').then(r => {
      const apiExams = r.data.data || [];
      if (apiExams.length > 0) {
        setDynamicExams(apiExams.map((e: any) => ({
          name: e.name,
          slug: e.slug,
          description: e.full_name || e.description || '',
          color: EXAM_COLORS[e.slug]?.color || 'from-gray-500 to-gray-600',
          icon: EXAM_COLORS[e.slug]?.icon || '📚',
        })));
      }
    }).catch(() => {});

    apiClient.get('/blog', { params: { per_page: 3 } }).then(r => setBlogPosts(r.data.data || [])).catch(() => {});
    apiClient.get('/payments/pricing').then(r => setPrices(r.data.data)).catch(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>ExamPrep - Free AI-Powered Competitive Exam Preparation | UPSC, JEE, NEET, SSC</title>
        <meta name="description" content="India's #1 free AI-powered exam preparation platform. Practice UPSC, JEE, NEET, SSC CGL, Banking, GATE, CAT with AI-generated questions, mock tests, daily quizzes, adaptive learning & detailed performance analytics. Start free today." />
        <meta name="keywords" content="exam preparation online, UPSC preparation 2026, JEE Main mock test free, NEET practice questions, SSC CGL preparation online, Banking exam preparation, GATE CS mock test, CAT preparation free, competitive exam India, online test series free, AI exam preparation, free mock test online, daily quiz app, study planner app, previous year question papers, online coaching India, question bank free, best exam preparation app, UPSC mock test, JEE Advanced practice, NEET 2026 preparation, SSC exam preparation, IBPS PO preparation" />
        <meta property="og:title" content="ExamPrep - Free AI-Powered Exam Preparation for UPSC, JEE, NEET, SSC" />
        <meta property="og:description" content="Practice UPSC, JEE, NEET, SSC, Banking exams with AI-generated questions, adaptive learning, mock tests & analytics. Free to start. Trusted by aspirants across India." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://zencodio.com" />
        <meta property="og:image" content="https://zencodio.com/og-image.png" />
        <link rel="canonical" href="https://zencodio.com" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [
            {"@type": "Question", "name": "What competitive exams does ExamPrep cover?", "acceptedAnswer": {"@type": "Answer", "text": "ExamPrep covers 8 major competitive exams in India: UPSC Civil Services, JEE Main & Advanced, NEET, SSC CGL, Banking (IBPS PO/Clerk, SBI), GATE Computer Science, CAT for MBA, and Coding/IT Placements."}},
            {"@type": "Question", "name": "Is ExamPrep free to use?", "acceptedAnswer": {"@type": "Answer", "text": "Yes! ExamPrep offers a generous free plan with 10 practice sessions per day, daily quizzes, all coding problems, and 30-day analytics. Premium plans start at just ₹149/month for unlimited access."}},
            {"@type": "Question", "name": "How does AI-powered exam preparation work?", "acceptedAnswer": {"@type": "Answer", "text": "ExamPrep uses Google Gemini AI to generate exam-level questions adapted to your difficulty level. The adaptive learning engine tracks your mastery per topic and automatically adjusts question difficulty. You also get an AI chatbot tutor that knows your performance data."}},
            {"@type": "Question", "name": "Can I take full-length mock tests on ExamPrep?", "acceptedAnswer": {"@type": "Answer", "text": "Yes! ExamPrep offers full-length timed mock tests that follow the exact pattern of real exams — JEE (75 questions, 3 hours), UPSC Prelims (90 questions, 2 hours), NEET (180 questions, 200 minutes), and more. Negative marking and section-wise scoring are included."}},
            {"@type": "Question", "name": "Does ExamPrep have previous year question papers?", "acceptedAnswer": {"@type": "Answer", "text": "Yes, ExamPrep includes previous year question (PYQ) papers for all supported exams. You can practice year-wise or topic-wise with detailed solutions and explanations."}},
            {"@type": "Question", "name": "How is ExamPrep different from other exam apps?", "acceptedAnswer": {"@type": "Answer", "text": "ExamPrep is powered by AI that generates unlimited exam-level questions — you never run out of practice material. It features adaptive learning, a personal AI tutor, mistake book with flashcard review, coding practice with in-browser editor, and comprehensive analytics. All starting free."}},
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://zencodio.com"},
          ]
        })}</script>
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              🚀 Now with AI Chatbot Tutor & Coding Practice
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
              Crack Your Exam with{' '}
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Practice
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-400">
              Practice with AI-generated exam-level questions. Adaptive difficulty, daily quizzes, coding challenges, AI tutor, and analytics to track your progress. Trusted by aspirants across India.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register" className="btn-primary px-8 py-3.5 text-base shadow-lg shadow-primary-500/25">
                Start Practicing Free
              </Link>
              <Link to="/pricing" className="btn-secondary px-6 py-3.5 text-base">
                View Plans — from ₹149/mo
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">No credit card required · 10 free sessions/day · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 sm:gap-16">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">{s.value}</p>
              <p className="mt-1 text-sm text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Exams */}
      <section id="exams" className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{dynamicExams.length} Competitive Exams</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Comprehensive preparation for India's top exams</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dynamicExams.map(exam => (
              <Link key={exam.slug} to={`/exams/${exam.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-1 dark:border-gray-800 dark:bg-gray-950">
                <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${exam.color} text-2xl`}>
                  {exam.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 dark:text-white">{exam.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{exam.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything You Need to Succeed</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">12 powerful features built for serious aspirants</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map(f => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">How It Works</h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Choose Your Exam', desc: 'Pick from UPSC, JEE, Banking, and 5 more. We tailor everything to your target exam.', color: 'bg-blue-500' },
              { step: '2', title: 'Practice with AI', desc: 'Get AI-generated questions at your difficulty level. Track mastery per topic.', color: 'bg-green-500' },
              { step: '3', title: 'Track & Improve', desc: 'Monitor accuracy, speed, and weak areas with analytics. Watch yourself improve daily.', color: 'bg-purple-500' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${s.color} text-xl font-bold text-white shadow-lg`}>{s.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Simple, Affordable Pricing</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Start free. Upgrade when you are ready.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { name: 'Free', price: 'Free', desc: '10 sessions/day, daily quiz, all coding', cta: 'Start Free', link: '/register', border: 'border-gray-200 dark:border-gray-800' },
              { name: 'Pro', price: `₹${prices.pro}/mo`, desc: 'Unlimited practice, AI features, 90d analytics', cta: 'Get Pro', link: '/register?plan=pro', border: 'border-primary-500 ring-2 ring-primary-200' },
              { name: 'Premium', price: `₹${prices.premium}/mo`, desc: 'Everything + topper comparison, PDF export', cta: 'Go Premium', link: '/register?plan=premium', border: 'border-purple-500' },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl border-2 bg-white p-6 text-center dark:bg-gray-950 ${p.border}`}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{p.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">{p.price}</p>
                <p className="mt-2 text-sm text-gray-500">{p.desc}</p>
                <Link to={p.link} className="mt-4 block rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">{p.cta}</Link>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/pricing" className="text-sm font-medium text-primary-600 hover:underline">View full plan comparison →</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">What Aspirants Say</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.exam}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog preview */}
      {blogPosts.length > 0 && (
        <section className="bg-gray-50 py-20 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Latest from Blog</h2>
              <Link to="/blog" className="text-sm font-medium text-primary-600 hover:underline">View all →</Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {blogPosts.map((post: any) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
                  <p className="text-xs text-gray-400">{post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · {post.reading_time_minutes} min read</p>
                  <h3 className="mt-2 text-base font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white">{post.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEO Content Section */}
      <section className="bg-white py-16 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Why Choose ExamPrep for Competitive Exam Preparation?</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            <p>
              ExamPrep is India's most advanced AI-powered competitive exam preparation platform, designed for aspirants preparing for UPSC Civil Services, JEE Main & Advanced, NEET, SSC CGL, Banking (IBPS PO/Clerk, SBI PO), GATE Computer Science, CAT, and coding interviews. Unlike traditional coaching or static question banks, ExamPrep uses Google Gemini AI to generate unlimited exam-level questions tailored to your current skill level.
            </p>
            <p>
              Our adaptive learning engine continuously analyzes your performance across topics and automatically adjusts question difficulty. If you're strong in Thermodynamics but weak in Electrostatics, ExamPrep will serve more Electrostatics questions at the right difficulty to help you improve. This personalized approach means you spend time where it matters most.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-2">Comprehensive Mock Tests Following Real Exam Patterns</h3>
            <p>
              Take full-length mock tests that exactly replicate real exam conditions — JEE Main with 75 questions across Physics, Chemistry, and Mathematics in 180 minutes; UPSC Prelims with 90 questions in 120 minutes; NEET with 180 questions in 200 minutes. Complete with negative marking, section-wise timing, and detailed performance analysis after each test.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-2">Features That Set Us Apart</h3>
            <p>
              <strong>Daily Quiz:</strong> 20 fresh questions every day with a 20-minute timer. Compete on the leaderboard and build consistency with streak tracking. <strong>Mistake Book:</strong> Every wrong answer is automatically logged with the correct explanation, available in flashcard review mode. <strong>AI Chatbot Tutor:</strong> Ask questions like "How is my performance in Organic Chemistry?" and get data-driven answers from an AI that has full access to your analytics. <strong>Study Planner:</strong> AI generates a personalized weekly schedule based on your target exam date, daily available hours, and weak areas.
            </p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pt-2">Start Free, Upgrade When Ready</h3>
            <p>
              ExamPrep's free plan gives you 10 practice sessions per day, daily quizzes, all coding problems, and 30-day analytics — enough for serious preparation. Pro (₹149/month) and Premium (₹199/month) plans unlock unlimited practice, AI features, PDF export, and advanced analytics. No credit card required to start.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary-600 to-accent-600 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to Start Your Preparation?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            Join thousands of aspirants using AI-powered practice to crack their competitive exams. Start free today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register" className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-primary-600 shadow-lg transition-colors hover:bg-primary-50">
              Get Started Free
            </Link>
            <Link to="/pricing" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10">
              Compare Plans
            </Link>
          </div>
          <p className="mt-4 text-sm text-primary-200">No credit card required · Cancel anytime</p>
        </div>
      </section>
    </>
  );
}
