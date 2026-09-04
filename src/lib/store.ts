import { useMemo, useSyncExternalStore } from 'react';
import type {
  AppState,
  User,
  Campaign,
  CampaignStatus,
  NotificationKind,
  CampaignApplication,
  CampaignAssignment,
  GrowthProofEntry,
  GrowthProofVisibility,
  Squad,
  Conversation,
  Message,
  SkillCheck,
} from './types';
import { buildSeed, hashPassword } from './seed';
import { supabase, cloudReady, WORLD_ID, WORLD_CODE, authEmailFor, DEMO_USERNAMES } from './supabase';
import { containsAbuse, countLinks, moderateContent } from './moderation';
import { CAMPAIGN_TYPE_MAP, ROLE_FOR_TYPE, roleForCampaign } from './domain';
import { celebrate } from './celebrate';

/** v3 storage: vendor business profiles + result campaigns. Bump = clean reseed. */
const KEY = 'wp_campushustle_v3';
const DAY = 86400000;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) return parsed;
    }
  } catch {
    /* reseed */
  }
  return buildSeed();
}

let state: AppState = load();
let version = 0;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  if (cloudReady && worldId) schedulePush();
}

function emit() {
  version++;
  listeners.forEach((l) => l());
  persist();
}

/* ================================================================ */
/* Optional cloud sync — Supabase shared campus "world"             */
/* Without env keys the app stays a browser-local demo.             */
/* ================================================================ */

let worldId: string | null = null;
let channel: any = null;
let dirty = false;
let pushTimer: number | undefined;
let lastCanon = '';
let remoteQueued: string | null = null;
let lastEnteredUid = '';
let lastEnterAt = 0;

/** Stable serialization (sorted keys) so DB echo reads compare cleanly. */
function canon(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

function schedulePush() {
  dirty = true;
  if (pushTimer !== undefined) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { void pushNow(); }, 700);
}

async function pushNow(): Promise<void> {
  pushTimer = undefined;
  if (!cloudReady || !worldId) { dirty = false; return; }
  const c = canon(state);
  if (c === lastCanon) { dirty = false; return; }
  try {
    await supabase()!.from('worlds').update({ state: JSON.parse(JSON.stringify(state)) }).eq('id', worldId);
    lastCanon = c;
    dirty = false;
    if (remoteQueued) { const q = remoteQueued; remoteQueued = null; applyRemoteRaw(q); }
  } catch { /* transient network error — the next local change retries */ }
}

function applyRemoteRaw(payload: string): void {
  try {
    const obj = JSON.parse(payload) as AppState;
    applyRemote(obj);
  } catch { /* ignore malformed */ }
}

function applyRemote(obj: AppState): void {
  if (!obj || !Array.isArray(obj.users)) return;
  const c = canon(obj);
  if (c === lastCanon || c === canon(state)) return; // own echo or already current
  if (dirty || pushTimer !== undefined) { remoteQueued = c; return; }
  const meId = state.sessionUserId;
  const meObj = meId ? byId(state.users, meId) : undefined;
  state = obj;
  if (meId && meObj && !byId(state.users, meId)) (state.users as User[]).push(meObj); // never drop the local session
  state.sessionUserId = meId && byId(state.users, meId) ? meId : null;
  emit();
}

async function enterWorld(authUser: any): Promise<void> {
  if (!cloudReady) return;
  const sb = supabase()!;
  if (channel) { try { sb.removeChannel(channel); } catch { /* ignore */ } channel = null; }
  worldId = null;
  const now = Date.now();
  if (authUser?.id === lastEnteredUid && now - lastEnterAt < 20_000) return;
  lastEnteredUid = authUser?.id ?? '';
  lastEnterAt = now;

  const email: string | undefined = authUser?.email;
  let localUid: string | undefined = authUser?.user_metadata?.local_uid;
  if (!localUid && email) {
    const em = String(email).toLowerCase();
    const match = state.users.find((u) => u.email.toLowerCase() === em);
    if (match) localUid = match.id;
    else {
      const prefix = em.split('@')[0];
      const un = state.users.find((u) => u.username.toLowerCase() === prefix);
      if (un) localUid = un.id;
    }
  }

  // attach membership to the shared UNILAG demo world
  const { data: mem } = await sb.from('world_members').select('local_uid, world_id').eq('auth_uid', authUser.id).maybeSingle();
  const member = mem as { local_uid?: string; world_id?: string } | null;
  if (!member) {
    const { data: w } = await sb.from('worlds').select('id').eq('id', WORLD_ID).maybeSingle();
    if (!w) {
      // first device ever: create the shared world seeded with current local state
      await sb.from('worlds').insert({ id: WORLD_ID, code: WORLD_CODE, state: JSON.parse(JSON.stringify(state)) });
    }
    await (sb.from('world_members') as any).upsert(
      { auth_uid: authUser.id, world_id: WORLD_ID, local_uid: localUid ?? '' },
      { onConflict: 'auth_uid' }
    );
    worldId = WORLD_ID;
  } else {
    worldId = member.world_id ?? WORLD_ID;
  }

  const { data: row } = await sb.from('worlds').select('state').eq('id', worldId).maybeSingle();
  const remoteState = (row as any)?.state as AppState | undefined;
  const seeded = !!remoteState && Array.isArray(remoteState.users) && remoteState.users.length > 0;
  if (seeded && remoteState) applyRemote(remoteState);
  else { dirty = false; lastCanon = ''; void pushNow(); } // adopt local state as world truth

  channel = sb
    .channel('world:' + worldId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'worlds', filter: `id=eq.${worldId}` }, (payload: any) => {
      if (payload?.new?.state) applyRemote(payload.new.state as AppState);
    })
    .subscribe();
}

