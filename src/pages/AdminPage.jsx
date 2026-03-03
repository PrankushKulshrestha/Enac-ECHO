import { useState, useEffect } from 'react';
import {
  Shield, Users, Recycle, Gift, Check, X,
  Leaf, TrendingUp, Package, Trash2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  getAllUsers, getAllSubmissions, getAvailableRewards,
  getAllRewards, updateReward, createReward, deleteSubmission,
} from '../lib/db';

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('overview');
  const [users, setUsers]           = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rewards, setRewards]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // New reward form
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    title: '', description: '', pointsCost: 100,
    partner: '', brandName: '', logoUrl: '',
  });
  const [savingReward, setSavingReward] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, s, r] = await Promise.all([
        getAllUsers(),
        getAllSubmissions(),
        getAllRewards(),
      ]);
      setUsers(u.documents);
      setSubmissions(s.documents);
      setRewards(r.documents);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleReward(reward) {
    try {
      await updateReward(reward.$id, { available: !reward.available });
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateReward(e) {
    e.preventDefault();
    setSavingReward(true);
    try {
      await createReward(rewardForm);
      setRewardForm({ title: '', description: '', pointsCost: 100, partner: '', brandName: '', logoUrl: '' });
      setShowRewardForm(false);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingReward(false);
    }
  }

  async function handleDeleteSubmission(sub) {
    if (!confirm('Delete this submission and remove points?')) return;
    try {
      await deleteSubmission(sub.$id, sub.userId, sub.totalPoints);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  const totalPoints     = users.reduce((sum, u) => sum + (u.points || 0), 0);
  const pendingSubs     = submissions.filter(s => s.status === 'pending');
  const verifiedSubs    = submissions.filter(s => s.status === 'verified');

  const tabs = [
    { id: 'overview',     label: 'Overview',    icon: TrendingUp },
    { id: 'submissions',  label: 'Submissions',  icon: Recycle },
    { id: 'users',        label: 'Users',        icon: Users },
    { id: 'rewards',      label: 'Rewards',      icon: Gift },
  ];

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <span className="section-tag mb-3 inline-flex"><Shield className="w-3 h-3" />Admin</span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">
            Admin Panel
          </h1>
          <p className="font-body text-bark/55 mt-2 text-sm">
            Manage submissions, users, and rewards.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 font-body text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-display font-semibold text-sm transition-all duration-200 ${
                tab === id
                  ? 'bg-moss text-cream shadow-sm'
                  : 'bg-white border border-eco-100 text-bark/65 hover:border-moss/40'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-eco-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Total Users',       value: users.length,        icon: Users,     color: 'text-moss',    bg: 'bg-moss/10' },
                  { label: 'Total Submissions',  value: submissions.length,  icon: Recycle,   color: 'text-eco-600', bg: 'bg-eco-100' },
                  { label: 'Pending Review',     value: pendingSubs.length,  icon: Package,   color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Points Distributed', value: totalPoints,         icon: Leaf,      color: 'text-leaf',    bg: 'bg-leaf/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-3xl p-7 border border-eco-100 shadow-sm">
                    <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
                      <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
                    </div>
                    <div className="font-display font-bold text-3xl text-moss">{value}</div>
                    <div className="font-body text-bark/55 text-sm mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* SUBMISSIONS */}
            {tab === 'submissions' && (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <h2 className="font-display font-semibold text-moss mb-6">
                  All Submissions
                  <span className="font-mono text-xs text-bark/40 ml-3">{submissions.length} total</span>
                </h2>
                {submissions.length === 0 ? (
                  <p className="font-body text-bark/45 text-sm text-center py-10">No submissions yet.</p>
                ) : (
                  <div className="space-y-0">
                    {submissions.map(sub => {
                      const items = (() => { try { return JSON.parse(sub.items); } catch { return []; } })();
                      return (
                        <div key={sub.$id} className="flex items-center justify-between py-4 border-b border-eco-50 last:border-0 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {items.map((item, i) => (
                                <span key={i} className="font-body text-xs bg-eco-50 text-bark/70 px-2 py-0.5 rounded-full">
                                  {item.itemType} ×{item.quantity}
                                </span>
                              ))}
                            </div>
                            <p className="font-mono text-xs text-bark/40">
                              {sub.userId} · {new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-display font-semibold text-sm text-eco-600">+{sub.totalPoints} pts</span>
                            <span className={`font-mono text-xs px-2.5 py-1 rounded-full ${
                              sub.status === 'verified' ? 'bg-eco-100 text-eco-700' : 'bg-yellow-50 text-yellow-700'
                            }`}>{sub.status}</span>
                            <button
                              onClick={() => handleDeleteSubmission(sub)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors group"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-bark/30 group-hover:text-red-400 transition-colors" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <h2 className="font-display font-semibold text-moss mb-6">
                  All Users
                  <span className="font-mono text-xs text-bark/40 ml-3">{users.length} total</span>
                </h2>
                {users.length === 0 ? (
                  <p className="font-body text-bark/45 text-sm text-center py-10">No users yet.</p>
                ) : (
                  <div className="space-y-0">
                    {users.map(u => (
                      <div key={u.$id} className="flex items-center justify-between py-4 border-b border-eco-50 last:border-0 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-sm text-moss">{u.name}</p>
                          <p className="font-mono text-xs text-bark/40">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-eco-600 bg-eco-50 px-2.5 py-1 rounded-full">
                            {u.points} pts
                          </span>
                          {u.isAdmin && (
                            <span className="font-mono text-xs bg-moss/10 text-moss px-2.5 py-1 rounded-full">admin</span>
                          )}
                          {u.isVerified ? (
                            <span className="font-mono text-xs bg-eco-100 text-eco-700 px-2.5 py-1 rounded-full">verified</span>
                          ) : (
                            <span className="font-mono text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">unverified</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REWARDS */}
            {tab === 'rewards' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-moss">
                    Rewards
                    <span className="font-mono text-xs text-bark/40 ml-3">{rewards.length} total</span>
                  </h2>
                  <button
                    onClick={() => setShowRewardForm(v => !v)}
                    className="btn-primary text-sm"
                  >
                    <Gift className="w-4 h-4" />
                    {showRewardForm ? 'Cancel' : 'Add Reward'}
                  </button>
                </div>

                {/* Create reward form */}
                {showRewardForm && (
                  <div className="bg-white rounded-3xl border border-eco-100 p-7">
                    <h3 className="font-display font-semibold text-moss mb-5">New Reward</h3>
                    <form onSubmit={handleCreateReward} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { key: 'title',       label: 'Title',        placeholder: '10% off voucher' },
                        { key: 'brandName',   label: 'Brand Name',   placeholder: 'Starbucks' },
                        { key: 'partner',     label: 'Partner',      placeholder: 'Starbucks India' },
                        { key: 'logoUrl',     label: 'Logo URL',     placeholder: 'https://...' },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">{label}</label>
                          <input
                            type="text"
                            value={rewardForm[key]}
                            onChange={e => setRewardForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full px-4 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                          />
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">Description</label>
                        <input
                          type="text"
                          value={rewardForm.description}
                          onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Get 10% off your next purchase..."
                          className="w-full px-4 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                        />
                      </div>
                      <div>
                        <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">Points Cost</label>
                        <input
                          type="number"
                          min="1"
                          value={rewardForm.pointsCost}
                          onChange={e => setRewardForm(f => ({ ...f, pointsCost: Number(e.target.value) }))}
                          className="w-full px-4 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={savingReward}
                          className="w-full btn-primary justify-center py-2.5 disabled:opacity-60"
                        >
                          {savingReward ? 'Saving...' : 'Create Reward'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Rewards list */}
                <div className="bg-white rounded-3xl border border-eco-100 p-7">
                  {rewards.length === 0 ? (
                    <p className="font-body text-bark/45 text-sm text-center py-10">No rewards yet. Add one above!</p>
                  ) : (
                    <div className="space-y-0">
                      {rewards.map(r => (
                        <div key={r.$id} className="flex items-center justify-between py-4 border-b border-eco-50 last:border-0 gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {r.logoUrl ? (
                              <img src={r.logoUrl} alt={r.brandName} className="w-8 h-8 rounded-lg object-contain border border-eco-100 shrink-0" onError={e => e.target.style.display='none'} />
                            ) : (
                              <div className="w-8 h-8 bg-eco-100 rounded-lg flex items-center justify-center shrink-0">
                                <span className="font-display font-bold text-xs text-moss">{r.brandName?.charAt(0) || '?'}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-display font-semibold text-sm text-moss">{r.title}</p>
                              <p className="font-mono text-xs text-bark/40">{r.brandName} · {r.pointsCost} pts</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleReward(r)}
                            className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl transition-all duration-200 ${
                              r.available
                                ? 'bg-eco-100 text-eco-700 hover:bg-red-50 hover:text-red-600'
                                : 'bg-yellow-50 text-yellow-700 hover:bg-eco-100 hover:text-eco-700'
                            }`}
                          >
                            {r.available ? <><Check className="w-3 h-3" />active</> : <><X className="w-3 h-3" />inactive</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}