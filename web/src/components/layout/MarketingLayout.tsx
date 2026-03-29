import { Outlet, Link } from 'react-router-dom';

export default function MarketingLayout() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
              EP
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ExamPrep</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="/#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Features
            </a>
            <a href="/#exams" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Exams
            </a>
            <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Pricing
            </Link>
            <Link to="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              About
            </Link>
            <Link to="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Blog
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm">
              Log in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <Outlet />

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} ExamPrep. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Terms</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
