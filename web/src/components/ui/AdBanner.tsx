import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

interface AdBannerProps {
  slot?: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  /** Show ad even for logged-in users (e.g., blog pages) */
  publicOnly?: boolean;
}

/**
 * Google AdSense banner component.
 *
 * Rules:
 * - Free users: see ads everywhere (dashboard, practice, blog, etc.)
 * - Pro users: see ads only on public pages (blog, exam detail)
 * - Premium users: never see ads
 * - Not logged in: see ads on public pages (blog, exam detail, try-free)
 * - Homepage, Pricing, About: NEVER show ads
 */
export default function AdBanner({ slot = '', format = 'auto', className = '', publicOnly = false }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Determine if ad should show based on user's plan
  const shouldShow = (() => {
    // Not logged in — show ads on public pages
    if (!isAuthenticated) return true;

    // Get plan from localStorage cache (set by subscription page)
    const cached = localStorage.getItem('examprep-auth');
    let plan = 'free';
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Plan is not in auth store — we'll check from a separate source
      } catch {}
    }

    // Check if user has ad-free plan stored
    const planCache = localStorage.getItem('examprep_plan');
    if (planCache) plan = planCache;

    // Premium: never show ads
    if (plan === 'premium') return false;
    // Pro: only show on public pages
    if (plan === 'pro') return publicOnly;
    // Free: show everywhere
    return true;
  })();

  useEffect(() => {
    if (!shouldShow || !adRef.current) return;

    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense not loaded or blocked
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div className={`ad-banner overflow-hidden text-center ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9474711113906728"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
