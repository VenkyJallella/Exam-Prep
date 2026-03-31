import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from '../../lib/api/client';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [proPrice, setProPrice] = useState(149);
  const [premiumPrice, setPremiumPrice] = useState(199);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/payments/pricing').then(r => {
      const d = r.data.data;
      setProPrice(d.pro);
      setPremiumPrice(d.premium);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (premiumPrice <= proPrice) {
      toast.error('Premium price must be higher than Pro');
      return;
    }
    if (proPrice < 1 || premiumPrice < 1) {
      toast.error('Price must be at least 1');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/payments/pricing', { pro: proPrice, premium: premiumPrice });
      toast.success('Prices updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>;

  return (
    <>
      <Helmet><title>Admin Settings | ExamPrep</title></Helmet>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

        {/* Subscription Pricing */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Pricing</h2>
          <p className="mt-1 text-sm text-gray-500">Set monthly subscription prices. Changes apply immediately to new purchases.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {/* Free */}
            <div className="rounded-xl border-2 border-gray-200 p-5 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-500">Free Plan</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Free</p>
              <p className="mt-1 text-xs text-gray-400">Cannot be changed</p>
            </div>

            {/* Pro */}
            <div className="rounded-xl border-2 border-primary-500 p-5">
              <h3 className="text-sm font-bold text-primary-600">Pro Plan</h3>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-lg font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  value={proPrice}
                  onChange={e => setProPrice(Number(e.target.value))}
                  min={1}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-2xl font-bold text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <span className="text-sm text-gray-400">/month</span>
              </div>
            </div>

            {/* Premium */}
            <div className="rounded-xl border-2 border-purple-500 p-5">
              <h3 className="text-sm font-bold text-purple-600">Premium Plan</h3>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-lg font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  value={premiumPrice}
                  onChange={e => setPremiumPrice(Number(e.target.value))}
                  min={1}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-2xl font-bold text-gray-900 focus:border-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <span className="text-sm text-gray-400">/month</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Prices'}
            </button>
            <p className="text-xs text-gray-400">Existing subscriptions won't be affected. Only new purchases use updated prices.</p>
          </div>
        </div>
      </div>
    </>
  );
}
