import { Client, Databases, Users, Teams, Account, ID, Query } from 'node-appwrite';

// ── ENV ───────────────────────────────────────────────────
const ENDPOINT   = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = process.env.APPWRITE_DB_ID;
const ADMIN_TEAM = process.env.ADMIN_TEAM_ID;

const COLS = {
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

// ── CLIENTS ───────────────────────────────────────────────
// Server client — full API key access for all DB operations
function serverClient() {
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
}

// User client — scoped to the caller's session via JWT
function userClient(jwt) {
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setJWT(jwt);
}

const db = () => new Databases(serverClient());

// ── AUTH HELPERS ──────────────────────────────────────────
async function getUserId(jwt) {
  const client  = userClient(jwt);
  const account = new Account(client);
  const user    = await account.get();
  return user.$id;
}

async function isAdmin(userId) {
  try {
    const teams = new Teams(serverClient());
    const list  = await teams.listMemberships(ADMIN_TEAM);
    return list.memberships.some(m => m.userId === userId && m.confirm === true);
  } catch {
    return false;
  }
}

async function requireAdmin(userId) {
  if (!(await isAdmin(userId))) {
    throw new Error('UNAUTHORIZED: Admin access required.');
  }
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
    code += CHARS[(Math.abs(entropy) + Math.floor(Math.random() * CHARS.length)) % CHARS.length];
    if (i === 3 || i === 7 || i === 11) code += '-';
  }
  return `ECHO-${code}`;
}

// ── DOMAIN HANDLERS ───────────────────────────────────────

async function handleUsers(action, payload, userId) {
  switch (action) {

    case 'createProfile': {
      const { name, email } = payload;
      try { return await db().getDocument(DB_ID, COLS.USERS, userId); } catch {}
      return db().createDocument(DB_ID, COLS.USERS, userId, {
        userId, name, email,
        points: 0, totalDeposits: 0,
        isVerified: false, isAdmin: false,
        createdAt: new Date().toISOString(),
      });
    }

    case 'getProfile':
      return db().getDocument(DB_ID, COLS.USERS, userId);

    case 'updateProfile':
      return db().updateDocument(DB_ID, COLS.USERS, userId, { name: payload.name });

    case 'setVerified':
      return db().updateDocument(DB_ID, COLS.USERS, userId, { isVerified: true });

    case 'getAllUsers':
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.USERS, [
        Query.orderDesc('$createdAt'), Query.limit(100),
      ]);

    case 'getUserByEmail':
      // No auth required — used during login before session exists
      return db().listDocuments(DB_ID, COLS.USERS, [
        Query.equal('email', payload.email), Query.limit(1),
      ]);

    default: throw new Error(`Unknown action: users.${action}`);
  }
}

