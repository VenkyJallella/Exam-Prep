import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import ChatBot from '@/components/ui/ChatBot';
import apiClient from '@/lib/api/client';

export default function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Cache user plan for ad visibility
  useEffect(() => {
    apiClient.get('/payments/usage').then(r => {
      localStorage.setItem('examprep_plan', r.data.data.plan || 'free');
    }).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuToggle={() => setMobileNavOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900 sm:p-6">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </div>
  );
}
