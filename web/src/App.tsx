import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './routes/dashboard/DashboardLayout';
import AdminLayout from './routes/admin/AdminLayout';
import AuthGuard from './components/layout/AuthGuard';
import RoleGuard from './components/layout/RoleGuard';
import LoadingScreen from './components/ui/LoadingScreen';

// Marketing pages (eager load for fast landing)
import HomePage from './routes/marketing/HomePage';

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

const AdminDashboard = lazy(() => import('./routes/admin/AdminDashboard'));
const AdminQuestions = lazy(() => import('./routes/admin/AdminQuestions'));
const AdminTests = lazy(() => import('./routes/admin/AdminTests'));
const AdminExams = lazy(() => import('./routes/admin/AdminExams'));
const AdminUsers = lazy(() => import('./routes/admin/AdminUsers'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Marketing / Public */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
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
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
