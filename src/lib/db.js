import { functions, databases, DB_ID, COLLECTIONS, Query } from './appwrite';

const FN_ID = '69a9b6a5003ae8c2400e';

export const ITEM_POINTS = {
  'Mobile Phone':     50,
  'Laptop':          150,
  'Tablet':          100,
  'Charger / Cable':  10,
  'Battery':          20,
  'Earphones':        15,
  'Circuit Board':    30,
  'USB Drive':        10,
  'Keyboard / Mouse': 25,
  'Other':            10,
};

// ── CORE CALLER ───────────────────────────────────────────
// Reads the JWT from localStorage and passes it as a header so the
// server function can authenticate the caller even without a cookie session.
async function _execute(domain, action, payload = {}) {
  const body = JSON.stringify({ domain, action, payload });
  const jwt  = localStorage.getItem('echo_jwt');

  const headers = jwt ? { 'x-appwrite-user-jwt': jwt } : {};

  let execution;
  try {
    execution = await functions.createExecution(
      FN_ID, body, false, '/', 'POST', headers,
    );
  } catch (e) {
    throw new Error('Could not reach server function: ' + e.message);
  }
  const raw = execution.responseBody ?? '';
  if (!raw) throw new Error('Empty response from server function.');
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error('Server returned invalid response: ' + raw.slice(0, 150));
  }
  if (!result.success) {
    throw new Error(result.error || 'Server error.');
  }
  return result.data;
}

// ── USERS ─────────────────────────────────────────────────

// createUserProfile uses raw fetch — guest action, no session needed.
export async function createUserProfile(name, email, userId) {
  const endpoint  = import.meta.env.VITE_APPWRITE_ENDPOINT;
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

  const response = await fetch(
    `${endpoint}/functions/${FN_ID}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
      },
      body: JSON.stringify({
        body: JSON.stringify({
          domain: 'users',
          action: 'createProfile',
          payload: { name, email, userId },
        }),
        async: false,
      }),
    }
  );

  const execution = await response.json();
  const result = JSON.parse(execution.responseBody);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export async function getUserProfile() {
  return _execute('users', 'getProfile');
}
export async function updateUserProfile(name) {
  return _execute('users', 'updateProfile', { name });
}
export async function setVerified() {
  return _execute('users', 'setVerified');
}
export async function getAllUsers() {
  return _execute('users', 'getAllUsers');
}
export async function getUserByEmail(email) {
  return databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
    Query.equal('email', email),
    Query.limit(1),
  ]);
}

// Direct DB query — used as fallback when server function is unavailable
export async function getUserProfileDirect(email) {
  const result = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
    Query.equal('email', email),
    Query.limit(1),
  ]);
  return result?.documents?.[0] ?? null;
}

// ── ROLE MANAGEMENT (superadmin only) ─────────────────────
export async function promoteToAdmin(targetUserId) {
  return _execute('users', 'promoteToAdmin', { targetUserId });
}
export async function promoteToSuperAdmin(targetUserId) {
  return _execute('users', 'promoteToSuperAdmin', { targetUserId });
}
export async function demoteToUser(targetUserId) {
  return _execute('users', 'demoteToUser', { targetUserId });
}
export async function deleteUser(targetUserId) {
  return _execute('users', 'deleteUser', { targetUserId });
}

// ── SUBMISSIONS ───────────────────────────────────────────
export async function createSubmission(_userId, { items, binId, groupId }) {
  return _execute('submissions', 'create', { items, binId, groupId });
}
export async function getUserSubmissions() {
  return _execute('submissions', 'getMySubmissions');
}
export async function getAllSubmissions() {
  return _execute('submissions', 'getAll');
}
export async function updateSubmissionStatus(submissionId, newStatus) {
  return _execute('submissions', 'updateStatus', { submissionId, newStatus });
}
export async function deleteSubmission(submissionId) {
  return _execute('submissions', 'delete', { submissionId });
}

// ── REWARDS ───────────────────────────────────────────────
export async function getAvailableRewards() {
  return databases.listDocuments(DB_ID, COLLECTIONS.REWARDS, [
    Query.equal('available', true),
  ]);
}
export async function getAllRewards() {
  return _execute('rewards', 'getAll');
}
export async function createReward(data) {
  return _execute('rewards', 'create', data);
}
export async function updateReward(rewardId, data) {
  return _execute('rewards', 'update', { rewardId, data });
}
export async function deleteReward(rewardId) {
  return _execute('rewards', 'delete', { rewardId });
}

// ── COUPON CODES ──────────────────────────────────────────
export async function addCouponCodesToReward(rewardId, codes) {
  return _execute('coupons', 'addCodes', { rewardId, codes });
}
export async function getCouponCodesForReward(rewardId) {
  return _execute('coupons', 'getCodes', { rewardId });
}
export async function getAvailableCodeCount(rewardId) {
  const res = await _execute('coupons', 'getCount', { rewardId });
  return res.count;
}
export async function getAvailableCodeCounts(rewardIds) {
  return _execute('coupons', 'getCounts', { rewardIds });
}
export async function deleteCouponCode(codeId) {
  return _execute('coupons', 'deleteCode', { codeId });
}

// ── REDEMPTIONS ───────────────────────────────────────────
export async function redeemReward(_userId, rewardId, pointsCost) {
  return _execute('redemptions', 'redeem', { rewardId, pointsCost });
}
export async function getUserRedemptions() {
  return _execute('redemptions', 'getMyRedemptions');
}

// ── GROUPS ────────────────────────────────────────────────
export async function createGroup(name) {
  return _execute('groups', 'create', { name });
}
export async function getGroup(groupId) {
  return _execute('groups', 'get', { groupId });
}
export async function getGroups(groupIds) {
  return _execute('groups', 'getMultiple', { groupIds });
}
export async function getGroupLeaderboard() {
  return _execute('groups', 'leaderboard');
}
export async function leaveGroup(_userId, groupId) {
  return _execute('groups', 'leave', { groupId });
}
export async function sendInvite(groupId, email, _invitedBy, inviterName, inviterEmail) {
  return _execute('groups', 'sendInvite', { groupId, email, inviterName, inviterEmail });
}
export async function getPendingInvites(email) {
  return _execute('groups', 'getPendingInvites', { email });
}
export async function acceptInvite(inviteId, _userId, groupId) {
  return _execute('groups', 'acceptInvite', { inviteId, groupId });
}
export async function declineInvite(inviteId) {
  return _execute('groups', 'declineInvite', { inviteId });
}
