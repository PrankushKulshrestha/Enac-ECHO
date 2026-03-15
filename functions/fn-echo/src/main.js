import {
  Client,
  Databases,
  Users,
  Teams,
  Account,
  ID,
  Query,
} from "node-appwrite";

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DB_ID;
const ADMIN_TEAM = process.env.ADMIN_TEAM_ID;
const SUPERADMIN_TEAM = process.env.SUPERADMIN_TEAM_ID;

const COLS = {
  USERS: "users",
  SUBMISSIONS: "submissions",
  REWARDS: "rewards",
  COUPON_CODES: "coupon_codes",
  REDEMPTIONS: "redemptions",
  GROUPS: "groups",
  INVITES: "invites",
  GROUP_ACHIEVEMENTS: "group_achievements",
};

const MAX_GROUP_MEMBERS  = 4;
const BONUS_INTERVAL     = 100; // group credits per bonus trigger
const BONUS_PER_MEMBER   = 1;   // eco-points awarded per trigger
const STALE_DAYS         = 45;  // submission older than this = ineligible

const ITEM_POINTS = {
  "Mobile Phone": 50,
  Laptop: 150,
  Tablet: 100,
  "Charger / Cable": 10,
  Battery: 20,
  Earphones: 15,
  "Circuit Board": 30,
  "USB Drive": 10,
  "Keyboard / Mouse": 25,
  Other: 10,
};

function serverClient() {
  return new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
}

function userClient(jwt) {
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(jwt);
}

const db = () => new Databases(serverClient());
const teams = () => new Teams(serverClient());
const users = () => new Users(serverClient());

async function getUserId(req, bodyJwt) {
  const injectedId = req.headers["x-appwrite-user-id"];
  if (injectedId && injectedId.trim()) return injectedId.trim();
  const jwt = bodyJwt || req.headers["x-appwrite-user-jwt"];
  if (jwt && jwt.trim()) {
    const client = userClient(jwt.trim());
    const account = new Account(client);
    const user = await account.get();
    return user.$id;
  }
  throw new Error("UNAUTHORIZED: No session.");
}

async function getRole(userId) {
  try {
    const doc = await db().getDocument(DB_ID, COLS.USERS, userId);
    return doc.role || "user";
  } catch {
    return "user";
  }
}

async function requireAdmin(userId) {
  const role = await getRole(userId);
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("UNAUTHORIZED: Admin access required.");
  }
}

async function requireSuperAdmin(userId) {
  const role = await getRole(userId);
  if (role !== "superadmin") {
    throw new Error("UNAUTHORIZED: Superadmin access required.");
  }
}

async function syncTeams(userId, newRole) {
  const t = teams();
  for (const teamId of [ADMIN_TEAM, SUPERADMIN_TEAM]) {
    try {
      const memberships = await t.listMemberships(teamId, [
        Query.equal("userId", userId),
      ]);
      for (const m of memberships.memberships) {
        await t.deleteMembership(teamId, m.$id);
      }
    } catch {}
  }
  if (newRole === "admin") {
    try { await t.createMembership(ADMIN_TEAM, [], undefined, userId); } catch {}
  } else if (newRole === "superadmin") {
    try { await t.createMembership(SUPERADMIN_TEAM, [], undefined, userId); } catch {}
  }
}

