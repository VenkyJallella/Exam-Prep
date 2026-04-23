/**
 * Reusable affiliate widget. Renders only when the corresponding source is
 * enabled in backend config (AMAZON_AFFILIATE_TAG / RESUME_IO_AFFILIATE_URL /
 * COURSERA_AFFILIATE_URL). Tracks every click via /affiliate/track.
 */
import { useEffect, useState } from 'react';
import apiClient from '../../lib/api/client';

type Source = 'amazon' | 'resume' | 'coursera';

interface Props {
  source: Source;
  productId?: string;        // ASIN for Amazon, optional slug for Coursera
  placement?: string;        // jobs | coding | blog | dashboard | sidebar
  title: string;
  description: string;
  cta?: string;
  imageUrl?: string;
  className?: string;
}

interface AffiliateConfig {
  amazon_enabled: boolean;
  resume_enabled: boolean;
  coursera_enabled: boolean;
}

let cachedConfig: AffiliateConfig | null = null;
let configPromise: Promise<AffiliateConfig> | null = null;

async function getConfig(): Promise<AffiliateConfig> {
  if (cachedConfig) return cachedConfig;
  if (!configPromise) {
    configPromise = apiClient.get('/affiliate/config').then((r) => {
      const cfg = r.data.data as AffiliateConfig;
      cachedConfig = cfg;
      return cfg;
    }).catch(() => {
      const cfg: AffiliateConfig = { amazon_enabled: false, resume_enabled: false, coursera_enabled: false };
      cachedConfig = cfg;
      return cfg;
    });
  }
  return configPromise;
}

export default function AffiliateCard({
  source,
  productId,
  placement,
  title,
  description,
  cta,
  imageUrl,
  className = '',
}: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    getConfig().then((cfg) => {
      if (!cfg) { setEnabled(false); return; }
      const map = {
        amazon: cfg.amazon_enabled,
        resume: cfg.resume_enabled,
        coursera: cfg.coursera_enabled,
      };
      setEnabled(map[source]);
    });
  }, [source]);

  // Hide entirely while we don't know status, or if disabled — no flicker
  if (enabled !== true) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/affiliate/track', {
        source,
        product_id: productId,
        placement,
      });
      const url = res.data.data?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,sponsored,noreferrer');
      }
    } catch {
      // Fallback — open the source's home page so the user is never stranded
      const fallback = {
        amazon: 'https://www.amazon.in/',
        resume: 'https://resume.io/',
        coursera: 'https://www.coursera.org/',
      };
      window.open(fallback[source], '_blank', 'noopener,noreferrer');
    }
  };

  const accent = {
    amazon: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
    resume: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    coursera: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  }[source];

  const sourceLabel = {
    amazon: 'Amazon.in',
    resume: 'Resume.io',
    coursera: 'Coursera',
  }[source];

  const defaultCta = {
    amazon: 'View on Amazon ↗',
    resume: 'Build Your Resume ↗',
    coursera: 'View Course ↗',
  }[source];

  return (
    <a
      href="#"
      onClick={handleClick}
      rel="sponsored noopener noreferrer"
      className={`block rounded-xl border ${accent} p-4 transition hover:shadow-md ${className}`}
    >
      <div className="flex items-start gap-3">
        {imageUrl && (
          <img src={imageUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded object-cover" loading="lazy" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Sponsored</span>
            <span>·</span>
            <span>{sourceLabel}</span>
          </div>
          <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{title}</div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{description}</div>
          <div className="mt-2 text-xs font-semibold text-primary-600">{cta || defaultCta}</div>
        </div>
      </div>
    </a>
  );
}
