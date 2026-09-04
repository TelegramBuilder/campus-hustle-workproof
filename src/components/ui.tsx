import { useEffect, useMemo, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { onCelebrate, type Celebration } from '../lib/celebrate';
import { useNavigate } from 'react-router-dom';
import type { User, Campaign, GrowthProofEntry } from '../lib/types';
import { publicName, byId } from '../lib/store';
import { timeAgo } from '../lib/format';
import { CAMPAIGN_TYPE_MAP, TRACK_MAP, MISSION_STATUS_LABEL, MISSION_STATUS_CLASS, SKILLCHECK_STATUS_LABEL, KIND_OF } from '../lib/domain';
import { IconStar, IconVerified, IconShield, IconCheck, IconAward, IconX, IconChevron } from './icons';

export const GRADIENTS: Record<string, string> = {
  g1: 'linear-gradient(135deg,#087F5B,#065f46)',
  g2: 'linear-gradient(135deg,#1d4ed8,#3730a3)',
  g3: 'linear-gradient(135deg,#db2777,#9d174d)',
  g4: 'linear-gradient(135deg,#ea580c,#c2410c)',
  g5: 'linear-gradient(135deg,#0d9488,#115e59)',
  g6: 'linear-gradient(135deg,#475569,#1e293b)',
  g7: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
  g8: 'linear-gradient(135deg,#0284c7,#075985)',
};

export function gradientFor(key?: string): string {
  return GRADIENTS[key ?? 'g5'] ?? GRADIENTS.g5;
}

export const COVER_KEYS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'] as const;

/** Default cover preset per campaign type (falls back to the per-campaign cover override). */
export function coverFor(type: string): string {
  const map: Record<string, string> = {
    sale: 'g1', lead: 'g8', ticket_sale: 'g2', content_task: 'g3', promotion_task: 'g4', media_task: 'g5', research_task: 'g6',
  };
  return map[type] ?? 'g5';
}

/** Gradient cover band used on campaign cards, detail heroes and business profiles. */
export function Cover({ cover, emoji, height = 104, children, className = '' }: { cover?: string; emoji?: string; height?: number; children?: ReactNode; className?: string }) {
  return (
    <div className={`cover ${className}`} style={{ background: gradientFor(cover), height }}>
      <span className="cover-emoji" aria-hidden>{emoji}</span>
      {children && <div className="cover-children">{children}</div>}
    </div>
  );
}

/* ---------- Celebration moments ---------- */

export function Celebrations() {
  const [items, setItems] = useState<Celebration[]>([]);
  useEffect(() => {
    onCelebrate((c) => {
      setItems((prev) => [...prev, c]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== c.id)), 3600);
    });
  }, []);
  return (
    <div className="celebrate-wrap" aria-live="polite">
      {items.map((c) => <CelebrationCard key={c.id} c={c} />)}
    </div>
  );
}

