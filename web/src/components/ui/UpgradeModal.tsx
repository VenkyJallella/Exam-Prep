import { Link } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

export default function UpgradeModal({ isOpen, onClose, feature, message }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary-500 to-purple-500">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="mt-4 text-center text-xl font-bold text-gray-900 dark:text-white">
          Upgrade to Unlock
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          {message || `${feature || 'This feature'} is available on Pro and Premium plans.`}
        </p>

        {/* Benefits */}
        <div className="mt-5 space-y-2">
          {[
            'Unlimited practice sessions',
            'All difficulty levels',
            'AI-powered explanations',
            'Full analytics (up to 1 year)',
            'Unlimited mistake tracking',
            'All coding problems',
            'Ad-free experience',
          ].map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {b}
            </div>
          ))}
        </div>

        {/* Plans quick view */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-primary-500 bg-primary-50 p-3 text-center dark:bg-primary-900/20">
            <p className="text-xs font-medium text-primary-600">Pro</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">₹149<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
          <div className="rounded-xl border-2 border-purple-500 bg-purple-50 p-3 text-center dark:bg-purple-900/20">
            <p className="text-xs font-medium text-purple-600">Premium</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">₹199<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Maybe Later</button>
          <Link to="/subscription" onClick={onClose} className="btn-primary flex-1 text-center">
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
