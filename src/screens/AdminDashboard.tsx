import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, levelInfo, userRating } from '../lib/store';
import { Avatar, StatusChip, toast, LogoMark, RatingStars } from '../components/ui';
import { IconDashboard, IconUsers, IconTarget, IconBox, IconFlag, IconShield, IconPassport, IconSettings, IconCrown, IconCheck, IconMegaphone, IconX, IconSearch } from '../components/icons';
import { timeAgo, dateShort } from '../lib/format';
import { CAMPAIGN_TYPE_MAP, MISSION_STATUS_LABEL, REPORT_REASONS, KIND_OF } from '../lib/domain';
import type { AppState, Report, User, Campaign, GrowthProofEntry } from '../lib/types';

type S = AppState;
type A = ReturnType<typeof useApp>['actions'];

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={16} /> },
  { key: 'verifications', label: 'Verification queue', icon: <IconShield size={16} /> },
  { key: 'businesses', label: 'Business approvals', icon: <IconCrown size={16} /> },
  { key: 'campaigns', label: 'Campaign approvals', icon: <IconTarget size={16} /> },
  { key: 'active', label: 'Active Campaigns', icon: <IconBox size={16} /> },
  { key: 'reports', label: 'Reports', icon: <IconFlag size={16} /> },
  { key: 'disputes', label: 'Disputes', icon: <IconShield size={16} /> },
  { key: 'corrections', label: 'GrowthProof corrections', icon: <IconPassport size={16} /> },
  { key: 'users', label: 'Users', icon: <IconUsers size={16} /> },
  { key: 'squads', label: 'Squads', icon: <IconUsers size={16} /> },
  { key: 'ambassadors', label: 'Ambassadors', icon: <IconMegaphone size={16} /> },
  { key: 'analytics', label: 'Analytics', icon: <IconDashboard size={16} /> },
  { key: 'audit', label: 'Audit log', icon: <IconSettings size={16} /> },
];

export default function AdminDashboard() {
  const { state, actions } = useApp();
  const me = currentUser();
  const nav = useNavigate();
  const location = useLocation();
  const seg = location.pathname.replace('/admin', '').replace(/^\//, '').split('/')[0];
  const active = SECTIONS.some((s) => s.key === seg) ? seg : 'dashboard';

  if (!me || (me.role !== 'admin' && me.role !== 'superadmin')) {
    return (
      <div className="app-frame">
        <div style={{ padding: '30px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🔐</div>
          <h2>Admins only</h2>
          <p className="subtle" style={{ margin: '8px 0 18px' }}>Log in with an admin demo account (admin / password123) to open this dashboard.</p>
          <button className="btn btn-primary" onClick={() => nav('/login')}>Go to login</button>
        </div>
      </div>
    );
  }

  const LogoutBar = () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18, padding: '10px 10px 4px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 12.5 }}>
      <Avatar user={me} size="xs" />
      <div className="grow" style={{ lineHeight: 1.2 }}>
        <div style={{ color: '#fff', fontWeight: 800 }}>{publicName(me)}</div>
        <div style={{ fontSize: 11 }}>Super admin · UNILAG</div>
      </div>
      <button onClick={() => { actions.logout(); nav('/'); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }} title="Log out">⎋</button>
    </div>
  );

  return (
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="aside-brand"><LogoMark size={26} /> GrowthProof Admin</div>
        {SECTIONS.map((s) => (
          <Link key={s.key} to={`/admin/${s.key}`} className={active === s.key ? 'active' : ''}>{s.icon}{s.label}</Link>
        ))}
        <Link to="/app/home" className="hide-desktop" style={{ color: '#94a3b8' }}>← Back to app</Link>
        <LogoutBar />
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="admin-mobile-tabs">
          {SECTIONS.map((s) => (
            <Link key={s.key} to={`/admin/${s.key}`} className={`chip ${active === s.key ? 'active' : ''}`} style={{ whiteSpace: 'nowrap' }}>{s.label}</Link>
          ))}
          <Link to="/app/home" className="chip">← App</Link>
        </div>
        <main className="admin-main">
          <BackToApp />
          {active === 'dashboard' && <Dash state={state} actions={actions} />}
          {active === 'verifications' && <Verifications state={state} actions={actions} />}
          {active === 'businesses' && <Businesses state={state} actions={actions} />}
          {active === 'campaigns' && <CampaignQueue state={state} actions={actions} />}
          {active === 'active' && <ActiveCampaigns state={state} actions={actions} />}
          {active === 'reports' && <Reports state={state} actions={actions} />}
          {active === 'disputes' && <Disputes state={state} actions={actions} />}
          {active === 'corrections' && <Corrections state={state} actions={actions} />}
          {active === 'users' && <Users state={state} actions={actions} />}
          {active === 'squads' && <SquadsAdmin state={state} actions={actions} />}
          {active === 'ambassadors' && <Ambassadors state={state} actions={actions} />}
          {active === 'analytics' && <Analytics state={state} actions={actions} />}
          {active === 'audit' && <Audit state={state} actions={actions} />}
        </main>
      </div>
    </div>
  );
}

const BackToApp = () => (
  <Link to="/app/home" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5, color: 'var(--slate)', marginBottom: 10 }}>
    ← Back to the app
  </Link>
);

const H = ({ title, sub }: { title: string; sub?: string }) => (
  <div style={{ marginBottom: 16 }}>
    <h1 style={{ fontSize: 21 }}>{title}</h1>
    {sub && <p className="subtle" style={{ fontSize: 13 }}>{sub}</p>}
  </div>
);

/* ---------------- Dashboard ---------------- */