function CelebrationCard({ c }: { c: Celebration }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.7 + Math.random() * 1.2,
        size: 6 + Math.random() * 7,
        color: ['#087F5B', '#F4B400', '#16A34A', '#FF5A5F', '#1D4ED8', '#DB2777', '#0EA5E9', '#7C3AED'][i % 8],
      })),
    [c.id]
  );
  return (
    <div className="celebrate-item">
      <div className="confetti" aria-hidden>
        {pieces.map((p, i) => (
          <span key={i} className="confetti-piece" style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.5, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
        ))}
      </div>
      <div className="celebrate-card">
        <span className="celebrate-emoji">{c.emoji}</span>
        <h3>{c.title}</h3>
        {c.sub && <p>{c.sub}</p>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; text: string; kind: ToastKind }
let toastId = 0;
let toastListener: ((t: ToastItem) => void) | null = null;

export function toast(text: string, kind: ToastKind = 'info') {
  toastListener?.({ id: ++toastId, text, kind });
}

export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  toastListener = (t) => {
    setItems((prev) => [...prev, t]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3400);
  };
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'success' ? 'success' : t.kind === 'error' ? 'error' : ''}`}>
          <span style={{ flex: 1 }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Logo: circular green mark with white C ---------- */

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#087F5B" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="#065f46" strokeWidth="1.5" opacity="0.5" />
      <path
        d="M41.5 23A13.8 13.8 0 0 0 32 18.6c-7 0-12.6 5.6-12.6 13.4S25 45.4 32 45.4c4.4 0 8.4-2 10.9-5.2l-5.4-3.7A6.9 6.9 0 0 1 32 38.9c-3.7 0-6-2.7-6-6.9s2.3-6.9 6-6.9c1.6 0 3 .6 4.1 1.6l5.4-3.7z"
        fill="#fff"
      />
      <path d="M22.5 51c3 2.2 6.9 3.4 9.5 3.4 10 0 18-6.8 18-16 0-4.4-1.8-8.5-4.7-11.6l-4.4 4.2a9.9 9.9 0 0 1 2 6.1c0 6-5.5 10.8-11.4 10.8-1.8 0-3.5-.4-5.1-1l-3.9 4.1z" fill="#102A43" opacity="0.6" />
    </svg>
  );
}

export function Wordmark({ light = false, growthProof = true }: { light?: boolean; growthProof?: boolean }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <LogoMark size={26} />
      <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        <span style={{ color: light ? '#fff' : 'var(--navy)' }}>Campus</span>
        <span style={{ color: 'var(--green)' }}>Hustle</span>
        {growthProof && (
          <span style={{ display: 'block', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', color: light ? '#cbd5e1' : 'var(--slate)' }}>
            GROWTHPROOF
          </span>
        )}
      </span>
    </span>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ user, size = 'md', showVerified = false }: { user?: User | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; showVerified?: boolean }) {
  const name = publicName(user);
  return (
    <span className="avatar-wrap">
      <span className={`avatar avatar-${size}`} style={{ background: gradientFor(user?.photo) }} title={name}>
        {((user?.firstName ?? name)[0] ?? '?').toUpperCase()}{(user?.lastName?.[0] ?? '').toUpperCase()}
      </span>
      {showVerified && user?.verificationStatus === 'verified' && (
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: size === 'xs' || size === 'sm' ? 12 : 16, height: size === 'xs' || size === 'sm' ? 12 : 16, background: 'var(--success)', border: '2px solid var(--card)', borderRadius: '50%' }} />
      )}
    </span>
  );
}

/* ---------- Rating ---------- */

export function RatingStars({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  return (
    <span className={`stars ${size === 'lg' ? 'stars-lg' : ''}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} filled={i <= Math.round(value)} />
      ))}
    </span>
  );
}

/* ---------- Status chips ---------- */

export function StatusChip({ status, label, cls }: { status?: string; label?: string; cls?: string }) {
  const text = label ?? (status ? MISSION_STATUS_LABEL[status as keyof typeof MISSION_STATUS_LABEL] ?? status : '');
  const css = cls ?? (status ? MISSION_STATUS_CLASS[status as keyof typeof MISSION_STATUS_CLASS] ?? 'status-sent' : 'status-sent');
  return <span className={`status ${css}`}>{text}</span>;
}

export function VerifiedBadge({ light = false }: { light?: boolean }) {
  return (
    <span className="row" style={{ gap: 4, color: light ? '#7ee2bd' : 'var(--green)', fontWeight: 800, fontSize: 11.5 }}>
      <IconVerified size={13} /> Verified UNILAG student
    </span>
  );
}

export function SkillCheckedBadge() {
  return (
    <span className="row" style={{ gap: 4, color: '#9a7a00', fontWeight: 800, fontSize: 11.5 }}>
      <IconAward size={13} /> Skill-Checked
    </span>
  );
}

/* ---------- Level ---------- */

