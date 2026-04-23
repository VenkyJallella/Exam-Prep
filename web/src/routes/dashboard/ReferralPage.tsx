import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import apiClient from '../../lib/api/client';

interface Reward {
  milestone: number;
  plan: string;
  days: number;
  granted_at: string;
}

interface LadderItem {
  milestone: number;
  plan: string;
  days: number;
  unlocked: boolean;
}

interface NextMilestone {
  milestone: number;
  plan: string;
  days: number;
  needed: number;
}

interface ReferralData {
  code: string;
  share_url: string;
  referral_count: number;
  referrals: { id: string; name: string; joined_at: string }[];
  rewards: Reward[];
  ladder: LadderItem[];
  next_milestone: NextMilestone | null;
}

function planLabel(plan: string, days: number): string {
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ${plan === 'premium' ? 'Premium' : 'Pro'}`;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/referrals/me');
      setData(res.data.data);
    } catch {
      toast.error('Failed to load referral dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const shareWhatsapp = () => {
    if (!data) return;
    const msg = `Hey! I'm using ExamPrep for my exam prep. Sign up with my referral code ${data.code} and we both get free Pro access — https://zencodio.com/register?ref=${data.code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500">Could not load referral data.</div>;
  }

  return (
    <>
      <Helmet><title>Refer & Earn — ExamPrep</title></Helmet>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refer & Earn 🎁</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invite friends to ExamPrep — they get a great learning platform, you get free Pro & Premium time.
          </p>
        </div>

        {/* Hero card with code + share */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 p-6 text-white">
          <div className="text-sm uppercase tracking-wide text-primary-100">Your referral code</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/20 px-5 py-3 font-mono text-2xl font-bold tracking-widest backdrop-blur">
              {data.code}
            </div>
            <button
              onClick={() => copy(data.code, 'Code')}
              className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white/30"
            >
              Copy code
            </button>
            <button
              onClick={() => copy(data.share_url, 'Link')}
              className="rounded-lg bg-white/20 px-3 py-2 text-sm font-medium backdrop-blur hover:bg-white/30"
            >
              Copy link
            </button>
            <button
              onClick={shareWhatsapp}
              className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-gray-50"
            >
              📱 Share on WhatsApp
            </button>
          </div>
          <div className="mt-3 text-sm text-primary-100">
            <span className="break-all">{data.share_url}</span>
          </div>
        </div>

        {/* Stats + next milestone */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-500">Friends referred</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data.referral_count}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-500">Rewards earned</div>
            <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{data.rewards.length}</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-500">Next reward</div>
            {data.next_milestone ? (
              <>
                <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {planLabel(data.next_milestone.plan, data.next_milestone.days)}
                </div>
                <div className="text-xs text-gray-500">
                  Refer {data.next_milestone.needed} more friend{data.next_milestone.needed > 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-green-600">All milestones unlocked! 🎉</div>
            )}
          </div>
        </div>

        {/* Reward ladder */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reward Ladder</h2>
          <p className="mt-1 text-sm text-gray-500">Each friend who signs up brings you closer to free Pro & Premium time.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.ladder.map((step) => (
              <div
                key={step.milestone}
                className={`rounded-xl border-2 p-4 text-center ${
                  step.unlocked
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                <div className="text-3xl">{step.unlocked ? '🏆' : '🔒'}</div>
                <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {step.milestone} {step.milestone === 1 ? 'referral' : 'referrals'}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {planLabel(step.plan, step.days)}
                </div>
                {step.unlocked && (
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-green-600">UNLOCKED</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Referrals list */}
        {data.referrals.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Referrals</h2>
            <div className="mt-3 divide-y divide-gray-200 dark:divide-gray-800">
              {data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2">
                  <div className="text-sm text-gray-900 dark:text-white">{r.name}</div>
                  <div className="text-xs text-gray-500">
                    Joined {new Date(r.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards history */}
        {data.rewards.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rewards History</h2>
            <div className="mt-3 space-y-2">
              {data.rewards.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {planLabel(r.plan, r.days)} unlocked
                    </div>
                    <div className="text-xs text-gray-500">
                      Milestone: {r.milestone} {r.milestone === 1 ? 'referral' : 'referrals'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(r.granted_at).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
