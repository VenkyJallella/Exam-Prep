import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';

// Layouts
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './routes/dashboard/DashboardLayout';
import AdminLayout from './routes/admin/AdminLayout';
import AuthGuard from './components/layout/AuthGuard';
import RoleGuard from './components/layout/RoleGuard';
import LoadingScreen from './components/ui/LoadingScreen';

// Marketing pages (eager load for fast landing)
import HomePage from './routes/marketing/HomePage';

// Marketing pages (lazy)
const AboutPage = lazy(() => import('./routes/marketing/AboutPage'));
const PricingPage = lazy(() => import('./routes/marketing/PricingPage'));
const ExamDetailPage = lazy(() => import('./routes/marketing/ExamDetailPage'));
const StaticPage = lazy(() => import('./routes/marketing/StaticPage'));

// Lazy load all app pages
const LoginPage = lazy(() => import('./routes/auth/LoginPage'));
const RegisterPage = lazy(() => import('./routes/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./routes/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./routes/auth/ResetPasswordPage'));

const DashboardPage = lazy(() => import('./routes/dashboard/DashboardPage'));
const PracticePage = lazy(() => import('./routes/dashboard/PracticePage'));
const PracticeSessionPage = lazy(() => import('./routes/dashboard/PracticeSessionPage'));
const TestListPage = lazy(() => import('./routes/dashboard/TestListPage'));
const TestSessionPage = lazy(() => import('./routes/dashboard/TestSessionPage'));
const TestResultsPage = lazy(() => import('./routes/dashboard/TestResultsPage'));
const AnalyticsPage = lazy(() => import('./routes/dashboard/AnalyticsPage'));
const MistakesPage = lazy(() => import('./routes/dashboard/MistakesPage'));
const LeaderboardPage = lazy(() => import('./routes/dashboard/LeaderboardPage'));
const ProfilePage = lazy(() => import('./routes/dashboard/ProfilePage'));
const StudyPlannerPage = lazy(() => import('./routes/dashboard/StudyPlannerPage'));
const SubscriptionPage = lazy(() => import('./routes/dashboard/SubscriptionPage'));

const AdminDashboard = lazy(() => import('./routes/admin/AdminDashboard'));
const AdminQuestions = lazy(() => import('./routes/admin/AdminQuestions'));
const AdminTests = lazy(() => import('./routes/admin/AdminTests'));
const AdminExams = lazy(() => import('./routes/admin/AdminExams'));
const AdminUsers = lazy(() => import('./routes/admin/AdminUsers'));

const BlogListPage = lazy(() => import('./routes/marketing/BlogListPage'));
const BlogDetailPage = lazy(() => import('./routes/marketing/BlogDetailPage'));

const AdminBlogs = lazy(() => import('./routes/admin/AdminBlogs'));
const AdminBlogDetail = lazy(() => import('./routes/admin/AdminBlogDetail'));
const AdminPoolManager = lazy(() => import('./routes/admin/AdminPoolManager'));
const AdminUserDetail = lazy(() => import('./routes/admin/AdminUserDetail'));
const AdminAnalytics = lazy(() => import('./routes/admin/AdminAnalytics'));
const AdminCoding = lazy(() => import('./routes/admin/AdminCoding'));
const AdminPages = lazy(() => import('./routes/admin/AdminPages'));

const CodingPage = lazy(() => import('./routes/dashboard/CodingPage'));
const CodingProblemPage = lazy(() => import('./routes/dashboard/CodingProblemPage'));
const DailyQuizPage = lazy(() => import('./routes/dashboard/DailyQuizPage'));
const CustomTestPage = lazy(() => import('./routes/dashboard/CustomTestPage'));
const PYQPage = lazy(() => import('./routes/dashboard/PYQPage'));
const WeeklyChallengesPage = lazy(() => import('./routes/dashboard/WeeklyChallengesPage'));
const ScheduledTestsPage = lazy(() => import('./routes/dashboard/ScheduledTestsPage'));
const PdfExportPage = lazy(() => import('./routes/dashboard/PdfExportPage'));

const NotFoundPage = lazy(() => import('./routes/NotFoundPage'));

function usePageTracking() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);
}

export default function App() {
  usePageTracking();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Marketing / Public */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/exams/:slug" element={<ExamDetailPage />} />
          <Route path="/terms" element={<StaticPage />} />
          <Route path="/privacy" element={<StaticPage />} />
          <Route path="/contact" element={<StaticPage />} />
          <Route path="/disclaimer" element={<StaticPage />} />
          <Route path="/dmca" element={<StaticPage />} />
          <Route path="/page/:slug" element={<StaticPage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Dashboard (Protected) */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice/:sessionId" element={<PracticeSessionPage />} />
            <Route path="/tests" element={<TestListPage />} />
            <Route path="/tests/:attemptId" element={<TestSessionPage />} />
            <Route path="/tests/:attemptId/results" element={<TestResultsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/mistakes" element={<MistakesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/study-planner" element={<StudyPlannerPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/coding" element={<CodingPage />} />
            <Route path="/coding/:slug" element={<CodingProblemPage />} />
            <Route path="/daily-quiz" element={<DailyQuizPage />} />
            <Route path="/pyq" element={<PYQPage />} />
            <Route path="/challenges" element={<WeeklyChallengesPage />} />
            <Route path="/scheduled-tests" element={<ScheduledTestsPage />} />
            <Route path="/export-pdf" element={<PdfExportPage />} />
            <Route path="/custom-test" element={<CustomTestPage />} />
          </Route>
        </Route>

        {/* Admin (Protected + Role) */}
        <Route element={<AuthGuard />}>
          <Route element={<RoleGuard allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/questions" element={<AdminQuestions />} />
              <Route path="/admin/tests" element={<AdminTests />} />
              <Route path="/admin/exams" element={<AdminExams />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/blogs" element={<AdminBlogs />} />
              <Route path="/admin/blogs/:postId" element={<AdminBlogDetail />} />
              <Route path="/admin/pool" element={<AdminPoolManager />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/coding" element={<AdminCoding />} />
              <Route path="/admin/pages" element={<AdminPages />} />
            </Route>
          </Route>
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