const LEVEL_STYLE: Record<string, { emoji: string; color: string; bg: string }> = {
  explorer: { emoji: '🧭', color: '#64748B', bg: '#eef2f7' },
  contributor: { emoji: '🤝', color: '#087F5B', bg: '#e6f4ef' },
  proven_contributor: { emoji: '🏅', color: '#9a7a00', bg: '#fdf3d7' },
  trusted_specialist: { emoji: '💎', color: '#102A43', bg: '#e3e9f2' },
  squad_leader: { emoji: '👑', color: '#7c3aed', bg: '#f1eafd' },
};

export function LevelBadge({ levelKey, name, light = false }: { levelKey: string; name: string; light?: boolean }) {
  const s = LEVEL_STYLE[levelKey] ?? LEVEL_STYLE.explorer;
  if (light) {
    return (
      <span className="hp-level"><span>{s.emoji}</span> {name}</span>
    );
  }
  return (
    <span className="row" style={{ gap: 6, background: s.bg, color: s.color, borderRadius: 999, padding: '6px 13px', fontWeight: 800, fontSize: 13, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
      <span>{s.emoji}</span> {name}
    </span>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        {title && (
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3>{title}</h3>
            <button className="btn-icon btn-soft" onClick={onClose} aria-label="Close"><IconX size={16} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------- Fields ---------- */

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

/** Opens a real file picker and reports back the chosen file's name (demo keeps metadata only — no upload server yet). */
export function pickFile(accept?: string): Promise<{ name: string; size?: number; type?: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, size: f.size, type: f.type } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function UploadBox({ label, fileName, onChange, meta, accept }: { label: string; fileName?: string; meta?: string; onChange: (name: string, fileMeta?: { name: string; size?: number; type?: string }) => void; accept?: string }) {
  return (
    <div
      className={`upload-box ${fileName ? 'has-file' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Attach ${label}`}
      onClick={async () => {
        const f = await pickFile(accept);
        if (f) onChange(f.name, f);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
    >
      {fileName ? (
        <span className="row" style={{ justifyContent: 'center', gap: 8 }}><IconCheck size={16} /> {fileName}{meta ? <span style={{ fontSize: 11, opacity: 0.7 }}>{meta}</span> : null}</span>
      ) : (
        <span className="col" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>📎</span>
          <span className="strong" style={{ fontSize: 13 }}>{label}</span>
          <span style={{ fontSize: 12 }}>Tap to attach</span>
        </span>
      )}
    </div>
  );
}

export function EmptyState({ emoji, title, sub, action }: { emoji: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="emoji">{emoji}</div>
      <h3>{title}</h3>
      {sub && <p className="subtle">{sub}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>{children}</button>
  );
}

export function SectionTitle({ title, seeAll, onClick }: { title: string; seeAll?: string; onClick?: () => void }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {seeAll && <span className="see-all" onClick={onClick}>{seeAll}</span>}
    </div>
  );
}

/* ---------- Campaign card ---------- */

export function CampaignCard({ campaign, owner, compact = false, showTrack = true }: { campaign: Campaign; owner?: User | null; compact?: boolean; showTrack?: boolean }) {
  const nav = useNavigate();
  const type = CAMPAIGN_TYPE_MAP[campaign.campaignType];
  const kind = KIND_OF(campaign.campaignType);
  const days = Math.ceil((campaign.deadline - Date.now()) / 86400000);
  const people = kind === 'result' ? 'promoter' : 'applicant';
  return (
    <div className="card card-tap cc-card" style={{ marginBottom: 14 }} onClick={() => nav(`/app/campaign/${campaign.id}`)}>
      <Cover cover={campaign.cover ?? coverFor(campaign.campaignType)} emoji={type?.emoji} height={compact ? 86 : 106}>
        {showTrack && <span className="cc-type-oncover">{type?.name}</span>}
        <StatusChip status={campaign.status} />
      </Cover>
      <div className="cc-body">
        <div className="cc-title">{campaign.title}</div>
        {owner && (
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Avatar user={owner} size="xs" showVerified />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--slate)' }}>{publicName(owner)} · verified student business</span>
          </div>
        )}
        {!compact && <p className="subtle cc-brief">{campaign.brief}</p>}
        {campaign.skills.slice(0, 4).length > 0 && (
          <div className="row wrap" style={{ gap: 6, marginTop: 12 }}>
            {campaign.skills.slice(0, 4).map((s) => <span key={s} className="skill-chip">{s}</span>)}
          </div>
        )}
        <div className="divider-soft" style={{ margin: '14px 0 12px' }} />
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="cc-meta-chip cc-money">💰 {campaign.rewardType === 'per_result' ? `₦${campaign.rewardAmount.toLocaleString()}/result` : `₦${campaign.rewardAmount.toLocaleString()} flat`}</span>
          <span className="cc-meta-chip">👥 {campaign.applicantsCount} {people}{campaign.applicantsCount !== 1 ? 's' : ''}</span>
          <span className="cc-meta-chip">⏳ {days > 0 ? `${days}d left` : days === 0 ? 'Today' : 'Closed'}</span>
          {kind === 'result' && campaign.targetResults ? <span className="cc-meta-chip">🎯 {campaign.confirmedResults}/{campaign.targetResults}</span> : null}
          {campaign.squadEligible !== 'individual' && <span className="tag tag-navy">Squad OK</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- GrowthProof entry card ---------- */

export function GrowthProofCard({ entry, showOwnerName = true }: { entry: GrowthProofEntry; showOwnerName?: boolean }) {
  const nav = useNavigate();
  return (
    <div className="card card-pad card-tap" style={{ marginBottom: 10, borderColor: 'var(--green-mist)', borderLeft: '4px solid var(--green)' }} onClick={() => nav(`/app/campaign/${entry.campaignId}`)}>
      <div className="row-between">
        <span className="row" style={{ gap: 6 }}>
          <span className="tag tag-green"><IconVerified size={11} /> Verified Campaign</span>
          {entry.onTime ? <span className="tag tag-green">On time</span> : <span className="tag tag-red">Late</span>}
        </span>
        <RatingStars value={entry.rating} />
      </div>
      <div className="strong" style={{ color: 'var(--navy)', fontSize: 15, marginTop: 8 }}>{entry.campaignTitle}</div>
      <div className="subtle" style={{ fontSize: 12.5 }}>{entry.businessName} · {CAMPAIGN_TYPE_MAP[entry.campaignType]?.name}</div>
      <div className="row wrap" style={{ gap: 5, marginTop: 8 }}>
        <span className="skill-chip">{entry.role}</span>
        {entry.skills.slice(0, 3).map((s) => <span key={s} className="skill-chip">{s}</span>)}
      </div>
      {entry.feedback && <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--slate)', marginTop: 8 }}>“{entry.feedback}”</p>}
      <div className="row-between" style={{ marginTop: 8 }}>
        <span className="subtle" style={{ fontSize: 11.5 }}>Accepted {timeAgo(entry.acceptedAt)} · Rating {entry.rating}.0</span>
        <span className="row" style={{ gap: 3, fontSize: 11, color: 'var(--slate)' }}>
          {entry.visibility === 'public' ? '🌐 Public' : entry.visibility === 'campus' ? '🎓 UNILAG only' : '🔒 Private'}
        </span>
      </div>
      {entry.corrected && (
        <div className="safety-tip" style={{ marginTop: 8, background: 'var(--mist-soft)', borderColor: 'var(--mist)' }}>
          <span>🛠️</span>
          <span><strong>Corrected by admin:</strong> {entry.corrected.note}</span>
        </div>
      )}
    </div>
  );
}

export { timeAgo, SKILLCHECK_STATUS_LABEL };