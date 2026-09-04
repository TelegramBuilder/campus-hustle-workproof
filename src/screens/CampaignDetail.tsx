import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, levelInfo, userRating } from '../lib/store';
import { Avatar, Modal, Field, Textarea, StatusChip, toast, GrowthProofCard, Cover, coverFor } from '../components/ui';
import { IconBack, IconChat, IconFlag, IconShield, IconCheck } from '../components/icons';
import { timeAgo, dateFull } from '../lib/format';
import { CAMPAIGN_TYPE_MAP, PAYMENT_LABEL, EFFORT_LABEL, REPORT_REASONS, RESULT_STATUS_LABEL, KIND_OF, RESULT_PROOF_HINT, vendorReliability } from '../lib/domain';
import type { GrowthProofEntry, ResultProofEntry } from '../lib/types';

const RESULT_STATUS_CLS: Record<ResultProofEntry['status'], string> = {
  submitted: 'status-negotiating',
  vendor_confirmed: 'status-completed',
  rejected: 'status-rejected',
  disputed: 'status-reported',
};

function TaskApplications() {
  const { state, actions } = useApp();
  const { id } = useParams();
  const nav = useNavigate();
  const campaign = byId(state.campaigns, id ?? '');
  if (!campaign) return null;
  const apps = state.applications
    .filter((a) => a.campaignId === campaign.id && ['pending', 'shortlisted'].includes(a.status))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (apps.length === 0) return <p className="subtle" style={{ fontSize: 13 }}>No applications yet. Share the Campaign in your class and hall groups.</p>;

  return (
    <div className="col" style={{ gap: 10 }}>
      {apps.map((a) => {
        const u = byId(state.users, a.applicantId);
        if (!u) return null;
        const lvl = levelInfo(u);
        const rating = userRating(u);
        const wpRefs = a.growthproofRefs.map((wid) => byId(state.growthproof, wid)).filter(Boolean) as GrowthProofEntry[];
        const squad = a.squadId ? byId(state.squads, a.squadId) : undefined;
        return (
          <div key={a.id} className="card card-pad">
            <div className="row-between">
              <div className="row" style={{ gap: 10, cursor: 'pointer' }} onClick={() => nav(`/app/user/${u.id}`)}>
                <Avatar user={u} size="md" showVerified />
                <div>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="strong" style={{ color: 'var(--navy)' }}>{publicName(u)}</span>
                    {squad && <span className="tag tag-navy">Squad: {squad.name}</span>}
                  </div>
                  <div className="subtle" style={{ fontSize: 12 }}>{u.faculty ?? 'UNILAG'} {u.department ? `· ${u.department}` : ''}</div>
                  <div className="row" style={{ gap: 10, fontSize: 11.5, color: 'var(--slate)', marginTop: 2 }}>
                    <span>📗 {lvl.entries} GrowthProof</span>
                    {rating.count > 0 ? <span>★ {rating.avg.toFixed(1)} ({rating.count})</span> : null}
                    <span>✅ {lvl.onTimePct === null ? 'No Campaigns yet' : `${lvl.onTimePct}% on-time`}</span>
                  </div>
                </div>
              </div>
              <StatusChip status={a.status === 'shortlisted' ? 'shortlisting' : 'open'} label={a.status === 'shortlisted' ? 'Shortlisted' : 'Applied'} cls={a.status === 'shortlisted' ? 'status-negotiating' : 'status-sent'} />
            </div>
            <div className="row wrap" style={{ gap: 5, marginTop: 10 }}>
              {u.skills.map((s) => <span key={s} className="skill-chip">{s}</span>)}
            </div>
            <p style={{ fontSize: 13.5, marginTop: 10, background: 'var(--mist-soft)', padding: '10px 12px', borderRadius: 10 }}>{a.message}</p>
            <p className="subtle" style={{ fontSize: 12.5, marginTop: 6 }}>Availability: {a.availability}</p>
            {wpRefs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {wpRefs.slice(0, 2).map((w) => <GrowthProofCard key={w.id} entry={w} />)}
              </div>
            )}
            {a.portfolioLinks.length > 0 && (
              <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                {a.portfolioLinks.map((l) => <span key={l} className="attach-pill">🔗 {l}</span>)}
              </div>
            )}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm btn-primary grow" onClick={() => {
                if (window.confirm(`Select ${publicName(u)}${squad ? ` and squad “${squad.name}”` : ''} for this Campaign?\n\nThe scope becomes locked, other applicants are notified, and a private workspace opens.`)) {
                  actions.selectApplicant(a.id);
                  toast('Selected — scope locked and workspace opened 🎯', 'success');
                  nav(`/app/workspace/${campaign.id}`);
                }
              }}>Select</button>
              <button className="btn btn-sm btn-soft grow" onClick={() => {
                const cid = actions.openConversation(a.applicantId, campaign.id);
                if (cid) nav(`/app/chat/${cid}`);
              }}>
                Message
              </button>
              <button className="btn btn-sm btn-outline grow" onClick={() => {
                if (window.confirm(`Decline ${publicName(u)}’s application?`)) {
                  actions.setApplicationStatus(a.id, 'declined');
                  toast('Application declined', 'success');
                }
              }}>Decline</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CampaignDetail() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const me = currentUser();
  const campaign = byId(state.campaigns, id ?? '');
  const [repOpen, setRepOpen] = useState(false);
  const [rep, setRep] = useState({ reason: '', details: '' });
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinNote, setJoinNote] = useState('');
  const [proofOpen, setProofOpen] = useState(false);
  const [proofForm, setProofForm] = useState({ description: '', customerRef: '', amount: '' });
  const [disputeFor, setDisputeFor] = useState<ResultProofEntry | null>(null);
  const [disputeNote, setDisputeNote] = useState('');
  const [decideFor, setDecideFor] = useState<ResultProofEntry | null>(null);
  const [decide, setDecide] = useState<{ rating: number; feedback: string; note: string }>({ rating: 5, feedback: '', note: '' });
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('Flexible');
  const [links, setLinks] = useState('');

  if (!campaign || !me) {
    return (
      <div className="screen-header">
        <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
        <h1>Campaign not found</h1>
      </div>
    );
  }

  const kind = KIND_OF(campaign.campaignType);
  const type = CAMPAIGN_TYPE_MAP[campaign.campaignType];
  const owner = byId(state.users, campaign.ownerUserId);
  const biz = byId(state.businesses, campaign.businessProfileId ?? '');
  const isOwnerUser = campaign.ownerUserId === me.id;
  const joined = state.applications.find((a) => a.campaignId === campaign.id && a.applicantId === me.id && a.status === 'joined');
  const myApp = state.applications.find((a) => a.campaignId === campaign.id && a.applicantId === me.id && !['declined', 'withdrawn'].includes(a.status));
  const assignment = state.assignments.find((a) => a.campaignId === campaign.id);
  const isContributor = assignment?.contributorIds.includes(me.id) ?? false;
  const mySquads = state.squads.filter((s) => s.leadId === me.id && state.squadMembers.some((sm) => sm.squadId === s.id && sm.userId === me.id && sm.status === 'accepted'));
  const days = Math.ceil((campaign.deadline - Date.now()) / 86400000);
  const canApply = kind === 'task' && ['open', 'shortlisting'].includes(campaign.status) && !isOwnerUser && !myApp && !isContributor;
  const canJoin = kind === 'result' && campaign.status === 'open' && !isOwnerUser && !joined && me.verificationStatus === 'verified';
  const myProofs = campaign.resultProofs.filter((p) => p.promoterId === me.id);
  const referral = joined?.referralCode ?? null;
  const myMembership = kind === 'result' && joined && campaign.status === 'open';
  // vendor reliability across all their result campaigns
  const allOwnerProofs = state.campaigns.filter((c) => c.ownerUserId === campaign.ownerUserId).flatMap((c) => c.resultProofs);
  const rel = vendorReliability(allOwnerProofs.filter((p) => p.status === 'vendor_confirmed').length, allOwnerProofs.filter((p) => p.status === 'disputed').length, allOwnerProofs.filter((p) => p.status === 'rejected').length);
  const rewardLine = campaign.rewardType === 'per_result'
    ? `₦${campaign.rewardAmount.toLocaleString()} per confirmed result`
    : `₦${campaign.rewardAmount.toLocaleString()} fixed reward`;
  const progress = campaign.targetResults ? Math.min(100, Math.round((campaign.confirmedResults / campaign.targetResults) * 100)) : 0;

  const copyCode = () => {
    if (referral) {
      navigator.clipboard?.writeText(referral).catch(() => undefined);
      toast(`Referral code ${referral} copied — share it with anyone who might buy!`, 'success');
    }
  };

  const submitJoin = () => {
    const err = actions.joinCampaign(campaign.id, joinNote);
    if (err) { toast(err, 'error'); return; }
    setJoinOpen(false);
    setJoinNote('');
    const code = actions.myReferralCode(campaign.id);
    toast(code ? `You’re in! Your referral code is ${code} 🎉` : 'You’re in!', 'success');
  };

  const submitProof = () => {
    if (proofForm.description.trim().length < 10) { toast('Describe the result in a little more detail', 'error'); return; }
    const err = actions.submitResultProof(campaign.id, {
      description: proofForm.description,
      customerRef: proofForm.customerRef.trim() || undefined,
      amount: proofForm.amount ? Number(proofForm.amount) : undefined,
    });
    if (err) { toast(err, 'error'); return; }
    setProofOpen(false);
    setProofForm({ description: '', customerRef: '', amount: '' });
    toast('Proof submitted — the vendor will confirm it', 'success');
  };

  const decideProof = (confirm: boolean) => {
    if (!decideFor) return;
    const err = actions.decideResultProof(decideFor.id, confirm, {
      rating: confirm ? decide.rating : undefined,
      feedback: confirm ? decide.feedback : undefined,
      note: confirm ? undefined : decide.note,
    });
    if (err) { toast(err, 'error'); return; }
    toast(confirm ? 'Result confirmed — GrowthProof issued 🎉' : 'Proof rejected — the promoter was notified', 'success');
    setDecideFor(null);
    setDecide({ rating: 5, feedback: '', note: '' });
  };

  const submitDispute = () => {
    if (!disputeFor) return;
    const err = actions.disputeResultProof(disputeFor.id, disputeNote);
    if (err) { toast(err, 'error'); return; }
    setDisputeFor(null);
    setDisputeNote('');
    toast('Dispute sent to admins — they’ll review both sides', 'success');
  };

  const submitApplication = (squadId?: string) => {
    if (!message.trim()) { toast('Write a short application message', 'error'); return; }
    const err = actions.applyToCampaign({
      campaignId: campaign.id, message, availability, growthproofRefs: state.growthproof.filter((w) => w.userId === me.id).map((w) => w.id),
      portfolioLinks: links.split('\n').map((l) => l.trim()).filter(Boolean),
      squadId,
    });
    if (err) { toast(err, 'error'); return; }
    setApplyOpen(false);
    setMessage('');
    toast('Application sent — the vendor will review it', 'success');
  };

  const fileReport = () => {
    if (!rep.reason) { toast('Choose a reason', 'error'); return; }
    actions.fileReport({ targetType: 'campaign', targetId: campaign.id, reason: rep.reason, details: rep.details, linkedCampaignId: campaign.id });
    setRepOpen(false);
    setRep({ reason: '', details: '' });
    toast('Report sent — admins will review', 'success');
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="screen-header">
        <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
        <h1 style={{ fontSize: 17 }}>Campaign</h1>
        <StatusChip status={campaign.status} />
      </div>

      <div style={{ padding: '4px 16px' }}>
        <Cover cover={campaign.cover ?? coverFor(campaign.campaignType)} emoji={type?.emoji} height={128} className="cd-cover">
          <span className="cc-type-oncover">{type?.name}</span>
          <StatusChip status={campaign.status} />
        </Cover>

        <div className="row wrap" style={{ gap: 6, marginTop: 14 }}>
          {kind === 'result' ? <span className="tag tag-gold">💰 Pays per confirmed result</span> : <span className="tag tag-navy">Creator task</span>}
          <span className="tag tag-slate">📍 {campaign.zone}</span>
        </div>

        <h1 style={{ fontSize: 21, marginTop: 8, color: 'var(--navy)' }}>{campaign.title}</h1>

        <div className="row wrap" style={{ gap: 10, fontSize: 13, color: 'var(--slate)', margin: '8px 0 12px' }}>
          <span>⏳ Deadline {dateFull(campaign.deadline)}{days >= 0 ? ` · ${days === 0 ? 'today' : `${days} days left`}` : ''}</span>
          {campaign.effort && <><span>·</span><span>⚡ {EFFORT_LABEL[campaign.effort]}</span></>}
        </div>

        {/* Vendor strip */}
        <div className="provider-strip" style={{ marginBottom: 14 }} onClick={() => nav(`/app/user/${owner?.id}`)}>
          <Avatar user={owner} size="md" showVerified />
          <div className="grow col" style={{ gap: 1 }}>
            <span className="strong" style={{ color: 'var(--navy)' }}>{biz?.businessName ?? `${publicName(owner)}’s business`}</span>
            <span className="subtle" style={{ fontSize: 12 }}>Student vendor · {publicName(owner)}{biz?.category ? ` · ${biz.category}` : ''}</span>
            <span className="row" style={{ gap: 4, color: 'var(--green)', fontWeight: 800, fontSize: 11 }}>
              <IconShield size={12} /> Identity verified by CampusHustle
            </span>
          </div>
        </div>

        {/* Reward card */}
        <div className="card card-pad" style={{ marginBottom: 14, borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="strong" style={{ fontSize: 16, color: 'var(--navy)' }}>{rewardLine}</span>
            <span className="tag" style={{ background: '#f7e5b3', color: '#8a6d00' }}>{kind === 'result' ? 'Per confirmed result' : 'Fixed task'}</span>
          </div>
          {campaign.rewardDescription && <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>{campaign.rewardDescription}</p>}
          {kind === 'result' && campaign.targetResults ? (
            <div>
              <div className="row-between" style={{ fontSize: 12, color: 'var(--slate)', margin: '6px 0 4px' }}>
                <span>🎯 {campaign.confirmedResults}/{campaign.targetResults} confirmed results</span>
                <span>{progress}%</span>
              </div>
              <div style={{ background: '#f1e5be', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{ background: 'var(--gold)', height: '100%', width: `${progress}%`, borderRadius: 999 }} />
              </div>
              {campaign.status === 'closed' && <p className="subtle" style={{ fontSize: 12, marginTop: 6 }}>This Campaign hit its target and is now closed — the vendor can run a new one.</p>}
            </div>
          ) : null}
          <p className="subtle" style={{ fontSize: 11.5, marginTop: 8 }}>
            CampusHustle does not hold or process payments — {kind === 'result' ? 'rewards are paid directly by the vendor' : 'payment is agreed directly between you and the vendor'} outside the app.
          </p>
        </div>

        {/* Vendor reliability */}
        <div className="row" style={{ gap: 6, marginBottom: 14, fontSize: 12, color: rel.tone === 'good' ? 'var(--green)' : rel.tone === 'bad' ? 'var(--danger)' : 'var(--amber)' }}>
          <span>{rel.tone === 'good' ? '🛡️' : rel.tone === 'bad' ? '⚠️' : '🔎'}</span>
          <span><strong>Vendor reliability:</strong> {rel.label}</span>
        </div>

        {/* The brief */}
        <div className="section">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>The brief</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{campaign.brief}</p>
        </div>

        {/* Result campaigns: how it works + promoter actions */}
        {kind === 'result' && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>How it works for promoters</h3>
            <div className="card card-pad" style={{ background: 'var(--mist-soft)' }}>
              <div className="col" style={{ gap: 8, fontSize: 13 }}>
                <div className="row" style={{ gap: 8 }}><span className="step-num">1</span><span>Join this Campaign — you get a <strong>unique referral code</strong>.</span></div>
                <div className="row" style={{ gap: 8 }}><span className="step-num">2</span><span>Share your code and bring a {campaign.campaignType === 'sale' ? 'paying customer' : campaign.campaignType === 'ticket_sale' ? 'ticket buyer' : 'genuine lead'}.</span></div>
                <div className="row" style={{ gap: 8 }}><span className="step-num">3</span><span>Submit proof of the result — the vendor confirms it against their records.</span></div>
                <div className="row" style={{ gap: 8 }}><span className="step-num">4</span><span>Confirmed result = <strong>GrowthProof entry</strong> on your Passport + your reward.</span></div>
              </div>
            </div>
          </div>
        )}

        {/* My referral card (joined promoter) */}
        {kind === 'result' && joined && referral && (
          <div className="card card-pad" style={{ marginBottom: 14, borderColor: 'var(--green-mist)', borderStyle: 'dashed' }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="strong" style={{ fontSize: 14 }}>📢 Your referral code</span>
              <StatusChip status={campaign.status === 'closed' ? 'cancelled' : 'accepted'} label={campaign.status === 'closed' ? 'Campaign closed' : 'You’re a promoter'} cls={campaign.status === 'closed' ? 'status-cancelled' : 'status-completed'} />
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="qr-box" aria-hidden>✳️</div>
              <div className="grow">
                <div className="strong" style={{ fontSize: 22, letterSpacing: '0.08em', color: 'var(--navy)' }}>{referral}</div>
                <p className="subtle" style={{ fontSize: 12 }}>Share this code — when {publicName(owner)} confirms the result you brought, your GrowthProof is issued automatically.</p>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={copyCode}>Copy code</button>
                  {myMembership && (
                    <button className="btn btn-sm btn-soft" onClick={() => { setProofOpen(true); }}>Submit proof of result</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Promoter's own proofs */}
        {kind === 'result' && joined && myProofs.length > 0 && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Your submitted results</h3>
            <div className="col" style={{ gap: 8 }}>
              {myProofs.sort((a, b) => b.createdAt - a.createdAt).map((p) => (
                <div key={p.id} className="card card-pad">
                  <div className="row-between">
                    <StatusChip status={p.status === 'submitted' ? 'negotiating' : p.status === 'vendor_confirmed' ? 'accepted' : p.status === 'rejected' ? 'rejected' : 'disputed'} label={RESULT_STATUS_LABEL[p.status]} cls={RESULT_STATUS_CLS[p.status]} />
                    <span className="subtle" style={{ fontSize: 11.5 }}>{timeAgo(p.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13.5, marginTop: 6 }}>{p.description}</p>
                  <div className="row wrap" style={{ gap: 6, fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>
                    {p.customerRef && <span className="attach-pill">🔎 {p.customerRef}</span>}
                    {p.amount ? <span className="attach-pill">Value ₦{p.amount.toLocaleString()}</span> : null}
                  </div>
                  {p.note && <p className="subtle" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>“{p.note}”</p>}
                  {p.status === 'rejected' && (
                    <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} onClick={() => { setDisputeFor(p); setDisputeNote(''); }}>
                      Dispute this decision
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner: vendor confirmation queue */}
        {kind === 'result' && isOwnerUser && (
          <div className="section">
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Vendor confirmation queue</h3>
            <p className="subtle" style={{ fontSize: 12.5, marginBottom: 10 }}>Confirm results you can verify against your records. Confirming issues GrowthProof to the promoter. Campaign code: <strong>{campaign.campaignCode}</strong></p>
            {campaign.resultProofs.length === 0 ? (
              <p className="subtle" style={{ fontSize: 13 }}>No results submitted yet. Share code <strong>{campaign.campaignCode}</strong> with students who can bring {campaign.campaignType === 'sale' ? 'sales' : campaign.campaignType === 'ticket_sale' ? 'ticket buyers' : 'leads'}.</p>
            ) : (
              <div className="col" style={{ gap: 8 }}>
                {campaign.resultProofs.sort((a, b) => (a.status === 'submitted' ? -1 : 1) - (b.status === 'submitted' ? -1 : 1) || b.createdAt - a.createdAt).map((p) => {
                  const pu = byId(state.users, p.promoterId);
                  return (
                    <div key={p.id} className="card card-pad">
                      <div className="row-between">
                        <div className="row" style={{ gap: 8 }}>
                          <Avatar user={pu} size="sm" showVerified />
                          <span className="strong" style={{ fontSize: 13.5 }}>{publicName(pu)}</span>
                        </div>
                        <StatusChip status={p.status === 'submitted' ? 'negotiating' : p.status === 'vendor_confirmed' ? 'accepted' : p.status === 'rejected' ? 'rejected' : 'disputed'} label={RESULT_STATUS_LABEL[p.status]} cls={RESULT_STATUS_CLS[p.status]} />
                      </div>
                      <p style={{ fontSize: 13.5, marginTop: 8 }}>{p.description}</p>
                      <div className="row wrap" style={{ gap: 6, fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>
                        {p.customerRef && <span className="attach-pill">🔎 {p.customerRef}</span>}
                        {p.amount ? <span className="attach-pill">Value ₦{p.amount.toLocaleString()}</span> : null}
                      </div>
                      {p.status === 'submitted' && (
                        <div className="row" style={{ gap: 8, marginTop: 10 }}>
                          <button className="btn btn-sm btn-primary grow" onClick={() => { setDecideFor(p); setDecide({ rating: 5, feedback: '', note: '' }); }}>Confirm result</button>
                          <button className="btn btn-sm btn-outline grow" onClick={() => { setDecideFor(p); setDecide({ rating: 5, feedback: '', note: '' }); }}>Reject</button>
                        </div>
                      )}
                      {p.status === 'disputed' && <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>Under admin review — you’ll be notified of the outcome.</p>}
                      {p.status === 'rejected' && p.note && <p className="subtle" style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>Reason: {p.note}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Task campaigns: outcome + deliverables */}
        {kind === 'task' && (
          <>
            {campaign.desiredOutcome && (
              <div className="section">
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Desired outcome</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>{campaign.desiredOutcome}</p>
              </div>
            )}
            {campaign.deliverables && campaign.deliverables.length > 0 && (
              <div className="section">
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Deliverables</h3>
                <div className="col" style={{ gap: 6 }}>
                  {campaign.deliverables.map((d, i) => (
                    <div key={i} className="row" style={{ gap: 8, alignItems: 'flex-start', fontSize: 13.5 }}>
                      <IconCheck size={15} style={{ color: 'var(--green)', flex: 'none', marginTop: 2 }} />
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {campaign.checklist && campaign.checklist.length > 0 && (
              <div className="section">
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Acceptance checklist</h3>
                <div className="card card-pad" style={{ background: 'var(--mist-soft)' }}>
                  <div className="col" style={{ gap: 7 }}>
                    {campaign.checklist.map((c, i) => (
                      <div key={i} className="row" style={{ gap: 8, fontSize: 13 }}>
                        <span className="row" style={{ width: 20, height: 20, borderRadius: 6, border: '1.5px solid var(--green)', justifyContent: 'center', fontSize: 10, color: 'var(--green)', flex: 'none' }}>{i + 1}</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                  <p className="subtle" style={{ fontSize: 11.5, marginTop: 10 }}>
                    Acceptance creates your verified GrowthProof entry.
                  </p>
                </div>
              </div>
            )}
            <div className="section">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Skills needed</h3>
              <div className="row wrap" style={{ gap: 6 }}>
                {campaign.skills.map((s) => <span key={s} className="skill-chip">{s}</span>)}
              </div>
            </div>
            {isOwnerUser && ['open', 'shortlisting'].includes(campaign.status) && (
              <div className="section">
                <h3 style={{ fontSize: 15, marginBottom: 10 }}>Applications ({state.applications.filter((a) => a.campaignId === campaign.id && ['pending', 'shortlisted'].includes(a.status)).length})</h3>
                <TaskApplications />
              </div>
            )}
            {campaign.snapshot && (
              <div className="section">
                <div className="safety-tip">
                  <span>🔒</span>
                  <span><strong>Scope locked.</strong> Brief, deliverables and deadline were frozen when this Campaign was assigned. Changes require a visible change request.</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="col" style={{ gap: 10 }}>
          {isContributor && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => nav(`/app/workspace/${campaign.id}`)}>
              Open Campaign workspace
            </button>
          )}
          {isOwnerUser && assignment && kind === 'task' && (
            <button className="btn btn-navy btn-lg btn-block" onClick={() => nav(`/app/workspace/${campaign.id}`)}>
              Manage workspace
            </button>
          )}
          {canJoin && (
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setJoinOpen(true)}>
              🎯 Join Campaign · earn {rewardLine.toLowerCase()}
            </button>
          )}
          {canApply && (
            <button
              className={`btn btn-lg btn-block ${campaign.squadEligible === 'squad' ? 'btn-navy' : 'btn-primary'}`}
              onClick={() => {
                if (campaign.squadEligible === 'squad') {
                  if (mySquads.length === 0) { toast('This Campaign needs a Squad — create one first', 'error'); nav('/app/squads'); return; }
                  if (mySquads.length === 1) { setMessage(''); submitApplication(mySquads[0].id); return; }
                }
                setApplyOpen(true);
              }}
            >
              {campaign.squadEligible === 'squad' ? 'Apply with my Squad' : mySquads.length > 0 && campaign.squadEligible === 'both' ? 'Apply (individual or squad)' : 'Apply to Campaign'}
            </button>
          )}
          {canApply && campaign.squadEligible === 'both' && mySquads.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-outline grow" onClick={() => setApplyOpen(true)}>As individual</button>
              <button className="btn btn-ghost grow" onClick={() => submitApplication(mySquads[0].id)}>With {mySquads[0].name}</button>
            </div>
          )}
          {!canJoin && !canApply && !isOwnerUser && myApp && !assignment && kind === 'task' && (
            <div className="card card-pad ta-center" style={{ background: 'var(--gold-soft)', borderColor: '#f0d48a' }}>
              <span className="strong" style={{ fontSize: 14 }}>Application sent ⏳</span>
              <p className="subtle" style={{ fontSize: 12.5 }}>The vendor reviews applications before selecting a creator.</p>
            </div>
          )}
          {!canJoin && !isOwnerUser && kind === 'result' && !joined && campaign.status === 'open' && (
            <div className="card card-pad ta-center" style={{ background: 'var(--gold-soft)', borderColor: '#f0d48a' }}>
              <span className="strong" style={{ fontSize: 14 }}>Verify your account to join</span>
              <p className="subtle" style={{ fontSize: 12.5 }}>Only verified UNILAG students can promote Campaigns.</p>
            </div>
          )}
          {myMembership && campaign.status === 'open' && (
            <button className="btn btn-sm btn-soft" onClick={() => {
              if (window.confirm('Leave this Campaign? Your referral code stops working.')) {
                const e = actions.leaveCampaign(campaign.id);
                if (e) toast(e, 'error'); else toast('You left the Campaign', 'success');
              }
            }}>Leave Campaign</button>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost btn-lg grow" onClick={() => {
              const cid = actions.openConversation(owner?.id ?? '', campaign.id);
              if (cid) nav(`/app/chat/${cid}`);
              else toast(kind === 'result' ? (joined ? 'Chat is open below on your referral card' : 'Join the Campaign first — the vendor chat opens when you join.') : 'Apply to this Campaign first — chat opens between applicants and the vendor.', 'info');
            }}>
              <IconChat size={17} /> Message vendor
            </button>
            <button className="btn-icon btn-soft" style={{ width: 50, height: 50, borderRadius: 14 }} title="Report" onClick={() => setRepOpen(true)}><IconFlag size={18} /></button>
          </div>
          {isOwnerUser && ['open', 'shortlisting', 'assigned', 'in_progress'].includes(campaign.status) && (
            <button className="btn btn-danger btn-lg btn-block" onClick={() => {
              const reason = window.prompt('Reason for ending this Campaign (shown to promoters/creators and admins):');
              if (reason === null) return;
              const e = actions.cancelCampaign(campaign.id, reason?.trim() || undefined);
              if (e) toast(e, 'error'); else toast('Campaign cancelled', 'success');
            }}>
              {kind === 'result' ? 'End Campaign early' : 'Cancel Campaign'}
            </button>
          )}
        </div>

        <p className="subtle ta-center" style={{ marginTop: 16, fontSize: 12 }}>
          Posted {timeAgo(campaign.createdAt)} · {campaign.applicantsCount} {kind === 'result' ? 'promoters joined' : 'applicants'} · Code {campaign.campaignCode}
        </p>
      </div>

      {/* Join modal */}
      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join as a promoter">
        <p className="subtle" style={{ fontSize: 13, marginBottom: 10 }}>You’ll get a unique referral code immediately. Bring results, submit proof, and every vendor-confirmed result earns GrowthProof on your Passport.</p>
        <Field label="Anything to add? (optional)">
          <Textarea placeholder="e.g. I live in Moremi Hall and can reach the whole floor." value={joinNote} onChange={(e) => setJoinNote(e.target.value)} style={{ minHeight: 60 }} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={submitJoin}>Join Campaign</button>
      </Modal>

      {/* Submit proof modal */}
      <Modal open={proofOpen} onClose={() => setProofOpen(false)} title="Submit proof of result">
        <p className="subtle" style={{ fontSize: 12.5, marginBottom: 10 }}>{RESULT_PROOF_HINT[campaign.campaignType]}</p>
        <Field label="What did you bring?">
          <Textarea placeholder="e.g. Sold 2 tees to my hall mates — paid ₦6,000 by transfer" value={proofForm.description} onChange={(e) => setProofForm({ ...proofForm, description: e.target.value })} style={{ minHeight: 70 }} />
        </Field>
        <Field label="Reference the vendor can verify (optional)" hint="Receipt number, order id, chat screenshot name… no phone numbers or PINs.">
          <input className="input" placeholder="e.g. Receipt #0231" value={proofForm.customerRef} onChange={(e) => setProofForm({ ...proofForm, customerRef: e.target.value })} />
        </Field>
        <Field label="Order value in ₦ (optional)">
          <input className="input" type="number" min={0} placeholder="6000" value={proofForm.amount} onChange={(e) => setProofForm({ ...proofForm, amount: e.target.value })} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={submitProof}>Submit proof</button>
      </Modal>

      {/* Vendor decision modal */}
      <Modal open={decideFor !== null} onClose={() => setDecideFor(null)} title="Confirm or reject this result">
        {decideFor && (
          <>
            <div className="card card-pad" style={{ background: 'var(--mist-soft)', marginBottom: 12 }}>
              <p style={{ fontSize: 13.5 }}>{decideFor.description}</p>
              {decideFor.customerRef && <p className="subtle" style={{ fontSize: 12.5, marginTop: 4 }}>🔎 {decideFor.customerRef}</p>}
            </div>
            <p className="subtle" style={{ fontSize: 12.5, marginBottom: 6 }}>Confirm only what you can verify against your records (receipts, chats, door list). Confirming issues GrowthProof to the promoter.</p>
            <Field label="Your rating of this promoter (shown on their Passport)">
              <div className="row" style={{ gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} className="btn-icon" style={{ width: 42, height: 42, borderRadius: 10, background: decide.rating >= n ? '#fdf3d7' : 'var(--mist-soft)', fontSize: 20 }} onClick={() => setDecide({ ...decide, rating: n })} aria-label={`${n} star`}>
                    <span style={{ color: decide.rating >= n ? '#d99a00' : '#cbd5e1' }}>★</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Short feedback (shown on their Passport)">
              <Textarea placeholder="e.g. Verified against the door list — 2 tickets confirmed." value={decide.feedback} onChange={(e) => setDecide({ ...decide, feedback: e.target.value })} style={{ minHeight: 56 }} />
            </Field>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-danger grow" onClick={() => decideProof(false)}>Reject</button>
              <button className="btn btn-primary grow" onClick={() => decideProof(true)}>Confirm result ✅</button>
            </div>
          </>
        )}
      </Modal>

      {/* Dispute modal */}
      <Modal open={disputeFor !== null} onClose={() => setDisputeFor(null)} title="Dispute the rejection">
        <p className="subtle" style={{ fontSize: 13, marginBottom: 10 }}>Admins will review your proof against the vendor’s rejection reason. Add anything that helps.</p>
        <Field label="Why was this wrongly rejected?">
          <Textarea placeholder="e.g. The receipt was issued under my name — I can share a screenshot" value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} />
        </Field>
        <button className="btn btn-danger btn-lg btn-block" onClick={submitDispute}>Send to admins</button>
      </Modal>

      {/* Apply modal (task campaigns) */}
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply to this Campaign">
        <Field label="Why you? (short message)" hint="Reference your GrowthProof and what you’ll deliver.">
          <Textarea placeholder="e.g. I shot the summer tee drop for this business last semester — I can match the style exactly…" value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Field label="Availability">
          <select className="select" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option>Flexible</option><option>Weekdays after 2pm</option><option>Weekends</option><option>Evenings only</option><option>Any day</option>
          </select>
        </Field>
        <Field label="Portfolio links (optional)" hint="One link per line.">
          <Textarea placeholder="behance.net/you/project" value={links} onChange={(e) => setLinks(e.target.value)} style={{ minHeight: 56 }} />
        </Field>
        {campaign.squadEligible === 'both' && mySquads.length > 0 && (
          <p className="subtle" style={{ fontSize: 12.5, marginBottom: 6 }}>Tip: you can also apply with squad “{mySquads[0].name}”.</p>
        )}
        <button className="btn btn-primary btn-lg btn-block" onClick={() => submitApplication()}>Send application</button>
      </Modal>

      {/* Report modal */}
      <Modal open={repOpen} onClose={() => setRepOpen(false)} title="Report this Campaign">
        <Field label="Reason">
          <div className="col" style={{ gap: 8 }}>
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className={`check-row ${rep.reason === r.id ? 'selected' : ''}`} onClick={() => setRep({ ...rep, reason: r.id })}>
                <span className="radio-dot" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Details (optional)">
          <Textarea placeholder="What should admins know?" value={rep.details} onChange={(e) => setRep({ ...rep, details: e.target.value })} />
        </Field>
        <button className="btn btn-danger btn-lg btn-block" onClick={fileReport}>Submit report</button>
      </Modal>
    </div>
  );
}

export { TaskApplications as CampaignApplicationsList };
