import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api/client';

interface AffiliateStats {
  window_days: number;
  total_clicks: number;
  by_source: Record<string, number>;
  by_placement: Record<string, number>;
  top_products: { source: string; product_id: string; clicks: number }[];
  daily: { date: string; clicks: number }[];
}

interface ReferralStats {
  total_users: number;
  referred_users: number;
  referral_rate_pct: number;
  total_rewards_granted: number;
  top_referrers: { user_id: string; name: string; email: string; referrals: number }[];
}

export default function AdminAffiliates() {
  const [aff, setAff] = useState<AffiliateStats | null>(null);
  const [ref, setRef] = useState<ReferralStats | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        apiClient.get(`/affiliate/admin/stats?days=${days}`),
        apiClient.get('/referrals/admin/stats'),
      ]);
      setAff(a.data.data);
      setRef(r.data.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [days]);

  if (loading || !aff || !ref) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const sourceColors: Record<string, string> = {
    amazon: 'bg-orange-100 text-orange-700',
    resume: 'bg-green-100 text-green-700',
    coursera: 'bg-blue-100 text-blue-700',
    other: 'bg-gray-100 text-gray-700',
  };

  const maxDaily = Math.max(1, ...aff.daily.map((d) => d.clicks));

  return (
    <>
      <Helmet><title>Affiliates & Referrals — Admin</title></Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliates & Referrals</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track outbound affiliate clicks (Amazon, Resume.io, Coursera) and referral program performance.
            </p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 1 year</option>
          </select>
        </div>

        {/* Top stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total clicks" value={aff.total_clicks.toLocaleString()} sub={`Last ${days} days`} />
          <StatCard label="Total users" value={ref.total_users.toLocaleString()} />
          <StatCard
            label="Referred users"
            value={ref.referred_users.toLocaleString()}
            sub={`${ref.referral_rate_pct}% of all users`}
          />
          <StatCard label="Rewards granted" value={ref.total_rewards_granted.toLocaleString()} />
        </div>

        {/* By source */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Clicks by Source</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(['amazon', 'resume', 'coursera'] as const).map((s) => (
              <div key={s} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sourceColors[s]}`}>
                  {s}
                </span>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {(aff.by_source[s] || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily trend */}
        {aff.daily.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daily Clicks</h2>
            <div className="mt-4 flex h-40 items-end gap-1">
              {aff.daily.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.clicks}`}>
                  <div
                    className="w-full rounded-t bg-primary-500"
                    style={{ height: `${(d.clicks / maxDaily) * 100}%`, minHeight: d.clicks > 0 ? 4 : 0 }}
                  />
                  <div className="text-[9px] text-gray-400">{d.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By placement */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Clicks by Placement</h2>
          {Object.keys(aff.by_placement).length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No placement data yet.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(aff.by_placement).map(([p, c]) => (
                <div key={p} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm dark:bg-gray-900">
                  <span className="font-medium capitalize">{p}</span>
                  <span className="text-gray-500">{c.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        {aff.top_products.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Products</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="py-2">Source</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {aff.top_products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sourceColors[p.source] || sourceColors.other}`}>
                        {p.source}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{p.product_id}</td>
                    <td className="py-2 text-right font-medium">{p.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top referrers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Referrers</h2>
          {ref.top_referrers.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No referrals yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr className="text-left text-xs uppercase text-gray-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2 text-right">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {ref.top_referrers.map((u) => (
                  <tr key={u.user_id}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="py-2 text-gray-500">{u.email}</td>
                    <td className="py-2 text-right font-bold">{u.referrals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
