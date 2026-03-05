import { account } from './appwrite';

const FN_ENDPOINT = `https://fra.cloud.appwrite.io/v1/functions/69a9b6a5003ae8c2400e/executions`;

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
// Gets the current user's JWT and calls fn-echo with domain + action + payload.
async function call(domain, action, payload = {}) {
  // Get a short-lived JWT for this request
  const jwt = await account.createJWT();

  const response = await fetch(FN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-appwrite-project':    import.meta.env.VITE_APPWRITE_PROJECT_ID,
      'x-appwrite-user-jwt':   jwt.jwt,
    },
    body: JSON.stringify({ domain, action, payload }),
  });

  const execution = await response.json();

  // Appwrite wraps function output in responseBody
  let result;
  try {
    result = JSON.parse(execution.responseBody ?? execution.response ?? '{}');
  } catch {
    throw new Error('Invalid response from server function.');
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
  return call('users', 'getUserByEmail', { email });
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
