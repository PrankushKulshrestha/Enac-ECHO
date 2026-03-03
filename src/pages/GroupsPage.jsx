import { useState, useEffect } from 'react';
import { Users, Plus, Mail, X, LogOut, Trophy, Leaf, Check } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  createGroup, getGroup, sendInvite,
  getPendingInvites, acceptInvite, declineInvite,
  leaveGroup, getGroupLeaderboard,
} from '../lib/db';

export default function GroupsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [group, setGroup]                 = useState(null);
  const [invites, setInvites]             = useState([]);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [creating, setCreating]           = useState(false);
  const [groupName, setGroupName]         = useState('');
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg]         = useState('');
  const [error, setError]                 = useState('');

  useEffect(() => { loadAll(); }, [profile]);

  async function loadAll() {
    setLoading(true);
    try {
      const [lb, inv] = await Promise.all([
        getGroupLeaderboard(),
        user ? getPendingInvites(profile?.email || user.email) : Promise.resolve({ documents: [] }),
      ]);
      setLeaderboard(lb?.documents ?? []);
      setInvites(inv?.documents ?? []);

      if (profile?.groupId) {
        const g = await getGroup(profile.groupId);
        setGroup(g);
      } else {
        setGroup(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError('');
    setCreating(true);
    try {
      await createGroup(groupName.trim(), user.$id);
      await refreshProfile();
      await loadAll();
      setGroupName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteMsg('');
    setError('');
    setInviteLoading(true);
    try {
      await sendInvite(group.$id, inviteEmail.trim(), user.$id);
      setInviteMsg(`Invite sent to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (e) {
      setError(e.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAccept(invite) {
    try {
      await acceptInvite(invite.$id, user.$id, invite.groupId);
      await refreshProfile();
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDecline(invite) {
    try {
      await declineInvite(invite.$id);
      setInvites(inv => inv.filter(i => i.$id !== invite.$id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await leaveGroup(user.$id, profile.groupId);
      await refreshProfile();
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  const memberCount = group ? JSON.parse(group.memberIds || '[]').length : 0;

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <span className="section-tag mb-3 inline-flex"><Leaf className="w-3 h-3" />Groups</span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">
            Eco Groups
          </h1>
          <p className="font-body text-bark/55 mt-2 text-sm">
            Team up with friends and compete on the leaderboard.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 font-body text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — My Group */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pending Invites */}
            {invites.length > 0 && (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <h2 className="font-display font-semibold text-moss mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Pending Invites ({invites.length})
                </h2>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.$id} className="flex items-center justify-between bg-eco-50 rounded-2xl p-4">
                      <div>
                        <p className="font-body font-medium text-sm text-bark">Group Invite</p>
                        <p className="font-mono text-xs text-bark/45">{invite.groupId}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(invite)}
                          className="w-8 h-8 bg-moss rounded-xl flex items-center justify-center hover:bg-leaf transition-colors"
                        >
                          <Check className="w-4 h-4 text-cream" />
                        </button>
                        <button
                          onClick={() => handleDecline(invite)}
                          className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-eco-50 rounded-xl animate-pulse" />)}
                </div>
              </div>
            ) : group ? (
              /* My Group */
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-moss rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-cream" strokeWidth={1.5} />
                      </div>
                      <h2 className="font-display font-bold text-xl text-moss">{group.name}</h2>
                    </div>
                    <p className="font-body text-bark/50 text-sm">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-2xl text-eco-600">{group.totalPoints}</div>
                    <div className="font-mono text-xs text-bark/40">group points</div>
                  </div>
                </div>

                {/* Invite form */}
                <div className="border-t border-eco-100 pt-6">
                  <h3 className="font-display font-semibold text-sm text-moss mb-3">Invite a Member</h3>
                  {inviteMsg && (
                    <div className="bg-eco-50 border border-eco-100 text-eco-700 rounded-2xl p-3 mb-3 font-body text-sm">
                      {inviteMsg}
                    </div>
                  )}
                  <form onSubmit={handleInvite} className="flex gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark/40" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@nsut.ac.in"
                        required
                        className="w-full pl-10 pr-4 py-3 border-2 border-eco-100 rounded-2xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="btn-primary text-sm py-3 px-5 shrink-0 disabled:opacity-60"
                    >
                      {inviteLoading ? '...' : 'Invite'}
                    </button>
                  </form>
                </div>

                {/* Leave group */}
                <button
                  onClick={handleLeave}
                  className="mt-6 flex items-center gap-2 font-body text-sm text-red-400 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Leave group
                </button>
              </div>
            ) : (
              /* Create Group */
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <div className="w-12 h-12 bg-eco-100 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-moss" strokeWidth={1.5} />
                </div>
                <h2 className="font-display font-bold text-xl text-moss mb-1">Create a Group</h2>
                <p className="font-body text-bark/55 text-sm mb-6">
                  Start a group with your friends and combine your eco-points.
                </p>
                <form onSubmit={handleCreateGroup} className="flex gap-3">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name..."
                    required
                    className="flex-1 px-4 py-3 border-2 border-eco-100 rounded-2xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary text-sm py-3 px-5 shrink-0 disabled:opacity-60"
                  >
                    {creating ? '...' : (
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create
                      </span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right — Leaderboard */}
          <div className="bg-white rounded-3xl border border-eco-100 p-7 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-moss" strokeWidth={1.5} />
              <h2 className="font-display font-semibold text-moss">Leaderboard</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-eco-50 rounded-xl animate-pulse" />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="font-body text-bark/45 text-sm text-center py-8">No groups yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((g, index) => (
                  <div
                    key={g.$id}
                    className={`flex items-center justify-between p-3 rounded-2xl ${
                      profile?.groupId === g.$id ? 'bg-moss text-cream' : 'bg-eco-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xs font-bold w-5 ${
                        profile?.groupId === g.$id ? 'text-eco-300' : 'text-bark/40'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className={`font-body font-medium text-sm ${
                        profile?.groupId === g.$id ? 'text-cream' : 'text-bark'
                      }`}>
                        {g.name}
                      </span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${
                      profile?.groupId === g.$id ? 'text-eco-300' : 'text-eco-600'
                    }`}>
                      {g.totalPoints} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}