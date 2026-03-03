import { databases, DB_ID, COLLECTIONS, ID, Query } from './appwrite';

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

export async function getUserProfile(userId) {
  return databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
}

export async function updateUserPoints(userId, pointsToAdd, depositsToAdd = 1) {
  const profile = await getUserProfile(userId);
  return databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    points:        profile.points + pointsToAdd,
    totalDeposits: profile.totalDeposits + depositsToAdd,
  });
}

export async function createSubmission(userId, { itemType, quantity, binId }) {
  const pointsEarned = (ITEM_POINTS[itemType] || 10) * quantity;
  const submission = await databases.createDocument(
    DB_ID, COLLECTIONS.SUBMISSIONS, ID.unique(), {
      userId,
      itemType,
      quantity,
      pointsEarned,
      binId,
      status:      'pending',
      submittedAt: new Date().toISOString(),
    }
  );
  await updateUserPoints(userId, pointsEarned, quantity);
  return submission;
}

export async function getUserSubmissions(userId) {
  return databases.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('userId', userId),
    Query.orderDesc('submittedAt'),
    Query.limit(20),
  ]);
}

export async function getAvailableRewards() {
  return databases.listDocuments(DB_ID, COLLECTIONS.REWARDS, [
    Query.equal('available', true),
  ]);
}

export async function redeemReward(userId, rewardId, pointsCost) {
  const profile = await getUserProfile(userId);
  if (profile.points < pointsCost) {
    throw new Error('Not enough eco-points to redeem this reward.');
  }
  const couponCode = `ECHO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const redemption = await databases.createDocument(
    DB_ID, COLLECTIONS.REDEMPTIONS, ID.unique(), {
      userId,
      rewardId,
      pointsSpent: pointsCost,
      couponCode,
      redeemedAt:  new Date().toISOString(),
    }
  );
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    points: profile.points - pointsCost,
  });
  return redemption;
}

export async function getUserRedemptions(userId) {
  return databases.listDocuments(DB_ID, COLLECTIONS.REDEMPTIONS, [
    Query.equal('userId', userId),
    Query.orderDesc('redeemedAt'),
  ]);
}