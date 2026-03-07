import { useState, useEffect } from 'react';
import {
  Shield, Users, Recycle, Gift, Check, X,
  Leaf, TrendingUp, Package, Trash2, AlertTriangle,
  KeyRound, Plus, ChevronDown, ChevronUp, Tag, Hash,
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import {
  getAllUsers, getAllSubmissions, getAllRewards,
  updateReward, createReward, deleteReward,
  addCouponCodesToReward, getCouponCodesForReward,
  getAvailableCodeCounts, deleteCouponCode,
  deleteSubmission, updateSubmissionStatus,
} from '../lib/db';

const statusStyle = {
  verified: 'bg-eco-100 text-eco-700',
  pending:  'bg-yellow-50 text-yellow-700',
  rejected: 'bg-red-50 text-red-600',
};

// ── VERIFY DIALOG ─────────────────────────────────────────
function VerifyDialog({ submission, onApprove, onReject, onClose, isOwn }) {
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const storedCode  = submission.bagCode || '';
  const codeMatches = inputCode.trim().toUpperCase() === storedCode.toUpperCase();
  const items       = (() => { try { return JSON.parse(submission.items); } catch { return []; } })();

  async function handleApprove() {
    if (!codeMatches || isOwn) return;
    setLoading(true); setError('');
    try { await onApprove(submission); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function handleReject() {
    setLoading(true); setError('');
    try { await onReject(submission); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-bark/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-moss" strokeWidth={1.5} />
            </div>
            <h2 className="font-display font-bold text-lg text-moss">Verify Deposit</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-eco-100 transition-colors">
            <X className="w-4 h-4 text-bark/50" />
          </button>
        </div>

        <div className="bg-eco-50 rounded-2xl p-4 mb-5">
          <div className="flex flex-wrap gap-1 mb-1">
            {items.map((item, i) => (
              <span key={i} className="font-body text-xs bg-white text-bark/70 px-2 py-0.5 rounded-full border border-eco-100">
                {item.itemType} ×{item.quantity}
              </span>
            ))}
          </div>
          <p className="font-mono text-xs text-bark/40 mt-1">
            {submission.totalPoints} pts · {new Date(submission.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {isOwn ? (
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-2xl p-3 mb-5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-body text-xs">This is your own submission. You cannot approve it.</span>
          </div>
        ) : (
          <>
            <p className="font-body text-sm text-bark/60 mb-3">Enter the code written on the physical bag:</p>
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              placeholder="ECHO-XXXX-XXXX-XXXX-XXXX"
              className={`w-full px-4 py-3 border-2 rounded-2xl font-mono text-sm focus:outline-none transition-colors mb-2 ${
                inputCode === ''   ? 'border-eco-100 bg-cream/50'
                : codeMatches     ? 'border-eco-400 bg-eco-50 text-eco-700'
                :                   'border-red-200 bg-red-50 text-red-700'
              }`}
            />
            {inputCode !== '' && (
              <p className={`font-mono text-xs mb-4 ${codeMatches ? 'text-eco-600' : 'text-red-500'}`}>
                {codeMatches ? '✓ Code matches — you can approve' : '✗ Code does not match'}
              </p>
            )}
          </>
        )}

        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 mb-4 font-body text-xs">{error}</div>}

        <div className="flex gap-3">
          <button onClick={handleReject} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-display font-semibold text-sm py-3 rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />Reject
          </button>
          <button onClick={handleApprove} disabled={loading || !codeMatches || isOwn}
            className="flex-1 flex items-center justify-center gap-2 bg-moss text-cream font-display font-semibold text-sm py-3 rounded-2xl hover:bg-leaf transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-moss">
            <Check className="w-4 h-4" />Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ADD CODES DIALOG (for existing rewards) ───────────────
function AddCodesDialog({ reward, onSave, onClose }) {
  const [raw, setRaw]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const parsed  = raw.split(',').map(c => c.trim()).filter(c => c !== '');
  const preview = parsed.slice(0, 3);

  async function handleSave() {
    if (parsed.length === 0) { setError('Enter at least one code.'); return; }
    setLoading(true); setError('');
    try { await onSave(reward.$id, parsed); onClose(); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-bark/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-lg text-moss">Add Coupon Codes</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-eco-100 transition-colors">
            <X className="w-4 h-4 text-bark/50" />
          </button>
        </div>
        <p className="font-body text-sm text-bark/55 mb-5">
          Adding to: <span className="font-semibold text-moss">{reward.brandName} — {reward.title}</span>
        </p>
        <label className="font-display font-medium text-sm text-bark/70 mb-2 block">
          Paste codes <span className="font-body font-normal text-bark/40">(comma separated)</span>
        </label>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder="CODE1, CODE2, CODE3, ..."
          rows={4}
          className="w-full px-4 py-3 border-2 border-eco-100 rounded-2xl font-mono text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50 resize-none mb-3"
        />
        {parsed.length > 0 && (
          <div className="bg-eco-50 border border-eco-100 rounded-xl p-3 mb-4">
            <p className="font-mono text-xs text-bark/50 mb-1">{parsed.length} code{parsed.length !== 1 ? 's' : ''} detected:</p>
            <p className="font-mono text-xs text-moss">{preview.join(', ')}{parsed.length > 3 ? ` … +${parsed.length - 3} more` : ''}</p>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 mb-4 font-body text-xs">{error}</div>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-eco-50 text-moss font-display font-semibold text-sm py-3 rounded-2xl hover:bg-eco-100 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading || parsed.length === 0}
            className="flex-1 btn-primary justify-center py-3 text-sm disabled:opacity-60">
            {loading ? 'Saving…' : `Add ${parsed.length > 0 ? parsed.length : ''} Code${parsed.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CODES PANEL (inline per reward in list) ───────────────
function CodesPanel({ reward, onCodesChanged }) {
  const [codes, setCodes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchCodes(); }, [reward.$id]);

  async function fetchCodes() {
    setLoading(true);
    try {
      const res = await getCouponCodesForReward(reward.$id);
      setCodes(res.documents);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(codeDoc) {
    if (codeDoc.isUsed) return;
    if (!confirm(`Delete code "${codeDoc.code}"?`)) return;
    setDeletingId(codeDoc.$id);
    try {
      await deleteCouponCode(codeDoc.$id);
      setCodes(prev => prev.filter(c => c.$id !== codeDoc.$id));
      onCodesChanged();
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  }

  const unused = codes.filter(c => !c.isUsed);
  const used   = codes.filter(c => c.isUsed);

  if (loading) return (
    <div className="mt-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-eco-50 rounded-xl animate-pulse" />)}</div>
  );

  if (codes.length === 0) return (
    <div className="mt-3 bg-eco-50 rounded-2xl p-4 text-center">
      <p className="font-body text-xs text-bark/45">No codes yet.</p>
    </div>
  );

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex gap-3 mb-3">
        <span className="font-mono text-xs bg-eco-100 text-eco-700 px-3 py-1 rounded-full">{unused.length} available</span>
        <span className="font-mono text-xs bg-bark/10 text-bark/50 px-3 py-1 rounded-full">{used.length} used</span>
      </div>
      {unused.map(c => (
        <div key={c.$id} className="flex items-center justify-between bg-eco-50 border border-eco-100 rounded-xl px-3 py-2 gap-2">
          <span className="font-mono text-xs text-moss font-bold tracking-wide">{c.code}</span>
          <button onClick={() => handleDelete(c)} disabled={deletingId === c.$id}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors group disabled:opacity-40">
            <Trash2 className="w-3 h-3 text-bark/25 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      ))}
      {used.map(c => (
        <div key={c.$id} className="flex items-center justify-between bg-bark/5 border border-bark/10 rounded-xl px-3 py-2 gap-2 opacity-50">
          <span className="font-mono text-xs text-bark/50 line-through tracking-wide">{c.code}</span>
          <span className="font-mono text-xs text-bark/35">used</span>
        </div>
      ))}
    </div>
  );
}

// ── ADD REWARD FORM ───────────────────────────────────────
const EMPTY_FORM = {
  title: '', brandName: '', partner: '', logoUrl: '',
  description: '', pointsCost: 100, couponCodesRaw: '',
};

function AddRewardForm({ onCreated, onCancel }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const parsedCodes = form.couponCodesRaw
    .split(',').map(c => c.trim()).filter(c => c !== '');
  const quantity = parsedCodes.length;

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim())     { setError('Voucher name is required.'); return; }
    if (!form.brandName.trim()) { setError('Brand name is required.'); return; }
    if (quantity === 0)         { setError('Paste at least one coupon code.'); return; }
    setSaving(true); setError('');
    try {
      const newReward = await createReward(form);
      await addCouponCodesToReward(newReward.$id, parsedCodes);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: 'title',       label: 'Voucher Name',  placeholder: '10% off on Starbucks',  span: 2 },
    { key: 'brandName',   label: 'Brand Name',    placeholder: 'Starbucks',              span: 1 },
    { key: 'partner',     label: 'Partner',       placeholder: 'Starbucks India',        span: 1 },
    { key: 'logoUrl',     label: 'Logo URL',      placeholder: 'https://...',            span: 2 },
    { key: 'description', label: 'Description',   placeholder: 'Get 10% off (up to ₹100) on your next Starbucks order', span: 2 },
  ];

  return (
    <div className="bg-white rounded-3xl border border-eco-100 p-7">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center">
          <Gift className="w-5 h-5 text-moss" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-moss">New Reward</h3>
          <p className="font-body text-xs text-bark/45 mt-0.5">Fill in all details and paste the coupon codes from the brand.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-2xl p-3 mb-5 font-body text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {fields.map(({ key, label, placeholder, span }) => (
            <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
              <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
              />
            </div>
          ))}

          <div>
            <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">Points Cost Per Coupon</label>
            <input
              type="number"
              min="1"
              value={form.pointsCost}
              onChange={e => set('pointsCost', Number(e.target.value))}
              className="w-full px-4 py-2.5 border-2 border-eco-100 rounded-xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
            />
          </div>

          <div>
            <label className="font-display font-medium text-xs text-bark/60 mb-1.5 flex items-center gap-1.5">
              Quantity
              <span className="font-body font-normal text-bark/35">(auto)</span>
            </label>
            <div className={`w-full px-4 py-2.5 border-2 rounded-xl font-mono text-sm flex items-center gap-2 transition-colors ${
              quantity > 0 ? 'border-eco-300 bg-eco-50 text-eco-700' : 'border-eco-100 bg-cream/30 text-bark/35'
            }`}>
              <Hash className="w-3.5 h-3.5 shrink-0" />
              {quantity > 0 ? `${quantity} coupon${quantity !== 1 ? 's' : ''}` : 'Paste codes below'}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="font-display font-medium text-xs text-bark/60 mb-1.5 block">
              Coupon Codes
              <span className="font-body font-normal text-bark/35 ml-1.5">comma separated</span>
            </label>
            <textarea
              value={form.couponCodesRaw}
              onChange={e => set('couponCodesRaw', e.target.value)}
              placeholder="ZOM10A, ZOM10B, ZOM10C, ZOM10D, ..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-eco-100 rounded-xl font-mono text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50 resize-none"
            />
            {quantity > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parsedCodes.slice(0, 6).map((c, i) => (
                  <span key={i} className="font-mono text-xs bg-eco-100 text-eco-700 px-2.5 py-0.5 rounded-lg">{c}</span>
                ))}
                {quantity > 6 && (
                  <span className="font-mono text-xs bg-bark/10 text-bark/45 px-2.5 py-0.5 rounded-lg">+{quantity - 6} more</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-eco-50">
          <button type="button" onClick={onCancel}
            className="flex-1 sm:flex-none px-6 bg-eco-50 text-moss font-display font-semibold text-sm py-3 rounded-2xl hover:bg-eco-100 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving || quantity === 0}
            className="flex-1 btn-primary justify-center py-3 disabled:opacity-60">
            {saving ? 'Creating…' : `Create Reward with ${quantity} Code${quantity !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── ADMIN PAGE ────────────────────────────────────────────
export default function AdminPage() {
  const { user, profile }             = useAuth();
  const [tab, setTab]                 = useState('overview');
  const [users, setUsers]             = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [rewards, setRewards]         = useState([]);
  const [codeCounts, setCodeCounts]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const [verifyingSub, setVerifyingSub]     = useState(null);
  const [addCodesReward, setAddCodesReward] = useState(null);
  const [expandedReward, setExpandedReward] = useState(null);
  const [showRewardForm, setShowRewardForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [u, s, r] = await Promise.all([
        getAllUsers(), getAllSubmissions(), getAllRewards(),
      ]);
      setUsers(u.documents);
      setSubmissions(s.documents);
      setRewards(r.documents);
      if (r.documents.length > 0) {
        const counts = await getAvailableCodeCounts(r.documents.map(rw => rw.$id));
        setCodeCounts(counts);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function refreshCodeCounts() {
    if (rewards.length === 0) return;
    const counts = await getAvailableCodeCounts(rewards.map(r => r.$id));
    setCodeCounts(counts);
  }

  // ✅ FIX #5: Simplified isOwnSubmission — removed redundant u.userId fallback.
  // The users collection uses $id as the primary key consistently.
  // Checking both u.$id and u.userId was a sign of data model confusion.
  function isOwnSubmission(sub) {
    if (sub.userId === user.$id) return true;
    const submitter = users.find(u => u.$id === sub.userId);
    return !!(submitter && profile?.email && submitter.email === profile.email);
  }

  async function handleApprove(sub) {
    await updateSubmissionStatus(sub.$id, 'verified');
    setSubmissions(prev => prev.map(s => s.$id === sub.$id ? { ...s, status: 'verified' } : s));
    setVerifyingSub(null);
  }

  async function handleReject(sub) {
    await updateSubmissionStatus(sub.$id, 'rejected');
    setSubmissions(prev => prev.map(s => s.$id === sub.$id ? { ...s, status: 'rejected' } : s));
    setVerifyingSub(null);
  }

  async function handleDeleteSubmission(sub) {
    if (!confirm('Delete this submission?')) return;
    try {
      await deleteSubmission(sub.$id);
      setSubmissions(prev => prev.filter(s => s.$id !== sub.$id));
    } catch (e) { setError(e.message); }
  }

  async function handleToggleReward(reward) {
    try {
      await updateReward(reward.$id, { available: !reward.available });
      setRewards(prev => prev.map(r => r.$id === reward.$id ? { ...r, available: !r.available } : r));
    } catch (e) { setError(e.message); }
  }

  async function handleDeleteReward(reward) {
    if (!confirm(`Delete "${reward.title}"? All coupon codes will also be deleted.`)) return;
    try {
      await deleteReward(reward.$id);
      setRewards(prev => prev.filter(r => r.$id !== reward.$id));
    } catch (e) { setError(e.message); }
  }

  async function handleAddCodes(rewardId, codes) {
    await addCouponCodesToReward(rewardId, codes);
    await refreshCodeCounts();
    setExpandedReward(null);
    setTimeout(() => setExpandedReward(rewardId), 50);
  }

  const totalPoints = users.reduce((sum, u) => sum + (u.points || 0), 0);
  const pendingSubs = submissions.filter(s => s.status === 'pending');

  const tabs = [
    { id: 'overview',    label: 'Overview',   icon: TrendingUp },
    { id: 'submissions', label: 'Submissions', icon: Recycle    },
    { id: 'users',       label: 'Users',       icon: Users      },
    { id: 'rewards',     label: 'Rewards',     icon: Gift       },
  ];

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      {verifyingSub && (
        <VerifyDialog
          submission={verifyingSub}
          isOwn={isOwnSubmission(verifyingSub)}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setVerifyingSub(null)}
        />
      )}
      {addCodesReward && (
        <AddCodesDialog
          reward={addCodesReward}
          onSave={handleAddCodes}
          onClose={() => setAddCodesReward(null)}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <span className="section-tag mb-3 inline-flex"><Shield className="w-3 h-3" />Admin</span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">Admin Panel</h1>
          <p className="font-body text-bark/55 mt-2 text-sm">Manage submissions, users, and rewards.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 font-body text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-display font-semibold text-sm transition-all duration-200 ${
                tab === id ? 'bg-moss text-cream shadow-sm' : 'bg-white border border-eco-100 text-bark/65 hover:border-moss/40'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {label}
              {id === 'submissions' && pendingSubs.length > 0 && (
                <span className="bg-yellow-400 text-white font-mono text-xs px-1.5 py-0.5 rounded-full">{pendingSubs.length}</span>
              )}
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
                  { label: 'Total Users',       value: users.length,       icon: Users,   color: 'text-moss',       bg: 'bg-moss/10'   },
                  { label: 'Total Submissions',  value: submissions.length, icon: Recycle, color: 'text-eco-600',    bg: 'bg-eco-100'   },
                  { label: 'Pending Review',     value: pendingSubs.length, icon: Package, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Points Distributed', value: totalPoints,        icon: Leaf,    color: 'text-leaf',       bg: 'bg-leaf/10'   },
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
                      const items     = (() => { try { return JSON.parse(sub.items); } catch { return []; } })();
                      const isOwn     = isOwnSubmission(sub);
                      const isPending = sub.status === 'pending';
                      return (
                        <div key={sub.$id} className="py-4 border-b border-eco-50 last:border-0">
                          <div className="flex items-center justify-between gap-3">
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
                              <span className="font-display font-semibold text-sm text-eco-600">
                                {sub.status === 'verified' ? '+' : ''}{sub.totalPoints} pts
                              </span>
                              <span className={`font-mono text-xs px-2.5 py-1 rounded-full ${statusStyle[sub.status] || 'bg-eco-50 text-bark/50'}`}>
                                {sub.status}
                              </span>
                              {isPending && (
                                <button onClick={() => setVerifyingSub(sub)}
                                  className="flex items-center gap-1.5 bg-moss text-cream font-display font-semibold text-xs px-3 py-1.5 rounded-xl hover:bg-leaf transition-colors">
                                  <KeyRound className="w-3 h-3" />Verify
                                </button>
                              )}
                              <button onClick={() => handleDeleteSubmission(sub)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors group">
                                <Trash2 className="w-3.5 h-3.5 text-bark/30 group-hover:text-red-400 transition-colors" />
                              </button>
                            </div>
                          </div>
                          {isOwn && isPending && (
                            <div className="mt-2 flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-xl px-3 py-1 w-fit">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span className="font-mono text-xs">Your submission — cannot verify</span>
                            </div>
                          )}
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
                  All Users<span className="font-mono text-xs text-bark/40 ml-3">{users.length} total</span>
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
                          <span className="font-mono text-xs font-bold text-eco-600 bg-eco-50 px-2.5 py-1 rounded-full">{u.points} pts</span>
                          {u.isAdmin && <span className="font-mono text-xs bg-moss/10 text-moss px-2.5 py-1 rounded-full">admin</span>}
                          {u.isVerified
                            ? <span className="font-mono text-xs bg-eco-100 text-eco-700 px-2.5 py-1 rounded-full">verified</span>
                            : <span className="font-mono text-xs bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full">unverified</span>
                          }
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
                    Rewards<span className="font-mono text-xs text-bark/40 ml-3">{rewards.length} total</span>
                  </h2>
                  {!showRewardForm && (
                    <button onClick={() => setShowRewardForm(true)} className="btn-primary text-sm">
                      <Plus className="w-4 h-4" />New Reward
                    </button>
                  )}
                </div>

                {showRewardForm && (
                  <AddRewardForm
                    onCreated={() => { setShowRewardForm(false); loadAll(); }}
                    onCancel={() => setShowRewardForm(false)}
                  />
                )}

                <div className="bg-white rounded-3xl border border-eco-100 p-7">
                  {rewards.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 bg-eco-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Gift className="w-7 h-7 text-eco-300" strokeWidth={1.5} />
                      </div>
                      <p className="font-display font-medium text-bark/50 text-sm">No rewards yet</p>
                      <p className="font-body text-bark/35 text-xs mt-1">Click "New Reward" above to add one</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {rewards.map(r => {
                        const available  = codeCounts[r.$id] ?? '…';
                        const isExpanded = expandedReward === r.$id;
                        return (
                          <div key={r.$id} className="py-5 border-b border-eco-50 last:border-0">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {r.logoUrl ? (
                                  <img src={r.logoUrl} alt={r.brandName}
                                    className="w-10 h-10 rounded-xl object-contain border border-eco-100 shrink-0 mt-0.5"
                                    onError={e => e.target.style.display='none'} />
                                ) : (
                                  <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="font-display font-bold text-sm text-moss">{r.brandName?.charAt(0) || '?'}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-display font-semibold text-sm text-moss">{r.title}</p>
                                  <p className="font-body text-xs text-bark/55 mt-0.5">{r.description}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="font-mono text-xs text-bark/40">{r.brandName}</span>
                                    <span className="font-mono text-xs text-bark/25">·</span>
                                    <span className="font-mono text-xs font-bold text-eco-600">{r.pointsCost} pts</span>
                                    <span className="font-mono text-xs text-bark/25">·</span>
                                    <span className={`font-mono text-xs flex items-center gap-1 ${
                                      available === 0 ? 'text-red-500' : 'text-eco-600'
                                    }`}>
                                      <Tag className="w-2.5 h-2.5" />
                                      {available === 0 ? 'out of stock' : `${available} left`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <button onClick={() => setExpandedReward(isExpanded ? null : r.$id)}
                                  className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl bg-eco-50 text-moss hover:bg-eco-100 transition-colors">
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  Codes
                                </button>
                                <button onClick={() => setAddCodesReward(r)}
                                  className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl bg-eco-50 text-moss hover:bg-eco-100 transition-colors">
                                  <Plus className="w-3 h-3" />Add
                                </button>
                                <button onClick={() => handleToggleReward(r)}
                                  className={`flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl transition-all duration-200 ${
                                    r.available
                                      ? 'bg-eco-100 text-eco-700 hover:bg-red-50 hover:text-red-600'
                                      : 'bg-yellow-50 text-yellow-700 hover:bg-eco-100 hover:text-eco-700'
                                  }`}>
                                  {r.available ? <><Check className="w-3 h-3" />active</> : <><X className="w-3 h-3" />inactive</>}
                                </button>
                                <button onClick={() => handleDeleteReward(r)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors group">
                                  <Trash2 className="w-3.5 h-3.5 text-bark/25 group-hover:text-red-400 transition-colors" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <CodesPanel reward={r} onCodesChanged={refreshCodeCounts} />
                            )}
                          </div>
                        );
                      })}
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
