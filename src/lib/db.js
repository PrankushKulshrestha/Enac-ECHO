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

// ── USER ─────────────────────────────────────────────────

export async function getUserProfile(userId) {
  return databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
}

export async function updateUserPoints(userId, pointsToAdd) {
  const profile = await getUserProfile(userId);
  return databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    points:        profile.points + pointsToAdd,
    totalDeposits: profile.totalDeposits + 1,
  });
}

// ── SUBMISSIONS ───────────────────────────────────────────

export async function createSubmission(userId, { items, binId, groupId }) {
  // Points are NOT awarded here — only after admin approves
  const totalPoints = items.reduce((sum, item) => {
    return sum + (ITEM_POINTS[item.itemType] || 10) * item.quantity;
  }, 0);

  return databases.createDocument(
    DB_ID, COLLECTIONS.SUBMISSIONS, ID.unique(), {
      userId,
      items:       JSON.stringify(items),
      totalPoints,
      binId,
      groupId:     groupId || null,
      status:      'pending',
      submittedAt: new Date().toISOString(),
    }
  );
}

export async function getUserSubmissions(userId) {
  return databases.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('userId', userId),
    Query.orderDesc('submittedAt'),
    Query.limit(100),
  ]);
}

export async function updateSubmissionStatus(submissionId, newStatus) {
  const submission = await databases.getDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);
  const oldStatus  = submission.status;

  // No-op if status hasn't changed
  if (oldStatus === newStatus) return;

  await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, {
    status: newStatus,
  });

  const { userId, totalPoints, groupId } = submission;

  // Award points when moving TO verified
  if (newStatus === 'verified') {
    const profile = await getUserProfile(userId);
    await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
      points:        profile.points + totalPoints,
      totalDeposits: profile.totalDeposits + 1,
    });
    if (groupId) {
      const group = await databases.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      await databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
        totalPoints: group.totalPoints + totalPoints,
      });
    }
  }

  // Claw back points when moving FROM verified to rejected/pending
  if (oldStatus === 'verified' && newStatus !== 'verified') {
    const profile = await getUserProfile(userId);
    await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
      points:        Math.max(0, profile.points - totalPoints),
      totalDeposits: Math.max(0, profile.totalDeposits - 1),
    });
    if (groupId) {
      const group = await databases.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      await databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
        totalPoints: Math.max(0, group.totalPoints - totalPoints),
      });
    }
  }
}

// ── REWARDS ───────────────────────────────────────────────

export async function getAvailableRewards() {
  return databases.listDocuments(DB_ID, COLLECTIONS.REWARDS, [
    Query.equal('available', true),
  ]);
}

export async function createReward(data) {
  return databases.createDocument(DB_ID, COLLECTIONS.REWARDS, ID.unique(), {
    title:       data.title,
    description: data.description,
    pointsCost:  data.pointsCost,
    partner:     data.partner,
    brandName:   data.brandName,
    logoUrl:     data.logoUrl || null,
    available:   true,
  });
}

export async function getAllRewards() {
  return databases.listDocuments(DB_ID, COLLECTIONS.REWARDS);
}

export async function updateReward(rewardId, data) {
  return databases.updateDocument(DB_ID, COLLECTIONS.REWARDS, rewardId, data);
}

// ── REDEMPTIONS ───────────────────────────────────────────

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

// ── GROUPS ────────────────────────────────────────────────

export async function createGroup(name, createdBy) {
  const group = await databases.createDocument(
    DB_ID, COLLECTIONS.GROUPS, ID.unique(), {
      name,
      createdBy,
      memberIds:   JSON.stringify([createdBy]),
      totalPoints: 0,
      createdAt:   new Date().toISOString(),
    }
  );
  const profile = await getUserProfile(createdBy);
  const existing = profile.groupIds || [];
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, createdBy, {
    groupIds: [...existing, group.$id],
  });
  return group;
}

export async function getGroup(groupId) {
  return databases.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
}

export async function getGroups(groupIds) {
  if (!groupIds || groupIds.length === 0) return [];
  const results = await Promise.all(groupIds.map(id => getGroup(id).catch(() => null)));
  return results.filter(Boolean);
}