/** Boot the cloud layer once (from App). No-op in local demo mode. */
export async function bootstrapCloud(): Promise<void> {
  if (!cloudReady) return;
  const sb = supabase()!;
  try {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) await enterWorld(data.session.user);
  } catch { /* offline — remain local until next load */ }
  sb.auth.onAuthStateChange((_e, session) => {
    if (session?.user) void enterWorld(session.user);
    else void actions.logout();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useApp() {
  const v = useSyncExternalStore(subscribe, () => version);
  return useMemo(() => ({ state, actions }), [v]);
}

/* ---------- helpers ---------- */

export const byId = <T extends { id: string }>(arr: T[], id: string): T | undefined =>
  arr.find((x) => x.id === id);

function add(key: keyof AppState, item: unknown) {
  (state as any)[key] = [...(state[key] as unknown as unknown[]), item];
}

function notify(userId: string, kind: NotificationKind, title: string, body: string, link?: string) {
  add('notifications', { id: uid('n'), userId, kind, title, body, link, createdAt: Date.now(), read: false });
  if (state.notifications.length > 400) state.notifications = state.notifications.slice(-400);
}

function log(actorId: string, action: string, targetType?: string, targetId?: string, detail?: string) {
  add('auditLog', { id: uid('al'), actorId, action, targetType, targetId, detail, createdAt: Date.now() });
  if (state.auditLog.length > 300) state.auditLog = state.auditLog.slice(-300);
}

function track(name: string, props?: Record<string, string | number | boolean>, userId?: string) {
  const arr = (state as any).analytics ?? [];
  arr.push({ id: uid('ae'), name, props, userId, createdAt: Date.now() });
  (state as any).analytics = arr.slice(-200);
}

function notifyAdmins(kind: NotificationKind, title: string, body: string, link?: string) {
  state.users
    .filter((u) => u.role === 'admin' || u.role === 'superadmin')
    .forEach((u) => notify(u.id, kind, title, body, link));
}

export function currentUser(): User | null {
  const id = state.sessionUserId;
  return id ? byId(state.users, id) ?? null : null;
}

/** Where a user should land right after login/signup, tuned to their role. */
export function landingPath(u?: User | null): string {
  if (!u) return '/app/home';
  if (u.role === 'admin' || u.role === 'superadmin') return '/admin';
  if (u.role === 'ambassador') return '/ambassador';
  if (u.verificationStatus !== 'verified') return '/app/verify';
  return '/app/home';
}

/* ---------- authorization helpers ---------- */

/** True when the session actor holds an admin-level role. */
export function isAdminUser(u?: User | null): boolean {
  return !!u && (u.role === 'admin' || u.role === 'superadmin');
}

function adminActor(): User | null {
  const u = currentUser();
  return u && isAdminUser(u) ? u : null;
}

/** Returns null when allowed, otherwise a human-readable denial reason. */
function allowAdmin(): string | null {
  const u = currentUser();
  if (!u) return 'Please log in.';
  if (!isAdminUser(u)) return 'Admin access required for this action.';
  return null;
}

function isInvolvedWithCampaign(m: Campaign, userId: string): boolean {
  if (m.ownerUserId === userId) return true;
  const a = state.assignments.find((x) => x.campaignId === m.id);
  if (a && a.contributorIds.includes(userId)) return true;
  const joined = state.applications.some((x) => x.campaignId === m.id && x.applicantId === userId && ['joined', 'selected'].includes(x.status));
  return joined;
}

/** result vs task kind for a campaign type. */
export function campaignKind(t: Campaign['campaignType']): 'result' | 'task' {
  return CAMPAIGN_TYPE_MAP[t]?.kind ?? 'task';
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(prefix: string, len = 4): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${s}`;
}

/* ---------- demo rate limiting ----------
 * In-memory per-actor sliding window. This is client-side only — a real
 * deployment must enforce limits server-side (per IP/device + per account). */
const rlWindows = new Map<string, number[]>();

function rlAllowed(actorKey: string, action: string, max: number, windowMs: number): boolean {
  const key = `${actorKey}|${action}`;
  const now = Date.now();
  const recent = (rlWindows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    rlWindows.set(key, recent);
    return false;
  }
  recent.push(now);
  rlWindows.set(key, recent);
  return true;
}

function clearRateLimits() {
  rlWindows.clear();
}

export function publicName(u?: User | null): string {
  if (!u) return 'Student';
  if (u.displayName && u.displayName.trim()) return u.displayName;
  return u.firstName;
}

export function businessOf(userId: string): AppState['businesses'][number] | undefined {
  return state.businesses.find((b) => b.userId === userId && b.status === 'approved');
}

/* ---------- rating + growthproof analytics ---------- */

export function userRating(u?: User | null): { avg: number; count: number } {
  if (!u) return { avg: 0, count: 0 };
  const revs = state.reviews.filter((r) => r.targetId === u.id && !r.hidden);
  if (revs.length === 0) return { avg: 0, count: 0 };
  return { avg: Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10, count: revs.length };
}

export interface LevelInfo {
  key: string;
  name: string;
  entries: number;
  avgRating: number;
  /** null when the student has no completed Campaigns yet — do NOT render as 100%. */
  onTimePct: number | null;
  squadCampaigns: number;
  next: { text: string; progress: number } | null;
}

const LEVELS_ORDER = ['explorer', 'contributor', 'proven_contributor', 'trusted_specialist', 'squad_leader'] as const;

export function levelInfo(u?: User | null): LevelInfo {
  const empty: LevelInfo = { key: 'explorer', name: 'Explorer', entries: 0, avgRating: 0, onTimePct: null, squadCampaigns: 0, next: null };
  if (!u) return empty;
  const mine = state.growthproof.filter((w) => w.userId === u.id && w.verified);
  const entries = mine.length;
  const { avg, count } = userRating(u);
  const done = mine.filter((w) => w.onTime).length;
  // null (not 100) until the student has at least one completed Campaign
  const onTimePct = entries > 0 ? Math.round((done / entries) * 100) : null;
  // count ONLY Campaigns the student did as part of a Squad: squad-only Campaigns
  // (historical) or Campaigns whose assignment carried a squadId (live)
  const squadCampaignIds = new Set(
    mine
      .filter((w) => {
        const asg = state.assignments.find((a) => a.campaignId === w.campaignId);
        if (asg) return !!asg.squadId;
        const mm = byId(state.campaigns, w.campaignId);
        return mm?.squadEligible === 'squad';
      })
      .map((w) => w.campaignId)
  );
  const squadCampaigns = squadCampaignIds.size;

  const qualifies = {
    contributor: entries >= 1,
    proven: entries >= 3 && (count > 0 ? avg >= 4.0 : true),
    specialist: entries >= 10 && avg >= 4.5 && (onTimePct ?? 0) >= 90,
    squad: squadCampaigns >= 1 && entries >= 3 && avg >= 4.0 && (onTimePct ?? 0) >= 80,
  };

  let key: typeof LEVELS_ORDER[number] = 'explorer';
  // Squad Leader is the top documented level — it must not be shadowed by Trusted Specialist.
  if (qualifies.squad) key = 'squad_leader';
  else if (qualifies.specialist) key = 'trusted_specialist';
  else if (qualifies.proven) key = 'proven_contributor';
  else if (qualifies.contributor) key = 'contributor';

  let next: LevelInfo['next'] = null;
  if (key === 'explorer') next = { text: 'One accepted Campaign unlocks Contributor.', progress: Math.min(100, entries) };
  if (key === 'contributor') next = { text: '2 more accepted Campaigns + 4.0★ rating unlock Proven Contributor.', progress: Math.min(100, Math.round((entries / 3) * 100)) };
  if (key === 'proven_contributor') next = { text: '10 accepted Campaigns, 4.5★ and a strong on-time record unlock Trusted Specialist.', progress: Math.min(100, Math.round((entries / 10) * 100)) };
  if (key === 'squad_leader' || key === 'trusted_specialist') {
    if (avg < 4.5 || (onTimePct ?? 0) < 90) next = { text: 'Keep 4.5★+ and 90%+ on-time to reach the next level.', progress: Math.min(100, Math.round(avg * 10)) };
  }

  const names: Record<string, string> = {
    explorer: 'Explorer',
    contributor: 'Contributor',
    proven_contributor: 'Proven Contributor',
    trusted_specialist: 'Trusted Specialist',
    squad_leader: 'Squad Leader',
  };
  return { key, name: names[key], entries, avgRating: avg, onTimePct, squadCampaigns, next };
}

export function skillCheckedTracks(u?: User | null): string[] {
  if (!u) return [];
  return state.skillChecks.filter((s) => s.userId === u.id && s.status === 'skill_checked').map((s) => s.track);
}

/* ---------- demo auto-replies ---------- */

const REPLIES: Record<string, string[]> = {
  u_morayo: ['Noted, thank you!', 'Great — I’ll update the committee.', 'Perfect, I’ll confirm soon.'],
  u_damilola: ['Thanks for the update!', 'Got it 👍', 'The exec will love this.'],
  u_segun: ['Thanks — I’ll check with the team.', 'Noted!', 'Alright, keep me posted.'],
  u_kunbi: ['Thank you!', 'That works for us.', 'Noted.' ],
  u_chiamaka: ['Awesome work!', 'Let me know if you need anything.', 'Nice one 👏'],
  u_aisha: ['Sounds good!', 'On it.', 'Thanks!'],
  u_admin: ['Noted.', 'I’ll review it shortly.', 'Thanks for flagging.'],
};

let replyTimers: number[] = [];

function scheduleReply(conversationId: string, otherId: string) {
  const t = window.setTimeout(() => {
    const conv = byId(state.conversations, conversationId);
    if (!conv) return;
    const pool = REPLIES[otherId] ?? ['Okay, noted!', 'Thanks!', 'Got it.'];
    const text = pool[Math.floor(Math.random() * pool.length)];
    addMessage(conversationId, otherId, text);
    const me = conv.participantIds.find((p) => p !== otherId);
    if (me) notify(me, 'message', `New message from ${publicName(byId(state.users, otherId))}`, text.slice(0, 90), `/app/chat/${conversationId}`);
    emit();
  }, 2600 + Math.random() * 4200);
  replyTimers.push(t);
}

function addMessage(conversationId: string, senderId: string, text: string, kind: Message['kind'] = 'text', attachmentName?: string, attachmentMeta?: { name: string; size?: number; type?: string }) {
  const m: Message = { id: uid('m'), conversationId, senderId, kind, text, attachmentName, attachmentMeta, createdAt: Date.now(), readBy: [] };
  add('messages', m);
  const c = byId(state.conversations, conversationId);
  if (c) c.lastMessageAt = Date.now();
}

function conversationWith(a: string, b: string, campaignId?: string): Conversation | undefined {
  return state.conversations.find(
    (c) => c.participantIds.includes(a) && c.participantIds.includes(b) && (campaignId ? c.campaignId === campaignId : !c.campaignId)
  );
}

function getOrCreateConversation(a: string, b: string, campaignId?: string): Conversation {
  const existing = conversationWith(a, b, campaignId);
  if (existing) return existing;
  const c: Conversation = { id: uid('cv'), participantIds: [a, b], campaignId, lastMessageAt: Date.now(), fileSharingOpen: false, blockedBy: [] };
  add('conversations', c);
  return c;
}

function unreadFor(userId: string, c: Conversation): number {
  return state.messages.filter(
    (m) => m.conversationId === c.id && m.senderId !== userId && !m.readBy.includes(userId)
  ).length;
}

export function totalUnread(userId: string): number {
  return state.conversations.filter((c) => c.participantIds.includes(userId)).reduce((s, c) => s + unreadFor(userId, c), 0);
}

export function unreadNotifications(userId: string): number {
  return state.notifications.filter((n) => n.userId === userId && !n.read).length;
}

function fileSharingAllowed(c: Conversation): boolean {
  if (c.fileSharingOpen) return true;
  if (c.campaignId) {
    const campaign = byId(state.campaigns, c.campaignId);
    if (campaign && ['assigned', 'in_progress', 'submitted', 'revision_requested'].includes(campaign.status)) return true;
    if (campaign && (campaign.status === 'open' || campaign.status === 'shortlisting')) {
      const ap = state.applications.find((a) => a.campaignId === campaign.id && c.participantIds.includes(a.applicantId) && (a.status === 'shortlisted' || a.status === 'selected'));
      return !!ap;
    }
  }
  return false;
}

/* ================================================================== */

function cloudLoginHint(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Cloud sign-in failed — make sure this account exists in Supabase Auth (run schema.sql; demo passwords are password123).';
  }
  if (m.includes('email not confirmed')) return 'Confirm your email first — or disable email confirmation under Supabase → Authentication.';
  return 'Sign-in failed: ' + msg;
}

export const actions = {
  /* ---------- auth & onboarding ---------- */
  async login(identifier: string, password: string): Promise<string | null> {
    const id = identifier.trim().toLowerCase();
    // 10 failed attempts per identifier per 15 minutes
    const attemptKey = id || 'unknown';
    const allowed = rlAllowed('login:' + attemptKey, 'attempt', 10, 15 * 60000);
    if (!allowed) return 'Too many login attempts. Try again in 15 minutes.';
    const u = state.users.find(
      (x) =>
        x.username.toLowerCase() === id ||
        x.phone.replace(/\s/g, '') === id.replace(/\s/g, '') ||
        x.email.toLowerCase() === id
    );
    if (!u || u.passwordHash !== hashPassword(u.username, password)) return 'Wrong username, email or password.';
    if (u.suspended) return 'This account is suspended. Contact campus admin.';

    if (cloudReady) {
      // real authentication against Supabase Auth
      const sb = supabase()!;
      const demo = DEMO_USERNAMES.has(u.username.toLowerCase());
      const email = demo || !/@/.test(u.email) ? authEmailFor(u.username) : u.email;
      state.sessionUserId = u.id; // guard: a remote snapshot must not drop this identity
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        state.sessionUserId = null;
        return cloudLoginHint(error.message);
      }
      const { data } = await sb.auth.getSession();
      if (data.session?.user) await enterWorld(data.session.user);
    } else {
      state.sessionUserId = u.id;
    }
    track('login', { method: 'password' }, u.id);
    emit();
    return null;
  },

  async logout() {
    if (cloudReady) { try { await supabase()!.auth.signOut(); } catch { /* ignore */ } }
    state.sessionUserId = null;
    emit();
  },

  async register(input: {
    firstName: string; lastName: string; displayName?: string; username: string;
    email: string; phone: string; password: string; campusId: string;
    faculty?: string; department?: string; level?: string;
  }): Promise<string | null> {
    const username = input.username.toLowerCase().trim();
    const email = input.email.trim().toLowerCase();
    // 3 accounts per device per hour (browser-level only — server must enforce IP/device limits)
    if (!rlAllowed('register', 'accounts', 3, 3600000)) return 'Too many accounts created from this device. Try again later.';
    if (state.users.some((u) => u.username.toLowerCase() === username)) return 'That username is already taken.';
    if (state.users.some((u) => u.email.toLowerCase() === email)) return 'That email is already registered.';
    if (state.users.some((u) => u.phone.replace(/\s/g, '') === input.phone.replace(/\s/g, ''))) return 'That phone number is already registered.';
    const newId = uid('u');

    if (cloudReady) {
      const sb = supabase()!;
      const { error } = await sb.auth.signUp({
        email,
        password: input.password,
        options: { data: { local_uid: newId } },
      });
      if (error) return 'Account sign-up failed: ' + error.message;
    }

    const u: User = {
      id: newId,
      role: 'student',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      displayName: input.displayName?.trim() || undefined,
      username,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      passwordHash: hashPassword(username, input.password),
      campusId: input.campusId,
      faculty: input.faculty,
      department: input.department,
      level: input.level,
      photo: 'g' + ((state.users.length % 8) + 1),
      verificationStatus: 'unverified',
      skills: [],
      showDepartment: false,
      warnCount: 0,
      portfolio: [],
      stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 },
      createdAt: Date.now(),
    };
    add('users', u);
    state.sessionUserId = u.id;
    state.onboardingStep = 'verify';
    track('register', {}, u.id);
    emit();
    if (cloudReady && worldId) schedulePush(); // make the new member visible to other devices
    return null;
  },

  setOnboarding(step: AppState['onboardingStep'], campusId?: string) {
    state.onboardingStep = step;
    if (campusId) state.onboardingCampusId = campusId;
    emit();
  },

  setSkills(skills: string[]) {
    const u = currentUser();
    if (!u) return;
    u.skills = skills.slice(0, 5);
    emit();
  },

  completeOnboarding() {
    state.onboardingStep = 'splash';
    emit();
  },

  /* ---------- verification ---------- */
  submitVerification(input: { matricNo: string; idDocumentName: string; selfieName: string }): string | null {
    const u = currentUser();
    if (!u) return 'Please log in.';
    if (u.verificationStatus === 'verified') return 'You’re already verified.';
    if (u.verificationStatus === 'pending') return 'Your verification is already under review — resubmission is locked until an admin decides.';
    if (u.verificationStatus === 'suspended') return 'This account is suspended.';
    const matric = input.matricNo.trim().toUpperCase();
    if (!matric) return 'Enter your matriculation number.';
    if (!input.idDocumentName || !input.selfieName) return 'Attach both your student ID and selfie.';
    // one matric number may only be verified once across the campus (demo checks in-app records only)
    const dup = state.users.some((x) => x.id !== u.id && x.matricNo && x.matricNo.toUpperCase() === matric && x.verificationStatus === 'verified');
    if (dup) return 'That matriculation number is already linked to a verified account. Contact campus admin if this is an error.';
    const existing = state.verifications.find((v) => v.userId === u.id);
    const record = {
      id: existing ? existing.id : uid('v'),
      userId: u.id,
      campusId: u.campusId,
      matricNo: matric,
      idDocumentName: input.idDocumentName,
      selfieName: input.selfieName,
      submittedAt: Date.now(),
      attempt: (existing?.attempt ?? 0) + 1,
    };
    if (existing) {
      const i = state.verifications.findIndex((v) => v.id === existing.id);
      state.verifications[i] = record;
    } else {
      add('verifications', record);
    }
    u.verificationStatus = 'pending';
    u.matricNo = matric;
    notifyAdmins('verification', 'New verification submitted', `${u.firstName} ${u.lastName} (attempt ${record.attempt}) submitted documents.`, '/admin/verifications');
    log(u.id, 'submit_verification', 'user', u.id, `attempt ${record.attempt}`);
    emit();
    return null;
  },

  decideVerification(verificationId: string, approve: boolean, note?: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const v = state.verifications.find((x) => x.id === verificationId);
    if (!v) return 'Verification record not found.';
    if (v.decidedAt) return 'This verification was already decided.';
    const u = byId(state.users, v.userId);
    if (!u) return 'User not found.';
    v.decidedBy = state.sessionUserId ?? undefined;
    v.decidedAt = Date.now();
    v.note = note;
    u.verificationStatus = approve ? 'verified' : 'rejected';
    if (approve) {
      log(state.sessionUserId ?? 'system', 'verify_user', 'user', u.id);
      notify(u.id, 'verification', 'You’re verified ✅', 'Your UNILAG identity was confirmed. Welcome to GrowthProof.', '/app/passport');
    } else {
      log(state.sessionUserId ?? 'system', 'reject_verification', 'user', u.id, note);
      notify(u.id, 'verification', 'Verification needs attention', note ?? 'Re-submit with clearer photos.', '/app/verify');
    }
    emit();
    return null;
  },

  verifyUserManually(userId: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const u = byId(state.users, userId);
    if (!u) return 'User not found.';
    if (u.verificationStatus === 'suspended') return 'Suspended accounts cannot be verified — restore them first.';
    u.verificationStatus = 'verified';
    log(state.sessionUserId ?? 'system', 'verify_user_manual', 'user', u.id);
    notify(u.id, 'verification', 'You’re verified ✅', 'Your identity was confirmed by campus admin.', '/app/passport');
    emit();
    return null;
  },

  /* ---------- profile ---------- */
  updateProfile(input: Partial<Pick<User, 'displayName' | 'bio' | 'skills' | 'faculty' | 'department' | 'level' | 'showDepartment' | 'photo'>>) {
    const u = currentUser();
    if (!u) return;
    Object.assign(u, input);
    if (input.skills) u.skills = input.skills.slice(0, 5);
    emit();
  },

  addPortfolio(input: { title: string; description: string; link?: string; file?: string }) {
    const u = currentUser();
    if (!u) return;
    u.portfolio = [...u.portfolio, { id: uid('pf'), ...input }];
    emit();
  },

  removePortfolio(id: string) {
    const u = currentUser();
    if (!u) return;
    u.portfolio = u.portfolio.filter((p) => p.id !== id);
    emit();
  },

  /* ---------- student business profiles (vendor status) ---------- */
  applyAsVendor(input: { businessName: string; category: string; services: string[]; bio?: string; evidenceNote?: string; cover?: string }) {
    const u = currentUser();
    if (!u) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can start a student business.';
    if (!input.businessName?.trim()) return 'Give your business a name.';
    if (!input.category?.trim()) return 'Choose a business category.';
    if (!input.services || input.services.filter((s) => s.trim()).length === 0) return 'List at least one thing you sell or offer.';
    if (state.businesses.some((b) => b.userId === u.id && b.status === 'pending')) return 'Your business profile is already under review.';
    if (state.businesses.some((b) => b.userId === u.id && b.status === 'approved')) return 'You already run an approved student business.';
    if (!rlAllowed(u.id, 'business_apply', 3, 24 * 3600000)) return 'Too many business applications today. Try again tomorrow.';
    add('businesses', {
      id: uid('biz'), userId: u.id, businessName: input.businessName.trim(), category: input.category.trim(), cover: input.cover,
      services: input.services.filter((s) => s.trim()).map((s) => s.trim()), bio: input.bio?.trim(), evidenceNote: input.evidenceNote?.trim(),
      status: 'pending', createdAt: Date.now(),
    });
    notifyAdmins('business', 'Student business application', `${u.firstName} applied to run “${input.businessName.trim()}” (${input.category.trim()}).`, '/admin/businesses');
    log(u.id, 'apply_business', 'business', undefined, input.businessName);
    emit();
    return null;
  },

  decideBusiness(businessId: string, approve: boolean, note?: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const b = state.businesses.find((x) => x.id === businessId);
    if (!b) return 'Business application not found.';
    if (b.status !== 'pending') return 'This application was already decided.';
    b.status = approve ? 'approved' : 'rejected';
    b.decidedBy = state.sessionUserId ?? undefined;
    b.note = note;
    const u = byId(state.users, b.userId);
    if (u) {
      notify(u.id, 'business', approve ? 'Your business can now post Campaigns 🎯' : 'Business application not approved', approve ? `“${b.businessName}” was approved — you can now create Campaigns.` : note ?? 'Please re-apply with more detail about what you sell.', '/app/passport');
    }
    log(state.sessionUserId ?? 'system', approve ? 'approve_business' : 'reject_business', 'business', b.id, b.businessName);
    emit();
    return null;
  },

  /* ---------- campaigns (vendor) ---------- */
  createCampaign(input: {
    title: string;
    campaignType: Campaign['campaignType'];
    rewardType: Campaign['rewardType'];
    rewardAmount: number;
    rewardDescription?: string;
    targetResults?: number;
    brief: string;
    desiredOutcome?: string;
    deliverables?: string[];
    deadline: number;
    effort?: Campaign['effort'];
    payment: Campaign['payment'];
    budgetRange?: string;
    skills: string[];
    zone: string;
    cover?: string;
    squadEligible?: Campaign['squadEligible'];
  }): string | null {
    const u = currentUser();
    if (!u) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can create Campaigns.';
    const biz = businessOf(u.id);
    if (!biz) return 'You need an approved student business to create Campaigns. Apply as a student vendor from your Passport first.';
    const kind = campaignKind(input.campaignType);
    if (kind === 'result') {
      if (input.rewardType !== 'per_result') return 'Result Campaigns pay per confirmed result.';
      if (!input.targetResults || input.targetResults < 1) return 'Set the number of results you want to reach (target results).';
      if (!(input.rewardAmount >= 100)) return 'Reward must be at least ₦100 per confirmed result.';
    } else {
      if (input.rewardType !== 'fixed_task') return 'Creator tasks pay a fixed reward for completed work.';
      if (input.payment === 'paid_outside' && !(input.rewardAmount >= 500)) return 'Fixed reward must be at least ₦500 for paid tasks.';
      if (!input.deliverables || input.deliverables.filter((d) => d.trim()).length === 0) return 'List at least one deliverable so creators know what to submit.';
    }
    if (input.brief.trim().length < 80) return 'Brief must be at least 80 characters — explain what you need and why.';
    if (input.skills.length === 0 || input.skills.length > 5) return 'Add up to 5 skill tags.';
    if (!Number.isFinite(input.deadline) || input.deadline <= Date.now()) return 'Deadline must be in the future.';
    if (input.squadEligible && kind !== 'task') return 'Squads apply to creator tasks only.';
    if (!rlAllowed(u.id, 'create_campaign', 10, 24 * 3600000)) return 'Campaign creation limit reached for today (10). Try again tomorrow.';
    // moderation runs on creation — flagged Campaigns are blocked, not silently posted
    const modText = [input.title, input.brief, input.desiredOutcome ?? '', input.zone, ...(input.deliverables ?? []), input.rewardDescription ?? ''].join(' ');
    const mod = moderateContent(modText);
    if (mod.flags.length > 0) {
      const code = mod.flags.includes('Academic cheating') ? 'cheating' : mod.flags.includes('Prohibited service') ? 'prohibited' : mod.flags.includes('Phone number') ? 'contact' : 'policy';
      log(u.id, 'campaign_blocked_moderation', 'campaign', undefined, mod.flags.join(', '));
      return code === 'cheating'
        ? 'Campaigns may not ask for academic cheating or exam help.'
        : code === 'prohibited'
          ? 'That service is not allowed on GrowthProof (no illegal, adult, gambling or loan services).'
          : code === 'contact'
            ? 'Leave contact details out of the Campaign — promoters connect through chat after joining.'
            : 'That content breaks the GrowthProof policy. Rewrite the Campaign.';
    }
    const m: Campaign = {
      id: uid('m'),
      ownerUserId: u.id,
      businessProfileId: biz.id,
      title: input.title.trim(),
      campaignType: input.campaignType,
      rewardType: input.rewardType,
      rewardAmount: input.rewardAmount,
      rewardDescription: input.rewardDescription?.trim(),
      targetResults: kind === 'result' ? input.targetResults : undefined,
      confirmedResults: 0,
      campaignCode: genCode('CH'),
      cover: input.cover,
      brief: input.brief.trim(),
      desiredOutcome: input.desiredOutcome?.trim(),
      deliverables: kind === 'task' ? input.deliverables?.filter((d) => d.trim()).map((d) => d.trim()) : undefined,
      deadline: input.deadline,
      effort: input.effort,
      payment: input.payment,
      budgetRange: input.budgetRange,
      skills: input.skills,
      squadEligible: input.squadEligible ?? 'individual',
      zone: input.zone,
      status: 'pending_review',
      applicantsCount: 0,
      resultProofs: [],
      changeRequests: [],
      createdAt: Date.now(),
    };
    add('campaigns', m);
    notifyAdmins('campaign', 'New Campaign awaiting review', `“${m.title}” from ${biz.businessName}.`, '/admin/campaigns');
    log(u.id, 'create_campaign', 'campaign', m.id, m.title);
    track('campaign_created', { campaignType: m.campaignType }, u.id);
    emit();
    return null;
  },

  decideCampaign(campaignId: string, approve: boolean, note?: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const m = byId(state.campaigns, campaignId);
    if (!m) return 'Campaign not found.';
    if (m.status !== 'pending_review') return 'Only pending Campaigns can be approved or rejected.';
    m.status = approve ? 'open' : 'rejected';
    m.reviewNote = note;
    const owner = byId(state.users, m.ownerUserId);
    if (owner) {
      notify(m.ownerUserId, 'campaign', approve ? 'Campaign approved and live 🎯' : 'Campaign not approved', approve ? `“${m.title}” is now open for applications.` : note ?? 'Please review the Campaign guidelines and edit.', '/app/campaigns');
    }
    log(state.sessionUserId ?? 'system', approve ? 'approve_campaign' : 'reject_campaign', 'campaign', m.id, note);
    emit();
    return null;
  },

  requestCampaignEdits(campaignId: string, note: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const m = byId(state.campaigns, campaignId);
    if (!m) return 'Campaign not found.';
    m.status = 'pending_review';
    m.reviewNote = note;
    notify(m.ownerUserId, 'campaign', 'Campaign edits requested', `“${m.title}” — ${note}`, '/app/campaigns');
    log(state.sessionUserId ?? 'system', 'request_campaign_edits', 'campaign', m.id, note);
    emit();
    return null;
  },

  /** Admin-only raw status setter used for pause/remove flows. */
  setCampaignStatus(campaignId: string, status: CampaignStatus): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const m = byId(state.campaigns, campaignId);
    if (!m) return 'Campaign not found.';
    m.status = status;
    log(state.sessionUserId ?? 'system', 'campaign_status', 'campaign', m.id, status);
    emit();
    return null;
  },

  cancelCampaign(campaignId: string, reason?: string): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!u || !m) return 'Campaign not found.';
    const isAdmin = isAdminUser(u);
    if (!isAdmin && m.ownerUserId !== u.id) return 'Only the Campaign Owner (or an admin) can cancel this Campaign.';
    if (['cancelled', 'growthproof_issued', 'disputed', 'rejected'].includes(m.status)) return `A ${m.status} Campaign can’t be cancelled.`;
    m.status = 'cancelled';
    state.assignments.forEach((x) => {
      if (x.campaignId === m.id) {
        x.contributorIds.forEach((cid) => notify(cid, 'campaign', 'Campaign cancelled', `“${m.title}” was cancelled by ${isAdmin ? 'campus admin' : 'the owner'}${reason ? ` — ${reason}` : ''}.`, '/app/campaigns'));
      }
    });
    notifyAdmins('campaign', 'Campaign cancelled', `“${m.title}” was cancelled${reason ? ` — ${reason}` : ''}.`, '/admin/campaigns');
    log(u.id, 'cancel_campaign', 'campaign', m.id, reason ?? '');
    emit();
    return null;
  },

  /* ---------- applications ---------- */
  applyToCampaign(input: {
    campaignId: string; message: string; availability: string; growthproofRefs: string[];
    portfolioLinks: string[]; squadId?: string;
  }): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, input.campaignId);
    if (!u || !m) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can apply to Campaigns.';
    if (m.ownerUserId === u.id) return 'You own this Campaign — you can’t apply to your own post.';
    if (campaignKind(m.campaignType) === 'result') return 'Result Campaigns use Join Campaign — one tap to become a promoter with your own referral code.';
    if (m.status !== 'open') return 'This Campaign is no longer accepting applications.';
    if (!rlAllowed(u.id, 'apply_campaign', 25, 24 * 3600000)) return 'Application limit reached for today (25). Try again tomorrow.';
    if (input.squadId) {
      const squad = byId(state.squads, input.squadId);
      if (!squad || squad.leadId !== u.id) return 'Only the Squad Lead can apply with a squad.';
      if (m.squadEligible === 'individual') return 'This Campaign is individual-only.';
      const accepted = state.squadMembers.filter((sm) => sm.squadId === squad.id && sm.status === 'accepted');
      if (accepted.length < 2) return 'A Squad needs at least 2 accepted members before applying.';
      // locked squads (already assigned to another Campaign) can't double-book
      const busy = state.assignments.some((a) => a.squadId === squad.id && ['assigned', 'in_progress', 'submitted', 'revision_requested'].includes(a.status));
      if (busy) return 'This Squad is already assigned to a Campaign.';
    } else if (m.squadEligible === 'squad') return 'This Campaign requires a Squad application.';
    const existing = state.applications.some((a) => a.campaignId === m.id && a.applicantId === u.id && !['declined', 'withdrawn'].includes(a.status));
    if (existing) return 'You already applied to this Campaign.';
    add('applications', {
      id: uid('ap'), campaignId: m.id, applicantId: u.id, squadId: input.squadId,
      message: input.message, availability: input.availability, growthproofRefs: input.growthproofRefs,
      portfolioLinks: input.portfolioLinks, status: 'pending', createdAt: Date.now(),
    });
    m.applicantsCount++;
    notify(m.ownerUserId, 'application', 'New Campaign application', `${publicName(u)} applied to “${m.title}”.`, `/app/campaign/${m.id}`);
    u.stats.totalApplications++;
    const conv = getOrCreateConversation(u.id, m.ownerUserId, m.id);
    conv.fileSharingOpen = false;
    log(u.id, 'apply_campaign', 'campaign', m.id);
    emit();
    return null;
  },

  /* ---------- result campaigns: promoters + proof of result ---------- */

  /** Verified students join a result Campaign instantly and receive a unique referral code. */
  joinCampaign(campaignId: string, note?: string): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!u || !m) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can join Campaigns.';
    if (m.ownerUserId === u.id) return 'You own this Campaign — vendors can’t promote their own post.';
    if (campaignKind(m.campaignType) !== 'result') return 'Creator tasks use an application instead — tap Apply and the vendor will review it.';
    if (m.status !== 'open') return 'This Campaign is no longer accepting promoters.';
    if (!rlAllowed(u.id, 'join_campaign', 25, 24 * 3600000)) return 'Join limit reached for today (25). Try again tomorrow.';
    const existing = state.applications.find((a) => a.campaignId === m.id && a.applicantId === u.id && !['declined', 'withdrawn'].includes(a.status));
    if (existing) return 'You already joined this Campaign.';
    const code = genCode('REF');
    add('applications', {
      id: uid('ap'), campaignId: m.id, applicantId: u.id, message: note?.trim() || 'Joined as a promoter.',
      availability: 'Flexible', growthproofRefs: [], portfolioLinks: [], status: 'joined', referralCode: code, createdAt: Date.now(),
    });
    m.applicantsCount++;
    notify(m.ownerUserId, 'application', 'New promoter joined', `${publicName(u)} joined “${m.title}”.`, `/app/campaign/${m.id}`);
    log(u.id, 'join_campaign', 'campaign', m.id, code);
    const conv = getOrCreateConversation(u.id, m.ownerUserId, m.id);
    conv.fileSharingOpen = true;
    emit();
    return null;
  },

  /** Promoter on a result Campaign: their unique referral code for this Campaign. */
  myReferralCode(campaignId: string): string | null {
    const u = currentUser();
    if (!u) return null;
    const ap = state.applications.find((a) => a.campaignId === campaignId && a.applicantId === u.id && a.status === 'joined');
    return ap?.referralCode ?? null;
  },

  /** Promoter on a result Campaign: withdraw your membership. */
  leaveCampaign(campaignId: string): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!u || !m) return 'Campaign not found.';
    const ap = state.applications.find((a) => a.campaignId === campaignId && a.applicantId === u.id && a.status === 'joined');
    if (!ap) return 'You have not joined this Campaign.';
    if (m.resultProofs.some((p) => p.promoterId === u.id && p.status !== 'rejected')) return 'You have open or confirmed results — ask the vendor to resolve them first.';
    ap.status = 'withdrawn';
    m.applicantsCount = Math.max(0, m.applicantsCount - 1);
    log(u.id, 'leave_campaign', 'campaign', campaignId);
    emit();
    return null;
  },

  /** Joined promoter submits proof of a sale, lead or ticket. */
  submitResultProof(campaignId: string, input: { description: string; customerRef?: string; amount?: number; attachment?: string }): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!u || !m) return 'Campaign not found.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can submit results.';
    if (m.status !== 'open') return 'This Campaign is no longer open.';
    const ap = state.applications.find((a) => a.campaignId === campaignId && a.applicantId === u.id && a.status === 'joined');
    if (!ap) return 'Join this Campaign first to get your referral code and submit results.';
    if (campaignKind(m.campaignType) !== 'result') return 'Result proofs only apply to result Campaigns.';
    if (!input.description?.trim() || input.description.trim().length < 10) return 'Describe the result — what was sold or who the lead is.';
    if (!rlAllowed(u.id, 'submit_result_proof', 20, 24 * 3600000)) return 'Proof submission limit reached for today (20).';
    const dup = m.resultProofs.some((p) => p.promoterId === u.id && p.status === 'submitted' && p.description === input.description.trim());
    if (dup) return 'That exact proof is already waiting for the vendor.';
    m.resultProofs.push({
      id: uid('rp'), promoterId: u.id, description: input.description.trim(), customerRef: input.customerRef?.trim(),
      amount: input.amount && Number.isFinite(input.amount) ? input.amount : undefined, attachment: input.attachment,
      status: 'submitted', createdAt: Date.now(),
    });
    notify(m.ownerUserId, 'result', 'New result proof to confirm', `${publicName(u)} submitted proof on “${m.title}”.`, `/app/campaign/${m.id}`);
    log(u.id, 'submit_result_proof', 'campaign', m.id, input.description);
    emit();
    return null;
  },

  /** Vendor confirms or rejects a promoter's proof. Confirming issues GrowthProof. */
  decideResultProof(proofId: string, confirm: boolean, extra: { rating?: number; feedback?: string; note?: string } = {}): string | null {
    const u = currentUser();
    if (!u) return 'Please log in.';
    const m = state.campaigns.find((c) => c.resultProofs.some((p) => p.id === proofId));
    const proof = m?.resultProofs.find((p) => p.id === proofId);
    if (!m || !proof) return 'Proof not found.';
    const isAdmin = isAdminUser(u);
    if (proof.status === 'disputed' && !isAdmin) return 'This proof is under dispute review — an admin will resolve it.';
    if (proof.status !== 'submitted' && proof.status !== 'disputed') return 'This proof was already decided.';
    if (!isAdmin && m.ownerUserId !== u.id) return 'Only the vendor who owns this Campaign can confirm or reject results.';
    const biz = state.businesses.find((b) => b.id === m.businessProfileId);
    const promoter = byId(state.users, proof.promoterId);
    if (confirm) {
      const rating = Number.isFinite(extra.rating) ? Math.min(5, Math.max(1, Math.round(extra.rating ?? 5))) : 5;
      const feedback = extra.feedback?.trim() || 'Vendor confirmed this result.';
      proof.status = 'vendor_confirmed';
      proof.decidedBy = u.id;
      proof.decidedAt = Date.now();
      proof.note = extra.note?.trim();
      m.confirmedResults++;
      const role = ROLE_FOR_TYPE[m.campaignType] ?? 'Promoter';
      const entry: GrowthProofEntry = {
        id: uid('wp'), userId: proof.promoterId, campaignId: m.id, role,
        campaignType: m.campaignType, skills: [...m.skills], acceptedAt: Date.now(), rating, onTime: true,
        feedback, businessName: biz?.businessName ?? publicName(byId(state.users, m.ownerUserId)) ?? 'Student business',
        campaignTitle: m.title, visibility: 'campus', verified: true, artifact: proof.customerRef ? `Ref: ${proof.customerRef}` : undefined,
      };
      add('growthproof', entry);
      proof.growthproofId = entry.id;
      if (promoter) {
        promoter.stats.acceptedCampaigns++;
        promoter.stats.onTimeCampaigns++;
        notify(promoter.id, 'result', 'Result confirmed — GrowthProof issued 🎉', `${m.title} · “${proof.description}”. Entry added to your Passport.`, '/app/passport');
      }
      add('reviews', {
        id: uid('rv'), targetId: proof.promoterId, authorId: m.ownerUserId, growthproofId: entry.id, campaignId: m.id,
        rating, reason: rating >= 4 ? 'quality' : 'reliability', text: feedback, hidden: false, createdAt: Date.now(),
      });
      log(u.id, isAdmin ? 'confirm_result_proof_admin' : 'confirm_result_proof', 'campaign', m.id, proof.description);
      track('result_confirmed', { campaignId: m.id, campaignType: m.campaignType }, m.ownerUserId);
      if (promoter) celebrate('🎉', 'GrowthProof earned!', `“${m.title}” · ${proof.description} — entry added to your Passport.`);
      // reaching the target closes the Campaign so the vendor can run a new one
      if (m.targetResults && m.confirmedResults >= m.targetResults && m.status === 'open') {
        m.status = 'closed';
        notify(m.ownerUserId, 'campaign', 'Campaign target reached 🎯', `“${m.title}” hit ${m.confirmedResults}/${m.targetResults} confirmed results and was closed.`, '/app/passport');
        log(u.id, 'close_campaign_target_reached', 'campaign', m.id);
      }
    } else {
      proof.status = 'rejected';
      proof.decidedBy = u.id;
      proof.decidedAt = Date.now();
      proof.note = extra.note?.trim() || 'Not confirmed by the vendor.';
      if (promoter) notify(promoter.id, 'result', 'Result proof not confirmed', `On “${m.title}”: ${proof.note}`, `/app/campaign/${m.id}`);
      log(u.id, isAdmin ? 'reject_result_proof_admin' : 'reject_result_proof', 'campaign', m.id, proof.description);
    }
    emit();
    return null;
  },

  /** Promoter disputes a rejection — routes the proof to admins. */
  disputeResultProof(proofId: string, note: string): string | null {
    const u = currentUser();
    const m = state.campaigns.find((c) => c.resultProofs.some((p) => p.id === proofId));
    const proof = m?.resultProofs.find((p) => p.id === proofId);
    if (!u || !m || !proof) return 'Proof not found.';
    if (proof.promoterId !== u.id) return 'Only the promoter who submitted this proof can dispute it.';
    if (proof.status !== 'rejected') return 'Only rejected proofs can be disputed.';
    proof.status = 'disputed';
    proof.note = note?.trim() || 'Promoter disputes the rejection.';
    add('reports', {
      id: uid('rep'), reporterId: u.id, targetType: 'campaign', targetId: m.id, reason: 'no_show',
      details: `Result proof dispute: ${proof.description} — ${proof.note}`, status: 'under_review', createdAt: Date.now(), linkedCampaignId: m.id,
    });
    notifyAdmins('report', 'Result proof disputed', `${publicName(u)} disputed a rejection on “${m.title}”.`, '/admin/disputes');
    log(u.id, 'dispute_result_proof', 'campaign', m.id, proofId);
    emit();
    return null;
  },

  /** Admin only: resolve a disputed result proof. */
  resolveResultDispute(proofId: string, confirm: boolean, note: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    if (!note?.trim()) return 'Add a resolution note for both sides.';
    const err = this.decideResultProof(proofId, confirm, { rating: confirm ? 4 : undefined, feedback: confirm ? 'Accepted by admin resolution.' : undefined, note: note.trim() });
    if (err) return err;
    emit();
    return null;
  },

  /** Owner only: shortlist or decline an application on their own Campaign. */
  setApplicationStatus(applicationId: string, status: 'shortlisted' | 'declined' | 'withdrawn'): string | null {
    const u = currentUser();
    const ap = byId(state.applications, applicationId);
    if (!u || !ap) return 'Application not found.';
    const m = byId(state.campaigns, ap.campaignId);
    if (!m || m.ownerUserId !== u.id) return 'Only the Campaign Owner can decide applications.';
    if (status === 'withdrawn') {
      if (ap.applicantId !== u.id) return 'Only the applicant can withdraw.';
    } else if (!['pending', 'shortlisted'].includes(ap.status)) {
      return 'This application has already been decided.';
    }
    ap.status = status;
    if (m) {
      notify(ap.applicantId, 'application', status === 'shortlisted' ? 'You’ve been shortlisted 🎯' : 'Application update', status === 'shortlisted' ? `For “${m.title}” — the owner wants to talk.` : `Your application to “${m.title}” was ${status}.`, `/app/campaign/${m.id}`);
    }
    log(u.id, 'application_status', 'application', ap.id, status);
    emit();
    return null;
  },

  /** Owner only: assign a Campaign to one applicant. Snapshots the scope once. */
  selectApplicant(applicationId: string): string | null {
    const u = currentUser();
    const ap = byId(state.applications, applicationId);
    if (!u || !ap) return 'Application not found.';
    const m = byId(state.campaigns, ap.campaignId);
    if (!m) return 'Campaign not found.';
    if (m.ownerUserId !== u.id) return 'Only the Campaign Owner can select a contributor.';
    if (!['open', 'shortlisting'].includes(m.status)) return 'This Campaign is no longer accepting selections.';
    if (state.assignments.some((x) => x.campaignId === m.id)) return 'This Campaign is already assigned.';
    if (!['pending', 'shortlisted'].includes(ap.status)) return 'This application is no longer available.';
    const applicant = byId(state.users, ap.applicantId);
    if (!applicant || applicant.verificationStatus !== 'verified') return 'Only verified students can be selected.';
    // immutable snapshot of the scope at assignment time (task Campaigns)
    m.snapshot = {
      title: m.title, brief: m.brief, desiredOutcome: m.desiredOutcome ?? m.brief,
      deliverables: [...(m.deliverables ?? [])], deadline: m.deadline, checklist: [...(m.checklist ?? [])], capturedAt: Date.now(),
    };
    let contributorIds: string[];
    let squadId: string | undefined;
    if (ap.squadId) {
      squadId = ap.squadId;
      contributorIds = state.squadMembers.filter((sm) => sm.squadId === ap.squadId && sm.status === 'accepted').map((sm) => sm.userId);
      if (contributorIds.length < 2) return 'The Squad needs at least 2 accepted members to take this Campaign.';
    } else {
      contributorIds = [ap.applicantId];
    }
    add('assignments', {
      id: uid('as'), campaignId: m.id, contributorIds, squadId, status: 'assigned', deadline: m.deadline,
      createdAt: Date.now(), paymentArrangedBy: [],
    });
    // close other open applications
    state.applications.forEach((a) => {
      if (a.campaignId === m.id && a.id !== applicationId && ['pending', 'shortlisted'].includes(a.status)) {
        a.status = 'declined';
        notify(a.applicantId, 'application', 'Campaign assigned to another contributor', `“${m.title}” has been assigned. Keep building your Passport — new Campaigns match your skills.`, '/app/campaigns');
      }
    });
    ap.status = 'selected';
    m.status = 'assigned';
    // open file sharing for all related conversations
    state.conversations.filter((c) => c.campaignId === m.id && c.participantIds.some((p) => contributorIds.includes(p))).forEach((c) => { c.fileSharingOpen = true; });
    contributorIds.forEach((cid) => {
      notify(cid, 'assignment', 'You’ve been assigned 🎯', `You were selected for “${m.title}”. The scope is now locked — work starts in your workspace.`, `/app/workspace/${m.id}`);
    });
    log(u.id, 'select_applicant', 'campaign', m.id, `Selected ${ap.squadId ? 'squad' : 'applicant'} ${ap.applicantId}`);
    emit();
    return null;
  },

  /* ---------- workspace ---------- */
  assignmentFor(campaignId: string): CampaignAssignment | undefined {
    return state.assignments.find((a) => a.campaignId === campaignId);
  },  startCampaign(campaignId: string): string | null {
    const u = currentUser();
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const m = byId(state.campaigns, campaignId);
    if (!u || !a || !m) return 'Campaign not found.';
    if (!a.contributorIds.includes(u.id) && m.ownerUserId !== u.id) return 'Only assigned contributors can start the work.';
    if (a.status !== 'assigned') return 'Only assigned Campaigns can be started.';
    a.status = 'in_progress';
    m.status = 'in_progress';
    log(u.id, 'start_campaign', 'campaign', campaignId);
    emit();
    return null;
  },

  /** Two-sided confirmation: each party marks it; “confirmed” only once both have. */
  confirmPaymentArranged(campaignId: string): string | null {
    const u = currentUser();
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const m = byId(state.campaigns, campaignId);
    if (!u || !a || !m) return 'Campaign not found.';
    const ownerId = m.ownerUserId;
    const contributorIds = a.contributorIds;
    if (u.id !== ownerId && !contributorIds.includes(u.id)) return 'Only the Campaign Owner or assigned contributors can confirm the payment arrangement.';
    if (a.paymentArrangedBy.includes(u.id)) return 'You already confirmed this arrangement.';
    if (['submitted', 'revision_requested', 'accepted'].includes(a.status)) return 'Confirm the arrangement before work is submitted.';
    a.paymentArrangedBy.push(u.id);
    const bothSides = a.paymentArrangedBy.includes(ownerId) && contributorIds.some((c) => a.paymentArrangedBy.includes(c));
    if (bothSides) a.paymentArrangedAt = Date.now();
    // tell the other side(s)
    const others = [ownerId, ...contributorIds].filter((x) => x !== u.id);
    const side = bothSides ? 'Payment arrangement confirmed by both sides 💳' : 'Payment arrangement confirmed by one side 💳';
    others.forEach((oid) => notify(oid, 'workspace', side, `On “${m.title}” — ${publicName(u)} confirmed the outside-platform arrangement${bothSides ? '' : '. Waiting on your confirmation.'} CampusHustle never holds payments.`, `/app/workspace/${m.id}`));
    log(u.id, 'confirm_payment_arrangement', 'campaign', campaignId, bothSides ? 'both sides' : 'one side');
    emit();
    return null;
  },

  submitDeliverables(campaignId: string, items: { title: string; link?: string; file?: string; note?: string }[]): string | null {
    const u = currentUser();
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const m = byId(state.campaigns, campaignId);
    if (!u || !a || !m) return 'Campaign not found.';
    if (!a.contributorIds.includes(u.id)) return 'Only assigned contributors can submit deliverables.';
    if (!['assigned', 'in_progress', 'revision_requested'].includes(a.status)) return 'This Campaign is not in a submittable state.';
    const clean = items.filter((i) => i.title.trim() && (i.link || i.file));
    clean.forEach((i) => {
      add('deliverables', { id: uid('dl'), assignmentId: a.id, uploaderId: u.id, title: i.title.trim(), link: i.link, file: i.file, note: i.note, createdAt: Date.now() });
    });
    if (clean.length > 0) {
      a.status = 'submitted';
      a.submittedAt = Date.now();
      m.status = 'submitted';
      notify(m.ownerUserId, 'workspace', 'Deliverables submitted 📦', `${publicName(u)} submitted work on “${m.title}”.`, `/app/workspace/${m.id}`);
      log(u.id, 'submit_deliverables', 'campaign', campaignId, `${clean.length} items`);
    } else {
      return 'Add at least one deliverable with a link or file.';
    }
    emit();
    return null;
  },

  requestRevision(campaignId: string, note: string): string | null {
    const u = currentUser();
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const m = byId(state.campaigns, campaignId);
    if (!u || !a || !m) return 'Campaign not found.';
    if (m.ownerUserId !== u.id) return 'Only the Campaign Owner can request a revision.';
    if (a.status !== 'submitted') return 'Revisions can only be requested after work is submitted.';
    if (!note.trim()) return 'Explain what needs revising.';
    a.status = 'revision_requested';
    m.status = 'revision_requested';
    a.contributorIds.forEach((cid) => notify(cid, 'workspace', 'Revision requested', `On “${m.title}”: ${note}`, `/app/workspace/${m.id}`));
    log(u.id, 'request_revision', 'campaign', campaignId, note);
    emit();
    return null;
  },

  /** Either party may propose a scope change while work is live — the OTHER side decides. */
  requestChange(campaignId: string, by: 'owner' | 'contributor', text: string): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    if (!u || !m || !a) return 'Campaign not found.';
    if (!isInvolvedWithCampaign(m, u.id)) return 'Only the owner or assigned contributors can request scope changes.';
    if (by === 'owner' && m.ownerUserId !== u.id) return 'Only the owner can file an owner change request.';
    if (by === 'contributor' && !a.contributorIds.includes(u.id)) return 'Only assigned contributors can file this change request.';
    if (!['assigned', 'in_progress', 'revision_requested'].includes(a.status)) return 'Scope changes are only possible while the Campaign is live.';
    if (!text.trim()) return 'Describe the change you need.';
    if (m.changeRequests.some((c) => c.status === 'pending')) return 'Resolve the pending change request first.';

    m.changeRequests.push({ id: uid('cr'), by, text: text.trim(), status: 'pending', createdAt: Date.now() });
    const other = by === 'owner' ? a.contributorIds : [m.ownerUserId];
    other.forEach((oid) => notify(oid, 'workspace', 'Change requested on locked scope', `“${m.title}”: ${text}`, `/app/workspace/${m.id}`));
    log(u.id, 'request_change', 'campaign', campaignId, by);
    emit();
    return null;
  },

  /** The counterparty decides a pending change request. */
  decideChangeRequest(campaignId: string, changeId: string, accept: boolean, newDeadline?: number): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!u || !m) return 'Campaign not found.';
    const cr = m.changeRequests.find((x) => x.id === changeId);
    if (!cr) return 'Change request not found.';
    if (cr.status !== 'pending') return 'This change request was already decided.';
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const decidedByOwner = cr.by === 'contributor';
    if (decidedByOwner) {
      if (m.ownerUserId !== u.id) return 'Only the Campaign Owner can decide this request.';
    } else {
      if (!a?.contributorIds.includes(u.id)) return 'Only the assigned contributor can decide this request.';
    }
    cr.status = accept ? 'accepted' : 'declined';
    cr.decidedBy = u.id;
    cr.decidedAt = Date.now();
    if (accept && a) {
      if (newDeadline && Number.isFinite(newDeadline) && newDeadline > Date.now()) a.deadline = newDeadline;
      if (a.status === 'revision_requested') { a.status = 'in_progress'; m.status = 'in_progress'; }
    }
    const others = cr.by === 'owner' ? a?.contributorIds ?? [] : [m.ownerUserId];
    others.forEach((oid) => notify(oid, 'workspace', accept ? 'Change request accepted' : 'Change request declined', `On “${m.title}” — ${accept ? 'the scope change was approved and recorded' : 'the scope stays locked as originally agreed'}.`, `/app/workspace/${m.id}`));
    log(u.id, accept ? 'accept_change_request' : 'decline_change_request', 'campaign', campaignId);
    emit();
    return null;
  },

  /** Owner accepts the work: issues GrowthProof to every contributing member + records their review. */
  acceptCampaign(campaignId: string, feedbacks: { userId: string; rating: number; feedback: string; onTime: boolean }[]): string | null {
    const u = currentUser();
    const m = byId(state.campaigns, campaignId);
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    const biz = m ? state.businesses.find((b) => b.id === m.businessProfileId) : undefined;
    if (!u || !m || !a) return 'Campaign not found.';
    if (m.ownerUserId !== u.id) return 'Only the vendor who owns this Campaign can accept the work.';
    if (a.status !== 'submitted') return 'Work must be submitted and reviewed before acceptance.';
    if (!m.snapshot) return 'This Campaign has no locked scope snapshot — it was never assigned properly.';
    const submitted = state.deliverables.some((d) => d.assignmentId === a.id);
    if (!submitted) return 'No deliverables were submitted for this Campaign.';
    if (state.growthproof.some((w) => w.campaignId === campaignId)) return 'GrowthProof was already issued for this Campaign.';
    // every assigned contributor must be rated, and only contributors can be rated
    const contributorIds = [...a.contributorIds];
    if (feedbacks.length !== contributorIds.length) return 'Rate every contributing member before accepting.';
    for (const fb of feedbacks) {
      if (!contributorIds.includes(fb.userId)) return 'You tried to rate someone who was not assigned to this Campaign.';
      if (!Number.isFinite(fb.rating) || fb.rating < 1 || fb.rating > 5) return 'Ratings must be between 1 and 5 stars.';
    }
    const rated = new Set(feedbacks.map((f) => f.userId));
    if (contributorIds.some((c) => !rated.has(c))) return 'Rate every contributing member before accepting.';      a.status = 'accepted';
    m.status = 'growthproof_issued';
    celebrate('🏆', 'Campaign accepted', `WorkProof issued to ${feedbacks.length} contributor${feedbacks.length > 1 ? 's' : ''} — check your Passport.`);
    const roleOf = (uid: string): string => {
      if (a.squadId) {
        const sm = state.squadMembers.find((x) => x.squadId === a.squadId && x.userId === uid);
        return sm?.role ?? 'Squad member';
      }
      const cu = byId(state.users, uid);
      return roleForCampaign(cu?.skills ?? [], m.skills);
    };
    feedbacks.forEach((fb) => {
      const entry: GrowthProofEntry = {
        id: uid('wp'),
        userId: fb.userId,
        campaignId: m.id,
        role: roleOf(fb.userId),
        campaignType: m.campaignType,
        skills: [...m.skills],
        acceptedAt: Date.now(),
        rating: fb.rating,
        onTime: fb.onTime,
        feedback: fb.feedback,
        businessName: biz?.businessName ?? 'Student business',
        campaignTitle: m.title,
        visibility: 'campus',
        verified: true,
      };
      add('growthproof', entry);
      const tu = byId(state.users, fb.userId);
      if (tu) {
        tu.stats.acceptedCampaigns++;
        if (fb.onTime) tu.stats.onTimeCampaigns++; else tu.stats.lateDeliveries++;
      }
      add('reviews', {
        id: uid('rv'), targetId: fb.userId, authorId: m.ownerUserId, growthproofId: entry.id, campaignId: m.id,
        rating: fb.rating, reason: fb.rating >= 4 ? 'quality' : 'communication', text: fb.feedback, hidden: false, createdAt: Date.now(),
      });
      notify(fb.userId, 'growthproof', 'GrowthProof issued ✅', `“${m.title}” was accepted. Entry added to your Passport with your rating and feedback.`, '/app/passport');
    });
    log(u.id, 'accept_campaign', 'campaign', m.id, `${feedbacks.length} GrowthProof entries issued`);
    track('campaign_accepted', { campaignId: m.id }, m.ownerUserId);
    emit();
    return null;
  },

  /** Admin only: correct a GrowthProof entry with an audit reason. */
  correctGrowthproof(entryId: string, note: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const entry = byId(state.growthproof, entryId);
    if (!entry) return 'GrowthProof entry not found.';
    if (!note.trim()) return 'Add the correction reason — it is shown to the student and kept in the audit log.';
    entry.corrected = { by: state.sessionUserId ?? 'system', note: note.trim(), at: Date.now() };
    notify(entry.userId, 'growthproof', 'GrowthProof entry corrected', `Admin corrected “${entry.campaignTitle}” — ${note}`, '/app/passport');
    log(state.sessionUserId ?? 'system', 'correct_growthproof', 'growthproof', entryId, note);
    emit();
    return null;
  },

  /** Only the owner of an entry may change its visibility. */
  setGrowthproofVisibility(entryId: string, visibility: GrowthProofVisibility): string | null {
    const u = currentUser();
    const entry = byId(state.growthproof, entryId);
    if (!u || !entry) return 'Entry not found.';
    if (entry.userId !== u.id) return 'Only the student who earned the entry can change its visibility.';
    entry.visibility = visibility;
    log(u.id, 'set_growthproof_visibility', 'growthproof', entryId, visibility);
    emit();
    return null;
  },

  /* ---------- skill checks ---------- */
  submitSkillCheck(input: { track: SkillCheck['track']; submissionName: string; notes?: string }): string | null {
    const u = currentUser();
    if (!u) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can submit Skill Checks.';
    if (state.skillChecks.some((s) => s.userId === u.id && s.track === input.track && s.status === 'pending')) return 'You already have a Skill Check under review for this track.';
    if (!rlAllowed(u.id, 'skillcheck', 3, 24 * 3600000)) return 'Skill Check submission limit reached for today.';
    const attempts = state.skillChecks.filter((s) => s.userId === u.id && s.track === input.track).length;
    add('skillChecks', { id: uid('sc'), userId: u.id, track: input.track, submissionName: input.submissionName, notes: input.notes, status: 'pending', submittedAt: Date.now(), attempt: attempts + 1 });
    notifyAdmins('skillcheck', 'Skill Check submitted for review', `${u.firstName} submitted a ${input.track} Skill Check (attempt ${attempts + 1}).`, '/admin/skillchecks');
    log(u.id, 'submit_skillcheck', 'skillcheck', undefined, input.track);
    emit();
    return null;
  },

  /** Admin only. */
  decideSkillCheck(checkId: string, result: 'skill_checked' | 'needs_improvement', feedback: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const sc = state.skillChecks.find((x) => x.id === checkId);
    if (!sc) return 'Skill Check not found.';
    if (sc.status !== 'pending') return 'This Skill Check was already decided.';
    sc.status = result;
    sc.reviewerId = state.sessionUserId ?? undefined;
    sc.reviewedAt = Date.now();
    sc.feedback = feedback;
    const u = byId(state.users, sc.userId);
    if (u) {
      notify(u.id, 'skillcheck', result === 'skill_checked' ? 'You’re Skill-Checked 🎯' : 'Skill Check needs improvement', result === 'skill_checked' ? `Your ${sc.track} check was approved.` : feedback, '/app/skill-checks');
    }
    log(state.sessionUserId ?? 'system', result === 'skill_checked' ? 'approve_skillcheck' : 'reject_skillcheck', 'skillcheck', sc.id, feedback);
    emit();
    return null;
  },

  /* ---------- squads ---------- */
  squadLocked(squadId: string): boolean {
    return state.assignments.some((a) => a.squadId === squadId && ['assigned', 'in_progress', 'submitted', 'revision_requested'].includes(a.status));
  },

  createSquad(name: string): string | null {
    const u = currentUser();
    if (!u) return 'Please log in.';
    if (u.verificationStatus !== 'verified') return 'Only verified students can lead a Squad.';
    if (u.warnCount >= 3) return 'You cannot lead a Squad with unresolved reports.';
    if (state.squads.some((s) => s.leadId === u.id)) return 'You already lead a Squad.';
    if (!rlAllowed(u.id, 'create_squad', 3, 24 * 3600000)) return 'Squad creation limit reached for today.';
    const s: Squad = { id: uid('sq'), name: name.trim(), leadId: u.id, campusId: u.campusId, createdAt: Date.now() };
    add('squads', s);
    add('squadMembers', { squadId: s.id, userId: u.id, role: 'Squad Lead', status: 'accepted' });
    emit();
    return null;
  },

  inviteToSquad(squadId: string, username: string, role: string): string | null {
    const u = currentUser();
    const squad = byId(state.squads, squadId);
    if (!u || !squad) return 'Squad not found.';
    if (squad.leadId !== u.id) return 'Only the Squad Lead can invite members.';
    if (this.squadLocked(squadId)) return 'This Squad is on an active Campaign — membership is locked until it completes.';
    if (!rlAllowed(u.id, 'invite_squad', 20, 24 * 3600000)) return 'Invitation limit reached for today.';
    const target = state.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!target) return 'No verified student with that username.';
    if (target.verificationStatus !== 'verified') return 'Invitees must be verified students.';
    if (state.squadMembers.some((sm) => sm.squadId === squadId && sm.userId === target.id)) return `${publicName(target)} is already in this Squad.`;
    const members = state.squadMembers.filter((sm) => sm.squadId === squadId && sm.status === 'accepted');
    if (members.length >= 5) return 'Squads hold 2–5 members.';
    add('squadMembers', { squadId, userId: target.id, role: role.trim() || 'Member', status: 'invited' });
    notify(target.id, 'squad', 'Squad invitation', `${publicName(u)} invited you to join “${squad.name}” as ${role.trim() || 'Member'}.`, `/app/squads`);
    log(u.id, 'invite_squad_member', 'squad', squadId, target.id);
    emit();
    return null;
  },

  respondToInvite(squadId: string, accept: boolean): string | null {
    const u = currentUser();
    const sm = state.squadMembers.find((x) => x.squadId === squadId && x.userId === u?.id);
    if (!u || !sm) return 'Invitation not found.';
    if (sm.status === 'accepted') return 'You already accepted this invitation.';
    sm.status = accept ? 'accepted' : 'invited';
    if (!accept) {
      const i = state.squadMembers.findIndex((x) => x.squadId === squadId && x.userId === u.id);
      state.squadMembers.splice(i, 1);
    }
    const squad = byId(state.squads, squadId);
    if (squad) {
      notify(squad.leadId, 'squad', accept ? 'Squad invitation accepted' : 'Squad invitation declined', `${publicName(u)} ${accept ? 'joined' : 'declined'} “${squad.name}”.`, '/app/squads');
    }
    emit();
    return null;
  },

  /** Squad Lead only — roles can't change while a Campaign is live. */
  setMemberRole(squadId: string, userId: string, role: string): string | null {
    const u = currentUser();
    const squad = byId(state.squads, squadId);
    if (!u || !squad || squad.leadId !== u.id) return 'Only the Squad Lead can set roles.';
    if (this.squadLocked(squadId)) return 'Roles are locked while this Squad is on an active Campaign.';
    const sm = state.squadMembers.find((x) => x.squadId === squadId && x.userId === userId);
    if (sm) sm.role = role.trim();
    emit();
    return null;
  },

  /* ---------- chat ---------- */
  /** Whether two users may talk: existing conversation, or a real Campaign relation. */
  canChatWith(meId: string, otherId: string, campaignId?: string): boolean {
    // reopening an existing conversation is always allowed (both joined it before)
    if (conversationWith(meId, otherId, campaignId)) return true;
    if (campaignId) {
      const m = byId(state.campaigns, campaignId);
      if (!m) return false;
      const owner = m.ownerUserId;
      // owner <-> applicant on this Campaign
      if ((owner === meId || owner === otherId)) {
        const other = owner === meId ? otherId : meId;
        const ap = state.applications.find((a) => a.campaignId === campaignId && a.applicantId === other);
        if (ap) return true;
        const asg = state.assignments.find((a) => a.campaignId === campaignId);
        if (asg && asg.contributorIds.includes(other)) return true;
      }
      // squadmates talking about a squad Campaign
      const asg = state.assignments.find((a) => a.campaignId === campaignId && a.squadId);
      if (asg) {
        const inBoth = [meId, otherId].every((x) => asg.contributorIds.includes(x));
        if (inBoth) return true;
      }
      return false;
    }
    // no Campaign: only existing conversations (a prior application/consent) qualify
    return false;
  },

  openConversation(userId: string, campaignId?: string): string | null {
    const me = currentUser();
    if (!me) return null;
    if (userId === me.id) return null;
    const other = byId(state.users, userId);
    if (!other) return null;
    // ambassadors and admins may reach students for support; everyone else needs a Campaign relation
    if (!isAdminUser(other) && other.role !== 'ambassador' && !this.canChatWith(me.id, userId, campaignId)) return null;
    const c = getOrCreateConversation(me.id, userId, campaignId);
    emit();
    return c.id;
  },

  markConversationRead(conversationId: string): string | null {
    const me = currentUser();
    const c = byId(state.conversations, conversationId);
    if (!me || !c) return 'Conversation not found.';
    if (!c.participantIds.includes(me.id)) return 'You are not part of this conversation.';
    let changed = false;
    state.messages.forEach((m) => {
      if (m.conversationId === conversationId && m.senderId !== me.id && !m.readBy.includes(me.id)) {
        m.readBy.push(me.id);
        changed = true;
      }
    });
    if (changed) emit();
    return null;
  },

  sendMessage(conversationId: string, text: string, kind: Message['kind'] = 'text', attachmentName?: string, attachmentMeta?: { name: string; size?: number; type?: string }): string | null {
    const me = currentUser();
    const c = byId(state.conversations, conversationId);
    if (!me || !c) return 'Conversation not found.';
    if (!c.participantIds.includes(me.id)) return 'You are not part of this conversation.';
    if (c.blockedBy.includes(me.id)) return 'This conversation is blocked — unblock it before sending.';
    if (c.blockedBy.includes(c.participantIds.find((p) => p !== me.id) ?? '')) return 'The other person blocked this conversation.';
    if (me.verificationStatus === 'unverified') return 'Verify your student account to keep messaging.';
    const dailyLimit = me.verificationStatus === 'verified' ? 300 : 40;
    if (!rlAllowed(me.id, 'messages', dailyLimit, 24 * 3600000)) return 'Daily message limit reached. Try again tomorrow.';
    if (!text.trim() && kind === 'text') return 'Write a message first.';
    if (containsAbuse(text)) return 'That message looks abusive. Please keep it respectful.';
    const links = countLinks(text);
    if (links > 0) {
      const myLinkMsgs = state.messages.filter((m) => m.conversationId === conversationId && m.senderId === me.id && countLinks(m.text) > 0).length;
      if (myLinkMsgs >= 2) return 'Repeated links look like spam and were blocked.';
    }
    if ((kind === 'file' || kind === 'image') && !fileSharingAllowed(c)) {
      return 'Files unlock once you’re assigned to the Campaign or shortlisted. Keep it to text for now.';
    }
    if ((kind === 'file' || kind === 'image') && !attachmentName) return 'Attach a file first.';
    addMessage(conversationId, me.id, text, kind, attachmentName, attachmentMeta);
    const otherId = c.participantIds.find((p) => p !== me.id) ?? '';
    notify(otherId, 'message', `New message from ${publicName(me)}`, (kind === 'text' ? text : attachmentName ?? 'Attachment').slice(0, 90), `/app/chat/${conversationId}`);
    track('message_sent', { kind }, me.id);
    emit();
    if (c.blockedBy.length === 0) scheduleReply(conversationId, otherId);
    return null;
  },

  /** Participant only: block the conversation from your side. */
  blockConversation(conversationId: string): string | null {
    const me = currentUser();
    const c = byId(state.conversations, conversationId);
    if (!me || !c) return 'Conversation not found.';
    if (!c.participantIds.includes(me.id)) return 'You are not part of this conversation.';
    if (!c.blockedBy.includes(me.id)) c.blockedBy.push(me.id);
    log(me.id, 'block_conversation', 'conversation', conversationId);
    emit();
    return null;
  },

  /** Participant only: unblock your own side. */
  unblockConversation(conversationId: string): string | null {
    const me = currentUser();
    const c = byId(state.conversations, conversationId);
    if (!me || !c) return 'Conversation not found.';
    if (!c.participantIds.includes(me.id)) return 'You are not part of this conversation.';
    c.blockedBy = c.blockedBy.filter((x) => x !== me.id);
    log(me.id, 'unblock_conversation', 'conversation', conversationId);
    emit();
    return null;
  },

  /* ---------- reports ---------- */
  fileReport(input: { targetType: string; targetId: string; reason: string; details?: string; linkedCampaignId?: string }): string | null {
    const me = currentUser();
    if (!me) return 'Please log in.';
    if (!input.reason) return 'Choose a report reason.';
    if (!rlAllowed(me.id, 'reports', 5, 24 * 3600000)) return 'Report limit reached for today (5). Please wait until tomorrow.';
    const dup = state.reports.some((r) => r.reporterId === me.id && r.targetId === input.targetId && r.reason === input.reason && ['open', 'under_review'].includes(r.status));
    if (dup) return 'You already reported this — it’s with the admins.';
    add('reports', {
      id: uid('rep'), reporterId: me.id, targetType: input.targetType as any, targetId: input.targetId,
      reason: input.reason as any, details: input.details?.trim(), status: 'open', createdAt: Date.now(), linkedCampaignId: input.linkedCampaignId,
    });
    notifyAdmins('report', 'New report opened', `${publicName(me)} reported a ${input.targetType}: ${input.reason}.`, '/admin/reports');
    log(me.id, 'file_report', input.targetType, input.targetId, input.reason);
    emit();
    return null;
  },

  /** Only owner or assigned contributors may dispute a live Campaign. */
  flagCampaignDispute(campaignId: string, reason: string, details?: string): string | null {
    const me = currentUser();
    const m = byId(state.campaigns, campaignId);
    if (!me || !m) return 'Campaign not found.';
    if (!isInvolvedWithCampaign(m, me.id)) return 'Only the owner or assigned contributors can dispute this Campaign.';
    if (!['assigned', 'in_progress', 'submitted', 'revision_requested'].includes(m.status)) return 'Only live Campaigns can be disputed.';
    if (state.reports.some((r) => r.linkedCampaignId === campaignId && r.status === 'under_review')) return 'This Campaign is already under dispute review.';
    if (!rlAllowed(me.id, 'disputes', 3, 24 * 3600000)) return 'Dispute limit reached for today.';
    m.status = 'disputed';
    add('reports', {
      id: uid('rep'), reporterId: me.id, targetType: 'campaign', targetId: campaignId, reason: reason as any,
      details: details?.trim(), status: 'under_review', createdAt: Date.now(), linkedCampaignId: campaignId,
    });
    notifyAdmins('report', 'Campaign disputed', `“${m.title}” was disputed — ${reason}`, '/admin/disputes');
    log(me.id, 'dispute_campaign', 'campaign', campaignId, details);
    emit();
    return null;
  },

  /** Admin only. */
  resolveReport(reportId: string, resolution: string, action?: 'warn' | 'suspend' | 'remove' | 'none'): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const rep = byId(state.reports, reportId);
    if (!rep) return 'Report not found.';
    if (rep.status === 'resolved' || rep.status === 'dismissed') return 'This report was already resolved.';
    rep.status = 'resolved';
    rep.resolution = resolution?.trim() || 'Resolved by campus admin.';
    rep.resolvedBy = state.sessionUserId ?? undefined;
    rep.resolvedAt = Date.now();
    if (action && action !== 'none' && rep.targetType === 'user') {
      const target = byId(state.users, rep.targetId);
      if (target) {
        if (action === 'warn') {
          target.warnCount++;
          notify(target.id, 'report', 'You received a warning', rep.resolution, '/app/passport');
        } else if (action === 'suspend') {
          target.verificationStatus = 'suspended';
          target.suspended = true;
          notify(target.id, 'report', 'Account suspended', rep.resolution, '/');
        }
      }
    }
    if (action === 'remove') {
      const m = rep.linkedCampaignId ? byId(state.campaigns, rep.linkedCampaignId) : byId(state.campaigns, rep.targetId);
      if (m) {
        m.status = 'cancelled';
        notify(m.ownerUserId, 'campaign', 'Campaign removed', 'Your Campaign was removed after review.', '/app/campaigns');
      }
    }
    notify(rep.reporterId, 'report', 'Report update', 'We reviewed your report. Thank you for keeping GrowthProof safe.', '/app/notifications');
    log(state.sessionUserId ?? 'system', 'resolve_report', 'report', rep.id, rep.resolution);
    emit();
    return null;
  },

  /** Admin only. Resolves a disputed Campaign to either GrowthProof-issued or cancelled — never both. */
  resolveDispute(campaignId: string, outcome: 'growthproof_issued' | 'cancelled', note: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const m = byId(state.campaigns, campaignId);
    const a = state.assignments.find((x) => x.campaignId === campaignId);
    if (!m) return 'Campaign not found.';
    if (m.status !== 'disputed') return 'Only disputed Campaigns can be resolved this way.';
    if (!note?.trim()) return 'Add a resolution note for both sides and the audit log.';
    const noteText = note.trim();
    if (outcome === 'growthproof_issued') {
      m.status = 'growthproof_issued';
      if (a) {
        a.status = 'accepted';
        // issue growthproof without the vendor's review step (admin-reviewed completion)
        const biz = state.businesses.find((b) => b.id === m.businessProfileId);
        a.contributorIds.forEach((cid) => {
          const existing = state.growthproof.some((w) => w.campaignId === campaignId && w.userId === cid);
          if (existing) return;
          const sm = a.squadId ? state.squadMembers.find((x) => x.squadId === a.squadId && x.userId === cid) : undefined;
          const u = byId(state.users, cid);
          if (!u) return;
          add('growthproof', {
            id: uid('wp'), userId: cid, campaignId, role: sm?.role ?? roleForCampaign(u.skills ?? [], m.skills), campaignType: m.campaignType, skills: [...m.skills],
            acceptedAt: Date.now(), rating: 4, onTime: true, feedback: `Accepted by admin resolution: ${noteText}`, businessName: biz?.businessName ?? 'Student business',
            campaignTitle: m.title, visibility: 'campus', verified: true,
          });
          u.stats.acceptedCampaigns++;
          u.stats.onTimeCampaigns++;
          notify(cid, 'growthproof', 'GrowthProof issued (admin resolution)', `“${m.title}” was accepted after review.`, '/app/passport');
        });
      }
    } else {
      m.status = 'cancelled';
      a?.contributorIds.forEach((cid) => notify(cid, 'campaign', 'Campaign cancelled after dispute', noteText, '/app/campaigns'));
    }
    state.reports.filter((r) => r.linkedCampaignId === campaignId && r.status === 'under_review').forEach((r) => { r.status = 'resolved'; r.resolution = noteText; r.resolvedBy = state.sessionUserId ?? undefined; r.resolvedAt = Date.now(); });
    log(state.sessionUserId ?? 'system', 'resolve_dispute', 'campaign', campaignId, `${outcome}: ${noteText}`);
    emit();
    return null;
  },

  /* ---------- notifications ---------- */
  markNotificationRead(id: string) {
    const n = state.notifications.find((x) => x.id === id);
    if (n && !n.read) { n.read = true; emit(); }
  },

  markAllNotificationsRead() {
    let changed = false;
    state.notifications.forEach((n) => { if (!n.read) { n.read = true; changed = true; } });
    if (changed) emit();
  },

  /* ---------- admin: users (all admin-only) ---------- */
  warnUser(userId: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const t = byId(state.users, userId);
    if (!t) return 'User not found.';
    t.warnCount++;
    notify(userId, 'system', 'You received a warning', 'Please follow the GrowthProof community rules.', '/app/passport');
    log(state.sessionUserId ?? 'system', 'warn_user', 'user', userId);
    emit();
    return null;
  },

  suspendUser(userId: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const t = byId(state.users, userId);
    if (!t) return 'User not found.';
    if (isAdminUser(t)) return 'Admins cannot suspend other admins.';
    t.verificationStatus = 'suspended';
    t.suspended = true;
    notify(userId, 'system', 'Account suspended', 'Your account was suspended by campus admin.', '/');
    log(state.sessionUserId ?? 'system', 'suspend_user', 'user', userId);
    emit();
    return null;
  },

  restoreUser(userId: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const t = byId(state.users, userId);
    if (!t) return 'User not found.';
    t.suspended = undefined;
    t.verificationStatus = 'verified';
    notify(userId, 'system', 'Account restored', 'Your account is active again.', '/app/passport');
    log(state.sessionUserId ?? 'system', 'restore_user', 'user', userId);
    emit();
    return null;
  },

  makeAmbassador(userId: string): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const t = byId(state.users, userId);
    if (!t) return 'User not found.';
    if (t.verificationStatus !== 'verified') return 'Only verified students can become ambassadors.';
    if (t.role === 'ambassador' || t.ambassadorId) return 'This user is already an ambassador.';
    if (isAdminUser(t)) return 'Admins are not made ambassadors.';
    t.role = 'ambassador';
    const amb = {
      id: uid('amb'), userId, campusId: t.campusId, vendorsRecruited: 0, promotersRecruited: 0, approvedReferrals: 0,
      completedCampaigns: 0, retained30Days: 0, rewardStatus: 'pending', rewardEarned: 0, monthlyTarget: 5,
    };
    add('ambassadors', amb);
    t.ambassadorId = amb.id;
    notify(userId, 'system', 'You’re now a campus ambassador 🎉', 'Recruit quality Campaign Owners and contributors.', '/ambassador');
    log(state.sessionUserId ?? 'system', 'make_ambassador', 'user', userId);
    emit();
    return null;
  },

  hideReview(reviewId: string, hide: boolean): string | null {
    const denied = allowAdmin();
    if (denied) return denied;
    const rv = state.reviews.find((r) => r.id === reviewId);
    if (!rv) return 'Review not found.';
    rv.hidden = hide;
    log(state.sessionUserId ?? 'system', hide ? 'hide_review' : 'unhide_review', 'review', reviewId);
    emit();
    return null;
  },

  resetDemo() {
    replyTimers.forEach((t) => window.clearTimeout(t));
    replyTimers = [];
    clearRateLimits();
    state = buildSeed();
    emit();
  },
};

export { unreadFor };