function generateBagCode(userId, itemCount, totalPoints) {
  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seed = `${userId}-${itemCount}-${totalPoints}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  let code = "";
  let entropy = Math.abs(hash);
  for (let i = 0; i < 16; i++) {
    entropy = (entropy * 1664525 + 1013904223) | 0;
    code += CHARS[Math.abs(entropy) % CHARS.length];
    if (i === 3 || i === 7 || i === 11) code += "-";
  }
  return `ECHO-${code}`;
}

async function handleUsers(action, payload, userId) {
  switch (action) {
    case "resolveUser": {
      const { email } = payload;
      const existing = await db().listDocuments(DB_ID, COLS.USERS, [
        Query.equal("email", email),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        return { userId: existing.documents[0].$id };
      }
      return { userId: ID.unique() };
    }
    case "createProfile": {
      const { name, email, userId: explicitId } = payload;
      const docId = explicitId || userId;
      if (!docId) throw new Error("Cannot create profile: no userId available.");
      try { return await db().getDocument(DB_ID, COLS.USERS, docId); } catch {}
      return db().createDocument(DB_ID, COLS.USERS, docId, {
        userId: docId,
        name,
        email,
        points: 0,
        totalDeposits: 0,
        isVerified: false,
        role: "user",
        createdAt: new Date().toISOString(),
      });
    }
    case "getProfile":
      return db().getDocument(DB_ID, COLS.USERS, userId);
    case "updateProfile":
      return db().updateDocument(DB_ID, COLS.USERS, userId, {
        name: payload.name,
      });
    case "setVerified": {
      const displayName = payload.name || "";

      // Always update the Appwrite auth record name via the admin API.
      // account.updateName() on the client is unreliable for reflecting in
      // the Appwrite console — the server-side users().updateName() is authoritative.
      if (displayName) {
        try { await users().updateName(userId, displayName); } catch (e) {
          // Non-fatal — profile update still proceeds
          log(`[fn-echo] updateName warning: ${e.message}`);
        }
      }

      try {
        // Profile exists — update isVerified and name if provided
        const updateData = { isVerified: true };
        if (displayName) updateData.name = displayName;
        return await db().updateDocument(DB_ID, COLS.USERS, userId, updateData);
      } catch (e) {
        if (e.code === 404) {
          // First-time login — create the profile document
          const u = await users().get(userId);
          const resolvedName = displayName || u.name || '';
          return db().createDocument(DB_ID, COLS.USERS, userId, {
            userId,
            name: resolvedName,
            email: u.email,
            points: 0,
            totalDeposits: 0,
            isVerified: true,
            role: "user",
            createdAt: new Date().toISOString(),
          });
        }
        throw e;
      }
    }
    case "getAllUsers": {
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.USERS, [
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]);
    }
    case "getUserByEmail":
      return db().listDocuments(DB_ID, COLS.USERS, [
        Query.equal("email", payload.email),
        Query.limit(1),
      ]);
    case "promoteToAdmin": {
      await requireSuperAdmin(userId);
      const { targetUserId } = payload;
      await db().updateDocument(DB_ID, COLS.USERS, targetUserId, { role: "admin" });
      await syncTeams(targetUserId, "admin");
      return { success: true };
    }
    case "promoteToSuperAdmin": {
      await requireSuperAdmin(userId);
      const { targetUserId } = payload;
      await db().updateDocument(DB_ID, COLS.USERS, targetUserId, { role: "superadmin" });
      await syncTeams(targetUserId, "superadmin");
      return { success: true };
    }
    case "demoteToUser": {
      await requireSuperAdmin(userId);
      const { targetUserId } = payload;
      if (targetUserId === userId) throw new Error("You cannot demote yourself.");
      await db().updateDocument(DB_ID, COLS.USERS, targetUserId, { role: "user" });
      await syncTeams(targetUserId, "user");
      return { success: true };
    }
    case "deleteUser": {
      await requireSuperAdmin(userId);
      const { targetUserId } = payload;
      if (targetUserId === userId) throw new Error("You cannot delete yourself.");
      try { await users().delete(targetUserId); } catch {}
      await db().deleteDocument(DB_ID, COLS.USERS, targetUserId);
      return { success: true };
    }
    default:
      throw new Error(`Unknown action: users.${action}`);
  }
}

async function handleSubmissions(action, payload, userId) {
  switch (action) {
    case "create": {
      const { items, binId, groupId } = payload;
      const totalPoints = items.reduce(
        (s, i) => s + (ITEM_POINTS[i.itemType] || 10) * i.quantity, 0,
      );
      const bagCode = generateBagCode(userId, items.length, totalPoints);
      return db().createDocument(DB_ID, COLS.SUBMISSIONS, ID.unique(), {
        userId,
        items: JSON.stringify(items),
        totalPoints,
        binId,
        groupId: groupId || null,
        status: "pending",
        bagCode,
        submittedAt: new Date().toISOString(),
      });
    }
    case "getMySubmissions":
      return db().listDocuments(DB_ID, COLS.SUBMISSIONS, [
        Query.equal("userId", userId),
        Query.orderDesc("submittedAt"),
        Query.limit(100),
      ]);
    case "getAll":
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.SUBMISSIONS, [
        Query.orderDesc("submittedAt"),
        Query.limit(100),
      ]);
    case "updateStatus": {
      await requireAdmin(userId);
      const { submissionId, newStatus } = payload;
      const sub = await db().getDocument(DB_ID, COLS.SUBMISSIONS, submissionId);
      const oldStatus = sub.status;
      if (oldStatus === newStatus) return sub;
      const role = await getRole(userId);
      if (sub.userId === userId && role !== "superadmin") {
        throw new Error("You cannot change the status of your own submission.");
      }
      await db().updateDocument(DB_ID, COLS.SUBMISSIONS, submissionId, { status: newStatus });
      const profile = await db().getDocument(DB_ID, COLS.USERS, sub.userId);
      if (newStatus === "verified") {
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points: profile.points + sub.totalPoints,
          totalDeposits: profile.totalDeposits + 1,
        });
        if (sub.groupId) {
          const grp = await db().getDocument(DB_ID, COLS.GROUPS, sub.groupId);
          const newGroupPoints = grp.totalPoints + sub.totalPoints;
          await db().updateDocument(DB_ID, COLS.GROUPS, sub.groupId, {
            totalPoints: newGroupPoints,
          });
          await checkAndAwardGroupBonuses(sub.groupId, grp.totalPoints, newGroupPoints);
        }
      } else if (oldStatus === "verified" && newStatus !== "verified") {
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points: Math.max(0, profile.points - sub.totalPoints),
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
    case "delete": {
      const { submissionId } = payload;
      const sub = await db().getDocument(DB_ID, COLS.SUBMISSIONS, submissionId);
      const role = await getRole(userId);
      if (sub.userId !== userId && role !== "admin" && role !== "superadmin") {
        throw new Error("UNAUTHORIZED");
      }
      if (sub.status === "verified") {
        const profile = await db().getDocument(DB_ID, COLS.USERS, sub.userId);
        await db().updateDocument(DB_ID, COLS.USERS, sub.userId, {
          points: Math.max(0, profile.points - sub.totalPoints),
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
    default:
      throw new Error(`Unknown action: submissions.${action}`);
  }
}

async function handleRewards(action, payload, userId) {
  switch (action) {
    case "getAvailable":
      return db().listDocuments(DB_ID, COLS.REWARDS, [
        Query.equal("available", true),
      ]);
    case "getAll":
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.REWARDS, [Query.limit(100)]);
    case "create":
      await requireAdmin(userId);
      return db().createDocument(DB_ID, COLS.REWARDS, ID.unique(), {
        title:                payload.title,
        description:          payload.description,
        pointsCost:           payload.pointsCost,
        partner:              payload.partner,
        brandName:            payload.brandName,
        logoUrl:              payload.logoUrl || null,
        available:            true,
        rewardType:           payload.rewardType || "single_use",
        multiUseCode:         payload.rewardType === "multi_use" ? (payload.multiUseCode || null) : null,
        multiUseMaxCount:     payload.rewardType === "multi_use" ? (parseInt(payload.multiUseMaxCount, 10) || 0) : 0,
        multiUseCurrentCount: 0,
      });
    case "update":
      await requireAdmin(userId);
      return db().updateDocument(DB_ID, COLS.REWARDS, payload.rewardId, payload.data);
    case "delete": {
      await requireAdmin(userId);
      const codes = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal("rewardId", payload.rewardId),
        Query.limit(500),
      ]);
      await Promise.all(
        codes.documents.map((c) => db().deleteDocument(DB_ID, COLS.COUPON_CODES, c.$id)),
      );
      await db().deleteDocument(DB_ID, COLS.REWARDS, payload.rewardId);
      return { success: true };
    }
    default:
      throw new Error(`Unknown action: rewards.${action}`);
  }
}

async function handleCoupons(action, payload, userId) {
  switch (action) {
    case "addCodes": {
      await requireAdmin(userId);
      const { rewardId, codes } = payload;
      const creates = codes
        .map((c) => c.trim())
        .filter((c) => c !== "")
        .map((code) =>
          db().createDocument(DB_ID, COLS.COUPON_CODES, ID.unique(), {
            rewardId,
            code,
            isUsed: false,
            usedBy: null,
            usedAt: null,
          }),
        );
      return Promise.all(creates);
    }
    case "getCodes":
      await requireAdmin(userId);
      return db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal("rewardId", payload.rewardId),
        Query.limit(500),
      ]);
    case "getCount": {
      const reward = await db().getDocument(DB_ID, COLS.REWARDS, payload.rewardId);
      if (reward.rewardType === "multi_use") {
        return { count: Math.max(0, (reward.multiUseMaxCount || 0) - (reward.multiUseCurrentCount || 0)) };
      }
      const res = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
        Query.equal("rewardId", payload.rewardId),
        Query.equal("isUsed", false),
        Query.limit(1),
      ]);
      return { count: res.total };
    }
    case "getCounts": {
      const counts = await Promise.all(
        payload.rewardIds.map(async (id) => {
          const reward = await db().getDocument(DB_ID, COLS.REWARDS, id).catch(() => null);
          if (!reward) return { id, count: 0 };
          if (reward.rewardType === "multi_use") {
            return { id, count: Math.max(0, (reward.multiUseMaxCount || 0) - (reward.multiUseCurrentCount || 0)) };
          }
          const res = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
            Query.equal("rewardId", id),
            Query.equal("isUsed", false),
            Query.limit(1),
          ]);
          return { id, count: res.total };
        }),
      );
      const map = {};
      counts.forEach(({ id, count }) => { map[id] = count; });
      return map;
    }
    case "deleteCode":
      await requireAdmin(userId);
      await db().deleteDocument(DB_ID, COLS.COUPON_CODES, payload.codeId);
      return { success: true };
    default:
      throw new Error(`Unknown action: coupons.${action}`);
  }
}

async function handleRedemptions(action, payload, userId) {
  switch (action) {
    case "redeem": {
      const { rewardId, pointsCost } = payload;
      const profile = await db().getDocument(DB_ID, COLS.USERS, userId);
      if (profile.points < pointsCost) throw new Error("Not enough eco-points.");
      const reward = await db().getDocument(DB_ID, COLS.REWARDS, rewardId);
      const now    = new Date().toISOString();
      let couponCode;

      if (reward.rewardType === "multi_use") {
        const used    = reward.multiUseCurrentCount || 0;
        const maxUses = reward.multiUseMaxCount      || 0;
        if (used >= maxUses) throw new Error("No more redemptions available for this reward.");
        const newCount = used + 1;
        await db().updateDocument(DB_ID, COLS.REWARDS, rewardId, {
          multiUseCurrentCount: newCount,
          ...(newCount >= maxUses ? { available: false } : {}),
        });
        couponCode = reward.multiUseCode;
      } else {
        const avail = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
          Query.equal("rewardId", rewardId),
          Query.equal("isUsed", false),
          Query.limit(1),
        ]);
        if (avail.documents.length === 0) throw new Error("No coupon codes left for this reward.");
        const codeDoc = avail.documents[0];
        await db().updateDocument(DB_ID, COLS.COUPON_CODES, codeDoc.$id, {
          isUsed: true,
          usedBy: userId,
          usedAt: now,
        });
        const remaining = await db().listDocuments(DB_ID, COLS.COUPON_CODES, [
          Query.equal("rewardId", rewardId),
          Query.equal("isUsed", false),
          Query.limit(1),
        ]);
        if (remaining.total === 0) {
          await db().updateDocument(DB_ID, COLS.REWARDS, rewardId, { available: false });
        }
        couponCode = codeDoc.code;
      }

      const redemption = await db().createDocument(DB_ID, COLS.REDEMPTIONS, ID.unique(), {
        userId,
        rewardId,
        pointsSpent: pointsCost,
        couponCode,
        redeemedAt: now,
      });
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        points: profile.points - pointsCost,
      });
      return redemption;
    }
    case "getMyRedemptions":
      return db().listDocuments(DB_ID, COLS.REDEMPTIONS, [
        Query.equal("userId", userId),
        Query.orderDesc("redeemedAt"),
      ]);
    default:
      throw new Error(`Unknown action: redemptions.${action}`);
  }
}

// ── GROUP BONUS HELPER ─────────────────────────────────────
// Called after group totalPoints changes. Checks if new milestones
// have been crossed and awards bonus eco-points to qualifying members.
async function checkAndAwardGroupBonuses(groupId, pointsBefore, pointsAfter) {
  const milestonesBefore = Math.floor(pointsBefore / BONUS_INTERVAL);
  const milestonesAfter  = Math.floor(pointsAfter  / BONUS_INTERVAL);
  if (milestonesAfter <= milestonesBefore) return; // no new milestones

  const group   = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
  const members = JSON.parse(group.memberIds || "[]");

  for (let m = milestonesBefore + 1; m <= milestonesAfter; m++) {
    const recipients = [];
    const warnings   = [];
    let   totalAwarded = 0;

    for (const memberId of members) {
      let memberProfile;
      try {
        memberProfile = await db().getDocument(DB_ID, COLS.USERS, memberId);
      } catch {
        warnings.push(`Member ${memberId}: profile not found — skipped.`);
        recipients.push({ userId: memberId, name: memberId, awarded: false, reason: 'Profile not found' });
        continue;
      }

      const name = memberProfile.name || memberId;

      // Find any active (non-deleted) submission under this group for this member
      const subs = await db().listDocuments(DB_ID, COLS.SUBMISSIONS, [
        Query.equal("userId", memberId),
        Query.equal("groupId", groupId),
        Query.orderDesc("submittedAt"),
        Query.limit(50),
      ]);

      // Check: must have at least one verified submission under this group
      const verifiedSubs = subs.documents.filter(s => s.status === "verified");
      if (verifiedSubs.length === 0) {
        const reason = "No verified submission under this group";
        warnings.push(`${name}: ${reason} — bonus skipped.`);
        recipients.push({ userId: memberId, name, awarded: false, reason });
        continue;
      }

      // Check: most recent verified submission must be within 45 days
      const mostRecent     = verifiedSubs[0];
      const daysSinceLastSub = (Date.now() - new Date(mostRecent.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSub >= STALE_DAYS) {
        const reason = `Last submission was ${Math.floor(daysSinceLastSub)} days ago (limit: ${STALE_DAYS} days)`;
        warnings.push(`${name}: ${reason} — bonus skipped.`);
        recipients.push({ userId: memberId, name, awarded: false, reason });
        continue;
      }

      // Award bonus point
      await db().updateDocument(DB_ID, COLS.USERS, memberId, {
        points: memberProfile.points + BONUS_PER_MEMBER,
      });
      recipients.push({ userId: memberId, name, awarded: true, reason: "" });
      totalAwarded++;
    }

    // Record achievement
    await db().createDocument(DB_ID, COLS.GROUP_ACHIEVEMENTS, ID.unique(), {
      groupId,
      milestone:    m,
      awardedAt:    new Date().toISOString(),
      recipients:   JSON.stringify(recipients),
      warnings:     JSON.stringify(warnings),
      totalAwarded,
    });
  }
}

async function handleGroups(action, payload, userId) {
  switch (action) {
    case "create": {
      const profile = await db().getDocument(DB_ID, COLS.USERS, userId);
      if (profile.groupId) throw new Error("You are already in a group. Leave it before creating a new one.");
      const group = await db().createDocument(DB_ID, COLS.GROUPS, ID.unique(), {
        name: payload.name,
        createdBy: userId,
        memberIds: JSON.stringify([userId]),
        totalPoints: 0,
        createdAt: new Date().toISOString(),
      });
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        groupId: group.$id,
      });
      return group;
    }
    case "get":
      return db().getDocument(DB_ID, COLS.GROUPS, payload.groupId);
    case "getMultiple": {
      if (!payload.groupIds?.length) return [];
      const results = await Promise.all(
        payload.groupIds.map((id) =>
          db().getDocument(DB_ID, COLS.GROUPS, id).catch(() => null),
        ),
      );
      return results.filter(Boolean);
    }
    case "leaderboard":
      return db().listDocuments(DB_ID, COLS.GROUPS, [
        Query.orderDesc("totalPoints"),
        Query.limit(100),
      ]);
    case "leave": {
      const { groupId } = payload;
      const group = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || "[]").filter((id) => id !== userId);
      await db().updateDocument(DB_ID, COLS.GROUPS, groupId, {
        memberIds: JSON.stringify(members),
      });
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        groupId: null,
      });
      if (members.length === 0) {
        const pending = await db().listDocuments(DB_ID, COLS.INVITES, [
          Query.equal("groupId", groupId),
          Query.equal("status", "pending"),
        ]);
        await Promise.all(
          pending.documents.map((i) => db().deleteDocument(DB_ID, COLS.INVITES, i.$id)),
        );
        await db().deleteDocument(DB_ID, COLS.GROUPS, groupId);
      }
      return { success: true };
    }
    case "sendInvite": {
      const { groupId, email, inviterName, inviterEmail } = payload;
      const existing = await db().listDocuments(DB_ID, COLS.INVITES, [
        Query.equal("email", email),
        Query.equal("groupId", groupId),
        Query.equal("status", "pending"),
      ]);
      if (existing.documents.length > 0) throw new Error("Invite already sent to this email.");
      const group = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      const currentMembers = JSON.parse(group.memberIds || "[]");
      if (currentMembers.length >= MAX_GROUP_MEMBERS) {
        throw new Error(`This group is full. Groups are limited to ${MAX_GROUP_MEMBERS} members.`);
      }
      return db().createDocument(DB_ID, COLS.INVITES, ID.unique(), {
        groupId,
        groupName: group.name,
        email,
        invitedBy: userId,
        inviterName: inviterName || "A member",
        inviterEmail: inviterEmail || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
    case "getPendingInvites":
      return db().listDocuments(DB_ID, COLS.INVITES, [
        Query.equal("email", payload.email),
        Query.equal("status", "pending"),
      ]);
    case "acceptInvite": {
      const { inviteId, groupId } = payload;
      const profile = await db().getDocument(DB_ID, COLS.USERS, userId);
      if (profile.groupId) throw new Error("You are already in a group. Leave it before accepting another invite.");
      const group = await db().getDocument(DB_ID, COLS.GROUPS, groupId);
      const members = JSON.parse(group.memberIds || "[]");
      if (members.length >= MAX_GROUP_MEMBERS) {
        throw new Error(`This group is already full (${MAX_GROUP_MEMBERS} members max).`);
      }
      if (!members.includes(userId)) members.push(userId);
      await db().updateDocument(DB_ID, COLS.GROUPS, groupId, {
        memberIds: JSON.stringify(members),
      });
      await db().updateDocument(DB_ID, COLS.USERS, userId, {
        groupId: groupId,
      });
      await db().updateDocument(DB_ID, COLS.INVITES, inviteId, { status: "accepted" });
      return { success: true };
    }
    case "declineInvite":
      await db().updateDocument(DB_ID, COLS.INVITES, payload.inviteId, { status: "declined" });
      return { success: true };
    case "getAchievements": {
      const { groupId } = payload;
      const docs = await db().listDocuments(DB_ID, COLS.GROUP_ACHIEVEMENTS, [
        Query.equal("groupId", groupId),
        Query.orderDesc("awardedAt"),
        Query.limit(100),
      ]);
      // Parse JSON fields for client
      docs.documents = docs.documents.map(d => ({
        ...d,
        recipients: (() => { try { return JSON.parse(d.recipients); } catch { return []; } })(),
        warnings:   (() => { try { return JSON.parse(d.warnings);   } catch { return []; } })(),
      }));
      return docs;
    }
    default:
      throw new Error(`Unknown action: groups.${action}`);
  }
}

const GUEST_ACTIONS = new Set([
  "users:resolveUser",
  "users:getUserByEmail",
  "users:createProfile",
  "rewards:getAvailable",
]);

export default async ({ req, res, log, error }) => {
  try {
    let body;
    try {
      body =
        typeof req.body === "string"
          ? req.body.trim() ? JSON.parse(req.body) : {}
          : (req.body ?? {});
    } catch (e) {
      return res.json({ success: false, error: "Invalid request body: " + e.message }, 400);
    }

    const { domain, action, payload = {}, jwt: bodyJwt } = body;
    if (!domain || !action) {
      return res.json({ success: false, error: "Missing domain or action." }, 400);
    }

    const key = `${domain}:${action}`;
    const isGuest = GUEST_ACTIONS.has(key);
    log(`[fn-echo] ${key} guest=${isGuest}`);

    let userId = null;
    if (!isGuest) {
      try {
        userId = await getUserId(req, bodyJwt);
      } catch (e) {
        return res.json({ success: false, error: "UNAUTHORIZED: No session." }, 401);
      }
    }

    log(`[fn-echo] userId=${userId ?? "guest"}`);

    let result;
    switch (domain) {
      case "users":       result = await handleUsers(action, payload, userId);       break;
      case "submissions": result = await handleSubmissions(action, payload, userId); break;
      case "rewards":     result = await handleRewards(action, payload, userId);     break;
      case "coupons":     result = await handleCoupons(action, payload, userId);     break;
      case "redemptions": result = await handleRedemptions(action, payload, userId); break;
      case "groups":      result = await handleGroups(action, payload, userId);      break;
      default:
        return res.json({ success: false, error: `Unknown domain: ${domain}` }, 400);
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    error(`[fn-echo] ERROR: ${err.message}`);
    const status = err.message?.startsWith("UNAUTHORIZED") ? 403 : 500;
    return res.json({ success: false, error: err.message }, status);
  }
};