function Dash({ state, actions }: { state: S; actions: A }) {
  const verified = state.users.filter((u) => u.verificationStatus === 'verified').length;
  const pending = state.users.filter((u) => u.verificationStatus === 'pending').length;
  const vendors = state.businesses.filter((b) => b.status === 'approved').length;
  const campaignsPosted = state.campaigns.length;
  const assigned = state.assignments.length;
  const accepted = state.campaigns.filter((m) => m.status === 'growthproof_issued').length;
  const confirmedResults = state.campaigns.reduce((s, m) => s + (m.confirmedResults ?? 0), 0);
  const repeatVendors = state.businesses.filter((b) => state.campaigns.filter((m) => m.businessProfileId === b.id && m.status === 'growthproof_issued').length >= 2).length;
  const secondCampaign = state.users.filter((u) => state.growthproof.filter((w) => w.userId === u.id).length >= 2).length;
  const openReports = state.reports.filter((r) => r.status === 'open' || r.status === 'under_review').length;
  const ratings = state.reviews.filter((r) => !r.hidden);
  const avgRating = ratings.length ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10 : 0;
  const onTimeAll = state.growthproof.filter((w) => w.verified);
  const onTime = onTimeAll.length ? Math.round((onTimeAll.filter((w) => w.onTime).length / onTimeAll.length) * 100) : null;
  // first-review acceptance: accepted campaigns with no revision recorded
  const firstTry = state.campaigns.filter((m) => m.status === 'growthproof_issued' && !state.assignments.some((a) => a.campaignId === m.id && a.status === 'revision_requested') && m.changeRequests.length === 0).length;
  const firstRate = accepted ? Math.round((firstTry / accepted) * 100) : 0;

  const stat = (n: string | number, l: string, icon = '📌') => (
    <div className="stat-card" key={l}>
      <div className="row-between"><span className="stat-icon">{icon}</span></div>
      <div className="stat-num">{n}</div>
      <div className="stat-label">{l}</div>
    </div>
  );

  return (
    <div>
      <H title="Campus dashboard" sub="University of Lagos · GrowthProof" />
      <div className="stat-grid">
        {stat(verified, 'Verified students', '🎓')}
        {stat(pending, 'Pending verification', '🪪')}
        {stat(vendors, 'Approved student businesses', '🏪')}
        {stat(campaignsPosted, 'Campaigns posted', '🎯')}
        {stat(confirmedResults, 'Confirmed results', '✅')}
        {stat(accepted, 'Campaigns completed', '📗')}
        {stat(`${firstRate}%`, 'First-review acceptance', '🔁')}
        {stat(repeatVendors, 'Repeat vendors', '🏢')}
        {stat(secondCampaign, 'Students w/ 2nd Campaign', '📈')}
        {stat(openReports, 'Open reports', '🚩')}
        {stat(avgRating || '—', 'Average rating', '⭐')}
        {stat(onTime === null ? '—' : `${onTime}%`, onTime === null ? 'No completions yet' : 'On-time completion', '⏱️')}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 10 }}>Awaiting your review</h3>
          <div className="col" style={{ gap: 8, fontSize: 13.5 }}>
            <Row label={`${pending} verification${pending !== 1 ? 's' : ''}`} to="/admin/verifications" />
            <Row label={`${state.businesses.filter((b) => b.status === 'pending').length} student business application${state.businesses.filter((b) => b.status === 'pending').length !== 1 ? 's' : ''}`} to="/admin/businesses" />
            <Row label={`${state.campaigns.filter((m) => m.status === 'pending_review').length} Campaigns awaiting approval`} to="/admin/campaigns" />
            <Row label={`${state.campaigns.flatMap((m) => m.resultProofs).filter((p) => p.status === 'submitted').length} results waiting on vendors`} to="/admin/active" />
            <Row label={`${openReports} open report${openReports !== 1 ? 's' : ''} + disputes`} to="/admin/reports" />
          </div>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 10 }}>Latest audit events</h3>
          <div className="col" style={{ gap: 6 }}>
            {state.auditLog.slice(-5).reverse().map((a) => (
              <div key={a.id} style={{ fontSize: 12.5 }}>
                <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{a.action.replace(/_/g, ' ')}</span>
                <span className="subtle"> · {publicName(byId(state.users, a.actorId))} · {timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 10 }}>Quality signals</h3>
          <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
            <p>⭐ Average promoter/creator rating: <strong>{avgRating || '—'}</strong></p>
            <p>⏱️ On-time delivery: <strong>{onTime === null ? 'no completions yet' : `${onTime}%`}</strong></p>
            <p>🔁 Repeat vendors: <strong>{repeatVendors}</strong></p>
            <p>📗 Students on a second Campaign: <strong>{secondCampaign}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, to }: { label: string; to: string }) => (
  <Link to={to} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--mist-soft)', borderRadius: 10, fontWeight: 700, color: 'var(--navy)' }}>
    {label} <span style={{ color: 'var(--green)' }}>→</span>
  </Link>
);

/* ---------------- Verification queue ---------------- */