async function handleSubmissions(action, payload, userId) {
  switch (action) {

    case 'create': {
      const { items, binId, groupId } = payload;
      const totalPoints = items.reduce((s, i) =>
        s + (ITEM_POINTS[i.itemType] || 10) * i.quantity, 0);
      const bagCode = generateBagCode(userId, items.length, totalPoints);
      return db().createDocument(DB_ID, COLS.SUBMISSIONS, ID.unique(), {
        userId, items: JSON.stringify(items), totalPoints, binId,
        groupId: groupId || null, status: 'pending', bagCode,
        submittedAt: new Date().toISOString(),
      });
    }

    case 'getMySubmissions':
      return db().listDocuments(DB_ID, COLS.SUBMISSIONS, [
        Query.equal('userId', userId), Query.orderDesc('submittedAt'), Query.limit(100),
      ]);

    case 'getAll':
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.SUBMISSIONS, [
        Query.orderDesc('submittedAt'), Query.limit(100),
      ]);

    case 'updateStatus': {
      await requireAdmin(userId);
      const { submissionId, newStatus } = payload;
      const sub      = await db().getDocument(DB_ID, COLS.SUBMISSIONS, submissionId);
      const oldStatus = sub.status;
      if (oldStatus === newStatus) return sub;

      await db().updateDocument(DB_ID, COLS.SUBMISSIONS, submissionId, { status: newStatus });

      const profile = await db().getDocument(DB_ID, COLS.USERS, sub.userId);

      if (newStatus === 'verified') {
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points:        profile.points + sub.totalPoints,
          totalDeposits: profile.totalDeposits + 1,
        });
        if (sub.groupId) {
          const grp = await db().getDocument(DB_ID, COLS.GROUPS, sub.groupId);
          await db().updateDocument(DB_ID, COLS.GROUPS, sub.groupId, {
            totalPoints: grp.totalPoints + sub.totalPoints,
          });
        }
      }
      if (oldStatus === 'verified' && newStatus !== 'verified') {
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points:        Math.max(0, profile.points - sub.totalPoints),
          totalDeposits: Math.max(0, profile.totalDeposits - 1),
        });
        if (sub.groupId) {
          const grp = await db().getDocument(DB_ID, COLS.GROUPS, sub.groupId);
          await db().updateDocument(DB_ID, COLS.GROUPS, sub.groupId, {
            totalPoints: Math.max(0, grp.totalPoints - sub.totalPoints),
          });
        }
      }
      return { success: true };
    }

    case 'delete': {
      const { submissionId } = payload;
      const sub   = await db().getDocument(DB_ID, COLS.SUBMISSIONS, submissionId);
      const admin = await isAdmin(userId);
      if (sub.userId !== userId && !admin) throw new Error('UNAUTHORIZED');

      if (sub.status === 'verified') {
        const profile = await db().getDocument(DB_ID, COLS.USERS, sub.userId);
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points:        Math.max(0, profile.points - sub.totalPoints),
          totalDeposits: Math.max(0, profile.totalDeposits - 1),
        });
        if (sub.groupId) {
          const grp = await db().getDocument(DB_ID, COLS.GROUPS, sub.groupId);
          await db().updateDocument(DB_ID, COLS.GROUPS, sub.groupId, {
            totalPoints: Math.max(0, grp.totalPoints - sub.totalPoints),
          });
        }
      }
      await db().deleteDocument(DB_ID, COLS.SUBMISSIONS, submissionId);
      return { success: true };
    }

    default: throw new Error(`Unknown action: submissions.${action}`);
  }
}

async function handleRewards(action, payload, userId) {
  switch (action) {

    case 'getAvailable':
      return db().listDocuments(DB_ID, COLS.REWARDS, [Query.equal('available', true)]);

    case 'getAll':
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.REWARDS, [Query.limit(100)]);

    case 'create':
      await requireAdmin(userId);
      return db().createDocument(DB_ID, COLS.REWARDS, ID.unique(), {
        title:       payload.title,
        description: payload.description,
        pointsCost:  payload.pointsCost,
        partner:     payload.partner,
        brandName:   payload.brandName,
        logoUrl:     payload.logoUrl || null,
        available:   true,
      });

    case 'update':
      await requireAdmin(userId);
      return db().updateDocument(DB_ID, COLS.REWARDS, payload.rewardId, payload.data);

    case 'delete': {
      await requireAdmin(userId);
      const codes = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal('rewardId', payload.rewardId), Query.limit(500),
      ]);
      await Promise.all(codes.documents.map(c =>
        db().deleteDocument(DB_ID, COLS.COUPON_CODES, c.$id)
      ));
      await db().deleteDocument(DB_ID, COLS.REWARDS, payload.rewardId);
      return { success: true };
    }

    default: throw new Error(`Unknown action: rewards.${action}`);
  }
}

async function handleCoupons(action, payload, userId) {
  switch (action) {

    case 'addCodes': {
      await requireAdmin(userId);
      const { rewardId, codes } = payload;
      const creates = codes
        .map(c => c.trim()).filter(c => c !== '')
        .map(code => db().createDocument(DB_ID, COLS.COUPON_CODES, ID.unique(), {
          rewardId, code, isUsed: false, usedBy: null, usedAt: null,
        }));
      return Promise.all(creates);
    }

    case 'getCodes':
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal('rewardId', payload.rewardId), Query.limit(500),
      ]);

    case 'getCount': {
      const res = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal('rewardId', payload.rewardId),
        Query.equal('isUsed', false),
        Query.limit(1),
      ]);
      return { count: res.total };
    }

    case 'getCounts': {
      const counts = await Promise.all(payload.rewardIds.map(async id => {
        const res = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
          Query.equal('rewardId', id), Query.equal('isUsed', false), Query.limit(1),
        ]);
        return { id, count: res.total };
      }));
      const map = {};
      counts.forEach(({ id, count }) => { map[id] = count; });
      return map;
    }

    case 'deleteCode':
      await requireAdmin(userId);
      await db().deleteDocument(DB_ID, COLS.COUPON_CODES, payload.codeId);
      return { success: true };

    default: throw new Error(`Unknown action: coupons.${action}`);
  }
}