export async function addPointsToGroup(groupId, points) {
  const group = await getGroup(groupId);
  return databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
    totalPoints: group.totalPoints + points,
  });
}

export async function getGroupLeaderboard() {
  return databases.listDocuments(DB_ID, COLLECTIONS.GROUPS, [
    Query.orderDesc('totalPoints'),
    Query.limit(100),
  ]);
}

export async function leaveGroup(userId, groupId) {
  const group = await getGroup(groupId);
  const members = JSON.parse(group.memberIds || '[]').filter(id => id !== userId);
  await databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
    memberIds: JSON.stringify(members),
  });

  const profile = await getUserProfile(userId);
  const groupIds = (profile.groupIds || []).filter(id => id !== groupId);
  await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
    groupIds,
  });

  if (members.length === 0) {
    const pendingInvites = await databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
      Query.equal('groupId', groupId),
      Query.equal('status', 'pending'),
    ]);
    await Promise.all(
      pendingInvites.documents.map(inv =>
        databases.deleteDocument(DB_ID, COLLECTIONS.INVITES, inv.$id)
      )
    );
    await databases.deleteDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
  }
}

// ── INVITES ───────────────────────────────────────────────

export async function sendInvite(groupId, email, invitedBy, inviterName, inviterEmail) {
  const existing = await databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
    Query.equal('email', email),
    Query.equal('groupId', groupId),
    Query.equal('status', 'pending'),
  ]);
  if (existing.documents.length > 0) {
    throw new Error('An invite has already been sent to this email.');
  }

  const group = await getGroup(groupId);

  return databases.createDocument(DB_ID, COLLECTIONS.INVITES, ID.unique(), {
    groupId,
    groupName:    group.name,
    email,
    invitedBy,
    inviterName:  inviterName  || 'A member',
    inviterEmail: inviterEmail || '',
    status:       'pending',
    createdAt:    new Date().toISOString(),
  });
}

export async function getPendingInvites(email) {
  return databases.listDocuments(DB_ID, COLLECTIONS.INVITES, [
    Query.equal('email', email),
    Query.equal('status', 'pending'),
  ]);
}

export async function acceptInvite(inviteId, userId, groupId) {
  const group = await getGroup(groupId);
  const members = JSON.parse(group.memberIds || '[]');
  if (!members.includes(userId)) members.push(userId);
  await databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
    memberIds: JSON.stringify(members),
  });

  const profile = await getUserProfile(userId);
  const groupIds = profile.groupIds || [];
  if (!groupIds.includes(groupId)) {
    await databases.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
      groupIds: [...groupIds, groupId],
    });
  }

  await databases.updateDocument(DB_ID, COLLECTIONS.INVITES, inviteId, {
    status: 'accepted',
  });
}

export async function declineInvite(inviteId) {
  return databases.updateDocument(DB_ID, COLLECTIONS.INVITES, inviteId, {
    status: 'declined',
  });
}

// ── ADMIN ─────────────────────────────────────────────────

export async function getAllUsers() {
  return databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
}

export async function getAllSubmissions() {
  return databases.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.orderDesc('submittedAt'),
    Query.limit(100),
  ]);
}

export async function deleteSubmission(submissionId) {
  // Fetch submission to check status before touching points
  const submission = await databases.getDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);

  // Only deduct points if submission was verified (points were awarded)
  if (submission.status === 'verified') {
    const profile = await getUserProfile(submission.userId);
    await databases.updateDocument(DB_ID, COLLECTIONS.USERS, submission.userId, {
      points:        Math.max(0, profile.points - submission.totalPoints),
      totalDeposits: Math.max(0, profile.totalDeposits - 1),
    });
    if (submission.groupId) {
      const group = await getGroup(submission.groupId);
      await databases.updateDocument(DB_ID, COLLECTIONS.GROUPS, submission.groupId, {
        totalPoints: Math.max(0, group.totalPoints - submission.totalPoints),
      });
    }
  }

  await databases.deleteDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);
}