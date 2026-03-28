import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page Not Found - ExamPrep</title>
        <meta name="description" content="The page you are looking for does not exist or has been moved." />
      </Helmet>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-8xl font-extrabold text-primary-600">404</p>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Page Not Found</h1>
          <p className="mt-2 text-lg text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/" className="btn-primary px-6 py-2.5">
              Go Home
            </Link>
            <Link to="/dashboard" className="btn-secondary px-6 py-2.5">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
