import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, businessOf, currentEarnMode } from '../lib/store';
import { Field, Input, Textarea, Select, Chip, toast, Modal, COVER_KEYS, gradientFor, coverFor } from '../components/ui';
import { IconBack, IconCheck } from '../components/icons';
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_MAP, KIND_OF, SKILLS, EFFORT_LABEL, PAYMENT_LABEL } from '../lib/domain';
import type { Effort, CampaignType, PaymentArrangement } from '../lib/types';

const ZONES = ['Sports Centre', 'Main Library', 'Faculty of Science', 'Faculty of Engineering', 'Faculty of Social Sciences', 'Faculty of Law', 'Faculty of Management Sciences', 'Faculty of Arts', 'College of Medicine', 'Jaja Hall', 'Mariere Hall', 'Moremi Hall', 'Eni-Njoku Hall', 'New Hall', 'Staff School gate', 'First Bank junction', 'UNILAG main gate'];

const minDeadline = () => Date.now() + 2 * 86400000;
const dl = new Date(minDeadline());
const isoDefault = `${dl.getFullYear()}-${String(dl.getMonth() + 1).padStart(2, '0')}-${String(dl.getDate()).padStart(2, '0')}`;

const RESULT_TYPES = CAMPAIGN_TYPES.slice(1).filter((t) => t.kind === 'result');
const TASK_TYPES = CAMPAIGN_TYPES.slice(1).filter((t) => t.kind === 'task');

