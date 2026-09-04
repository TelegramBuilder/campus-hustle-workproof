import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, userRating, levelInfo } from '../lib/store';
import { Avatar, Modal, Field, Input, RatingStars, toast, EmptyState } from '../components/ui';
import { IconBack, IconUsers, IconShield } from '../components/icons';
import { timeAgo } from '../lib/format';
import { CAMPAIGN_TYPE_MAP } from '../lib/domain';
import type { Squad } from '../lib/types';

const ROLES = ['Squad Lead', 'Designer', 'Writer', 'Photographer', 'Videographer', 'Event Coordinator', 'Tutor', 'Social Media Support', 'MC / Host', 'Editor', 'Researcher', 'Member'];

export default function SquadDetail() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const me = currentUser();
  const squad: Squad | undefined = byId(state.squads, id ?? '');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Member');
  const [confirming, setConfirming] = useState<{ userId: string; role: string } | null>(null);

  if (!squad || !me) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <div className="screen-header">
          <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
          <h1>Squad not found</h1>
        </div>
      </div>
    );
  }

  const isLead = squad.leadId === me.id;
  const lead = byId(state.users, squad.leadId);
  const members = state.squadMembers
    .filter((sm) => sm.squadId === squad.id && sm.status === 'accepted')
    .map((sm) => ({ sm, user: byId(state.users, sm.userId)! }))
    .filter((x) => x.user);
  const pendingInvites = state.squadMembers.filter((sm) => sm.squadId === squad.id && sm.status === 'invited');
  const iAmInvited = state.squadMembers.some((sm) => sm.squadId === squad.id && sm.userId === me.id && sm.status === 'invited');

  const combinedEntries = members.reduce((s, m) => s + levelInfo(m.user).entries, 0);
  const ratings = members.map((m) => userRating(m.user).avg).filter((r) => r > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const allSkills = Array.from(new Set(members.flatMap((m) => m.user.skills))).slice(0, 8);

  const squadCampaigns = state.assignments.filter((a) => a.squadId === squad.id);
  const campaignApps = state.applications.filter((a) => a.squadId === squad.id && a.status !== 'withdrawn');

  const sendInvite = () => {
    if (!username.trim() || !role.trim()) { toast('Enter a username and role', 'error'); return; }
    const err = actions.inviteToSquad(squad.id, username, role);
    if (err) { toast(err, 'error'); return; }
    setUsername(''); setRole('Member'); setInviteOpen(false);
    toast('Invitation sent — they must accept', 'success');
  };

  const membersMaxed = members.length >= 5;

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="top-bar">
        <div className="row-between">
          <div className="row" style={{ gap: 10 }}>
            <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
            <span className="row" style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', justifyContent: 'center' }}>
              <IconUsers size={19} />
            </span>
            <div>
              <h1 style={{ fontSize: 17 }}>{squad.name}</h1>
              <p className="subtle" style={{ fontSize: 11.5 }}>Formed {timeAgo(squad.createdAt)} · UNILAG</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '2px 16px' }}>
        {/* Confirmation banner for invited user */}
        {iAmInvited && (
          <div className="card card-pad" style={{ borderColor: 'var(--green-mist)', marginBottom: 14 }}>
            <p style={{ fontSize: 13.5 }}>You were invited to join <strong>{squad.name}</strong>. Accepting confirms your role and makes you eligible for Squad applications led by {publicName(lead)}.</p>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm grow" onClick={() => { actions.respondToInvite(squad.id, true); toast('Welcome to the Squad 🎉', 'success'); }}>Accept & confirm role</button>
              <button className="btn btn-soft btn-sm grow" onClick={() => { actions.respondToInvite(squad.id, false); nav('/app/squads'); }}>Decline</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <Avatar user={lead} size="sm" showVerified />
              <div>
                <span className="strong" style={{ fontSize: 13, color: 'var(--navy)' }}>{publicName(lead)}</span>
                <span className="subtle" style={{ display: 'block', fontSize: 11 }}>Squad Lead</span>
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => nav(`/app/user/${lead?.id}`)}>View Passport</button>
          </div>
          <div className="row wrap" style={{ gap: 18 }}>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 19, color: 'var(--navy)' }}>{members.length}<span style={{ fontSize: 12, color: 'var(--slate)' }}>/5</span></span>
              <span className="subtle" style={{ fontSize: 11 }}>Members</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 19, color: 'var(--navy)' }}>{combinedEntries}</span>
              <span className="subtle" style={{ fontSize: 11 }}>Combined GrowthProof</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              {avgRating > 0 ? <RatingStars value={avgRating} /> : <span className="strong" style={{ fontSize: 16, color: 'var(--slate)' }}>New</span>}
              <span className="subtle" style={{ fontSize: 11 }}>Average rating</span>
            </div>
          </div>
        </div>

        {/* Combined skills */}
        <div className="section">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Combined skills</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            {allSkills.length ? allSkills.map((s) => <span key={s} className="skill-chip">{s}</span>) : <span className="subtle" style={{ fontSize: 12.5 }}>Members haven’t added skills yet.</span>}
          </div>
        </div>

        {/* Members + roles */}
        <div className="section">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15 }}>Members & roles ({members.length}/5)</h3>
            {isLead && !membersMaxed && <button className="btn btn-sm btn-primary" onClick={() => setInviteOpen(true)}>+ Invite</button>}
          </div>
          <div className="card">
            {members.map(({ sm, user }) => (
              <div key={user.id} className="list-item">
                <Avatar user={user} size="md" showVerified />
                <div className="grow">
                  <div className="row-between">
                    <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }} onClick={() => nav(`/app/user/${user.id}`)}>{publicName(user)}</span>
                    <span className="subtle" style={{ fontSize: 11.5 }}>{user.level ? `${user.level}L` : ''} · ★ {userRating(user).avg > 0 ? userRating(user).avg.toFixed(1) : '—'}</span>
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 3, alignItems: 'center' }}>
                    {isLead && user.id !== me.id ? (
                      <button className="chip chip-sm" style={{ fontSize: 11 }} onClick={() => setConfirming({ userId: user.id, role: sm.role })}>
                        {sm.role} ✎
                      </button>
                    ) : (
                      <span className="tag tag-navy" style={{ fontSize: 10.5 }}>{sm.role}</span>
                    )}
                    {user.verificationStatus === 'verified' && <span className="row" style={{ gap: 3, color: 'var(--green)', fontSize: 10.5, fontWeight: 800 }}><IconShield size={11} /> Verified</span>}
                  </div>
                </div>
                <button className="btn-icon btn-soft" onClick={() => nav(`/app/user/${user.id}`)} aria-label="View Passport">›</button>
              </div>
            ))}
            {members.length === 0 && <EmptyState emoji="🪑" title="Empty squad" sub="Waiting for members to accept invitations." />}
          </div>
          {pendingInvites.length > 0 && (
            <p className="subtle" style={{ fontSize: 11.5, marginTop: 6 }}>
              ⏳ {pendingInvites.length} pending invitation{pendingInvites.length !== 1 ? 's' : ''}: {pendingInvites.map((p) => publicName(byId(state.users, p.userId))).join(', ')} — they must accept to join.
            </p>
          )}
        </div>

        {/* Roles pool hint */}
        <div className="safety-tip" style={{ marginBottom: 14 }}>
          <span>💡</span>
          <span style={{ fontSize: 12.5 }}><strong>Roles you can assign:</strong> {ROLES.slice(1).join(' · ')}. GrowthProof always shows each member’s individual role.</span>
        </div>

        {/* Campaign record */}
        <div className="section">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Campaign record</h3>
          {campaignApps.length === 0 && squadCampaigns.length === 0 ? (
            <div className="card card-pad ta-center" style={{ borderStyle: 'dashed' }}>
              <p className="subtle" style={{ fontSize: 13 }}>No Campaigns yet. {isLead ? 'Browse Campaigns marked “Squad OK” to apply as a team.' : `${publicName(lead)} can apply the squad to eligible Campaigns.`}</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => nav('/app/campaigns?elig=squad')}>Find squad Campaigns</button>
            </div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {squadCampaigns.map((a) => {
                const m = byId(state.campaigns, a.campaignId);
                if (!m) return null;
                const entryCount = state.growthproof.filter((w) => w.campaignId === m.id && members.some((mb) => mb.user.id === w.userId)).length;
                return (
                  <div key={a.id} className="card card-pad card-tap" onClick={() => nav(m.status === 'growthproof_issued' ? `/app/campaign/${m.id}` : `/app/workspace/${m.id}`)}>
                    <div className="row-between">
                      <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{m.title}</span>
                      <span className="tag tag-green" style={{ fontSize: 10.5 }}>{CAMPAIGN_TYPE_MAP[m.campaignType]?.emoji} {CAMPAIGN_TYPE_MAP[m.campaignType]?.name}</span>
                    </div>
                    <div className="subtle" style={{ fontSize: 11.5, marginTop: 4 }}>
                      {entryCount > 0 ? `📗 ${entryCount} GrowthProof entr${entryCount === 1 ? 'y' : 'ies'} issued to members` : m.status === 'assigned' || m.status === 'in_progress' ? 'In progress — scope locked' : `Status: ${m.status.replace(/_/g, ' ')}`}
                    </div>
                  </div>
                );
              })}
              {campaignApps.map((ap) => {
                const m = byId(state.campaigns, ap.campaignId);
                if (!m || squadCampaigns.some((a) => a.campaignId === m.id)) return null;
                return (
                  <div key={ap.id} className="card card-pad" style={{ background: 'var(--mist-soft)' }}>
                    <div className="row-between">
                      <span style={{ fontSize: 13, color: 'var(--navy)' }}>{m.title}</span>
                      <span className="tag tag-amber" style={{ fontSize: 10.5 }}>{ap.status === 'pending' ? 'Applied' : ap.status === 'shortlisted' ? 'Shortlisted' : ap.status === 'declined' ? 'Not selected' : 'Applied'}</span>
                    </div>
                    <button className="btn btn-sm btn-ghost" style={{ marginTop: 6 }} onClick={() => nav(`/app/campaign/${m.id}`)}>View Campaign</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Squad rules */}
        <div className="card card-pad" style={{ background: 'var(--navy)', color: '#e2e8f0', marginBottom: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 6 }}>Squad rules</h3>
          <div className="col" style={{ gap: 5, fontSize: 12, lineHeight: 1.5 }}>
            <p>• 2–5 verified UNILAG students, each confirming their own role.</p>
            <p>• Vendors can view every member’s individual Passport.</p>
            <p>• Every contributing member receives their own GrowthProof after acceptance — the lead never takes all the credit.</p>
            <p>• Only trusted members without unresolved serious reports can lead.</p>
          </div>
        </div>
      </div>

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member">
        <Field label="Username" hint="Their @username — must be a verified UNILAG student.">
          <Input placeholder="e.g. emeka" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <p className="subtle" style={{ fontSize: 11.5, marginBottom: 10 }}>
          They must accept the invitation and confirm this role before the Squad can apply to Campaigns.
        </p>
        <button className="btn btn-primary btn-lg btn-block" onClick={sendInvite}>Send invitation</button>
      </Modal>

      {/* Role change modal */}
      <Modal open={confirming !== null} onClose={() => setConfirming(null)} title="Change role">
        {confirming && (
          <div>
            <Field label="New role">
              <select className="select" value={confirming.role} onChange={(e) => setConfirming({ ...confirming, role: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => {
              actions.setMemberRole(squad.id, confirming.userId, confirming.role);
              setConfirming(null);
              toast('Role updated — it will show on their next GrowthProof entry', 'success');
            }}>Save role</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
