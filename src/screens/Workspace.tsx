import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, userRating } from '../lib/store';
import { Avatar, Modal, Field, Input, Textarea, UploadBox, StatusChip, RatingStars, toast, EmptyState } from '../components/ui';
import { IconBack, IconChat, IconFlag, IconShield, IconCheck, IconLock } from '../components/icons';
import { timeAgo, dateFull, timeShort } from '../lib/format';
import { CAMPAIGN_TYPE_MAP, EFFORT_LABEL, PAYMENT_LABEL, roleForCampaign } from '../lib/domain';
import type { Campaign } from '../lib/types';

export default function Workspace() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const me = currentUser();
  const campaign: Campaign | undefined = byId(state.campaigns, id ?? '');

  // contributor submission
  const [items, setItems] = useState([{ title: '', link: '', file: '' }]);
  const [revOpen, setRevOpen] = useState(false);
  const [revNote, setRevNote] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const [rep, setRep] = useState({ reason: '', details: '' });

  if (!me || !campaign) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <div className="screen-header">
          <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
          <h1>Workspace not found</h1>
        </div>
      </div>
    );
  }

  const assignment = state.assignments.find((a) => a.campaignId === campaign.id);
  const isOwner = campaign.ownerUserId === me.id;
  const isContributor = assignment?.contributorIds.includes(me.id) ?? false;
  const involved = isOwner || isContributor;
  const owner = byId(state.users, campaign.ownerUserId);
  const biz = byId(state.businesses, campaign.businessProfileId ?? '');
  const squad = assignment?.squadId ? byId(state.squads, assignment.squadId) : undefined;

  if (!involved || !assignment) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <div className="screen-header">
          <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
          <h1>Workspace</h1>
          <span />
        </div>
        <div style={{ padding: '6px 16px' }}>
          <EmptyState emoji="🔒" title="Private workspace" sub="Only the assigned creators and the vendor can see this workspace. Check your notifications if you were selected." action={<button className="btn btn-primary" onClick={() => nav('/app/home')}>Go home</button>} />
        </div>
      </div>
    );
  }

  const contributors = assignment.contributorIds.map((cid) => byId(state.users, cid)).filter(Boolean) as NonNullable<typeof owner>[];
  const deliverables = state.deliverables.filter((d) => d.assignmentId === assignment.id).sort((a, b) => a.createdAt - b.createdAt);
  const done = ['submitted', 'revision_requested', 'accepted'].includes(assignment.status);
  const closed = ['accepted', 'growthproof_issued', 'cancelled', 'disputed', 'rejected'].includes(campaign.status);
  const working = assignment.status === 'assigned' || assignment.status === 'in_progress';
  const wpIssued = state.growthproof.some((w) => w.campaignId === campaign.id);

  // ---- timeline steps ----
  const steps: { label: string; done: boolean; now?: boolean }[] = [
    { label: 'Assigned', done: true },
    { label: 'In progress', done: assignment.status !== 'assigned', now: assignment.status === 'assigned' },
    { label: 'Submitted', done: ['submitted', 'revision_requested', 'accepted'].includes(assignment.status), now: assignment.status === 'submitted' },
    { label: 'Accepted', done: assignment.status === 'accepted' || wpIssued, now: assignment.status === 'revision_requested' ? false : undefined },
  ];
  // timeline ordering for revision: if revision_requested → shows revision then back to in_progress
  if (assignment.status === 'revision_requested') {
    steps.splice(2, 0, { label: 'Revision requested', done: false, now: true });
  }

  const days = Math.ceil((assignment.deadline - Date.now()) / 86400000);
  const canSubmit = isContributor && (assignment.status === 'assigned' || assignment.status === 'in_progress' || assignment.status === 'revision_requested');

  const submitDeliverables = () => {
    const clean = items
      .map((i) => ({ title: i.title.trim(), link: i.link.trim(), file: i.file.trim() }))
      .filter((i) => i.title && (i.link || i.file));
    if (clean.length === 0) { toast('Add at least one deliverable with a link or file', 'error'); return; }
    actions.submitDeliverables(campaign.id, clean);
    setItems([{ title: '', link: '', file: '' }]);
    toast('Work submitted — the owner will review against the checklist', 'success');
  };

  const openChat = () => {
    const convId = actions.openConversation(isOwner ? contributors[0]?.id ?? '' : campaign.ownerUserId, campaign.id);
    if (convId) nav(`/app/chat/${convId}`);
  };

  const fileReport = () => {
    if (!rep.reason) { toast('Choose a reason', 'error'); return; }
    actions.flagCampaignDispute(campaign.id, rep.reason, rep.details);
    setRepOpen(false);
    setRep({ reason: '', details: '' });
    toast('Dispute opened — admins will review both sides', 'success');
  };

  const AcceptPanel = () => {
    const [fb, setFb] = useState<Record<string, { rating: number; onTime: boolean; feedback: string }>>(() =>
      Object.fromEntries(contributors.map((c) => [c.id, { rating: 5, onTime: true, feedback: '' }]))
    );
    return (
      <div className="col" style={{ gap: 14 }}>
        <div className="safety-tip">
          <span>📗</span>
          <span style={{ fontSize: 12.5 }}>
            Accepting issues a <strong>verified GrowthProof entry to every contributing member</strong> with their individual role{contributors.length > 1 ? ' — the Squad Lead can’t claim all the credit' : ''}.
          </span>
        </div>
        {contributors.map((c) => (
          <div key={c.id} className="card card-pad" style={{ background: 'var(--mist-soft)' }}>
            <div className="row-between">
              <div className="row" style={{ gap: 8 }}>
                <Avatar user={c} size="sm" showVerified />
                <div>
                  <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{publicName(c)}</span>
                  <span className="subtle" style={{ display: 'block', fontSize: 11 }}>{squad ? state.squadMembers.find((sm) => sm.squadId === squad.id && sm.userId === c.id)?.role ?? 'Squad member' : roleForCampaign(c.skills ?? [], campaign.skills)}</span>
                </div>
              </div>
              <RatingStars value={fb[c.id].rating} size="lg" />
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
              {[5, 4, 3, 2, 1].map((r) => (
                <button key={r} className={`chip chip-sm ${fb[c.id].rating === r ? 'active' : ''}`} onClick={() => setFb({ ...fb, [c.id]: { ...fb[c.id], rating: r } })}>{r}★</button>
              ))}
              <button className={`chip chip-sm ${fb[c.id].onTime ? 'active' : ''}`} onClick={() => setFb({ ...fb, [c.id]: { ...fb[c.id], onTime: !fb[c.id].onTime } })}>✅ On time</button>
            </div>
            <Input
              placeholder={`Short feedback for ${publicName(c)}’s GrowthProof — e.g. “Delivered all five posts with the faculty brand kit.”`}
              value={fb[c.id].feedback}
              onChange={(e) => setFb({ ...fb, [c.id]: { ...fb[c.id], feedback: e.target.value } })}
              style={{ marginTop: 8 }}
            />
          </div>
        ))}
        <button className="btn btn-primary btn-lg btn-block" onClick={() => {
          const payload = contributors.map((c) => ({ userId: c.id, rating: fb[c.id].rating, feedback: fb[c.id].feedback.trim() || `Great work on ${campaign.title} — checklist accepted.`, onTime: fb[c.id].onTime }));
          actions.acceptCampaign(campaign.id, payload);
          setAcceptOpen(false);
          toast(contributors.length > 1 ? 'Campaign accepted — GrowthProof issued to every member 🎉' : 'Campaign accepted — GrowthProof entry issued 🎉', 'success');
        }}>
          Accept work & issue GrowthProof
        </button>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="top-bar">
        <div className="row-between">
          <div className="row" style={{ gap: 10, minWidth: 0 }}>
            <button className="btn-icon btn-soft" onClick={() => nav(`/app/campaign/${campaign.id}`)} aria-label="Back"><IconBack size={18} /></button>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.title}</h1>
              <p className="subtle" style={{ fontSize: 11 }}>Campaign workspace · {CAMPAIGN_TYPE_MAP[campaign.campaignType]?.name}</p>
            </div>
          </div>
          <StatusChip status={campaign.status} />
        </div>
      </div>

      <div style={{ padding: '6px 16px' }}>
        {/* status strip */}
        <div className="card card-pad" style={{ borderColor: campaign.status === 'disputed' ? 'var(--danger)' : 'var(--green-mist)', marginBottom: 14 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div>
              <span className="strong" style={{ fontSize: 14, color: 'var(--navy)' }}>⏳ {days > 0 ? `${days} day${days !== 1 ? 's' : ''} left` : days === 0 ? 'Due today' : `Overdue by ${-days} day${days !== -1 ? 's' : ''}`}</span>
              <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>Locked deadline: {dateFull(assignment.deadline)}</span>
            </div>
            {squad && <span className="tag tag-navy">👥 {squad.name}</span>}
          </div>

          {/* timeline */}
          <div className="timeline">
            {steps.map((s, i) => (
              <div key={i} className={`tl-item ${s.now ? 'current' : s.done ? 'done' : ''}`}>
                <span className="tl-dot">{s.done ? <IconCheck size={10} /> : null}</span>
                <div className="tl-body">
                  <span className="tl-title" style={{ fontSize: 12.5 }}>{s.label}</span>
                  <span className="tl-sub" style={{ display: 'block' }}>
                    {s.now ? (campaign.status === 'revision_requested' ? 'Waiting on contributor to revise & resubmit' : assignment.status === 'submitted' ? 'Owner is reviewing the checklist' : 'Work phase — deliver by the locked deadline') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* payment arrangement */}
        <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--bg)', borderStyle: 'dashed' }}>
          <div className="row-between">
            <div>
              <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>💳 {PAYMENT_LABEL[campaign.payment]}</span>
              {campaign.budgetRange && <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>Budget range: {campaign.budgetRange}</span>}
            </div>
            {(() => {
              const ownerConfirmed = assignment.paymentArrangedBy.includes(campaign.ownerUserId);
              const contribConfirmed = assignment.contributorIds.some((c) => assignment.paymentArrangedBy.includes(c));
              const confirmed = ownerConfirmed && contribConfirmed;
              const iConfirmed = assignment.paymentArrangedBy.includes(me.id);
              if (confirmed) {
                return <span className="tag tag-green">✓ Both sides confirmed {assignment.paymentArrangedAt ? timeShort(assignment.paymentArrangedAt) : ''}</span>;
              }
              if (iConfirmed) {
                return <span className="tag tag-amber">⏳ Awaiting the other party’s confirmation</span>;
              }
              return (
                <button className="btn btn-sm btn-ghost" onClick={() => { const e = actions.confirmPaymentArranged(campaign.id); if (e) toast(e, 'error'); else toast('Confirmed on your side — the other party still needs to confirm. Never share bank details publicly.', 'success'); }}>
                  {ownerConfirmed || contribConfirmed ? 'Confirm on my side' : 'Mark arranged outside'}
                </button>
              );
            })()}
          </div>
          <p className="subtle" style={{ fontSize: 11, marginTop: 6 }}>CampusHustle does not hold or process payments. Pay the contributor directly by transfer or cash — never pay “upfront fees” to anyone.</p>
        </div>

        {/* locked snapshot */}
        <div className="section">
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            <IconLock size={15} style={{ color: 'var(--green)' }} />
            <h3 style={{ fontSize: 15 }}>Locked scope</h3>
          </div>
          <p className="subtle" style={{ fontSize: 11.5, marginBottom: 10 }}>
            Snapshot taken when this Campaign was assigned ({campaign.snapshot ? timeAgo(campaign.snapshot.capturedAt) : '—'}). Immutable — any change needs a change request.
          </p>
          <div className="card card-pad" style={{ background: 'var(--mist-soft)' }}>
            <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{campaign.snapshot?.brief ?? campaign.brief}</p>
            <div className="divider" style={{ margin: '10px 0' }} />
            <p className="strong" style={{ fontSize: 12.5, marginBottom: 6 }}>Deliverables</p>
            <div className="col" style={{ gap: 5 }}>
              {(campaign.snapshot?.deliverables ?? campaign.deliverables ?? []).map((d, i) => (
                <div key={i} className="row" style={{ gap: 7, alignItems: 'flex-start', fontSize: 12.5 }}>
                  <IconCheck size={14} style={{ color: 'var(--green)', flex: 'none', marginTop: 2 }} />
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: '10px 0' }} />
            <p className="strong" style={{ fontSize: 12.5, marginBottom: 6 }}>Acceptance checklist</p>
            <div className="col" style={{ gap: 5 }}>
              {(campaign.snapshot?.checklist ?? campaign.checklist ?? []).map((c, i) => (
                <div key={i} className="row" style={{ gap: 7, fontSize: 12.5 }}>
                  <span className="row" style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--green)', justifyContent: 'center', fontSize: 9, color: 'var(--green)', flex: 'none' }}>{i + 1}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* change requests */}
        {campaign.changeRequests.length > 0 && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Change requests</h3>
            <div className="col" style={{ gap: 8 }}>
              {campaign.changeRequests.map((cr) => {
                const byName = cr.by === 'owner' ? publicName(owner) : publicName(byId(state.users, (state.applications.find((a) => a.campaignId === campaign.id && a.status === 'selected')?.applicantId ?? me.id)));
                const mine = cr.by === (isOwner ? 'owner' : 'contributor');
                const pending = cr.status === 'pending';
                const canDecide = pending && !mine;
                return (
                  <div key={cr.id} className="card card-pad" style={{ borderColor: pending ? '#f0d48a' : 'var(--mist)', background: pending ? 'var(--gold-soft)' : undefined }}>
                    <div className="row-between">
                      <span className="tag tag-amber" style={{ fontSize: 10.5 }}>{cr.by === 'owner' ? 'Owner' : 'Contributor'} request · {pending ? 'pending' : cr.status}</span>
                      <span className="subtle" style={{ fontSize: 10.5 }}>{timeAgo(cr.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: 13, margin: '8px 0', lineHeight: 1.5 }}>“{cr.text}”</p>
                    {canDecide && (
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-sm btn-primary grow" onClick={() => {
                          const nd = window.prompt('New deadline (YYYY-MM-DD) if this changes the date — leave blank to keep it:');
                          const ms = nd && nd.trim() ? new Date(nd.trim() + 'T23:59:59').getTime() : undefined;
                          actions.decideChangeRequest(campaign.id, cr.id, true, Number.isFinite(ms) ? ms : undefined);
                          toast('Change accepted', 'success');
                        }}>Accept</button>
                        <button className="btn btn-sm btn-soft grow" onClick={() => { actions.decideChangeRequest(campaign.id, cr.id, false); toast('Change declined — locked scope stands', 'info'); }}>Decline</button>
                      </div>
                    )}
                    {mine && pending && <p className="subtle" style={{ fontSize: 11.5 }}>Waiting on the other side to respond.</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* deliverables */}
        <div className="section">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15 }}>Deliverables {deliverables.length > 0 && `(${deliverables.length})`}</h3>
            <button className="btn btn-sm btn-soft" onClick={openChat}><IconChat size={14} /> Workspace chat</button>
          </div>
          {deliverables.length === 0 ? (
            <div className="card card-pad ta-center" style={{ borderStyle: 'dashed' }}>
              <p className="subtle" style={{ fontSize: 12.5 }}>{isContributor ? 'Submit your work here when it’s ready — the owner checks it against the acceptance checklist.' : 'No deliverables yet. The contributor will submit work here.'}</p>
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {deliverables.map((d) => {
                const uploader = byId(state.users, d.uploaderId);
                return (
                  <div key={d.id} className="card card-pad">
                    <div className="row-between">
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{d.link ? '🔗' : '📎'}</span>
                        <div>
                          <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{d.title}</span>
                          <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>
                            {d.link || d.file} · by {publicName(uploader)} · {timeAgo(d.createdAt)}
                          </span>
                        </div>
                      </div>
                      <Avatar user={uploader} size="xs" />
                    </div>
                    {d.note && <p className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>{d.note}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* contributors */}
        <div className="section">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>{squad ? `Team (${contributors.length})` : 'Contributor'}</h3>
          <div className="col" style={{ gap: 8 }}>
            {contributors.map((c) => {
              const role = squad ? state.squadMembers.find((sm) => sm.squadId === squad.id && sm.userId === c.id)?.role : roleForCampaign(c.skills ?? [], campaign.skills);
              const r = userRating(c);
              const entry = state.growthproof.find((w) => w.campaignId === campaign.id && w.userId === c.id);
              return (
                <div key={c.id} className="card card-pad" style={{ borderColor: 'var(--green-mist)' }}>
                  <div className="row-between">
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar user={c} size="md" showVerified />
                      <div>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="strong" style={{ fontSize: 14, color: 'var(--navy)' }}>{publicName(c)}</span>
                          {r.count > 0 && <RatingStars value={r.avg} />}
                        </div>
                        <span className="subtle" style={{ fontSize: 11.5 }}>{role} · UNILAG · ★ {r.avg > 0 ? r.avg.toFixed(1) : 'new'} · 📗 {state.growthproof.filter((w) => w.userId === c.id && w.verified).length} GrowthProof</span>
                      </div>
                    </div>
                    {entry && <span className="tag tag-green">📗 GrowthProof issued</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* action area */}
        {!closed && (
          <div className="col" style={{ gap: 10, marginTop: 6 }}>
            {/* owner: request revision / accept */}
            {isOwner && assignment.status === 'submitted' && (
              <>
                <button className="btn btn-primary btn-lg btn-block" onClick={() => setAcceptOpen(true)}>Accept work & issue GrowthProof</button>
                <button className="btn btn-outline btn-block" onClick={() => setRevOpen(true)}>Request revision</button>
              </>
            )}
            {isOwner && working && (
              <button className="btn btn-soft btn-block" onClick={() => { actions.startCampaign(campaign.id); toast('Campaign marked in progress', 'success'); }}>
                Start work phase
              </button>
            )}
            {/* contributor: submit */}
            {canSubmit && (
              <div className="card card-pad" style={{ borderColor: 'var(--green-mist)', background: 'var(--green-soft)', borderStyle: 'dashed' }}>
                <p className="strong" style={{ fontSize: 13.5, color: 'var(--navy)', marginBottom: 10 }}>Submit deliverables</p>
                <div className="col" style={{ gap: 8 }}>
                  {items.map((it, i) => (
                    <div key={i} className="col" style={{ gap: 6, padding: 10, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--mist)' }}>
                      <Input placeholder={`Deliverable ${i + 1} title — e.g. Instagram post set (5 files)`} value={it.title} onChange={(e) => setItems(items.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x))} />
                      <div className="row" style={{ gap: 6 }}>
                        <Input placeholder="Link (Google Drive, Behance…)" value={it.link} onChange={(e) => setItems(items.map((x, xi) => xi === i ? { ...x, link: e.target.value } : x))} />
                        <UploadBox label="or file" fileName={it.file || undefined} onChange={(name) => setItems(items.map((x, xi) => xi === i ? { ...x, file: name } : x))} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-sm btn-ghost" onClick={() => setItems([...items, { title: '', link: '', file: '' }])}>+ Add another</button>
                  <button className="btn btn-primary btn-lg btn-block" onClick={submitDeliverables}>Submit work for review</button>
                </div>
              </div>
            )}
            {isContributor && (assignment.status === 'submitted') && (
              <div className="card card-pad ta-center" style={{ background: 'var(--gold-soft)', borderColor: '#f0d48a' }}>
                <span className="strong" style={{ fontSize: 14 }}>Submitted — awaiting the owner’s checklist review ⏳</span>
              </div>
            )}
            {isContributor && assignment.status === 'revision_requested' && (
              <div className="safety-tip" style={{ borderColor: '#f0d48a', background: 'var(--warning-soft)' }}>
                <span>✍️</span><span style={{ fontSize: 12.5 }}>The owner requested changes. Revise your deliverables and resubmit above.</span>
              </div>
            )}
            {isOwner && wpIssued && (
              <div className="card card-pad ta-center" style={{ background: 'var(--green-soft)', borderColor: 'var(--green-mist)' }}>
                <span className="strong" style={{ fontSize: 14, color: 'var(--green-dark)' }}>GrowthProof issued to the team 🎉</span>
              </div>
            )}

            {/* scope change + dispute */}
            <div className="row" style={{ gap: 8 }}>
              {!done && !closed && (
                <button className="btn btn-ghost grow" onClick={() => setChangeOpen(true)}>🔄 Request scope change</button>
              )}
              {!closed && campaign.status !== 'disputed' && (
                <button className="btn btn-danger grow" onClick={() => setRepOpen(true)}><IconFlag size={15} /> Dispute / report</button>
              )}
            </div>
          </div>
        )}

        {closed && (
          <div className="card card-pad ta-center" style={{ background: 'var(--mist-soft)', marginTop: 10 }}>
            {campaign.status === 'growthproof_issued' || wpIssued ? (
              <>
                <span style={{ fontSize: 26 }}>📗</span>
                <p className="strong" style={{ fontSize: 14.5, color: 'var(--navy)' }}>Campaign complete — GrowthProof issued</p>
                <p className="subtle" style={{ fontSize: 12.5, marginBottom: 12 }}>Every contributing member’s entry is live on their Passport with role, rating and feedback.</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: 26 }}>🛑</span>
                <p className="strong" style={{ fontSize: 14.5, color: 'var(--navy)' }}>Campaign {campaign.status === 'cancelled' ? 'cancelled' : campaign.status === 'disputed' ? 'under dispute' : 'closed'}</p>
                <p className="subtle" style={{ fontSize: 12.5 }}>Admins are handling it. You’ll be notified of any resolution.</p>
              </>
            )}
            <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={() => nav('/app/campaigns')}>Browse new Campaigns</button>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'center', gap: 8, margin: '14px 0 4px', fontSize: 11, color: 'var(--slate)' }}>
          <IconShield size={12} /> Private workspace · {publicName(owner)} & assigned contributors only
        </div>
      </div>

      {/* revision modal */}
      <Modal open={revOpen} onClose={() => setRevOpen(false)} title="Request revision">
        <Field label="What should change?" hint="Be specific — reference checklist items and deliverables.">
          <Textarea placeholder="e.g. Post 2 has the wrong venue date — it says the 14th, the event is the 21st. Update and resubmit all five in the same format." value={revNote} onChange={(e) => setRevNote(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => {
          if (!revNote.trim()) { toast('Describe the changes needed', 'error'); return; }
          actions.requestRevision(campaign.id, revNote.trim());
          setRevOpen(false); setRevNote('');
          toast('Revision requested — the contributor is notified', 'success');
        }}>Send revision request</button>
      </Modal>

      {/* change request modal */}
      <Modal open={changeOpen} onClose={() => setChangeOpen(false)} title="Request a scope change">
        <div className="safety-tip" style={{ marginBottom: 10 }}>
          <span>🔒</span>
          <span style={{ fontSize: 12.5 }}>The locked scope never silently changes. The other side must accept your request — and any new deadline is recorded visibly.</span>
        </div>
        <Field label={`What needs to change? (as ${isOwner ? 'owner' : 'contributor'})`} hint="Deadline extensions, extra deliverables, revised expectations.">
          <Textarea placeholder="e.g. The Faculty Week committee added a 6th post (announcement of the keynote). Requesting +1 deliverable and 3 extra days." value={changeText} onChange={(e) => setChangeText(e.target.value)} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => {
          if (!changeText.trim()) { toast('Describe the change', 'error'); return; }
          actions.requestChange(campaign.id, isOwner ? 'owner' : 'contributor', changeText.trim());
          setChangeOpen(false); setChangeText('');
          toast('Change request sent for approval', 'success');
        }}>Send change request</button>
      </Modal>

      {/* accept modal */}
      <Modal open={acceptOpen} onClose={() => setAcceptOpen(false)} title="Accept work & issue GrowthProof">
        <AcceptPanel />
      </Modal>

      {/* dispute modal */}
      <Modal open={repOpen} onClose={() => setRepOpen(false)} title="Dispute or report this Campaign">
        <Field label="Reason">
          <div className="col" style={{ gap: 8 }}>
            {[['scam', 'Scam or fake Campaign'], ['no_show', 'No-show / not delivered'], ['inappropriate', 'Inappropriate content'], ['harassment', 'Harassment'], ['cheating', 'Academic cheating'], ['other', 'Other']].map(([rid, label]) => (
              <label key={rid} className={`check-row ${rep.reason === rid ? 'selected' : ''}`} onClick={() => setRep({ ...rep, reason: rid })}>
                <span className="radio-dot" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Details (optional)">
          <Textarea placeholder="What happened? Dates, deliverables, messages — admins see the full locked scope." value={rep.details} onChange={(e) => setRep({ ...rep, details: e.target.value })} />
        </Field>
        <button className="btn btn-danger btn-lg btn-block" onClick={fileReport}>Open dispute</button>
      </Modal>
    </div>
  );
}