export default function CreateCampaign() {
  const { actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const earnMode = currentEarnMode();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    campaignType: (earnMode === 'skills' ? 'content_task' : 'sale') as CampaignType,
    rewardAmount: '',
    rewardDescription: '',
    targetResults: '',
    brief: '',
    outcome: '',
    deadline: isoDefault,
    effort: 'small' as Effort,
    payment: 'paid_outside' as PaymentArrangement,
    budget: '',
    zone: ZONES[0],
    squadEligible: 'individual',
    cover: coverFor('sale'),
  });
  const [deliverables, setDeliverables] = useState(['']);
  const [skills, setSkills] = useState<string[]>([]);
  const [err, setErr] = useState('');

  if (!me) return null;
  const biz = businessOf(me.id);
  const kind = KIND_OF(form.campaignType);

  const setType = (t: CampaignType) => {
    const k = KIND_OF(t);
    setForm((f) => ({
      ...f,
      campaignType: t,
      cover: coverFor(t),
      payment: k === 'result' ? 'paid_outside' : f.payment,
      targetResults: k === 'task' ? '' : f.targetResults,
    }));
  };

  if (me.verificationStatus !== 'verified' || !biz) {
    return (
      <div style={{ paddingBottom: 24 }}>
        <div className="top-bar">
          <div className="row-between">
            <div className="row" style={{ gap: 10 }}>
              <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
              <h1 style={{ fontSize: 19 }}>Create Campaign</h1>
            </div>
          </div>
        </div>
        <div style={{ padding: '6px 16px' }}>
          <div className="empty-state" style={{ paddingTop: 30 }}>
            <div className="emoji">🏪</div>
            <h3>Verified student vendors only</h3>
            <p className="subtle">
              Campaigns come from student businesses — you need a <strong>verified student account</strong> and an <strong>approved student business profile</strong> to post.
            </p>
          </div>
          <div className="card card-pad" style={{ marginBottom: 10, background: 'var(--mist-soft)' }}>
            <div className="row" style={{ gap: 8 }}>
              <IconCheck size={16} style={{ color: me.verificationStatus === 'verified' ? 'var(--success)' : 'var(--slate)', flex: 'none', marginTop: 2 }} />
              <p style={{ fontSize: 13 }}>{me.verificationStatus === 'verified' ? 'Identity verified ✓' : `Verification: ${me.verificationStatus}.`} {me.verificationStatus !== 'verified' && 'Verify your student ID to continue.'}</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <IconCheck size={16} style={{ color: biz ? 'var(--success)' : 'var(--slate)', flex: 'none', marginTop: 2 }} />
              <p style={{ fontSize: 13 }}>{biz ? 'Student business approved ✓' : 'No approved student business yet. Register your business from your Passport first — it takes 2 minutes.'}</p>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {me.verificationStatus !== 'verified' && <button className="btn btn-primary grow" onClick={() => nav('/app/verify')}>Verify my identity</button>}
            <button className="btn btn-outline grow" onClick={() => nav('/app/passport')}>Open my Passport</button>
          </div>
        </div>
      </div>
    );
  }

  const toggleSkill = (s: string) => {
    setSkills((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 5) { toast('Up to 5 skill tags', 'error'); return prev; }
      return [...prev, s];
    });
  };

  const setAt = (i: number, arr: string[], set: (v: string[]) => void, v: string) => {
    const next = [...arr]; next[i] = v; set(next);
  };
  const removeAt = (i: number, arr: string[], set: (v: string[]) => void) => {
    if (arr.length <= 1) { set(['']); return; }
    set(arr.filter((_, x) => x !== i));
  };

  const submit = () => {
    const cleanDel = deliverables.map((d) => d.trim()).filter(Boolean);
    const deadlineMs = new Date(form.deadline + 'T23:59:59').getTime();
    const err = actions.createCampaign({
      title: form.title,
      campaignType: form.campaignType,
      rewardType: kind === 'result' ? 'per_result' : 'fixed_task',
      rewardAmount: Number(form.rewardAmount) || 0,
      rewardDescription: form.rewardDescription.trim() || undefined,
      targetResults: kind === 'result' && form.targetResults ? Number(form.targetResults) : undefined,
      brief: form.brief,
      desiredOutcome: form.outcome.trim() || undefined,
      deliverables: kind === 'task' ? cleanDel : undefined,
      deadline: deadlineMs,
      effort: kind === 'task' ? form.effort : undefined,
      payment: form.payment,
      budgetRange: form.budget.trim() || undefined,
      skills,
      squadEligible: kind === 'task' ? (form.squadEligible as 'individual' | 'both' | 'squad') : 'individual',
      zone: form.zone,
      cover: form.cover,
    });
    if (err) { setErr(err); toast(err, 'error'); return; }
    setReviewOpen(false);
    setErr('');
    toast(earnMode === 'skills' ? 'Gig submitted for admin review 🎯' : 'Campaign submitted for admin review 🎯', 'success');
    nav('/app/campaigns');
  };

  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="top-bar">
        <div className="row-between">
          <div className="row" style={{ gap: 10 }}>
            <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
            <div>
              <h1 style={{ fontSize: 19 }}>{earnMode === 'skills' ? 'Post a Skill Gig' : 'Create Growth Campaign'}</h1>
              <p className="subtle" style={{ fontSize: 11.5 }}>Posting as {biz.businessName}</p>
            </div>
          </div>
          <span className="tag tag-green">Goes to admin review</span>
        </div>
      </div>

      <div style={{ padding: '6px 16px' }}>
        <Field label={earnMode === 'skills' ? 'Gig title' : 'Campaign title'} hint="Clear and specific — a student should know exactly what you want after one read.">
          <Input placeholder={earnMode === 'skills' ? 'e.g. Create five Instagram designs for the food-launch' : 'e.g. Leads for the Fashion Corner grand sale'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={90} />
        </Field>

        <Field label="Campaign type" hint="Result Campaigns pay per confirmed sale, lead or ticket. Creator tasks pay a fixed reward for delivered work.">
          <p className="subtle" style={{ fontSize: 12, marginBottom: 6 }}>🎯 Result-based (promoters bring results)</p>
          <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
            {RESULT_TYPES.map((t) => <Chip key={t.id} active={form.campaignType === t.id} onClick={() => setType(t.id as CampaignType)}>{t.emoji} {t.name}</Chip>)}
          </div>
          <p className="subtle" style={{ fontSize: 12, marginBottom: 6 }}>🎨 Creator tasks (creators do the work)</p>
          <div className="row wrap" style={{ gap: 6 }}>
            {TASK_TYPES.map((t) => <Chip key={t.id} active={form.campaignType === t.id} onClick={() => setType(t.id as CampaignType)}>{t.emoji} {t.name}</Chip>)}
          </div>
        </Field>

        <Field label="Cover visual" hint="Pick the banner colour for your Campaign card — photos and brand art come later.">
          <div className="row wrap" style={{ gap: 10 }}>
            {COVER_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-label={`Cover ${k}`}
                className={`cover-swatch ${form.cover === k ? 'selected' : ''}`}
                style={{ background: gradientFor(k) }}
                onClick={() => setForm({ ...form, cover: k })}
              >
                {form.cover === k && <span>✓</span>}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid-2">
          <Field label={kind === 'result' ? 'Reward per confirmed result (₦)' : 'Fixed reward (₦)'}>
            <Input type="number" min={0} step={100} placeholder={kind === 'result' ? '300' : '15000'} value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })} />
          </Field>
          {kind === 'result' ? (
            <Field label="Target results" hint="Close the Campaign automatically at this number.">
              <Input type="number" min={1} placeholder="25" value={form.targetResults} onChange={(e) => setForm({ ...form, targetResults: e.target.value })} />
            </Field>
          ) : (
            <Field label="Effort estimate">
              <Select value={form.effort} onChange={(e) => setForm({ ...form, effort: e.target.value as Effort })}>
                {(['small', 'medium', 'large'] as Effort[]).map((k) => <option key={k} value={k}>{EFFORT_LABEL[k]}</option>)}
              </Select>
            </Field>
          )}
        </div>

        <Field label="Reward description (optional)" hint="Explain how rewards work so promoters trust the maths.">
          <Textarea placeholder="e.g. ₦300 per lead who asks for the price list. Bonus ₦1,500 for the top promoter this week." value={form.rewardDescription} onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })} style={{ minHeight: 52 }} />
        </Field>

        <Field label="The brief" hint={`Minimum 80 characters · ${form.brief.trim().length}/80`} error={err.includes('80') ? err : undefined}>
          <Textarea placeholder="What do you sell, what result do you need, and how will a student verify it? Be specific enough that a stranger could help." value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} style={{ minHeight: 110 }} />
        </Field>

        {kind === 'result' && (
          <div className="safety-tip" style={{ marginBottom: 16 }}>
            <span>🛡️</span>
            <span style={{ fontSize: 12.5 }}>Say what counts as a verifiable result (a sale receipt, a chat where the customer asks for your price list, a ticket on the door list). Vague proof leads to disputes.</span>
          </div>
        )}

        {kind === 'task' ? (
          <>
            <Field label="Deliverables" hint="What exactly will the creator hand over?">
              <div className="col" style={{ gap: 8 }}>
                {deliverables.map((d, i) => (
                  <div key={i} className="row" style={{ gap: 8 }}>
                    <Input placeholder={`Deliverable ${i + 1} — e.g. 15 edited product shots`} value={d} onChange={(e) => setAt(i, deliverables, setDeliverables, e.target.value)} />
                    {deliverables.length > 1 && <button className="btn-icon btn-soft" onClick={() => removeAt(i, deliverables, setDeliverables)} aria-label="Remove">✕</button>}
                  </div>
                ))}
                <button className="btn btn-sm btn-ghost" onClick={() => setDeliverables([...deliverables, ''])}>+ Add deliverable</button>
              </div>
            </Field>
            <Field label="Desired outcome (optional)">
              <Textarea placeholder="e.g. A restock catalogue I can post on Instagram" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} style={{ minHeight: 56 }} />
            </Field>
          </>
        ) : (
          <Field label="How you'll verify results (optional)">
            <Textarea placeholder="e.g. I'll confirm each lead in chat; tickets are checked against the door list." value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} style={{ minHeight: 56 }} />
          </Field>
        )}

        <div className="grid-2">
          <Field label="Deadline">
            <Input type="date" min={isoDefault} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
          <Field label="Campus zone" hint="Zone, never an exact address.">
            <Select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Payment arrangement">
            <Select value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value as PaymentArrangement })}>
              {(['paid_outside', 'volunteer', 'to_discuss'] as PaymentArrangement[]).map((k) => <option key={k} value={k}>{PAYMENT_LABEL[k]}</option>)}
            </Select>
          </Field>
          <Field label="Budget range (optional)">
            <Input placeholder="e.g. ₦15k–₦25k" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} maxLength={30} />
          </Field>
        </div>

        <div className="safety-tip" style={{ marginBottom: 16 }}>
          <span>💳</span>
          <span style={{ fontSize: 12.5 }}><strong>CampusHustle does not hold or process payments.</strong> Rewards are paid by you directly to promoters and creators — no escrow, no wallet, no commission.</span>
        </div>

        <Field label="Skill tags" hint={`Up to 5 — matched to student Passports. ${skills.length}/5`}>
          <div className="row wrap" style={{ gap: 6 }}>
            {SKILLS.map((s) => <Chip key={s} active={skills.includes(s)} onClick={() => toggleSkill(s)}>{s}</Chip>)}
          </div>
        </Field>

        {kind === 'task' && (
          <Field label="Who can apply?">
            <div className="row" style={{ gap: 8 }}>
              {([['individual', 'Individual only'], ['both', 'Individual or Squad'], ['squad', 'Squad only']] as const).map(([v, label]) => (
                <button key={v} className={`chip ${form.squadEligible === v ? 'active' : ''}`} onClick={() => setForm({ ...form, squadEligible: v })}>{label}</button>
              ))}
            </div>
          </Field>
        )}

        {err && !err.includes('80') && <div className="safety-tip" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)', marginBottom: 12 }}><span>⚠️</span><span>{err}</span></div>}

        {/* Policy reminder */}
        <div className="card card-pad" style={{ background: 'var(--navy)', color: '#e2e8f0', margin: '8px 0 14px' }}>
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 6 }}>Before you publish</h3>
          <div className="col" style={{ gap: 5, fontSize: 12, lineHeight: 1.55 }}>
            <p>• Campaigns promote your own real student business — no fake leads or self-dealing.</p>
            <p>• No academic cheating, exam help, illegal services, harassment, adult content, drugs, weapons or gambling.</p>
            <p>• No phone numbers or bank details in the public Campaign — payment is arranged in chat after results are confirmed.</p>
            <p>• CampusHustle does not hold or process payments — you pay promoters and creators directly.</p>
            <p>• Admins review your Campaign before it goes live, and you confirm every result you pay for.</p>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-block" onClick={() => setReviewOpen(true)}>Review & submit Campaign</button>
      </div>

      {/* Review modal */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Submit for review?">
        <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
          <span className="tag tag-green">{CAMPAIGN_TYPE_MAP[form.campaignType]?.emoji} {CAMPAIGN_TYPE_MAP[form.campaignType]?.name}</span>
          <span className="tag tag-slate">📍 {form.zone}</span>
          {kind === 'result' && form.targetResults && <span className="tag tag-gold">🎯 {form.targetResults} result target</span>}
        </div>
        <h3 style={{ fontSize: 17, color: 'var(--navy)', marginBottom: 8 }}>{form.title || 'Untitled Campaign'}</h3>
        <div className="subtle" style={{ fontSize: 12.5, marginBottom: 10 }}>
          {kind === 'result' ? `₦${(Number(form.rewardAmount) || 0).toLocaleString()} per confirmed result` : `₦${(Number(form.rewardAmount) || 0).toLocaleString()} fixed · ${EFFORT_LABEL[form.effort]}`} · {PAYMENT_LABEL[form.payment]} · Due {new Date(form.deadline + 'T23:59:59').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
        <div className="card card-pad" style={{ background: 'var(--mist-soft)', marginBottom: 12 }}>
          <p className="strong" style={{ fontSize: 12.5, marginBottom: 6 }}>Review checklist</p>
          <div className="col" style={{ gap: 4, fontSize: 12.5 }}>
            <p>✓ Brief ≥ 80 characters ({form.brief.trim().length})</p>
            {kind === 'result' ? (
              <>
                <p>✓ Reward: ₦{(Number(form.rewardAmount) || 0).toLocaleString()} per confirmed result</p>
                <p>✓ Target: {form.targetResults || '—'} results</p>
              </>
            ) : (
              <>
                <p>✓ {deliverables.filter((d) => d.trim()).length} deliverable{deliverables.filter((d) => d.trim()).length !== 1 ? 's' : ''}</p>
                <p>✓ {skills.length} skill tag{skills.length !== 1 ? 's' : ''} (need 1–5)</p>
              </>
            )}
          </div>
        </div>
        <div className="safety-tip" style={{ marginBottom: 12 }}>
          <span>💳</span>
          <span style={{ fontSize: 12.5 }}>CampusHustle does not hold or process payments. Admins review this Campaign before it goes live.</span>
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={submit}>Send to admin review</button>
      </Modal>
    </div>
  );
}
