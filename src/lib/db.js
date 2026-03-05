import { account } from './appwrite';

const FN_ID       = '69a9b6a5003ae8c2400e';
const FN_ENDPOINT = `https://fra.cloud.appwrite.io/v1/functions/${FN_ID}/executions`;

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

// ── CORE CALLERS ─────────────────────────────────────────

// Authenticated call — requires active session (JWT)
async function call(domain, action, payload = {}) {
  let jwt;
  try {
    const token = await account.createJWT();
    jwt = token.jwt;
  } catch {
    throw new Error('No active session. Please log in.');
  }
  return _execute(domain, action, payload, jwt);
}

// Unauthenticated call — for login/register flows before session exists
// Uses Appwrite's guest execution (no JWT), fn-echo handles these without auth check
async function callGuest(domain, action, payload = {}) {
  console.log('[callGuest] calling', domain, action, payload);
  return _execute(domain, action, payload, null);
}

async function _execute(domain, action, payload, jwt) {
  const headers = {
    'Content-Type':       'application/json',
    'x-appwrite-project': import.meta.env.VITE_APPWRITE_PROJECT_ID,
  };
  if (jwt) headers['x-appwrite-user-jwt'] = jwt;

  let response;
  try {
    // Appwrite function execution API expects { body, async, path, method, headers }
    response = await fetch(FN_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        body:   JSON.stringify({ domain, action, payload }),
        async:  false,
        path:   '/',
        method: 'POST',
      }),
    });
  } catch (e) {
    throw new Error('Could not reach server function. Check your connection.');
  }

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED: Function execution not permitted.');
  }

  // Appwrite returns execution object — responseBody contains our JSON
  let execution;
  try {
    execution = await response.json();
  } catch {
    throw new Error('Empty response from server function.');
  }

  // responseBody is a string we need to parse
  const raw = execution.responseBody ?? execution.response ?? '';
  if (!raw) throw new Error('Empty response body from server function.');

  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON from server function: ' + raw.slice(0, 100));
  }

  if (!result.success) {
    throw new Error(result.error || 'Server error.');
  }

  return result.data;
}

// ── USERS ─────────────────────────────────────────────────
export async function createUserProfile(userId, name, email) {
  return call('users', 'createProfile', { name, email });
}

export async function getUserProfile() {
  return call('users', 'getProfile');
}

export async function updateUserProfile(name) {
  return call('users', 'updateProfile', { name });
}

export async function setVerified() {
  return call('users', 'setVerified');
}

export async function getAllUsers() {
  return call('users', 'getAllUsers');
}

export async function getUserByEmail(email) {
  return callGuest('users', 'getUserByEmail', { email });
}

// ── SUBMISSIONS ───────────────────────────────────────────
export async function createSubmission(userId, { items, binId, groupId }) {
  return call('submissions', 'create', { items, binId, groupId });
}

export async function getUserSubmissions() {
  return call('submissions', 'getMySubmissions');
}

export async function getAllSubmissions() {
  return call('submissions', 'getAll');
}

export async function updateSubmissionStatus(submissionId, newStatus) {
  return call('submissions', 'updateStatus', { submissionId, newStatus });
}

export async function deleteSubmission(submissionId) {
  return call('submissions', 'delete', { submissionId });
}

// ── REWARDS ───────────────────────────────────────────────
export async function getAvailableRewards() {
  return call('rewards', 'getAvailable');
}

export async function getAllRewards() {
  return call('rewards', 'getAll');
}

export async function createReward(data) {
  return call('rewards', 'create', data);
}

export async function updateReward(rewardId, data) {
  return call('rewards', 'update', { rewardId, data });
}

export async function deleteReward(rewardId) {
  return call('rewards', 'delete', { rewardId });
}

// ── COUPON CODES ──────────────────────────────────────────
export async function addCouponCodesToReward(rewardId, codes) {
  return call('coupons', 'addCodes', { rewardId, codes });
}

export async function getCouponCodesForReward(rewardId) {
  return call('coupons', 'getCodes', { rewardId });
}

export async function getAvailableCodeCount(rewardId) {
  const res = await call('coupons', 'getCount', { rewardId });
  return res.count;
}

export async function getAvailableCodeCounts(rewardIds) {
  return call('coupons', 'getCounts', { rewardIds });
}

export async function deleteCouponCode(codeId) {
  return call('coupons', 'deleteCode', { codeId });
}

// ── REDEMPTIONS ───────────────────────────────────────────
export async function redeemReward(userId, rewardId, pointsCost) {
  return call('redemptions', 'redeem', { rewardId, pointsCost });
}

export async function getUserRedemptions() {
  return call('redemptions', 'getMyRedemptions');
}

// ── GROUPS ────────────────────────────────────────────────
export async function createGroup(name) {
  return call('groups', 'create', { name });
}

export async function getGroup(groupId) {
  return call('groups', 'get', { groupId });
}

export async function getGroups(groupIds) {
  return call('groups', 'getMultiple', { groupIds });
}

export async function getGroupLeaderboard() {
  return call('groups', 'leaderboard');
}

export async function leaveGroup(userId, groupId) {
  return call('groups', 'leave', { groupId });
}

export async function sendInvite(groupId, email, invitedBy, inviterName, inviterEmail) {
  return call('groups', 'sendInvite', { groupId, email, inviterName, inviterEmail });
}

export async function getPendingInvites(email) {
  return call('groups', 'getPendingInvites', { email });
}

export async function acceptInvite(inviteId, userId, groupId) {
  return call('groups', 'acceptInvite', { inviteId, groupId });
}

export async function declineInvite(inviteId) {
  return call('groups', 'declineInvite', { inviteId });
}