async function handleRedemptions(action, payload, userId) {
  switch (action) {

    case 'redeem': {
      const { rewardId, pointsCost } = payload;
      const profile = await db().getDocument(DB_ID, COLS.USERS, userId);
      if (profile.points < pointsCost) throw new Error('Not enough eco-points.');

      const avail = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal('rewardId', rewardId), Query.equal('isUsed', false), Query.limit(1),
      ]);
      if (avail.documents.length === 0) throw new Error('No coupon codes left for this reward.');

      const codeDoc = avail.documents[0];
      const now     = new Date().toISOString();

      await db().updateDocument(DB_ID, COLS.COUPON_CODES, codeDoc.$id, {
        isUsed: true, usedBy: userId, usedAt: now,
      });

      const remaining = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal('rewardId', rewardId), Query.equal('isUsed', false), Query.limit(1),
      ]);
      if (remaining.total === 0) {
        await db().updateDocument(DB_ID, COLS.REWARDS, rewardId, { available: false });
      }

      const redemption = await db().createDocument(DB_ID, COLS.REDEMPTIONS, ID.unique(), {
        userId, rewardId, pointsSpent: pointsCost,
        couponCode: codeDoc.code, redeemedAt: now,
      });

      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        points: profile.points - pointsCost,
      });

      return redemption;
    }

    case 'getMyRedemptions':
      return db().listDocuments(DB_ID, COLS.REDEMPTIONS, [
        Query.equal('userId', userId), Query.orderDesc('redeemedAt'),
      ]);

    default: throw new Error(`Unknown action: redemptions.${action}`);
  }
}

async function handleGroups(action, payload, userId) {
  switch (action) {

    case 'create': {
      const group = await db().createDocument(DB_ID, COLS.GROUPS, ID.unique(), {
        name: payload.name, createdBy: userId,
        memberIds: JSON.stringify([userId]),
        totalPoints: 0, createdAt: new Date().toISOString(),
      });
      const profile = await db().getDocument(DB_ID, COLS.USERS, userId);
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        groupIds: [...(profile.groupIds || []), group.$id],
      });
      return group;
    }

    case 'get':
      return db().getDocument(DB_ID, COLS.GROUPS, payload.groupId);

    case 'getMultiple': {
      if (!payload.groupIds?.length) return [];
      const results = await Promise.all(
        payload.groupIds.map(id => db().getDocument(DB_ID, COLS.GROUPS, id).catch(() => null))
      );
      return results.filter(Boolean);
    }

    case 'leaderboard':
      return db().listDocuments(DB_ID, COLS.GROUPS, [
        Query.orderDesc('totalPoints'), Query.limit(100),
      ]);

    case 'leave': {
      const { groupId } = payload;
      const group   = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || '[]').filter(id => id !== userId);
      await db().updateDocument(DB_ID, COLS.GROUPS, groupId, { memberIds: JSON.stringify(members) });
      const profile  = await db().getDocument(DB_ID, COLS.USERS, userId);
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        groupIds: (profile.groupIds || []).filter(id => id !== groupId),
      });
      if (members.length === 0) {
        const pending = await db().listDocuments(DB_ID, COLS.INVITES, [
          Query.equal('groupId', groupId), Query.equal('status', 'pending'),
        ]);
        await Promise.all(pending.documents.map(i =>
          db().deleteDocument(DB_ID, COLS.INVITES, i.$id)
        ));
        await db().deleteDocument(DB_ID, COLS.GROUPS, groupId);
      }
      return { success: true };
    }

    case 'sendInvite': {
      const { groupId, email, inviterName, inviterEmail } = payload;
      const existing = await db().listDocuments(DB_ID, COLS.INVITES, [
        Query.equal('email', email), Query.equal('groupId', groupId), Query.equal('status', 'pending'),
      ]);
      if (existing.documents.length > 0) throw new Error('Invite already sent to this email.');
      const group = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      return db().createDocument(DB_ID, COLS.INVITES, ID.unique(), {
        groupId, groupName: group.name, email, invitedBy: userId,
        inviterName: inviterName || 'A member',
        inviterEmail: inviterEmail || '',
        status: 'pending', createdAt: new Date().toISOString(),
      });
    }

    case 'getPendingInvites':
      return db().listDocuments(DB_ID, COLS.INVITES, [
        Query.equal('email', payload.email), Query.equal('status', 'pending'),
      ]);

    case 'acceptInvite': {
      const { inviteId, groupId } = payload;
      const group   = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || '[]');
      if (!members.includes(userId)) members.push(userId);
      await db().updateDocument(DB_ID, COLS.GROUPS, groupId, { memberIds: JSON.stringify(members) });
      const profile  = await db().getDocument(DB_ID, COLS.USERS, userId);
      const groupIds = profile.groupIds || [];
      if (!groupIds.includes(groupId)) {
        await db().updateDocument(DB_ID, COLS.USERS, userId, { groupIds: [...groupIds, groupId] });
      }
      await db().updateDocument(DB_ID, COLS.INVITES, inviteId, { status: 'accepted' });
      return { success: true };
    }

    case 'declineInvite':
      await db().updateDocument(DB_ID, COLS.INVITES, payload.inviteId, { status: 'declined' });
      return { success: true };

    default: throw new Error(`Unknown action: groups.${action}`);
  }
}

