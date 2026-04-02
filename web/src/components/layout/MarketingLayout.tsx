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
            <Link to="/interview" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Interview
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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">EP</div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">ExamPrep</span>
              </Link>
              <p className="mt-3 text-sm text-gray-500">
                India's AI-powered competitive exam preparation platform. Practice for UPSC, JEE, NEET, SSC, Banking, GATE, CAT exams with adaptive learning.
              </p>
            </div>

            {/* Exams */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Exams</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li><Link to="/exams/upsc" className="hover:text-gray-900 dark:hover:text-white">UPSC Preparation</Link></li>
                <li><Link to="/exams/jee" className="hover:text-gray-900 dark:hover:text-white">JEE Mock Tests</Link></li>
                <li><Link to="/exams/neet" className="hover:text-gray-900 dark:hover:text-white">NEET Practice</Link></li>
                <li><Link to="/exams/ssc-cgl" className="hover:text-gray-900 dark:hover:text-white">SSC CGL Prep</Link></li>
                <li><Link to="/exams/banking" className="hover:text-gray-900 dark:hover:text-white">Banking Exams</Link></li>
                <li><Link to="/exams/gate-cs" className="hover:text-gray-900 dark:hover:text-white">GATE CS</Link></li>
                <li><Link to="/exams/cat" className="hover:text-gray-900 dark:hover:text-white">CAT Preparation</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resources</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li><Link to="/blog" className="hover:text-gray-900 dark:hover:text-white">Blog & Study Tips</Link></li>
                <li><Link to="/interview" className="hover:text-gray-900 dark:hover:text-white">Interview Prep</Link></li>
                <li><Link to="/pricing" className="hover:text-gray-900 dark:hover:text-white">Pricing Plans</Link></li>
                <li><Link to="/about" className="hover:text-gray-900 dark:hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-gray-900 dark:hover:text-white">Contact Us</Link></li>
                <li><Link to="/register" className="hover:text-gray-900 dark:hover:text-white">Sign Up Free</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                <li><Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-gray-900 dark:hover:text-white">Terms & Conditions</Link></li>
                <li><Link to="/disclaimer" className="hover:text-gray-900 dark:hover:text-white">Disclaimer</Link></li>
                <li><Link to="/dmca" className="hover:text-gray-900 dark:hover:text-white">DMCA Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
            <p className="text-center text-xs text-gray-400">
              &copy; {new Date().getFullYear()} ExamPrep (zencodio.com). All rights reserved. ExamPrep is not affiliated with UPSC, NTA, SSC, IBPS, or any exam conducting body. All exam names are trademarks of their respective organizations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
