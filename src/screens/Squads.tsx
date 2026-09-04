import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, userRating, levelInfo } from '../lib/store';
import { Avatar, Modal, Field, Input, EmptyState, toast, RatingStars } from '../components/ui';
import { IconBack, IconUsers } from '../components/icons';
import { timeAgo } from '../lib/format';

export default function Squads() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');

  const myMemberships = useMemo(() => {
    if (!me) return [];
    return state.squadMembers.filter((sm) => sm.userId === me.id);
  }, [state.squadMembers, me]);

  if (!me) return null;

  const mySquad = myMemberships.map((sm) => byId(state.squads, sm.squadId)).filter(Boolean);
  const invitePending = myMemberships.filter((sm) => sm.status === 'invited');
  const leads = state.squads.filter((s) => s.leadId === me.id);
  const otherSquads = state.squads.filter((s) => !mySquad.includes(s) && s.leadId !== me.id);

  const membersOf = (squadId: string) =>
    state.squadMembers
      .filter((sm) => sm.squadId === squadId && sm.status === 'accepted')
      .map((sm) => ({ sm, user: byId(state.users, sm.userId)! }))
      .filter((x) => x.user);

  const SquadCard = ({ squad, mine }: { squad: (typeof state.squads)[number]; mine: boolean }) => {
    const members = membersOf(squad.id);
    const lead = byId(state.users, squad.leadId);
    const combinedEntries = members.reduce((s, m) => s + levelInfo(m.user).entries, 0);
    const rated = members.map((m) => userRating(m.user).avg).filter((r) => r > 0);
    const avgRating = rated.length > 0 ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
    return (
      <div className="card card-pad card-tap" style={{ marginBottom: 10 }} onClick={() => nav(`/app/squad/${squad.id}`)}>
        <div className="row-between">
          <div className="row" style={{ gap: 10 }}>
            <span className="row" style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', fontSize: 18, justifyContent: 'center', flex: 'none' }}>
              <IconUsers size={20} />
            </span>
            <div>
              <div className="strong" style={{ color: 'var(--navy)', fontSize: 15 }}>{squad.name}</div>
              <div className="subtle" style={{ fontSize: 12 }}>Led by {publicName(lead)} · {members.length} member{members.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          {mine && <span className="tag tag-navy">Your squad</span>}
        </div>
        <div className="row wrap" style={{ gap: -6, marginTop: 10, paddingLeft: 2 }}>
          <div className="avatar-row">
            {members.slice(0, 5).map((m) => <Avatar key={m.user.id} user={m.user} size="xs" showVerified />)}
          </div>
        </div>
        <div className="divider" style={{ margin: '10px 0 8px' }} />
        <div className="row wrap" style={{ gap: 14, fontSize: 12, color: 'var(--slate)' }}>
          <span>📗 {combinedEntries} combined GrowthProof</span>
          <span>★ {avgRating > 0 ? avgRating.toFixed(1) : 'new'}</span>
          <span>🎓 UNILAG only</span>
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
          {members.slice(0, 6).map((m) => <span key={m.user.id} className="skill-chip">{m.sm.role}</span>)}
        </div>
      </div>
    );
  };

  const createSquad = () => {
    if (!name.trim()) { toast('Give your Squad a name', 'error'); return; }
    const err = actions.createSquad(name.trim());
    if (err) { toast(err, 'error'); return; }
    setName('');
    setCreateOpen(false);
    toast('Squad created — invite up to 4 more members', 'success');
  };

  return (
    <div>
      <div className="top-bar">
        <div className="row-between">
          <div>
            <h1 style={{ fontSize: 20 }}>Hustle Squads</h1>
            <p className="subtle" style={{ fontSize: 12 }}>2–5 verified students · one lead · shared GrowthProof</p>
          </div>
          {!leads.some((s) => membersOf(s.id).length >= 2) && me.verificationStatus === 'verified' && (
            <button className="btn btn-primary btn-sm" onClick={() => { if (leads.length > 0) { toast('You already lead a Squad — invite members from it', 'info'); return; } setCreateOpen(true); }}>+ New squad</button>
          )}
        </div>
      </div>

      <div style={{ padding: '2px 16px' }}>
        {/* Pending invites */}
        {invitePending.length > 0 && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Invitations for you</h3>
            {invitePending.map((sm) => {
              const squad = byId(state.squads, sm.squadId);
              const lead = squad ? byId(state.users, squad.leadId) : null;
              if (!squad) return null;
              return (
                <div key={sm.squadId} className="card card-pad" style={{ borderColor: 'var(--green-mist)', marginBottom: 10 }}>
                  <div className="row-between" style={{ gap: 10 }}>
                    <div>
                      <div className="strong" style={{ color: 'var(--navy)' }}>“{squad.name}”</div>
                      <div className="subtle" style={{ fontSize: 12.5 }}>{publicName(lead)} invited you as <strong>{sm.role}</strong> · {timeAgo(squad.createdAt)}</div>
                      <div className="subtle" style={{ fontSize: 12 }}>Every member accepts their role — GrowthProof shows your individual role, never just the lead’s credit.</div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm grow" onClick={() => { actions.respondToInvite(squad.id, true); toast('You’re in! 🎉', 'success'); }}>Accept</button>
                    <button className="btn btn-soft btn-sm grow" onClick={() => { actions.respondToInvite(squad.id, false); toast('Invitation declined', 'info'); }}>Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* My squads */}
        {mySquad.length > 0 && (
          <div className="section">
            <SectionTitle2 title="Your squads" />
            {mySquad.map((s) => s && <SquadCard key={s.id} squad={s} mine />)}
          </div>
        )}

        {/* Learn banner */}
        {mySquad.length === 0 && me.verificationStatus === 'verified' && (
          <div className="banner banner-navy" style={{ margin: '6px 0 16px' }}>
            <span style={{ fontSize: 24 }}>👥</span>
            <div className="grow">
              <h3>Team up for bigger Campaigns</h3>
              <p>Some Campaigns need more than one skill. Form a 2–5 person Squad and apply together — each member earns their own GrowthProof entry with their own role.</p>
            </div>
            {leads.length === 0 && <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--navy)', fontWeight: 800 }} onClick={() => setCreateOpen(true)}>Create squad</button>}
          </div>
        )}

        {/* Other squads */}
        {otherSquads.length > 0 && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Other squads on UNILAG</h3>
            {otherSquads.map((s) => <SquadCard key={s.id} squad={s} mine={false} />)}
          </div>
        )}

        {mySquad.length === 0 && otherSquads.length === 0 && invitePending.length === 0 && (
          <EmptyState
            emoji="👥"
            title="No squads yet"
            sub="Squads of 2–5 verified students can apply to larger Campaigns together. Create one and invite classmates by username."
            action={me.verificationStatus === 'verified' ? <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Create your Squad</button> : undefined}
          />
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a Hustle Squad">
        <div className="safety-tip" style={{ marginBottom: 12 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12.5 }}>Only verified students join. Squad Leads need no unresolved serious reports, and every member confirms their own role.</span>
        </div>
        <Field label="Squad name" hint="Something teams will recognise, e.g. “Seyi & Co Media”.">
          <Input placeholder="e.g. Lagos Lens Collective" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        <Field label="Your role" hint="As Squad Lead you’ll be added automatically — add your speciality, e.g. “Squad Lead · Photographer”.">
          <Input placeholder="Squad Lead · …" readOnly />
        </Field>
        <p className="subtle" style={{ fontSize: 12, marginBottom: 10 }}>
          After creating, invite up to 4 verified students by username from the Squad page. Every member must accept.
        </p>
        <button className="btn btn-primary btn-lg btn-block" onClick={createSquad}>Create squad</button>
      </Modal>
    </div>
  );
}

const SectionTitle2 = ({ title }: { title: string }) => <h3 style={{ fontSize: 15, marginBottom: 8 }}>{title}</h3>;
