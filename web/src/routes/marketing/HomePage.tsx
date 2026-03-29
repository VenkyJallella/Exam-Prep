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

const stats = [
  { value: '1,500+', label: 'Questions' },
  { value: '8', label: 'Exam Types' },
  { value: '50+', label: 'Topics' },
  { value: '100%', label: 'AI-Powered' },
];

export default function HomePage() {
  const [blogPosts, setBlogPosts] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/blog/', { params: { per_page: 3 } }).then(r => setBlogPosts(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>ExamPrep - AI-Powered Competitive Exam Preparation</title>
        <meta name="description" content="Prepare for UPSC, JEE, SSC, Banking, NEET, GATE, CAT exams with AI-generated questions, adaptive learning, mock tests, daily quizzes, and performance analytics. Free to start." />
        <meta name="keywords" content="exam preparation, UPSC preparation, JEE practice, SSC CGL mock test, Banking exam, NEET questions, GATE CS, CAT preparation, AI questions, online test series, India" />
        <meta property="og:title" content="ExamPrep - AI-Powered Competitive Exam Preparation" />
        <meta property="og:description" content="Crack UPSC, JEE, SSC, Banking exams with AI-powered practice. 1500+ questions, daily quizzes, coding challenges. Free to start." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://examprep.in" />
        <link rel="canonical" href="https://examprep.in" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          "mainEntity": [
            {"@type": "Question", "name": "What exams does ExamPrep cover?", "acceptedAnswer": {"@type": "Answer", "text": "ExamPrep covers UPSC, JEE, SSC CGL, Banking, NEET, GATE CS, CAT, and Coding exams."}},
            {"@type": "Question", "name": "Is ExamPrep free?", "acceptedAnswer": {"@type": "Answer", "text": "Yes! Free plan includes 10 sessions/day, daily quizzes, all coding problems, and 30-day analytics."}},
            {"@type": "Question", "name": "How does AI practice work?", "acceptedAnswer": {"@type": "Answer", "text": "AI generates exam-level questions adapted to your difficulty. It tracks mastery per topic and adjusts automatically."}},
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">8 Competitive Exams</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Comprehensive preparation for India's top exams</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {exams.map(exam => (
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
              { name: 'Pro', price: '₹149/mo', desc: 'Unlimited practice, AI features, 90d analytics', cta: 'Get Pro', link: '/register', border: 'border-primary-500 ring-2 ring-primary-200' },
              { name: 'Premium', price: '₹199/mo', desc: 'Everything + topper comparison, PDF export', cta: 'Go Premium', link: '/register', border: 'border-purple-500' },
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
