import { Client, Databases, Users, Teams, ID, Query } from 'node-appwrite';

// ── INIT ──────────────────────────────────────────────────
const ENDPOINT   = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = process.env.APPWRITE_DB_ID;
const ADMIN_TEAM = process.env.ADMIN_TEAM_ID;

const COLLECTIONS = {
  USERS:        'users',
  SUBMISSIONS:  'submissions',
  REWARDS:      'rewards',
  COUPON_CODES: 'coupon_codes',
  REDEMPTIONS:  'redemptions',
  GROUPS:       'groups',
  INVITES:      'invites',
};

const ITEM_POINTS = {
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

// ── SERVER CLIENT (full API key access) ───────────────────
function getServerClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
  return client;
}

// ── USER CLIENT (scoped to caller's JWT) ─────────────────
function getUserClient(jwt) {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setJWT(jwt);
  return client;
}

// ── AUTH HELPERS ──────────────────────────────────────────
async function getCallerUserId(jwt) {
  const client    = getUserClient(jwt);
  const databases = new Databases(client);
  // Use the user-scoped client to get account — if JWT is invalid this throws
  const { Account } = await import('node-appwrite');
  const account = new Account(client);
  const user    = await account.get();
  return user.$id;
}

async function isAdmin(userId) {
  try {
    const client = getServerClient();
    const teams  = new Teams(client);
    const list   = await teams.listMemberships(ADMIN_TEAM);
    return list.memberships.some(m => m.userId === userId && m.confirm === true);
  } catch {
    return false;
  }
}

async function requireAdmin(userId) {
  const admin = await isAdmin(userId);
  if (!admin) throw new Error('UNAUTHORIZED: Admin access required.');
}