function Verifications({ state, actions }: { state: S; actions: A }) {
  const queue = state.verifications.filter((v) => {
    const u = byId(state.users, v.userId);
    return u && (u.verificationStatus === 'pending' || u.verificationStatus === 'rejected');
  });
  return (
    <div>
      <H title="Student verification queue" sub="Private documents — only admins can view these. Never shown on profiles." />
      {queue.length === 0 ? <EmptyAdmin emoji="🎉" text="Queue clear — no pending verifications." /> : queue.map((v) => {
        const u = byId(state.users, v.userId);
        if (!u) return null;
        return (
          <div key={v.id} className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="row-between">
              <div className="row" style={{ gap: 10 }}>
                <Avatar user={u} size="md" />
                <div>
                  <span className="strong" style={{ fontSize: 15, color: 'var(--navy)' }}>{u.firstName} {u.lastName}</span>
                  <span className="subtle" style={{ display: 'block', fontSize: 12 }}>@{u.username} · {u.faculty ?? '—'} · Level {u.level ?? '—'} · applied {timeAgo(v.submittedAt)}</span>
                  <span className="tag tag-amber" style={{ fontSize: 10.5, marginTop: 4 }}>Matric {v.matricNo} · {u.verificationStatus === 'rejected' ? `rejected: ${v.note ?? 'resubmitted'}` : 'pending'}</span>
                </div>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
              {[['🪪', v.idDocumentName], ['🤳', v.selfieName]].map(([icon, name]) => (
                <span key={name} className="attach-pill">🔒 {icon} {name}</span>
              ))}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm grow" onClick={() => { actions.decideVerification(v.id, true); toast(`${u.firstName} verified`, 'success'); }}>✓ Approve</button>
              <button className="btn btn-soft btn-sm grow" onClick={() => {
                const note = window.prompt('Reason for rejection (shown to the student):', 'Photo unclear — please retake against a plain background.');
                if (note !== null) { actions.decideVerification(v.id, false, note); toast('Rejected with note', 'info'); }
              }}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Student business approvals ---------------- */

function Businesses({ state, actions }: { state: S; actions: A }) {
  const queue = state.businesses.filter((b) => b.status === 'pending');
  return (
    <div>
      <H title="Student business approvals" sub="Any verified UNILAG student can run a business. Approve when the business looks real and matches campus rules." />
      {queue.length === 0 ? <EmptyAdmin emoji="🏪" text="No pending business applications." /> : queue.map((b) => {
        const u = byId(state.users, b.userId);
        if (!u) return null;
        return (
          <div key={b.id} className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 10 }}>
              <Avatar user={u} size="md" showVerified />
              <div>
                <span className="strong" style={{ fontSize: 15, color: 'var(--navy)' }}>{publicName(u)}</span>
                <span className="subtle" style={{ display: 'block', fontSize: 12 }}>{u.firstName} {u.lastName} · {u.department ?? '—'} · {u.level ?? '—'}L · applied {timeAgo(b.createdAt)}</span>
              </div>
            </div>
            <div className="card card-pad" style={{ margin: '10px 0', background: 'var(--mist-soft)' }}>
              <span className="tag tag-navy" style={{ fontSize: 11 }}>{b.category}</span>
              <p className="strong" style={{ fontSize: 16, color: 'var(--navy)', marginTop: 6 }}>{b.businessName}</p>
              {b.bio && <p className="subtle" style={{ fontSize: 13 }}>{b.bio}</p>}
              {b.services.length > 0 && (
                <div className="row wrap" style={{ gap: 5, marginTop: 6 }}>
                  {b.services.map((s) => <span key={s} className="skill-chip" style={{ fontSize: 11 }}>{s}</span>)}
                </div>
              )}
              {b.evidenceNote && <p className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>🔎 {b.evidenceNote}</p>}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary btn-sm grow" onClick={() => { actions.decideBusiness(b.id, true); toast(`${b.businessName} approved — can now post Campaigns`, 'success'); }}>✓ Approve</button>
              <button className="btn btn-soft btn-sm grow" onClick={() => {
                const note = window.prompt('Reason (shown to the student):', 'We couldn’t verify this business yet. Please re-apply with a sample, catalogue or social page.');
                if (note !== null) { actions.decideBusiness(b.id, false, note); toast('Rejected', 'info'); }
              }}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Campaign queue ---------------- */

function CampaignQueue({ state, actions }: { state: S; actions: A }) {
  const queue = state.campaigns.filter((m) => m.status === 'pending_review');
  return (
    <div>
      <H title="Campaign approvals" sub="Every Campaign is moderated before it goes live." />
      {queue.length === 0 ? <EmptyAdmin emoji="🎯" text="No Campaigns awaiting approval." /> : queue.map((m) => {
        const owner = byId(state.users, m.ownerUserId);
        const biz = state.businesses.find((b) => b.id === m.businessProfileId);
        const kind = KIND_OF(m.campaignType);
        return (
          <div key={m.id} className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="tag tag-green">{CAMPAIGN_TYPE_MAP[m.campaignType]?.emoji} {CAMPAIGN_TYPE_MAP[m.campaignType]?.name}</span>
              <span className="tag tag-slate">📍 {m.zone}</span>
              <span className="tag tag-gold">💰 {m.rewardType === 'per_result' ? `₦${m.rewardAmount.toLocaleString()}/result` : `₦${m.rewardAmount.toLocaleString()} fixed`}</span>
              {kind === 'result' && m.targetResults ? <span className="tag tag-navy">🎯 {m.targetResults} target</span> : null}
            </div>
            <h3 style={{ fontSize: 16, margin: '8px 0 2px', color: 'var(--navy)' }}>{m.title}</h3>
            <p className="subtle" style={{ fontSize: 12 }}>by {biz?.businessName ?? `${publicName(owner)}’s business`} ({publicName(owner)}) · due {dateShort(m.deadline)} · {kind === 'task' ? `${(m.deliverables ?? []).length} deliverable${(m.deliverables ?? []).length !== 1 ? 's' : ''}` : 'result Campaign'}</p>
            <p style={{ fontSize: 13.5, marginTop: 8, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.brief.slice(0, 320)}{m.brief.length > 320 ? '…' : ''}</p>
            {m.rewardDescription && <p className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>💬 {m.rewardDescription}</p>}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm grow" onClick={() => { actions.decideCampaign(m.id, true); toast('Campaign live 🎯', 'success'); }}>✓ Approve & publish</button>
              <button className="btn btn-outline btn-sm grow" onClick={() => {
                const note = window.prompt('What should the vendor fix?', '');
                if (note) { actions.requestCampaignEdits(m.id, note); toast('Edits requested', 'info'); }
              }}>Request edits</button>
              <button className="btn btn-soft btn-sm grow" onClick={() => {
                const note = window.prompt('Rejection reason:', 'Breaks the Campaign rules — see guidelines.');
                if (note !== null) { actions.decideCampaign(m.id, false, note); toast('Rejected', 'info'); }
              }}>Reject</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Active campaigns ---------------- */

function ActiveCampaigns({ state, actions }: { state: S; actions: A }) {
  const live = state.campaigns.filter((m) => !['cancelled', 'rejected', 'growthproof_issued'].includes(m.status));
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  return (
    <div>
      <H title="Active Campaigns" sub="Pause, reopen or remove Campaigns. Scope stays locked once assigned." />
      {live.length === 0 ? <EmptyAdmin emoji="📭" text="No active Campaigns." /> : live.map((m) => {
        const owner = byId(state.users, m.ownerUserId);
        const a = state.assignments.find((x) => x.campaignId === m.id);
        const kind = KIND_OF(m.campaignType);
        return (
          <div key={m.id} className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="row-between">
              <div>
                <div className="row" style={{ gap: 6, marginBottom: 2 }}>
                  <h3 style={{ fontSize: 15, color: 'var(--navy)' }}>{m.title}</h3>
                  <StatusChip status={m.status} />
                </div>
                <p className="subtle" style={{ fontSize: 12 }}>{publicName(owner)} · {CAMPAIGN_TYPE_MAP[m.campaignType]?.name} · {a ? `assigned to ${a.contributorIds.length} contributor${a.contributorIds.length !== 1 ? 's' : ''}` : kind === 'result' ? `${m.confirmedResults}/${m.targetResults ?? '—'} confirmed · ${m.applicantsCount} promoters` : `${m.applicantsCount} applicant${m.applicantsCount !== 1 ? 's' : ''}`}</p>
              </div>
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              <select
                className="select"
                style={{ padding: '8px 10px', fontSize: 12.5, flex: 1, minWidth: 150 }}
                value={statuses[m.id] ?? m.status}
                onChange={(e) => setStatuses({ ...statuses, [m.id]: e.target.value })}
              >
                {Object.entries(MISSION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-sm btn-soft" onClick={() => { actions.setCampaignStatus(m.id, (statuses[m.id] ?? m.status) as Campaign['status']); toast('Status updated — audit logged', 'success'); }}>Apply</button>
              <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(`Remove “${m.title}”? Contributors are notified.`)) { actions.setCampaignStatus(m.id, 'cancelled'); toast('Campaign removed', 'info'); } }}>Remove</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Reports ---------------- */

function Reports({ state, actions }: { state: S; actions: A }) {
  const open = state.reports.filter((r) => r.status === 'open' || r.status === 'under_review').sort((a, b) => a.createdAt - b.createdAt);
  const closed = state.reports.filter((r) => r.status === 'resolved' || r.status === 'dismissed');
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  const reasonLabel = (r: Report) => REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? r.reason;

  return (
    <div>
      <H title="Reports" sub="Reports on users, Campaigns and messages. Hide a review while investigating." />
      {open.length === 0 ? <EmptyAdmin emoji="✅" text="No open reports." /> : open.map((rep) => {
        const reporter = byId(state.users, rep.reporterId);
        const targetUser = rep.targetType === 'user' ? byId(state.users, rep.targetId) : undefined;
        const campaign = rep.linkedCampaignId ? byId(state.campaigns, rep.linkedCampaignId) : rep.targetType === 'campaign' ? byId(state.campaigns, rep.targetId) : undefined;
        return (
          <div key={rep.id} className="card card-pad" style={{ marginBottom: 12, borderColor: 'var(--danger)' }}>
            <div className="row-between">
              <span className="tag tag-red" style={{ fontSize: 10.5 }}>{rep.status === 'under_review' ? 'Under review' : 'Open'} · {rep.targetType}</span>
              <span className="subtle" style={{ fontSize: 11 }}>{timeAgo(rep.createdAt)}</span>
            </div>
            <p className="strong" style={{ fontSize: 15, color: 'var(--navy)', margin: '8px 0 2px' }}>{reasonLabel(rep)}</p>
            <p className="subtle" style={{ fontSize: 13 }}>
              Reported by {publicName(reporter)} · on {targetUser ? `@${targetUser.username} (${targetUser.firstName} ${targetUser.lastName})` : campaign ? `“${campaign.title}”` : rep.targetId}
            </p>
            {rep.details && <p style={{ fontSize: 13.5, background: 'var(--mist-soft)', padding: '10px 12px', borderRadius: 10, marginTop: 8 }}>{rep.details}</p>}
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {targetUser && (
                <>
                  <button className="btn btn-sm btn-soft" onClick={() => { actions.warnUser(targetUser.id); toast('Warning issued', 'success'); }}>⚠ Warn user</button>
                  <button className="btn btn-sm btn-outline" onClick={() => { if (window.confirm(`Suspend @${targetUser.username}?`)) { actions.suspendUser(targetUser.id); toast('User suspended', 'info'); } }}>Suspend</button>
                </>
              )}
              {campaign && <button className="btn btn-sm btn-outline" onClick={() => { if (window.confirm(`Remove “${campaign.title}”?`)) { actions.setCampaignStatus(campaign.id, 'cancelled'); toast('Campaign removed', 'info'); } }}>Remove Campaign</button>}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <input className="input" placeholder="Resolution note (logged to audit)" value={resolutions[rep.id] ?? ''} onChange={(e) => setResolutions({ ...resolutions, [rep.id]: e.target.value })} />
              <button className="btn btn-primary btn-sm grow" style={{ flex: 0 }} onClick={() => {
                const res = resolutions[rep.id]?.trim() || 'Resolved after review.';
                actions.resolveReport(rep.id, res, 'none');
                toast('Resolved', 'success');
              }}>Resolve</button>
            </div>
          </div>
        );
      })}

      <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>Review moderation (hide while investigating)</h3>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl hide-mobile">
          <thead><tr><th>Review</th><th>Target</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {state.reviews.slice().reverse().slice(0, 12).map((rv) => {
              const target = byId(state.users, rv.targetId);
              return (
                <tr key={rv.id}>
                  <td style={{ fontSize: 13 }}>{rv.text ?? '—'} <span style={{ opacity: 0.6 }}>({rv.rating}★)</span></td>
                  <td>for {publicName(target)}</td>
                  <td>{rv.hidden ? <span className="tag tag-red">Hidden</span> : <span className="tag tag-green">Visible</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-soft" onClick={() => { actions.hideReview(rv.id, !rv.hidden); toast(rv.hidden ? 'Review unhidden' : 'Review hidden while investigating', 'success'); }}>
                      {rv.hidden ? 'Unhide' : 'Hide'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
          {state.reviews.slice().reverse().slice(0, 6).map((rv) => {
            const target = byId(state.users, rv.targetId);
            return (
              <div key={rv.id} className="row-between" style={{ gap: 8 }}>
                <div className="grow" style={{ fontSize: 12.5 }}>“{rv.text ?? '—'}” <span className="subtle">for {publicName(target)} · {rv.rating}★</span></div>
                <button className="btn btn-sm btn-soft" style={{ flex: 'none' }} onClick={() => { actions.hideReview(rv.id, !rv.hidden); toast('Updated', 'success'); }}>{rv.hidden ? 'Unhide' : 'Hide'}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Disputes ---------------- */

function Disputes({ state, actions }: { state: S; actions: A }) {
  const disputed = state.campaigns.filter((m) => m.status === 'disputed');
  const disputedProofs = state.campaigns.flatMap((m) => m.resultProofs.filter((p) => p.status === 'disputed').map((p) => ({ proof: p, campaign: m })));
  return (
    <div>
      <H title="Disputes" sub="Creator-task disputes and rejected-result disputes land here. The locked scope, proof notes and messages decide it." />
      {disputed.length === 0 && disputedProofs.length === 0 ? <EmptyAdmin emoji="🕊️" text="No disputes — a healthy campus." /> : <>
        {disputed.map((m) => {
          const a = state.assignments.find((x) => x.campaignId === m.id);
          const owner = byId(state.users, m.ownerUserId);
          const reports = state.reports.filter((r) => r.linkedCampaignId === m.id);
          const contributors = (a?.contributorIds ?? []).map((cid) => byId(state.users, cid)).filter(Boolean);
          return (
            <div key={m.id} className="card card-pad" style={{ marginBottom: 12, borderColor: 'var(--danger)' }}>
              <div className="row-between">
                <h3 style={{ fontSize: 15.5, color: 'var(--navy)' }}>“{m.title}”</h3>
                <StatusChip status="disputed" />
              </div>
              <p className="subtle" style={{ fontSize: 12 }}>Vendor: {publicName(owner)} · {contributors.length} contributor{contributors.length !== 1 ? 's' : ''} · scope locked {m.snapshot ? timeAgo(m.snapshot.capturedAt) : ''}</p>
              {reports.map((r) => (
                <div key={r.id} className="safety-tip" style={{ marginTop: 8 }}>
                  <span>🚩</span>
                  <span style={{ fontSize: 12.5 }}><strong>{REPORT_REASONS.find((x) => x.id === r.reason)?.label}:</strong> {r.details ?? 'No details'}</span>
                </div>
              ))}
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm grow" onClick={() => {
                  const note = window.prompt('Resolution note (goes on each GrowthProof entry):', 'Work was delivered as agreed per deliverables and messages. Resolved in the contributor’s favour.');
                  if (note !== null) { actions.resolveDispute(m.id, 'growthproof_issued', note); toast('GrowthProof issued via admin resolution', 'success'); }
                }}>✓ Issue GrowthProof</button>
                <button className="btn btn-danger btn-sm grow" onClick={() => {
                  const note = window.prompt('Resolution note (sent to both sides):', 'Campaign cancelled after review.');
                  if (note !== null) { actions.resolveDispute(m.id, 'cancelled', note); toast('Campaign cancelled', 'info'); }
                }}>Cancel Campaign</button>
              </div>
            </div>
          );
        })}
        {disputedProofs.map(({ proof, campaign: m }) => {
          const promoter = byId(state.users, proof.promoterId);
          const owner = byId(state.users, m.ownerUserId);
          return (
            <div key={proof.id} className="card card-pad" style={{ marginBottom: 12, borderColor: 'var(--danger)' }}>
              <div className="row-between">
                <h3 style={{ fontSize: 15.5, color: 'var(--navy)' }}>“{m.title}” — disputed result</h3>
                <StatusChip status="reported" label="Disputed proof" cls="status-reported" />
              </div>
              <p className="subtle" style={{ fontSize: 12 }}>Promoter: {publicName(promoter)} vs vendor {publicName(owner)} · submitted {timeAgo(proof.createdAt)}</p>
              <div className="safety-tip" style={{ marginTop: 8 }}>
                <span>🧾</span>
                <span style={{ fontSize: 12.5 }}><strong>Claim:</strong> {proof.description}{proof.customerRef ? ` · Ref: ${proof.customerRef}` : ''}</span>
              </div>
              {proof.note && <div className="safety-tip" style={{ marginTop: 6, borderColor: 'var(--mist)' }}><span>🗣️</span><span style={{ fontSize: 12.5 }}><strong>Dispute note:</strong> {proof.note}</span></div>}
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm grow" onClick={() => {
                  const note = window.prompt('Resolution note (sent to both sides):', 'Proof verified against the vendor’s records. Result confirmed.');
                  if (note !== null) { actions.resolveResultDispute(proof.id, true, note); toast('Result confirmed — GrowthProof issued', 'success'); }
                }}>✓ Confirm result</button>
                <button className="btn btn-danger btn-sm grow" onClick={() => {
                  const note = window.prompt('Resolution note (sent to both sides):', 'Proof could not be verified. Rejection stands.');
                  if (note !== null) { actions.resolveResultDispute(proof.id, false, note); toast('Rejection upheld', 'info'); }
                }}>Keep rejected</button>
              </div>
            </div>
          );
        })}
      </>}
    </div>
  );
}

/* ---------------- Corrections ---------------- */

function Corrections({ state, actions }: { state: S; actions: A }) {
  const all = [...state.growthproof].sort((a, b) => b.acceptedAt - a.acceptedAt);
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const list = term ? all.filter((w) => (w.campaignTitle + publicName(byId(state.users, w.userId))).toLowerCase().includes(term)) : all;
  return (
    <div>
      <H title="GrowthProof corrections" sub="Every correction is audit-logged with a reason — the Passport stays honest." />
      <div className="search-bar" style={{ marginBottom: 12, maxWidth: 360 }}><span className="search-icon"><IconSearch size={16} /></span>
        <input placeholder="Search entries…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <EmptyAdmin emoji="📗" text="No GrowthProof entries yet." /> : list.slice(0, 30).map((w: GrowthProofEntry) => {
        const u = byId(state.users, w.userId);
        return (
          <div key={w.id} className="card card-pad" style={{ marginBottom: 10 }}>
            <div className="row-between">
              <div>
                <span className="strong" style={{ fontSize: 14, color: 'var(--navy)' }}>{w.campaignTitle}</span>
                <span className="subtle" style={{ display: 'block', fontSize: 12 }}>{publicName(u)} · {w.role} · {w.onTime ? 'on time' : 'late'} · {w.rating}★ · {timeAgo(w.acceptedAt)}</span>
              </div>
              {w.corrected && <span className="tag tag-red">Corrected</span>}
            </div>
            {w.corrected && (
              <p className="subtle" style={{ fontSize: 12, marginTop: 4 }}>🛠️ {w.corrected.note} · {timeAgo(w.corrected.at)}</p>
            )}
            <button className="btn btn-sm btn-soft" style={{ marginTop: 8 }} onClick={() => {
              const note = window.prompt('Why is this entry being corrected? (visible to the student + audit log):', '');
              if (note) { actions.correctGrowthproof(w.id, note); toast('Correction logged', 'success'); }
            }}>
              ✎ Correct entry
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Users ---------------- */

function Users({ state, actions }: { state: S; actions: A }) {
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const term = q.trim().toLowerCase();
  const users = state.users.filter((u) => {
    if (roleF !== 'all' && u.role !== roleF) return false;
    if (!term) return true;
    return (u.firstName + ' ' + u.lastName + ' ' + u.username + ' ' + u.department).toLowerCase().includes(term);
  });
  return (
    <div>
      <H title="Users" sub="Verify manually, warn, suspend, restore, or promote ambassadors." />
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}><span className="search-icon"><IconSearch size={16} /></span>
          <input placeholder="Search name or @username…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto' }} value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="ambassador">Ambassadors</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl hide-mobile">
          <thead><tr><th>Student</th><th>Status</th><th>Role</th><th>Level</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="avatar-row"><Avatar user={u} size="sm" showVerified /><div><div className="who">{u.firstName} {u.lastName}</div><div className="sub">@{u.username} · {u.department ?? '—'}</div></div></div>
                </td>
                <td><StatusChip status={u.verificationStatus} label={u.verificationStatus === 'verified' ? 'Verified' : u.verificationStatus} cls={u.verificationStatus === 'verified' ? 'status-completed' : u.verificationStatus === 'pending' ? 'status-negotiating' : u.verificationStatus === 'suspended' ? 'status-removed' : 'status-sent'} /></td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{u.level ?? '—'}</td>
                <td>
                  <div className="row" style={{ gap: 5 }}>
                    {u.verificationStatus !== 'verified' && u.verificationStatus !== 'suspended' && <button className="btn btn-sm btn-primary" onClick={() => { actions.verifyUserManually(u.id); toast('Verified', 'success'); }}>Verify</button>}
                    {u.role !== 'admin' && u.role !== 'superadmin' && !u.ambassadorId && <button className="btn btn-sm btn-soft" onClick={() => { actions.makeAmbassador(u.id); toast(`${u.firstName} is now an ambassador`, 'success'); }}>Ambassador</button>}
                    {u.suspended ? <button className="btn btn-sm btn-ghost" onClick={() => { actions.restoreUser(u.id); toast('Account restored', 'success'); }}>Restore</button> :
                      u.id !== currentUser()?.id && <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(`Suspend ${u.firstName}?`)) { actions.suspendUser(u.id); toast('Suspended', 'info'); } }}>Suspend</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
          {users.map((u) => (
            <div key={u.id} className="row" style={{ gap: 10 }}>
              <Avatar user={u} size="sm" showVerified />
              <div className="grow">
                <div className="strong" style={{ fontSize: 13 }}>{u.firstName} {u.lastName} <span className="subtle">@{u.username}</span></div>
                <div className="row" style={{ gap: 6, marginTop: 4 }}>
                  <StatusChip status={u.verificationStatus} label={u.verificationStatus === 'verified' ? 'Verified' : u.verificationStatus} cls={u.verificationStatus === 'verified' ? 'status-completed' : u.verificationStatus === 'suspended' ? 'status-removed' : 'status-sent'} />
                  <button className="btn btn-sm btn-soft" onClick={() => { actions.warnUser(u.id); toast('Warning issued', 'success'); }}>Warn</button>
                  {u.suspended ? <button className="btn btn-sm btn-ghost" onClick={() => { actions.restoreUser(u.id); toast('Restored', 'success'); }}>Restore</button> :
                    <button className="btn btn-sm btn-danger" onClick={() => { if (window.confirm(`Suspend ${u.firstName}?`)) actions.suspendUser(u.id); }}>Suspend</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Squads admin ---------------- */

function SquadsAdmin({ state, actions }: { state: S; actions: A }) {
  void actions;
  return (
    <div>
      <H title="Squads" sub="Every member accepts their role and earns individual GrowthProof." />
      {state.squads.length === 0 ? <EmptyAdmin emoji="👥" text="No squads formed yet." /> : <div className="col" style={{ gap: 12 }}>
        {state.squads.map((sq) => {
          const lead = byId(state.users, sq.leadId);
          const members = state.squadMembers.filter((sm) => sm.squadId === sq.id && sm.status === 'accepted');
          const combined = members.reduce((s, sm) => s + levelInfo(byId(state.users, sm.userId)).entries, 0);
          const campaigns = state.assignments.filter((a) => a.squadId === sq.id);
          return (
            <div key={sq.id} className="card card-pad">
              <div className="row-between">
                <h3 style={{ fontSize: 15.5, color: 'var(--navy)' }}>“{sq.name}”</h3>
                <span className="tag tag-navy">{members.length}/5 members</span>
              </div>
              <p className="subtle" style={{ fontSize: 12, marginTop: 2 }}>Lead: {publicName(lead)} · {combined} combined GrowthProof · {campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''} assigned</p>
              <div className="avatar-row" style={{ marginTop: 10 }}>
                {members.map((sm) => <div key={sm.userId}><Avatar user={byId(state.users, sm.userId)} size="sm" showVerified /></div>)}
              </div>
              <div className="row wrap" style={{ gap: 5, marginTop: 8 }}>
                {members.map((sm) => <span key={sm.userId} className="skill-chip" style={{ fontSize: 11 }}>{publicName(byId(state.users, sm.userId))} — {sm.role}</span>)}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

/* ---------------- Ambassadors ---------------- */

function Ambassadors({ state, actions }: { state: S; actions: A }) {
  void actions;
  const fmt = (n: number) => n.toLocaleString('en-NG');
  return (
    <div>
      <H title="Ambassadors" sub="Rewards are based on verified users, completed Campaigns and retained contributors — never raw sign-ups." />
      <div className="col" style={{ gap: 12 }}>
        {state.ambassadors.map((amb) => {
          const u = byId(state.users, amb.userId);
          const referrals = state.ambassadorReferrals.filter((r) => r.ambassadorId === amb.id);
          const qualifiedShare = referrals.length ? Math.round((referrals.filter((r) => r.completedCampaign && r.verified).length / referrals.length) * 100) : 0;
          return (
            <div key={amb.id} className="card card-pad">
              <div className="row-between">
                <div className="row" style={{ gap: 10 }}>
                  <Avatar user={u} size="md" showVerified />
                  <div>
                    <span className="strong" style={{ fontSize: 15, color: 'var(--navy)' }}>{publicName(u)}</span>
                    <span className="subtle" style={{ display: 'block', fontSize: 12 }}>Ambassador · {amb.monthlyTarget} monthly milestone</span>
                  </div>
                </div>
                <span className={`tag ${amb.rewardStatus === 'qualified' ? 'tag-gold' : 'tag-amber'}`}>{amb.rewardStatus === 'qualified' ? '🏆 Qualified' : amb.rewardStatus === 'paid' ? 'Paid ✓' : 'Pending'}</span>
              </div>
              <div className="stat-grid" style={{ margin: '12px 0 6px' }}>
                {[[amb.vendorsRecruited, 'Vendors'], [amb.promotersRecruited, 'Promoters'], [amb.approvedReferrals, 'Approved referrals'], [amb.completedCampaigns, 'Completed Campaigns'], [amb.retained30Days, 'Retained 30d']].map(([n, l]) => (
                  <div key={l as string} className="stat-card"><div className="stat-num" style={{ fontSize: 20 }}>{n}</div><div className="stat-label">{l}</div></div>
                ))}
              </div>
              <p className="subtle" style={{ fontSize: 12 }}>Quality share: {qualifiedShare}% of referrals completed a Campaign · Reward earned: <strong className="text-gold">₦{fmt(amb.rewardEarned)}</strong></p>
              {amb.rewardStatus === 'qualified' && (
                <button className="btn btn-sm btn-gold" style={{ marginTop: 10 }} onClick={() => toast('In production: payout via bank transfer would be initiated here', 'info')}>Mark reward paid</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Analytics ---------------- */

function Analytics({ state, actions }: { state: S; actions: A }) {
  void actions;
  const verified = state.users.filter((u) => u.verificationStatus === 'verified').length;
  const accepted = state.campaigns.filter((m) => m.status === 'growthproof_issued').length;
  const confirmedResults = state.campaigns.reduce((s, m) => s + (m.confirmedResults ?? 0), 0);
  const vendors = state.businesses.filter((b) => b.status === 'approved').length;
  const repeatVendors = state.businesses.filter((b) => state.campaigns.filter((m) => m.businessProfileId === b.id && m.status === 'growthproof_issued').length >= 2).length;
  const withAny = state.users.filter((u) => state.growthproof.some((w) => w.userId === u.id)).length;
  const secondCampaigns = state.users.filter((u) => state.growthproof.filter((w) => w.userId === u.id).length >= 2).length;
  const openSevere = state.reports.filter((r) => ['scam', 'fake_identity', 'harassment', 'illegal'].includes(r.reason) && (r.status === 'open' || r.status === 'under_review')).length;

  const targets = [
    { label: 'Verified student profiles', cur: verified, target: 30, icon: '🎓' },
    { label: 'Confirmed results (sales/leads/tickets/tasks)', cur: confirmedResults, target: 20, icon: '✅' },
    { label: 'First-review acceptance (est.)', cur: accepted ? Math.round((state.campaigns.filter((m) => m.status === 'growthproof_issued' && m.changeRequests.length === 0).length / accepted) * 100) : 0, target: 70, suffix: '%', icon: '🔁' },
    { label: 'Repeat student vendors', cur: repeatVendors, target: 5, icon: '🏢' },
    { label: 'Promoters/creators on a 2nd Campaign', cur: withAny ? Math.round((secondCampaigns / withAny) * 100) : 0, target: 30, suffix: '%', icon: '📈' },
    { label: 'Unresolved severe reports', cur: openSevere, target: 0, icon: '🛡️' },
  ];

  const typeBreakdown = (['sale', 'lead', 'ticket_sale', 'content_task', 'promotion_task', 'media_task', 'research_task'] as const).map((t) => ({
    t,
    posted: state.campaigns.filter((m) => m.campaignType === t).length,
    confirmed: state.campaigns.filter((m) => m.campaignType === t).reduce((s, m) => s + (m.confirmedResults ?? 0), 0),
  }));
  const topOwners = [...state.businesses].sort((a, b) => state.campaigns.filter((m) => m.businessProfileId === b.id && m.status === 'growthproof_issued').length - state.campaigns.filter((m) => m.businessProfileId === a.id && m.status === 'growthproof_issued').length).slice(0, 5);
  const topContributors = [...state.users].sort((a, b) => state.growthproof.filter((w) => w.userId === b.id).length - state.growthproof.filter((w) => w.userId === a.id).length).slice(0, 5);

  return (
    <div>
      <H title="Analytics" sub="Phase-one success metrics — internal only, never shown to students." />
      <p className="subtle" style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Launch targets</p>
      <div className="col" style={{ gap: 12 }}>
        {targets.map((m) => {
          const pct = Math.min(100, Math.round((m.cur / m.target) * 100));
          const met = m.cur >= m.target;
          return (
            <div key={m.label} className="card card-pad">
              <div className="row-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>{m.icon} {m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: met ? 'var(--success)' : 'var(--navy)' }}>
                  {m.cur}{m.suffix ?? ''} / {m.target}{m.suffix ?? ''} {met ? '✓' : ''}
                </span>
              </div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', marginTop: 20 }}>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 8 }}>By Campaign type</h3>
          {typeBreakdown.map((x) => (
            <div key={x.t} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--mist)', fontSize: 13 }}>
              <span>{CAMPAIGN_TYPE_MAP[x.t]?.emoji} {CAMPAIGN_TYPE_MAP[x.t]?.name}</span>
              <span className="subtle">{x.confirmed} confirmed / {x.posted} posted</span>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 8 }}>Top student businesses</h3>
          {topOwners.map((b) => {
            const u = byId(state.users, b.userId);
            const done = state.campaigns.filter((m) => m.businessProfileId === b.id && m.status === 'growthproof_issued').length;
            return <div key={b.id} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--mist)', fontSize: 13 }}><span>{publicName(u)} · {b.businessName.length > 28 ? b.businessName.slice(0, 26) + '…' : b.businessName}</span><span className="subtle">{done} done</span></div>;
          })}
          <h3 style={{ margin: '14px 0 8px' }}>Top promoters & creators</h3>
          {topContributors.map((u) => <div key={u.id} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--mist)', fontSize: 13 }}><span>{publicName(u)}</span><span className="subtle">{state.growthproof.filter((w) => w.userId === u.id).length} entries</span></div>)}
        </div>
        <div className="card card-pad">
          <h3 style={{ marginBottom: 8 }}>Notes</h3>
          <div className="col" style={{ gap: 6, fontSize: 12.5, lineHeight: 1.55 }}>
            <p>• First-review acceptance and second-Campaign rates are estimated from locked-scope change requests and GrowthProof counts.</p>
            <p>• “Approved student businesses” count: {vendors}. Any verified student can become one.</p>
            <p>• Confirmed results = vendor-confirmed proof submissions across all Campaigns.</p>
            <p>• Events tracked in this build: {state.analytics?.length ?? 0} (register, campaign_created, result_confirmed, message_sent…).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Audit ---------------- */

function Audit({ state, actions }: { state: S; actions: A }) {
  void actions;
  return (
    <div>
      <H title="Audit log" sub="Immutable trail of approvals, suspensions, acceptances, disputes and GrowthProof actions." />
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl hide-mobile">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>
            {state.auditLog.slice().reverse().map((a) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(a.createdAt)}</td>
                <td>{publicName(byId(state.users, a.actorId))}</td>
                <td style={{ textTransform: 'capitalize' }}>{a.action.replace(/_/g, ' ')}</td>
                <td className="subtle">{a.targetType ?? '—'}</td>
                <td className="subtle">{a.detail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hide-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
          {state.auditLog.slice().reverse().map((a) => (
            <div key={a.id} style={{ fontSize: 12.5, borderBottom: '1px solid var(--mist)', paddingBottom: 8 }}>
              <span className="strong" style={{ textTransform: 'capitalize' }}>{a.action.replace(/_/g, ' ')}</span> <span className="subtle">by {publicName(byId(state.users, a.actorId))} · {timeAgo(a.createdAt)}</span>
              {a.detail && <div className="subtle">{a.detail}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const EmptyAdmin = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="card card-pad ta-center" style={{ padding: '34px 20px' }}>
    <div style={{ fontSize: 36, marginBottom: 8 }}>{emoji}</div>
    <p className="subtle">{text}</p>
  </div>
);