// ── ACTIONS THAT DON'T NEED A SESSION ────────────────────
const GUEST_ACTIONS = new Set(['users:getUserByEmail']);

// ── ENTRY POINT ───────────────────────────────────────────
export default async ({ req, res, log, error }) => {
  try {
    let body;
    try {
      body = typeof req.body === 'string'
        ? (req.body.trim() ? JSON.parse(req.body) : {})
        : (req.body ?? {});
    } catch (e) {
      return res.json({ success: false, error: 'Invalid request body: ' + e.message }, 400);
    }

    const { domain, action, payload = {} } = body;

    if (!domain || !action) {
      return res.json({ success: false, error: 'Missing domain or action.' }, 400);
    }

    const key     = `${domain}:${action}`;
    const isGuest = GUEST_ACTIONS.has(key);

    log(`[fn-echo] ${key} guest=${isGuest}`);

    // Resolve userId — required for all non-guest actions
    let userId = null;
    if (!isGuest) {
      const jwt = req.headers['x-appwrite-user-jwt'];
      if (!jwt || jwt.trim() === '') {
        return res.json({ success: false, error: 'UNAUTHORIZED: No session.' }, 401);
      }
      try {
        userId = await getUserId(jwt);
      } catch (e) {
        return res.json({ success: false, error: 'UNAUTHORIZED: Invalid session.' }, 401);
      }
    }

    log(`[fn-echo] userId=${userId ?? 'guest'}`);

    let result;
    switch (domain) {
      case 'users':       result = await handleUsers(action, payload, userId);       break;
      case 'submissions': result = await handleSubmissions(action, payload, userId); break;
      case 'rewards':     result = await handleRewards(action, payload, userId);     break;
      case 'coupons':     result = await handleCoupons(action, payload, userId);     break;
      case 'redemptions': result = await handleRedemptions(action, payload, userId); break;
      case 'groups':      result = await handleGroups(action, payload, userId);      break;
      default:            return res.json({ success: false, error: `Unknown domain: ${domain}` }, 400);
    }

    return res.json({ success: true, data: result });

  } catch (err) {
    error(`[fn-echo] ERROR: ${err.message}`);
    const status = err.message?.startsWith('UNAUTHORIZED') ? 403 : 500;
    return res.json({ success: false, error: err.message }, status);
  }
};