// ── BAG CODE ──────────────────────────────────────────────
function generateBagCode(userId, itemCount, totalPoints) {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seed  = `${userId}-${itemCount}-${totalPoints}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  let code = '';
  let entropy = Math.abs(hash);
  for (let i = 0; i < 16; i++) {
    entropy = (entropy * 1664525 + 1013904223) | 0;
    const idx = (Math.abs(entropy) + Math.floor(Math.random() * CHARS.length)) % CHARS.length;
    code += CHARS[idx];
    if (i === 3 || i === 7 || i === 11) code += '-';
  }
  return `ECHO-${code}`;
}

// ── HANDLERS ──────────────────────────────────────────────

// USERS
async function handleUsers(action, payload, userId) {
  const db     = new Databases(getServerClient());
  const users  = new Users(getServerClient());

  switch (action) {

    case 'createProfile': {
      const { name, email } = payload;
      // Check if profile already exists
      try {
        const existing = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
        return existing;
      } catch {}
      return db.createDocument(DB_ID, COLLECTIONS.USERS, userId, {
        userId,
        name,
        email,
        points:        0,
        totalDeposits: 0,
        isVerified:    false,
        isAdmin:       false,
        createdAt:     new Date().toISOString(),
      });
    }

    case 'getProfile': {
      return db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
    }

    case 'updateProfile': {
      const { name } = payload;
      return db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, { name });
    }

    case 'setVerified': {
      return db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, { isVerified: true });
    }

    case 'getAllUsers': {
      await requireAdmin(userId);
      return db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
    }

    case 'getUserByEmail': {
      const { email } = payload;
      return db.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal('email', email),
        Query.limit(1),
      ]);
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// SUBMISSIONS
async function handleSubmissions(action, payload, userId) {
  const db = new Databases(getServerClient());

  switch (action) {

    case 'create': {
      const { items, binId, groupId } = payload;
      const totalPoints = items.reduce((sum, item) =>
        sum + (ITEM_POINTS[item.itemType] || 10) * item.quantity, 0);
      const bagCode = generateBagCode(userId, items.length, totalPoints);
      return db.createDocument(DB_ID, COLLECTIONS.SUBMISSIONS, ID.unique(), {
        userId,
        items:       JSON.stringify(items),
        totalPoints,
        binId,
        groupId:     groupId || null,
        status:      'pending',
        bagCode,
        submittedAt: new Date().toISOString(),
      });
    }

    case 'getMySubmissions': {
      return db.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
        Query.equal('userId', userId),
        Query.orderDesc('submittedAt'),
        Query.limit(100),
      ]);
    }

    case 'getAll': {
      await requireAdmin(userId);
      return db.listDocuments(DB_ID, COLLECTIONS.SUBMISSIONS, [
        Query.orderDesc('submittedAt'),
        Query.limit(100),
      ]);
    }

    case 'updateStatus': {
      await requireAdmin(userId);
      const { submissionId, newStatus } = payload;
      const submission = await db.getDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);
      const oldStatus  = submission.status;
      if (oldStatus === newStatus) return submission;

      await db.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId, { status: newStatus });

      const { userId: ownerId, totalPoints, groupId } = submission;
      const profile = await db.getDocument(DB_ID, COLLECTIONS.USERS, ownerId);

      if (newStatus === 'verified') {
        await db.updateDocument(DB_ID, COLLECTIONS.USERS, ownerId, {
          points:        profile.points + totalPoints,
          totalDeposits: profile.totalDeposits + 1,
        });
        if (groupId) {
          const group = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
          await db.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
            totalPoints: group.totalPoints + totalPoints,
          });
        }
      }
      if (oldStatus === 'verified' && newStatus !== 'verified') {
        await db.updateDocument(DB_ID, COLLECTIONS.USERS, ownerId, {
          points:        Math.max(0, profile.points - totalPoints),
          totalDeposits: Math.max(0, profile.totalDeposits - 1),
        });
        if (groupId) {
          const group = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
          await db.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
            totalPoints: Math.max(0, group.totalPoints - totalPoints),
          });
        }
      }
      return { success: true };
    }

    case 'delete': {
      const { submissionId } = payload;
      const submission = await db.getDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);
      // Only owner or admin can delete
      const admin = await isAdmin(userId);
      if (submission.userId !== userId && !admin) throw new Error('UNAUTHORIZED');

      if (submission.status === 'verified') {
        const profile = await db.getDocument(DB_ID, COLLECTIONS.USERS, submission.userId);
        await db.updateDocument(DB_ID, COLLECTIONS.USERS, submission.userId, {
          points:        Math.max(0, profile.points - submission.totalPoints),
          totalDeposits: Math.max(0, profile.totalDeposits - 1),
        });
        if (submission.groupId) {
          const group = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, submission.groupId);
          await db.updateDocument(DB_ID, COLLECTIONS.GROUPS, submission.groupId, {
            totalPoints: Math.max(0, group.totalPoints - submission.totalPoints),
          });
        }
      }
      await db.deleteDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submissionId);
      return { success: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// REWARDS
async function handleRewards(action, payload, userId) {
  const db = new Databases(getServerClient());

  switch (action) {

    case 'getAvailable': {
      return db.listDocuments(DB_ID, COLLECTIONS.REWARDS, [
        Query.equal('available', true),
      ]);
    }

    case 'getAll': {
      await requireAdmin(userId);
      return db.listDocuments(DB_ID, COLLECTIONS.REWARDS, [Query.limit(100)]);
    }

    case 'create': {
      await requireAdmin(userId);
      const { title, description, pointsCost, partner, brandName, logoUrl } = payload;
      return db.createDocument(DB_ID, COLLECTIONS.REWARDS, ID.unique(), {
        title, description, pointsCost, partner, brandName,
        logoUrl: logoUrl || null,
        available: true,
      });
    }

    case 'update': {
      await requireAdmin(userId);
      const { rewardId, data } = payload;
      return db.updateDocument(DB_ID, COLLECTIONS.REWARDS, rewardId, data);
    }

    case 'delete': {
      await requireAdmin(userId);
      const { rewardId } = payload;
      // Cascade delete coupon codes
      const codes = await db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
        Query.equal('rewardId', rewardId),
        Query.limit(500),
      ]);
      await Promise.all(codes.documents.map(c =>
        db.deleteDocument(DB_ID, COLLECTIONS.COUPON_CODES, c.$id)
      ));
      await db.deleteDocument(DB_ID, COLLECTIONS.REWARDS, rewardId);
      return { success: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// COUPONS
async function handleCoupons(action, payload, userId) {
  const db = new Databases(getServerClient());

  switch (action) {

    case 'addCodes': {
      await requireAdmin(userId);
      const { rewardId, codes } = payload;
      const creates = codes
        .map(c => c.trim())
        .filter(c => c !== '')
        .map(code => db.createDocument(DB_ID, COLLECTIONS.COUPON_CODES, ID.unique(), {
          rewardId, code, isUsed: false, usedBy: null, usedAt: null,
        }));
      return Promise.all(creates);
    }

    case 'getCodes': {
      await requireAdmin(userId);
      const { rewardId } = payload;
      return db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
        Query.equal('rewardId', rewardId),
        Query.limit(500),
      ]);
    }

    case 'getCount': {
      const { rewardId } = payload;
      const res = await db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
        Query.equal('rewardId', rewardId),
        Query.equal('isUsed', false),
        Query.limit(1),
      ]);
      return { count: res.total };
    }

    case 'getCounts': {
      const { rewardIds } = payload;
      const counts = await Promise.all(rewardIds.map(async id => {
        const res = await db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
          Query.equal('rewardId', id),
          Query.equal('isUsed', false),
          Query.limit(1),
        ]);
        return { id, count: res.total };
      }));
      const map = {};
      counts.forEach(({ id, count }) => { map[id] = count; });
      return map;
    }

    case 'deleteCode': {
      await requireAdmin(userId);
      const { codeId } = payload;
      await db.deleteDocument(DB_ID, COLLECTIONS.COUPON_CODES, codeId);
      return { success: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// REDEMPTIONS
async function handleRedemptions(action, payload, userId) {
  const db = new Databases(getServerClient());

  switch (action) {

    case 'redeem': {
      const { rewardId, pointsCost } = payload;
      const profile = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      if (profile.points < pointsCost) {
        throw new Error('Not enough eco-points to redeem this reward.');
      }
      const available = await db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
        Query.equal('rewardId', rewardId),
        Query.equal('isUsed', false),
        Query.limit(1),
      ]);
      if (available.documents.length === 0) {
        throw new Error('No coupon codes left for this reward. Check back later!');
      }
      const codeDoc    = available.documents[0];
      const couponCode = codeDoc.code;
      const now        = new Date().toISOString();

      await db.updateDocument(DB_ID, COLLECTIONS.COUPON_CODES, codeDoc.$id, {
        isUsed: true, usedBy: userId, usedAt: now,
      });

      // Check remaining — auto-deactivate if empty
      const remaining = await db.listDocuments(DB_ID, COLLECTIONS.COUPON_CODES, [
        Query.equal('rewardId', rewardId),
        Query.equal('isUsed', false),
        Query.limit(1),
      ]);
      if (remaining.total === 0) {
        await db.updateDocument(DB_ID, COLLECTIONS.REWARDS, rewardId, { available: false });
      }

      const redemption = await db.createDocument(DB_ID, COLLECTIONS.REDEMPTIONS, ID.unique(), {
        userId, rewardId, pointsSpent: pointsCost, couponCode, redeemedAt: now,
      });

      await db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        points: profile.points - pointsCost,
      });

      return redemption;
    }

    case 'getMyRedemptions': {
      return db.listDocuments(DB_ID, COLLECTIONS.REDEMPTIONS, [
        Query.equal('userId', userId),
        Query.orderDesc('redeemedAt'),
      ]);
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// GROUPS
async function handleGroups(action, payload, userId) {
  const db = new Databases(getServerClient());

  switch (action) {

    case 'create': {
      const { name } = payload;
      const group = await db.createDocument(DB_ID, COLLECTIONS.GROUPS, ID.unique(), {
        name,
        createdBy:   userId,
        memberIds:   JSON.stringify([userId]),
        totalPoints: 0,
        createdAt:   new Date().toISOString(),
      });
      const profile = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      const existing = profile.groupIds || [];
      await db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
        groupIds: [...existing, group.$id],
      });
      return group;
    }

    case 'get': {
      const { groupId } = payload;
      return db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
    }

    case 'getMultiple': {
      const { groupIds } = payload;
      if (!groupIds || groupIds.length === 0) return [];
      const results = await Promise.all(
        groupIds.map(id => db.getDocument(DB_ID, COLLECTIONS.GROUPS, id).catch(() => null))
      );
      return results.filter(Boolean);
    }

    case 'leaderboard': {
      return db.listDocuments(DB_ID, COLLECTIONS.GROUPS, [
        Query.orderDesc('totalPoints'),
        Query.limit(100),
      ]);
    }

    case 'leave': {
      const { groupId } = payload;
      const group   = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || '[]').filter(id => id !== userId);
      await db.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
        memberIds: JSON.stringify(members),
      });
      const profile  = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      const groupIds = (profile.groupIds || []).filter(id => id !== groupId);
      await db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, { groupIds });
      if (members.length === 0) {
        const pending = await db.listDocuments(DB_ID, COLLECTIONS.INVITES, [
          Query.equal('groupId', groupId),
          Query.equal('status', 'pending'),
        ]);
        await Promise.all(pending.documents.map(inv =>
          db.deleteDocument(DB_ID, COLLECTIONS.INVITES, inv.$id)
        ));
        await db.deleteDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      }
      return { success: true };
    }

    case 'sendInvite': {
      const { groupId, email, inviterName, inviterEmail } = payload;
      const existing = await db.listDocuments(DB_ID, COLLECTIONS.INVITES, [
        Query.equal('email', email),
        Query.equal('groupId', groupId),
        Query.equal('status', 'pending'),
      ]);
      if (existing.documents.length > 0) {
        throw new Error('An invite has already been sent to this email.');
      }
      const group = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      return db.createDocument(DB_ID, COLLECTIONS.INVITES, ID.unique(), {
        groupId,
        groupName:    group.name,
        email,
        invitedBy:    userId,
        inviterName:  inviterName  || 'A member',
        inviterEmail: inviterEmail || '',
        status:       'pending',
        createdAt:    new Date().toISOString(),
      });
    }

    case 'getPendingInvites': {
      const { email } = payload;
      return db.listDocuments(DB_ID, COLLECTIONS.INVITES, [
        Query.equal('email', email),
        Query.equal('status', 'pending'),
      ]);
    }

    case 'acceptInvite': {
      const { inviteId, groupId } = payload;
      const group   = await db.getDocument(DB_ID, COLLECTIONS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || '[]');
      if (!members.includes(userId)) members.push(userId);
      await db.updateDocument(DB_ID, COLLECTIONS.GROUPS, groupId, {
        memberIds: JSON.stringify(members),
      });
      const profile  = await db.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      const groupIds = profile.groupIds || [];
      if (!groupIds.includes(groupId)) {
        await db.updateDocument(DB_ID, COLLECTIONS.USERS, userId, {
          groupIds: [...groupIds, groupId],
        });
      }
      await db.updateDocument(DB_ID, COLLECTIONS.INVITES, inviteId, { status: 'accepted' });
      return { success: true };
    }

    case 'declineInvite': {
      const { inviteId } = payload;
      await db.updateDocument(DB_ID, COLLECTIONS.INVITES, inviteId, { status: 'declined' });
      return { success: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Actions that don't require an authenticated session
const GUEST_ACTIONS = new Set([
  'users:getUserByEmail',
]);

// ── MAIN ENTRY POINT ──────────────────────────────────────
export default async ({ req, res, log, error }) => {
  try {
    // Appwrite passes body as string — parse safely
    let body;
    try {
      body = typeof req.body === 'string'
        ? (req.body.trim() === '' ? {} : JSON.parse(req.body))
        : (req.body ?? {});
    } catch (parseErr) {
      return res.json({ success: false, error: 'Invalid request body: ' + parseErr.message }, 400);
    }

    const { domain, action, payload = {} } = body;

    log(`[fn-echo] received domain=${domain} action=${action} bodyKeys=${Object.keys(body).join(',')}`);

    if (!domain || !action) {
      return res.json({ success: false, error: `Missing domain or action. Got: ${JSON.stringify(body).slice(0, 200)}` }, 400);
    }

    const actionKey = `${domain}:${action}`;
    const isGuest   = GUEST_ACTIONS.has(actionKey);

    // Resolve userId — skip for guest actions
    let userId = null;
    const jwt = req.headers['x-appwrite-user-jwt'];

    if (!isGuest) {
      if (!jwt || jwt.trim() === '') throw new Error('UNAUTHORIZED: Missing JWT.');
      try {
        const client  = getUserClient(jwt);
        const { Account } = await import('node-appwrite');
        const account = new Account(client);
        const caller  = await account.get();
        userId = caller.$id;
      } catch (e) {
        throw new Error('UNAUTHORIZED: Invalid or expired session. Please log in again.');
      }
    }

    // For guest actions, log what we received for debugging
    if (isGuest) {
      log(`[fn-echo] guest action: ${actionKey} jwt=${jwt ? 'present' : 'absent'}`);
    }

    log(`[fn-echo] domain=${domain} action=${action} userId=${userId ?? 'guest'}`);

    let result;
    switch (domain) {
      case 'users':       result = await handleUsers(action, payload, userId);       break;
      case 'submissions': result = await handleSubmissions(action, payload, userId); break;
      case 'rewards':     result = await handleRewards(action, payload, userId);     break;
      case 'coupons':     result = await handleCoupons(action, payload, userId);     break;
      case 'redemptions': result = await handleRedemptions(action, payload, userId); break;
      case 'groups':      result = await handleGroups(action, payload, userId);      break;
      default:            throw new Error(`Unknown domain: ${domain}`);
    }

    return res.json({ success: true, data: result });

  } catch (err) {
    error(`[fn-echo] ${err.message}`);
    const isUnauth = err.message?.startsWith('UNAUTHORIZED');
    return res.json(
      { success: false, error: err.message },
      isUnauth ? 403 : 500,
    );
  }
};
