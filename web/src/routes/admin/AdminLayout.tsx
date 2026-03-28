import { Outlet, NavLink } from 'react-router-dom';

const adminNav = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">A</div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">Admin</span>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/dashboard" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            Back to App
          </NavLink>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
