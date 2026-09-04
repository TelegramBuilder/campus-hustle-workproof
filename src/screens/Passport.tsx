import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, levelInfo, userRating } from '../lib/store';
import { Avatar, RatingStars, LevelBadge, GrowthProofCard, EmptyState, toast, Modal, Field, Input, Textarea } from '../components/ui';
import { IconBack, IconEdit, IconUsers, IconShield, IconVerified } from '../components/icons';
import { timeAgo } from '../lib/format';
import { BUSINESS_CATEGORIES } from '../lib/domain';
import type { User } from '../lib/types';

const TABS = ['Overview', 'GrowthProof', 'Portfolio', 'Skills', 'Reviews', 'Squads'] as const;

export default function Passport() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const me = currentUser();
  const targetId = id ?? me?.id ?? '';
  const profile: User | undefined = byId(state.users, targetId);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [bizOpen, setBizOpen] = useState(false);
  const [pfOpen, setPfOpen] = useState(false);
  const [bizForm, setBizForm] = useState({ businessName: '', category: BUSINESS_CATEGORIES[0], services: '', evidenceNote: '' });
  const [pfForm, setPfForm] = useState({ title: '', description: '', link: '' });
  const [privId, setPrivId] = useState<string | null>(null);
  const [params] = useSearchParams();

  if (!me || !profile) {
    return (
      <div style={{ paddingBottom: 20 }}>
        <div className="screen-header">
          <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
          <h1>Passport not found</h1>
        </div>
      </div>
    );
  }

  const isMe = profile.id === me.id;
  const biz = state.businesses.find((b) => b.userId === profile.id);
  const bizApproved = biz?.status === 'approved';
  const lvl = levelInfo(profile);
  const rating = userRating(profile);
  // support /app/passport?vendor=1 to open the business application directly
  const [autoOpened, setAutoOpened] = useState(false);
  if (!autoOpened && isMe && params.get('vendor') === '1') {
    setAutoOpened(true);
    setTimeout(() => setBizOpen(true), 250);
  }

  // visibility filtering
  const visible = (visibility: string) => {
    if (isMe || me.role === 'admin' || me.role === 'superadmin') return true;
    if (visibility === 'public') return true;
    if (visibility === 'campus') return me.verificationStatus === 'verified';
    return false;
  };

  const growthproof = state.growthproof.filter((w) => w.userId === profile.id && visible(w.visibility)).sort((a, b) => b.acceptedAt - a.acceptedAt);
  const reviews = state.reviews.filter((r) => r.targetId === profile.id && !r.hidden).sort((a, b) => b.createdAt - a.createdAt);
  const mySquads = state.squads.filter((s) => state.squadMembers.some((sm) => sm.squadId === s.id && sm.userId === profile.id && sm.status === 'accepted'));
  const onTimeRate = profile.stats.acceptedCampaigns > 0 ? Math.round((profile.stats.onTimeCampaigns / (profile.stats.onTimeCampaigns + profile.stats.lateDeliveries)) * 100) : null;

  const applyVendor = () => {
    if (!bizForm.businessName.trim()) { toast('Give your business a name', 'error'); return; }
    const services = bizForm.services.split('\n').map((s) => s.trim()).filter(Boolean);
    if (services.length === 0) { toast('List at least one thing you sell or offer', 'error'); return; }
    const err = actions.applyAsVendor({
      businessName: bizForm.businessName,
      category: bizForm.category,
      services,
      evidenceNote: bizForm.evidenceNote.trim() || undefined,
    });
    if (err) { toast(err, 'error'); return; }
    setBizOpen(false);
    setBizForm({ businessName: '', category: BUSINESS_CATEGORIES[0], services: '', evidenceNote: '' });
    toast('Business application sent — admins will review it', 'success');
  };

  const addPortfolio = () => {
    if (!pfForm.title.trim()) { toast('Title your example', 'error'); return; }
    actions.addPortfolio({ title: pfForm.title.trim(), description: pfForm.description.trim(), link: pfForm.link.trim() || undefined });
    setPfOpen(false);
    setPfForm({ title: '', description: '', link: '' });
    toast('Portfolio example added', 'success');
  };

  const header = (
    <div>
      <div className="pp-hero">
        <div className="row-between" style={{ marginBottom: 16 }}>
          {isMe ? <div /> : <button className="btn-icon" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }} onClick={() => nav(-1)}><IconBack size={18} /></button>}
          {isMe && (
            <div className="row" style={{ gap: 8 }}>
              {!bizApproved && (
                <button className="btn btn-sm pp-chip-btn" onClick={() => setBizOpen(true)}>🏪 {biz ? (biz.status === 'pending' ? 'Business pending' : biz.status === 'rejected' ? 'Re-apply as vendor' : '') : 'Start a business'}</button>
              )}
              <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--green-dark)', fontWeight: 800 }} onClick={() => nav('/app/profile/edit')}><IconEdit size={14} /> Edit</button>
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 15 }}>
          <span className="pp-avatar"><Avatar user={profile} size="xl" showVerified /></span>
          <div className="grow" style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 22, lineHeight: 1.15, color: '#fff' }}>{publicName(profile)}</h1>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', fontWeight: 600, marginTop: 2 }}>
              @{profile.username} · UNILAG{profile.faculty ? ` · ${profile.faculty}` : ''}{profile.showDepartment && profile.department ? ` · ${profile.department}` : ''}
            </div>
            <div className="row wrap" style={{ gap: 8, marginTop: 9 }}>
              {profile.verificationStatus === 'verified' && <span className="pp-verified"><IconVerified size={13} /> Verified UNILAG student</span>}
              {profile.verificationStatus !== 'verified' && profile.verificationStatus !== 'suspended' && isMe && (
                <button className="tag tag-amber" style={{ cursor: 'pointer', border: 'none' }} onClick={() => nav('/app/verify')} title="Review or re-submit verification">Verification {profile.verificationStatus} · tap to review</button>
              )}
              {profile.verificationStatus === 'suspended' && <span className="tag tag-red">Suspended</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

      {/* student business strip */}
      {biz && (
        <div className="card card-pad" style={{ marginTop: 14, borderColor: bizApproved ? 'var(--green-mist)' : 'var(--mist)', background: bizApproved ? 'var(--green-soft)' : 'var(--mist-soft)' }}>
          <div className="row-between">
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏪</span>
              <div>
                <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{biz.businessName}</span>
                <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>{biz.category} · {biz.status === 'approved' ? 'Approved student business — can post Campaigns' : biz.status === 'pending' ? 'Business application pending review' : 'Business application not approved'}</span>
                {biz.services.length > 0 && bizApproved && (
                  <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                    {biz.services.slice(0, 3).map((s) => <span key={s} className="skill-chip">{s}</span>)}
                  </div>
                )}
              </div>
            </div>
            {bizApproved && <IconShield size={18} style={{ color: 'var(--green)' }} />}
          </div>
        </div>
      )}

      {/* level + metrics */}
      <div className="card card-pad" style={{ marginTop: 14, border: '1.5px solid var(--green-mist)', background: 'linear-gradient(140deg,#ffffff, #f2faf7)' }}>
        <div className="row-between">
          <p className="subtle" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GrowthProof level</p>
          <LevelBadge levelKey={lvl.key} name={lvl.name} />
        </div>
        <div className="pp-stats">
          <Metric n={String(lvl.entries)} l="Accepted" />
          <Metric n={lvl.avgRating > 0 ? `${lvl.avgRating.toFixed(1)}★` : '—'} l="Rating" />
          <Metric n={onTimeRate === null ? '—' : `${onTimeRate}%`} l={onTimeRate === null ? 'No jobs' : 'On-time'} />
          <Metric n={String(profile.stats.totalApplications)} l="Applied" />
        </div>
        {lvl.next && !isMe && lvl.entries > 0 && (
          <div className="subtle" style={{ fontSize: 11.5, marginTop: 8 }}>Next: {lvl.next.text}</div>
        )}
      </div>

      {/* tabs */}
      <div className="tabs" style={{ marginTop: 16, overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 30 }}>
      {header}

      <div style={{ padding: '14px 16px' }}>
        {tab === 'Overview' && (
          <div className="col" style={{ gap: 0 }}>
            {profile.bio && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>{profile.bio}</p>}

            {lvl.next && (
              <div className="earn-line" style={{ marginBottom: 14 }}>
                <span>🎯</span>
                <span>{lvl.next.text}</span>
              </div>
            )}

            {!bizApproved && isMe && profile.verificationStatus === 'verified' && biz?.status !== 'pending' && (
              <div className="banner banner-navy" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 24 }}>🏪</span>
                <div className="grow">
                  <h3>{biz?.status === 'rejected' ? 'Re-apply as a student vendor' : 'Run a student business?'}</h3>
                  <p>Verified students can register a business profile for what they sell — clothes, food, prints, design, tickets. Approved vendors post Campaigns that pay promoters and creators. CampusHustle never holds payments.</p>
                </div>
                <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--navy)', fontWeight: 800 }} onClick={() => setBizOpen(true)}>
                  Apply
                </button>
              </div>
            )}
            {biz && biz.status === 'pending' && (
              <div className="verify-banner" style={{ marginBottom: 14 }}>
                <span>⏳</span><p>“{biz.businessName}” is under review. You’ll be notified once admins approve your business — then you can post Campaigns.</p>
              </div>
            )}

            {growthproof.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>Latest GrowthProof</h3>
                {growthproof.slice(0, 3).map((w) => <GrowthProofCard key={w.id} entry={w} />)}
              </>
            )}
            {reviews.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, marginBottom: 8, marginTop: 4 }}>Recent reviews</h3>
                {reviews.slice(0, 2).map((r) => <ReviewRow key={r.id} rating={r.rating} text={r.text ?? ''} by={byId(state.users, r.authorId)} when={r.createdAt} />)}
              </>
            )}
            {isMe && growthproof.length === 0 && (
              <EmptyState emoji="🗺️" title="Your Passport is ready to grow" sub="Apply to Campaigns that match your skills — every accepted Campaign adds a verified entry here." action={<button className="btn btn-primary" onClick={() => nav('/app/campaigns')}>Find Campaigns</button>} />
            )}

            {isMe && (
              <div className="card" style={{ marginTop: 6 }}>
                <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => nav('/app/help')}>
                  <span className="row" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--mist-soft)', justifyContent: 'center', flex: 'none' }}>🛟</span>
                  <div className="grow"><span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>Help & safety</span><span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>FAQs, rules, reset demo data</span></div>
                </div>
                <div className="list-item" style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => { if (window.confirm('Log out of CampusHustle GrowthProof?')) { actions.logout(); nav('/'); } }}>
                  <span className="row" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--danger)', justifyContent: 'center', flex: 'none' }}>⎋</span>
                  <span className="strong" style={{ fontSize: 13.5, color: 'var(--danger)' }}>Log out</span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'GrowthProof' && (
          <div>
            {growthproof.length === 0 ? (
              <EmptyState emoji="📗" title="No GrowthProof entries yet" sub={isMe ? 'Accepted Campaigns appear here with your rating, feedback and on-time record.' : 'This student has no accepted Campaigns yet.'} />
            ) : (
              <div className="col" style={{ gap: 4 }}>
                {growthproof.map((w) => (
                  <div key={w.id}>
                    <GrowthProofCard entry={w} />
                    {isMe && (
                      <div className="row wrap" style={{ gap: 5, margin: '-2px 0 10px', paddingLeft: 4 }}>
                        <span className="subtle" style={{ fontSize: 11 }}>Visible to:</span>
                        {([['public', '🌐 Public'], ['campus', '🎓 UNILAG'], ['private', '🔒 Private']] as const).map(([v, label]) => (
                          <button key={v} className={`chip chip-sm ${w.visibility === v ? 'active' : ''}`} style={{ fontSize: 10.5 }} onClick={() => { actions.setGrowthproofVisibility(w.id, v); toast(`Entry is now ${label}`, 'success'); }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isMe && growthproof.length > 0 && (
              <p className="subtle" style={{ fontSize: 11.5, margin: '10px 2px 4px' }}>
                You control who sees each entry. Your matric number, ID and phone never appear on any Passport.
              </p>
            )}
          </div>
        )}

        {tab === 'Portfolio' && (
          <div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <p className="subtle" style={{ fontSize: 12 }}>Selected examples — reviewed by vendors before they hire you.</p>
              {isMe && <button className="btn btn-sm btn-primary" onClick={() => setPfOpen(true)}>+ Add example</button>}
            </div>
            {profile.portfolio.length === 0 ? (
              <EmptyState emoji="🖼️" title="No portfolio examples" sub={isMe ? 'Add your best 2–3 pieces — vendors check these before hiring creators.' : 'No examples shared yet.'} />
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {profile.portfolio.map((p) => (
                  <div key={p.id} className="card card-pad">
                    <div className="row-between">
                      <span className="strong" style={{ fontSize: 14, color: 'var(--navy)' }}>{p.title}</span>
                      {isMe && <button className="btn-icon btn-soft" onClick={() => { actions.removePortfolio(p.id); toast('Removed', 'info'); }} aria-label="Remove">✕</button>}
                    </div>
                    <p className="subtle" style={{ fontSize: 12.5, marginTop: 4 }}>{p.description}</p>
                    {p.link && <span className="attach-pill" style={{ marginTop: 8 }}>🔗 {p.link}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Skills' && (
          <div>
            <div className="row wrap" style={{ gap: 8 }}>
              {profile.skills.length === 0 && <span className="subtle" style={{ fontSize: 13 }}>No skills added yet.</span>}
              {profile.skills.map((s) => <span key={s} className="skill-chip" style={{ fontSize: 13.5, padding: '8px 14px' }}>{s}</span>)}
            </div>
            {isMe && profile.skills.length < 5 && (
              <button className="btn btn-outline btn-block" style={{ marginTop: 14 }} onClick={() => nav('/app/profile/edit')}>Edit skills</button>
            )}
          </div>
        )}

        {tab === 'Reviews' && (
          <div>
            {rating.count > 0 && (
              <div className="card card-pad ta-center" style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
                  <span className="strong" style={{ fontSize: 28, color: 'var(--navy)' }}>{rating.avg.toFixed(1)}</span>
                  <div className="col" style={{ gap: 2 }}>
                    <RatingStars value={rating.avg} size="lg" />
                    <span className="subtle" style={{ fontSize: 11.5 }}>{rating.count} review{rating.count !== 1 ? 's' : ''} · after accepted Campaigns only</span>
                  </div>
                </div>
              </div>
            )}
            {reviews.length === 0 ? (
              <EmptyState emoji="⭐" title="No reviews yet" sub="Reviews only unlock after an accepted Campaign — that keeps them real." />
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {reviews.map((r) => <ReviewRow key={r.id} rating={r.rating} text={r.text ?? ''} by={byId(state.users, r.authorId)} when={r.createdAt} />)}
              </div>
            )}
          </div>
        )}

        {tab === 'Squads' && (
          <div>
            {mySquads.length === 0 ? (
              <EmptyState emoji="👥" title="Not in a squad yet" sub={isMe ? 'Join 2–5 verified students to apply for bigger Campaigns together.' : 'Not currently in any Hustle Squad.'} action={isMe ? <button className="btn btn-primary" onClick={() => nav('/app/squads')}>Explore squads</button> : undefined} />
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {mySquads.map((s) => {
                  const members = state.squadMembers.filter((sm) => sm.squadId === s.id && sm.status === 'accepted');
                  const myRole = members.find((m) => m.userId === profile.id)?.role;
                  return (
                    <div key={s.id} className="card card-pad card-tap" onClick={() => nav(`/app/squad/${s.id}`)}>
                      <div className="row-between">
                        <div className="row" style={{ gap: 10 }}>
                          <span className="row" style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', justifyContent: 'center' }}><IconUsers size={19} /></span>
                          <div>
                            <span className="strong" style={{ fontSize: 14.5, color: 'var(--navy)' }}>{s.name}</span>
                            <span className="subtle" style={{ display: 'block', fontSize: 12 }}>{members.length} members · {publicName(byId(state.users, s.leadId))} leads</span>
                          </div>
                        </div>
                        <span className="tag tag-navy">{myRole ?? 'Member'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy modal for GrowthProof entries */}
      <Modal open={privId !== null} onClose={() => setPrivId(null)} title="Who can see this entry?">
        {privId && (() => {
          const entry = state.growthproof.find((w) => w.id === privId);
          if (!entry) return null;
          const opts: { v: 'public' | 'campus' | 'private'; label: string; desc: string }[] = [
            { v: 'public', label: '🌐 Public', desc: 'Anyone with the link — employers, future teams.' },
            { v: 'campus', label: '🎓 Verified UNILAG only', desc: 'Verified students and Campaign Owners on GrowthProof.' },
            { v: 'private', label: '🔒 Private', desc: 'Only you and admins (for verification).' },
          ];
          return (
            <div className="col" style={{ gap: 8 }}>
              <p className="subtle" style={{ fontSize: 12.5, marginBottom: 4 }}>“{entry.campaignTitle}” — never shows your matric number, ID or phone.</p>
              {opts.map((o) => (
                <label key={o.v} className={`check-row ${entry.visibility === o.v ? 'selected' : ''}`} onClick={() => { actions.setGrowthproofVisibility(entry.id, o.v); setPrivId(null); toast(`Entry is now ${o.label}`, 'success'); }}>
                  <span className="radio-dot" />
                  <span>
                    <span className="strong" style={{ fontSize: 13.5 }}>{o.label}</span>
                    <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>{o.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          );
        })()}
      </Modal>

      {/* Student vendor application */}
      <Modal open={bizOpen} onClose={() => setBizOpen(false)} title="Register your student business">
        <div className="safety-tip" style={{ marginBottom: 12 }}>
          <span>🛡️</span>
          <span style={{ fontSize: 12.5 }}>Any verified UNILAG student can register the business they actually run on campus — merch, food, prints, design, tickets, services. Admins review each application before you can post Campaigns. No association or society membership needed.</span>
        </div>
        <Field label="Business name" hint="What students know you as, e.g. “Funmi’s Fashion Corner”.">
          <Input placeholder="e.g. Kunbi’s Study Kits" value={bizForm.businessName} onChange={(e) => setBizForm({ ...bizForm, businessName: e.target.value })} />
        </Field>
        <Field label="Category">
          <select className="select" value={bizForm.category} onChange={(e) => setBizForm({ ...bizForm, category: e.target.value })}>
            {BUSINESS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="What do you sell or offer?" hint="One per line — these show on your public profile.">
          <Textarea placeholder={'Custom-print tees\nHoodies & sweatshirts\nCampus merch bundles'} value={bizForm.services} onChange={(e) => setBizForm({ ...bizForm, services: e.target.value })} style={{ minHeight: 72 }} />
        </Field>
        <Field label="Evidence (optional)" hint="Link or note admins can check — Instagram, catalogue, past orders. Never share bank or card details here.">
          <Textarea placeholder="e.g. Instagram @funmisfashion — 400+ followers, 90+ orders confirmed" value={bizForm.evidenceNote} onChange={(e) => setBizForm({ ...bizForm, evidenceNote: e.target.value })} style={{ minHeight: 52 }} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={applyVendor}>Submit application</button>
      </Modal>

      {/* Add portfolio */}
      <Modal open={pfOpen} onClose={() => setPfOpen(false)} title="Add portfolio example">
        <Field label="Title">
          <Input placeholder="e.g. Faculty Week teaser campaign" value={pfForm.title} onChange={(e) => setPfForm({ ...pfForm, title: e.target.value })} />
        </Field>
        <Field label="What you did" hint="Your role and the outcome.">
          <Textarea placeholder="e.g. 12 social posts + 3 posters. 40k reach in week one." value={pfForm.description} onChange={(e) => setPfForm({ ...pfForm, description: e.target.value })} style={{ minHeight: 52 }} />
        </Field>
        <Field label="Link (optional)">
          <Input placeholder="https://…" value={pfForm.link} onChange={(e) => setPfForm({ ...pfForm, link: e.target.value })} />
        </Field>
        <button className="btn btn-primary btn-lg btn-block" onClick={addPortfolio}>Add example</button>
      </Modal>
    </div>
  );
}

const Metric = ({ n, l }: { n: string; l: string }) => (
  <div className="pp-stat">
    <b>{n}</b>
    <span>{l}</span>
  </div>
);

const ReviewRow = ({ rating, text, by, when }: { rating: number; text: string; by?: User | null; when: number }) => (
  <div className="review-card">
    <div className="row-between">
      <div className="row" style={{ gap: 6 }}>
        <Avatar user={by} size="xs" showVerified />
        <span className="strong" style={{ fontSize: 12.5, color: 'var(--navy)' }}>{publicName(by)}</span>
        <span className="subtle" style={{ fontSize: 11 }}>· verified vendor</span>
      </div>
      <RatingStars value={rating} />
    </div>
    <p style={{ fontSize: 13.5, fontStyle: 'italic', marginTop: 8, lineHeight: 1.55 }}>“{text}”</p>
    <div className="subtle" style={{ fontSize: 10.5, marginTop: 6 }}>{timeAgo(when)}</div>
  </div>
);
