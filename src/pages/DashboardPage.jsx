import {
  getUserSubmissions, createSubmission, getAvailableRewards,
  getUserRedemptions, redeemReward, ITEM_POINTS, deleteSubmission,
} from '../lib/db';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Coins, Recycle, Gift, ArrowRight, MapPin,
  TrendingUp, Clock, Plus, X, ChevronDown, Users, Trash2,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const BINS = [
  { id: 'bin-1', label: 'Main Gate Lobby' },
  { id: 'bin-2', label: 'Library Entrance' },
  { id: 'bin-3', label: 'Block 6 Ground Floor' },
  { id: 'bin-4', label: 'Block 4 Ground Floor' },
  { id: 'bin-5', label: 'Canteen Area' },
  { id: 'bin-6', label: 'Sports Complex' },
];

function SubmitModal({ onClose, onSuccess, userId, groupId }) {
  const [items, setItems]     = useState([{ itemType: '', quantity: 1 }]);
  const [binId, setBinId]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const totalPoints = items.reduce((sum, item) => {
    return sum + (item.itemType ? (ITEM_POINTS[item.itemType] || 10) * item.quantity : 0);
  }, 0);

  function addItem() {
    setItems([...items, { itemType: '', quantity: 1 }]);
  }

  function removeItem(index) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items.filter(i => i.itemType);
    if (validItems.length === 0) { setError('Add at least one item.'); return; }
    if (!binId) { setError('Select a collection bin.'); return; }
    setLoading(true);
    try {
      await createSubmission(userId, {
        items:   validItems,
        binId,
        groupId: groupId || null,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bark/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-eco-100 transition-colors">
          <X className="w-4 h-4 text-bark/50" />
        </button>

        <h2 className="font-display font-bold text-xl text-moss mb-1">Log E-Waste Deposit</h2>
        <p className="font-body text-bark/50 text-sm mb-6">Add all items in this bag.</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-3 mb-4 font-body text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-display font-medium text-sm text-bark/70">Items in this bag</label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 font-body text-xs text-moss hover:text-leaf transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  {/* Item type */}
                  <div className="relative flex-1">
                    <select
                      value={item.itemType}
                      onChange={(e) => updateItem(index, 'itemType', e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50 pr-8"
                    >
                      <option value="">Select item...</option>
                      {Object.entries(ITEM_POINTS).map(([type, pts]) => (
                        <option key={type} value={type}>{type} — {pts}pts</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bark/40 pointer-events-none" />
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                      className="w-7 h-7 rounded-lg border-2 border-eco-100 flex items-center justify-center font-bold text-moss hover:bg-eco-50 text-sm"
                    >−</button>
                    <span className="font-display font-bold text-sm text-moss w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItem(index, 'quantity', Math.min(20, item.quantity + 1))}
                      className="w-7 h-7 rounded-lg border-2 border-eco-100 flex items-center justify-center font-bold text-moss hover:bg-eco-50 text-sm"
                    >+</button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Points preview */}
          {totalPoints > 0 && (
            <div className="bg-eco-50 border border-eco-100 rounded-2xl p-3 flex items-center justify-between">
              <span className="font-body text-sm text-bark/60">Total points for this bag</span>
              <span className="font-mono font-bold text-eco-600">+{totalPoints} pts</span>
            </div>
          )}

          {/* Group indicator */}
          {groupId && (
            <div className="bg-moss/10 border border-moss/20 rounded-2xl p-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-moss" strokeWidth={1.5} />
              <span className="font-body text-sm text-moss">Points will also be added to your group</span>
            </div>
          )}

          {/* Bin selector */}
          <div>
            <label className="font-display font-medium text-sm text-bark/70 mb-3 block">Collection Bin</label>
            <div className="grid grid-cols-2 gap-2">
              {BINS.map((bin) => (
                <button
                  key={bin.id}
                  type="button"
                  onClick={() => setBinId(bin.id)}
                  className={`text-left px-4 py-3 rounded-2xl border-2 font-body text-xs transition-all duration-200 ${
                    binId === bin.id
                      ? 'border-moss bg-moss text-cream'
                      : 'border-eco-100 text-bark/65 hover:border-moss/40'
                  }`}
                >
                  <MapPin className="w-3 h-3 mb-1 inline-block mr-1" />
                  {bin.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary justify-center py-3.5 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Deposit'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [submissions, setSubmissions]     = useState([]);
  const [rewards, setRewards]             = useState([]);
  const [redemptions, setRedemptions]     = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [loadingData, setLoadingData]     = useState(true);
  const [redeemError, setRedeemError]     = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');

  useEffect(() => { loadAll(); }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoadingData(true);
    try {
      const [subs, rwds, redems] = await Promise.all([
        getUserSubmissions(user.$id),
        getAvailableRewards(),
        getUserRedemptions(user.$id),
      ]);
      setSubmissions(subs.documents);
      setRewards(rwds.documents);
      setRedemptions(redems.documents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }
async function handleDelete(submission) {
  if (!confirm('Delete this deposit? Points will be removed.')) return;
  try {
    await deleteSubmission(submission.$id, user.$id, submission.totalPoints);
    await refreshProfile();
    await loadAll();
  } catch (e) {
    console.error(e);
  }
}
  async function handleRedeem(reward) {
    setRedeemError('');
    setRedeemSuccess('');
    try {
      const r = await redeemReward(user.$id, reward.$id, reward.pointsCost);
      setRedeemSuccess(`Redeemed! Your coupon code: ${r.couponCode}`);
      await refreshProfile();
      await loadAll();
    } catch (e) {
      setRedeemError(e.message);
    }
  }

  function handleSubmitSuccess() {
    setShowModal(false);
    refreshProfile();
    loadAll();
  }

  const points        = profile?.points        ?? 0;
  const totalDeposits = profile?.totalDeposits ?? 0;

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      {showModal && (
        <SubmitModal
          userId={user.$id}
          groupId={profile?.groupId}
          onClose={() => setShowModal(false)}
          onSuccess={handleSubmitSuccess}
        />
      )}

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
          <div>
            <span className="section-tag mb-3 inline-flex"><Leaf className="w-3 h-3" />Dashboard</span>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">
              Welcome, {profile?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Eco Hero'}! 🌱
            </h1>
            <p className="font-body text-bark/55 mt-2 text-sm">Track your contributions and redeem rewards.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            Log Deposit
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'Eco Points', value: points, icon: Coins, color: 'text-eco-600', bg: 'bg-eco-100' },
            { label: 'Items Deposited', value: totalDeposits, icon: Recycle, color: 'text-moss', bg: 'bg-moss/10' },
            { label: 'Rewards Redeemed', value: redemptions.length, icon: Gift, color: 'text-leaf', bg: 'bg-leaf/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-3xl p-7 border border-eco-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className={`w-11 h-11 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
              </div>
              <div className="font-display font-bold text-3xl text-moss">{loadingData ? '—' : value}</div>
              <div className="font-body text-bark/55 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-3 bg-white rounded-3xl border border-eco-100 p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-eco-100 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-moss" strokeWidth={1.5} />
              </div>
              <h2 className="font-display font-semibold text-moss">Recent Deposits</h2>
            </div>
            {loadingData ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-eco-50 rounded-xl animate-pulse" />)}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-eco-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Recycle className="w-7 h-7 text-eco-300" strokeWidth={1.5} />
                </div>
                <p className="font-display font-medium text-bark/50 text-sm">No deposits yet</p>
                <p className="font-body text-bark/35 text-xs mt-1">Log your first e-waste deposit above</p>
              </div>
            ) : (
              <div className="space-y-0">
                {submissions.slice(0, 8).map((s) => {
  const items = (() => { try { return JSON.parse(s.items); } catch { return []; } })();
  return (
    <div key={s.$id} className="flex items-center justify-between py-3.5 border-b border-eco-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-1 mb-0.5">
          {items.map((item, i) => (
            <span key={i} className="font-body text-xs bg-eco-50 text-bark/70 px-2 py-0.5 rounded-full">
              {item.itemType} ×{item.quantity}
            </span>
          ))}
        </div>
        <p className="font-mono text-xs text-bark/40">
          {new Date(s.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="font-display font-semibold text-sm text-eco-600">+{s.totalPoints} pts</span>
        <span className={`font-mono text-xs px-2.5 py-1 rounded-full ${
          s.status === 'verified' ? 'bg-eco-100 text-eco-700' : 'bg-yellow-50 text-yellow-700'
        }`}>{s.status}</span>
        {s.status !== 'verified' && (
          <button
            onClick={() => handleDelete(s)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors group"
          >
            <Trash2 className="w-3.5 h-3.5 text-bark/30 group-hover:text-red-400 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
})}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-moss rounded-3xl p-7 text-cream flex-1 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-leaf/30 blur-2xl pointer-events-none" />
              <div className="w-10 h-10 bg-cream/15 rounded-xl flex items-center justify-center mb-4 border border-cream/20">
                <MapPin className="w-5 h-5 text-eco-300" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">Find a Bin</h3>
              <p className="font-body text-cream/65 text-xs leading-relaxed mb-5">6 collection points across campus.</p>
              <Link to="/#map" className="inline-flex items-center gap-2 bg-cream text-moss font-display font-semibold text-xs px-4 py-2.5 rounded-full hover:bg-eco-100 transition-colors duration-200 group">
                View Map <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <Link
              to="/groups"
              className="bg-white rounded-3xl border border-eco-100 p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-moss" strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-semibold text-moss text-base mb-1">
                {profile?.groupId ? 'My Group' : 'Join a Group'}
              </h3>
              <p className="font-body text-bark/50 text-xs leading-relaxed">
                {profile?.groupId ? 'View your group stats and leaderboard.' : 'Team up and compete with friends.'}
              </p>
            </Link>
          </div>
        </div>

        {/* Rewards */}
        <div className="bg-white rounded-3xl border border-eco-100 p-7">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-eco-100 rounded-xl flex items-center justify-center">
              <Gift className="w-4 h-4 text-moss" strokeWidth={1.5} />
            </div>
            <h2 className="font-display font-semibold text-moss">Redeem Rewards</h2>
            <span className="font-mono text-xs text-bark/40 ml-auto">{points} pts available</span>
          </div>

          {redeemError && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-3 mt-4 font-body text-sm">{redeemError}</div>
          )}
          {redeemSuccess && (
            <div className="bg-eco-50 border border-eco-100 text-eco-700 rounded-2xl p-3 mt-4 font-body text-sm font-medium">{redeemSuccess}</div>
          )}

          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[1,2].map(i => <div key={i} className="h-28 bg-eco-50 rounded-2xl animate-pulse" />)}
            </div>
          ) : rewards.length === 0 ? (
            <p className="font-body text-bark/45 text-sm mt-6 text-center py-8">No rewards available yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {rewards.map((r) => {
                const canAfford = points >= r.pointsCost;
                return (
                  <div key={r.$id} className={`rounded-2xl border-2 p-5 transition-all duration-200 ${canAfford ? 'border-eco-100 hover:border-moss/40' : 'border-eco-50 opacity-60'}`}>
                    {/* Brand logo row */}
                    <div className="flex items-center gap-3 mb-3">
                      {r.logoUrl ? (
                        <img
                          src={r.logoUrl}
                          alt={r.brandName}
                          className="w-8 h-8 rounded-lg object-contain border border-eco-100"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-eco-100 rounded-lg flex items-center justify-center shrink-0">
                          <span className="font-display font-bold text-xs text-moss">
                            {r.brandName?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-display font-semibold text-sm text-moss">{r.brandName}</p>
                        <p className="font-mono text-xs text-bark/40">{r.partner}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-eco-600 bg-eco-100 px-2.5 py-1 rounded-full ml-auto shrink-0">
                        {r.pointsCost} pts
                      </span>
                    </div>
                    <p className="font-body font-medium text-sm text-bark mb-1">{r.title}</p>
                    <p className="font-body text-xs text-bark/55 mb-4 leading-relaxed">{r.description}</p>
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canAfford}
                      className={`w-full text-xs font-display font-semibold py-2.5 rounded-xl transition-all duration-200 ${
                        canAfford ? 'bg-moss text-cream hover:bg-leaf' : 'bg-eco-50 text-bark/35 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Redeem' : `Need ${r.pointsCost - points} more pts`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}