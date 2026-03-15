import { useState, useEffect } from 'react';
import {
  Users, Plus, Mail, X, LogOut, Trophy, Leaf,
  Check, Star, AlertTriangle, Info, Gift,
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import {
  createGroup, getGroups, sendInvite, getPendingInvites,
  acceptInvite, declineInvite, leaveGroup, getGroupLeaderboard,
  getGroupAchievements,
} from '../lib/db';

// ── GROUP CREDITS EXPLAINER ───────────────────────────────
// totalPoints on a group = group credits (leaderboard display only).
// They are NOT spendable points. Individual eco-points (useable for
// rewards) are credited separately via the group bonus mechanism:
// for every 10 group credits gained, each qualifying member receives
// 1 eco-point added to their personal balance.

const MAX_MEMBERS = 4;
const BONUS_INTERVAL = 100; // group credits per bonus trigger
const BONUS_PER_MEMBER = 1; // eco-points awarded per trigger

// Only these milestone credit totals are shown in the achievements tab.
// Bonuses still trigger server-side every 100 credits beyond 10000,
// but they are not displayed to keep the UI clean.
const DISPLAY_MILESTONES = new Set([1, 5, 10]); // milestone numbers (credits / 100) → shows 100, 500, 1000

// Helper: days since a date string
function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export default function GroupsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [groups, setGroups]               = useState([]);
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [invites, setInvites]             = useState([]);
  const [leaderboard, setLeaderboard]     = useState([]);
  const [achievements, setAchievements]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [creating, setCreating]           = useState(false);
  const [showCreate, setShowCreate]       = useState(false);
  const [groupName, setGroupName]         = useState('');
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg]         = useState('');
  const [error, setError]                 = useState('');
  const [activeTab, setActiveTab]         = useState('group'); // 'group' | 'leaderboard' | 'achievements'

  useEffect(() => { loadAll(); }, [profile]);

  const currentGroupId = profile?.groupId?.trim() || '';
  const alreadyInGroup = !!currentGroupId;

  async function loadAll(overrideGroupId) {
    setLoading(true);
    try {
      const gId      = overrideGroupId !== undefined ? overrideGroupId : currentGroupId;
      const groupIds = gId ? [gId] : [];
      const [fetchedGroups, lb, inv] = await Promise.all([
        getGroups(groupIds),
        getGroupLeaderboard(),
        user ? getPendingInvites(profile?.email || user.email) : Promise.resolve({ documents: [] }),
      ]);
      setGroups(fetchedGroups);
      setLeaderboard(lb?.documents ?? []);
      setInvites(inv?.documents ?? []);
      setActiveGroupIdx(i => Math.min(i, Math.max(fetchedGroups.length - 1, 0)));

      // Load group achievements if in a group
      if (gId) {
        try {
          const ach = await getGroupAchievements(gId);
          setAchievements(ach?.documents ?? []);
        } catch { setAchievements([]); }
      } else {
        setAchievements([]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    const trimmedName = groupName.trim();

    if (alreadyInGroup) {
      setError('You are already in a group. Leave your current group before creating a new one.');
      return;
    }
    if (!trimmedName) return;

    const nameTaken = (leaderboard || []).some(
      g => (g.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameTaken) {
      setError('That group name is already taken. Please choose another one.');
      return;
    }

    setError('');
    setCreating(true);
    try {
      const newGroup = await createGroup(trimmedName, user.$id);
      await refreshProfile();
      setGroups([newGroup]);
      setActiveGroupIdx(0);
      const lb = await getGroupLeaderboard();
      setLeaderboard(lb?.documents ?? []);
      setGroupName('');
      setShowCreate(false);
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
    const activeGroup = groups[activeGroupIdx];
    const memberCount = JSON.parse(activeGroup?.memberIds || '[]').length;

    if (memberCount >= MAX_MEMBERS) {
      setError(`Groups are limited to ${MAX_MEMBERS} members to keep things fair. This group is full.`);
      return;
    }

    setInviteLoading(true);
    try {
      await sendInvite(
        activeGroup.$id,
        inviteEmail.trim(),
        user.$id,
        profile?.name || user.name,
        profile?.email || user.email,
      );
      setInviteMsg(`Invite sent to ${inviteEmail}!`);
      setInviteEmail('');
    } catch (e) {
      setError(e.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAccept(invite) {
    if (alreadyInGroup) {
      setError('You are already in a group. Leave your current group before accepting another invite.');
      return;
    }
    // Check target group capacity
    try {
      const targetGroups = await getGroups([invite.groupId]);
      if (targetGroups.length > 0) {
        const members = JSON.parse(targetGroups[0].memberIds || '[]');
        if (members.length >= MAX_MEMBERS) {
          setError(`This group is already full (${MAX_MEMBERS} members max).`);
          return;
        }
      }
    } catch {}

    try {
      await acceptInvite(invite.$id, user.$id, invite.groupId);
      setInvites(inv => inv.filter(i => i.$id !== invite.$id));
      await refreshProfile();
      await loadAll(invite.groupId);
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

  async function handleLeave(groupId) {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await leaveGroup(user.$id, groupId);
      await refreshProfile();
      await loadAll('');
      setShowCreate(false);
      setActiveTab('group');
    } catch (e) {
      setError(e.message);
    }
  }

  const activeGroup = groups[activeGroupIdx] || null;
  const memberCount = activeGroup ? JSON.parse(activeGroup.memberIds || '[]').length : 0;
  const groupFull   = memberCount >= MAX_MEMBERS;

  // How many bonus milestones has this group hit so far
  const bonusMilestones = activeGroup
    ? Math.floor((activeGroup.totalPoints || 0) / BONUS_INTERVAL)
    : 0;

  return (
    <main className="pt-24 pb-16 px-6 bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <span className="section-tag mb-3 inline-flex">
            <Leaf className="w-3 h-3" />
            Groups
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-moss mt-3">
            Eco Groups
          </h1>
          <p className="font-body text-bark/55 mt-2 text-sm">
            Team up and earn bonus eco-points together. Max {MAX_MEMBERS} members per group.
          </p>
        </div>

        {/* How bonuses work — info banner */}
        <div className="bg-eco-50 border border-eco-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-moss shrink-0 mt-0.5" />
          <div className="font-body text-xs text-bark/70 leading-relaxed">
            <span className="font-semibold text-moss">Group Bonus:</span> For every{' '}
            <span className="font-semibold">{BONUS_INTERVAL} group credits</span> your group earns,
            each qualifying member receives <span className="font-semibold">{BONUS_PER_MEMBER} eco-point</span>{' '}
            added to their personal balance (useable for rewards).
            <br />
            <span className="text-bark/50 mt-1 block">
              Qualifying = you must have an active submission under this group made within the last 45 days.
              Group credits shown on the leaderboard are <em>not</em> spendable — only your personal eco-points are.
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 mb-6 font-body text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending invites */}
            {invites.length > 0 && (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <h2 className="font-display font-semibold text-moss mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Pending Invites ({invites.length})
                </h2>
                <div className="space-y-3">
                  {invites.map(invite => (
                    <div key={invite.$id} className="flex items-center justify-between bg-eco-50 rounded-2xl p-4 gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-sm text-moss truncate">
                          {invite.groupName || 'Group Invite'}
                        </p>
                        <p className="font-body text-xs text-bark/60 mt-0.5">
                          Invited by <span className="font-medium text-bark">{invite.inviterName || 'A member'}</span>
                          {invite.inviterEmail ? <span className="text-bark/40"> · {invite.inviterEmail}</span> : null}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!alreadyInGroup && (
                          <button onClick={() => handleAccept(invite)}
                            className="w-8 h-8 bg-moss rounded-xl flex items-center justify-center hover:bg-leaf transition-colors"
                            title="Accept">
                            <Check className="w-4 h-4 text-cream" />
                          </button>
                        )}
                        <button onClick={() => handleDecline(invite)}
                          className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center hover:bg-red-200 transition-colors"
                          title="Decline">
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {alreadyInGroup && (
                  <p className="font-body text-xs text-bark/50 mt-4">
                    You are already in a group, so you cannot accept another invite unless you leave your current group.
                  </p>
                )}
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-3xl border border-eco-100 p-7">
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-12 bg-eco-50 rounded-xl animate-pulse" />)}
                </div>
              </div>
            ) : (
              <>
                {/* Group selector + create button */}
                <div className="flex items-center gap-2 flex-wrap">
                  {groups.map((g, idx) => (
                    <button key={g.$id} onClick={() => setActiveGroupIdx(idx)}
                      className={`px-4 py-2 rounded-2xl font-display font-semibold text-sm transition-all duration-200 ${
                        activeGroupIdx === idx
                          ? 'bg-moss text-cream shadow-sm'
                          : 'bg-white border border-eco-100 text-bark/65 hover:border-moss/40'
                      }`}>
                      {g.name}
                    </button>
                  ))}
                  {!alreadyInGroup && (
                    <button onClick={() => setShowCreate(v => !v)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-display font-semibold text-sm bg-white border border-eco-100 text-moss hover:border-moss/40 transition-all duration-200">
                      <Plus className="w-3.5 h-3.5" />
                      {groups.length === 0 ? 'Create a Group' : 'New Group'}
                    </button>
                  )}
                </div>

                {/* Create group form */}
                {showCreate && !alreadyInGroup && (
                  <div className="bg-white rounded-3xl border border-eco-100 p-7">
                    <div className="w-10 h-10 bg-eco-100 rounded-2xl flex items-center justify-center mb-4">
                      <Users className="w-5 h-5 text-moss" strokeWidth={1.5} />
                    </div>
                    <h2 className="font-display font-bold text-lg text-moss mb-1">Create a Group</h2>
                    <p className="font-body text-bark/55 text-sm mb-1">
                      Start a new group and invite friends to join.
                    </p>
                    <p className="font-body text-xs text-bark/40 mb-5">
                      Maximum {MAX_MEMBERS} members per group.
                    </p>
                    <form onSubmit={handleCreateGroup} className="flex gap-3">
                      <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                        placeholder="Group name..." required
                        className="flex-1 px-4 py-3 border-2 border-eco-100 rounded-2xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50" />
                      <button type="submit" disabled={creating}
                        className="btn-primary text-sm py-3 px-5 shrink-0 disabled:opacity-60">
                        {creating ? '...' : <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Create</span>}
                      </button>
                    </form>
                  </div>
                )}

                {/* Active group panel */}
                {activeGroup && (
                  <div className="bg-white rounded-3xl border border-eco-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-eco-100">
                      {[
                        { id: 'group',        label: 'My Group'      },
                        { id: 'achievements', label: 'Group Achievements' },
                      ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                          className={`flex-1 py-3.5 font-display font-semibold text-sm transition-colors duration-200 ${
                            activeTab === t.id
                              ? 'text-moss border-b-2 border-moss bg-eco-50/50'
                              : 'text-bark/50 hover:text-bark/70'
                          }`}>
                          {t.id === 'achievements' && achievements.filter(a => DISPLAY_MILESTONES.has(a.milestone)).length > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 bg-eco-500 text-white text-xs rounded-full mr-1.5 font-mono">
                              {achievements.filter(a => DISPLAY_MILESTONES.has(a.milestone)).length}
                            </span>
                          )}
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* ── MY GROUP TAB ── */}
                    {activeTab === 'group' && (
                      <div className="p-7">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 bg-moss rounded-xl flex items-center justify-center">
                                <Users className="w-4 h-4 text-cream" strokeWidth={1.5} />
                              </div>
                              <h2 className="font-display font-bold text-xl text-moss">{activeGroup.name}</h2>
                            </div>
                            <p className="font-body text-bark/50 text-sm">
                              {memberCount}/{MAX_MEMBERS} members
                              {groupFull && <span className="ml-2 font-mono text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100">Full</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-display font-bold text-2xl text-eco-600">
                              {activeGroup.totalPoints}
                            </div>
                            <div className="font-mono text-xs text-bark/40">group credits</div>
                            {bonusMilestones > 0 && (
                              <div className="font-mono text-xs text-moss mt-1">
                                {bonusMilestones} bonus{bonusMilestones !== 1 ? 'es' : ''} triggered
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Next bonus progress */}
                        {(() => {
                          const pts = activeGroup.totalPoints || 0;
                          const nextMilestone = (Math.floor(pts / BONUS_INTERVAL) + 1) * BONUS_INTERVAL;
                          const progressPct   = ((pts % BONUS_INTERVAL) / BONUS_INTERVAL) * 100;
                          return (
                            <div className="bg-eco-50 border border-eco-100 rounded-2xl p-4 mb-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-body text-xs text-bark/60">Next group bonus</span>
                                <span className="font-mono text-xs font-bold text-moss">
                                  {pts % BONUS_INTERVAL}/{BONUS_INTERVAL} credits
                                </span>
                              </div>
                              <div className="w-full h-2 bg-eco-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-moss rounded-full transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <p className="font-body text-xs text-bark/45 mt-2">
                                {nextMilestone - pts} more group credits → each qualifying member earns +{BONUS_PER_MEMBER} eco-point
                              </p>
                            </div>
                          );
                        })()}

                        {/* Invite */}
                        <div className="border-t border-eco-100 pt-6">
                          <h3 className="font-display font-semibold text-sm text-moss mb-3">
                            Invite a Member
                            {groupFull && (
                              <span className="ml-2 font-body font-normal text-xs text-yellow-600">
                                — Group is full ({MAX_MEMBERS}/{MAX_MEMBERS})
                              </span>
                            )}
                          </h3>
                          {inviteMsg && (
                            <div className="bg-eco-50 border border-eco-100 text-eco-700 rounded-2xl p-3 mb-3 font-body text-sm">
                              {inviteMsg}
                            </div>
                          )}
                          {groupFull ? (
                            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-2xl p-3 font-body text-sm">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              This group has reached the maximum of {MAX_MEMBERS} members. No more invites can be sent.
                            </div>
                          ) : (
                            <form onSubmit={handleInvite} className="flex gap-3">
                              <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bark/40" />
                                <input type="email" value={inviteEmail}
                                  onChange={e => setInviteEmail(e.target.value)}
                                  placeholder="friend@nsut.ac.in" required
                                  className="w-full pl-10 pr-4 py-3 border-2 border-eco-100 rounded-2xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50" />
                              </div>
                              <button type="submit" disabled={inviteLoading}
                                className="btn-primary text-sm py-3 px-5 shrink-0 disabled:opacity-60">
                                {inviteLoading ? '...' : 'Invite'}
                              </button>
                            </form>
                          )}
                        </div>

                        <button onClick={() => handleLeave(activeGroup.$id)}
                          className="mt-6 flex items-center gap-2 font-body text-sm text-red-400 hover:text-red-600 transition-colors">
                          <LogOut className="w-4 h-4" />
                          Leave group
                        </button>
                      </div>
                    )}

                    {/* ── GROUP ACHIEVEMENTS TAB ── */}
                    {activeTab === 'achievements' && (
                      <div className="p-7">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-moss" />
                          <h3 className="font-display font-semibold text-moss">Group Achievements</h3>
                        </div>
                        <p className="font-body text-xs text-bark/50 mb-6">
                          Eco-points earned by members via group bonuses. Each milestone (+{BONUS_INTERVAL} group credits) awards qualifying members +{BONUS_PER_MEMBER} personal eco-point.
                        </p>

                        {achievements.length === 0 ? (
                          <div className="text-center py-10">
                            <div className="w-14 h-14 bg-eco-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Gift className="w-7 h-7 text-eco-300" strokeWidth={1.5} />
                            </div>
                            <p className="font-display font-medium text-bark/50 text-sm">No bonuses yet</p>
                            <p className="font-body text-bark/35 text-xs mt-1">
                              Earn {BONUS_INTERVAL} group credits together to unlock the first milestone
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0">
                            {achievements.filter(ach => DISPLAY_MILESTONES.has(ach.milestone)).map(ach => (
                              <div key={ach.$id} className="py-4 border-b border-eco-50 last:border-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-6 h-6 bg-eco-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Star className="w-3 h-3 text-moss" />
                                      </div>
                                      <p className="font-display font-semibold text-sm text-moss">
                                        First {ach.milestone * BONUS_INTERVAL} group credits!
                                      </p>
                                    </div>
                                    <p className="font-body text-xs text-bark/50 ml-8">
                                      Group reached {ach.milestone * BONUS_INTERVAL} credits ·{' '}
                                      {new Date(ach.awardedAt).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                      })}
                                    </p>
                                    {/* Per-member breakdown */}
                                    {ach.recipients && ach.recipients.length > 0 && (
                                      <div className="mt-2 ml-8 space-y-1">
                                        {ach.recipients.map((r, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                                              r.awarded
                                                ? 'bg-eco-100 text-eco-700'
                                                : 'bg-bark/5 text-bark/40 line-through'
                                            }`}>
                                              {r.name || r.userId}
                                            </span>
                                            {r.awarded ? (
                                              <span className="font-mono text-xs text-eco-600">+{BONUS_PER_MEMBER} pt</span>
                                            ) : (
                                              <span className="font-mono text-xs text-bark/35">{r.reason}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="font-mono text-xs font-bold text-eco-600">
                                      +{ach.totalAwarded} pt{ach.totalAwarded !== 1 ? 's' : ''} given
                                    </span>
                                  </div>
                                </div>
                                {/* Warnings for non-qualifying members */}
                                {ach.warnings && ach.warnings.length > 0 && (
                                  <div className="mt-3 space-y-1 ml-8">
                                    {ach.warnings.map((w, i) => (
                                      <div key={i} className="flex items-start gap-1.5 text-yellow-700">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                        <span className="font-body text-xs">{w}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* No groups yet */}
                {groups.length === 0 && !showCreate && (
                  <div className="bg-white rounded-3xl border border-eco-100 p-10 text-center">
                    <div className="w-14 h-14 bg-eco-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-eco-300" strokeWidth={1.5} />
                    </div>
                    <p className="font-display font-medium text-bark/50 text-sm">You're not in any groups yet</p>
                    <p className="font-body text-bark/35 text-xs mt-1">Create one or accept an invite above</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT COLUMN: LEADERBOARD ── */}
          <div className="bg-white rounded-3xl border border-eco-100 p-7 h-fit">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-moss" strokeWidth={1.5} />
              <h2 className="font-display font-semibold text-moss">Leaderboard</h2>
            </div>
            <p className="font-body text-xs text-bark/45 mb-5">
              Ranked by group credits. Credits ≠ spendable points.
            </p>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-eco-50 rounded-xl animate-pulse" />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="font-body text-bark/45 text-sm text-center py-8">No groups yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((g, index) => {
                  const isMyGroup = currentGroupId === g.$id;
                  const members   = JSON.parse(g.memberIds || '[]').length;
                  return (
                    <div key={g.$id}
                      className={`flex items-center justify-between p-3 rounded-2xl ${isMyGroup ? 'bg-moss text-cream' : 'bg-eco-50'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono text-xs font-bold w-5 shrink-0 ${isMyGroup ? 'text-eco-300' : 'text-bark/40'}`}>
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className={`font-body font-medium text-sm block truncate ${isMyGroup ? 'text-cream' : 'text-bark'}`}>
                            {g.name}
                          </span>
                          <span className={`font-mono text-xs ${isMyGroup ? 'text-eco-300/70' : 'text-bark/35'}`}>
                            {members}/{MAX_MEMBERS} members
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`font-mono text-xs font-bold block ${isMyGroup ? 'text-eco-300' : 'text-eco-600'}`}>
                          {g.totalPoints}
                        </span>
                        <span className={`font-mono text-xs ${isMyGroup ? 'text-eco-300/60' : 'text-bark/30'}`}>credits</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
