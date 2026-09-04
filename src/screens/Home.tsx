import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, publicName, byId, levelInfo, unreadNotifications, currentEarnMode, type EarnMode } from '../lib/store';
import { CampaignCard, SectionTitle, Avatar, LevelBadge, gradientFor, coverFor } from '../components/ui';
import { IconBell } from '../components/icons';
import { greeting, timeAgo } from '../lib/format';
import { replayGuide } from '../components/Guide';
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_MAP, KIND_OF, SKILL_TRACKS } from '../lib/domain';
import type { CampaignType } from '../lib/types';

const TYPE_GRADIENT: Record<string, string> = {
  sale: 'linear-gradient(135deg,#0b8c66,#065f46)',
  lead: 'linear-gradient(135deg,#0284c7,#075985)',
  ticket_sale: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
  content_task: 'linear-gradient(135deg,#db2777,#9d174d)',
  promotion_task: 'linear-gradient(135deg,#ea580c,#c2410c)',
  media_task: 'linear-gradient(135deg,#0d9488,#115e59)',
  research_task: 'linear-gradient(135deg,#1d4ed8,#3730a3)',
};

const TRACK_GRADIENT: Record<string, string> = {
  design_content: 'linear-gradient(135deg,#db2777,#9d174d)',
  photo_video: 'linear-gradient(135deg,#0d9488,#115e59)',
  promotion_assets: 'linear-gradient(135deg,#ea580c,#c2410c)',
};

function EarnSwitch({ mode, onChange }: { mode: EarnMode; onChange: (m: EarnMode) => void }) {
  return (
    <div className="earn-switch" role="tablist" aria-label="How do you want to earn?">
      <button role="tab" aria-selected={mode === 'skills'} className={mode === 'skills' ? 'on' : ''} onClick={() => onChange('skills')}>💼 Earn with Skills</button>
      <button role="tab" aria-selected={mode === 'growth'} className={mode === 'growth' ? 'on' : ''} onClick={() => onChange('growth')}>📈 Growth Campaigns</button>
    </div>
  );
}

export default function Home() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const [hintOff, setHintOff] = useState(() => {
    try { return localStorage.getItem(`ch_homehint_${me?.id ?? ''}`) === '1'; } catch { return false; }
  });
  if (!me) return null;
  const mode = currentEarnMode();

  const level = levelInfo(me);
  const unreadN = unreadNotifications(me.id);
  const myBiz = state.businesses.find((b) => b.userId === me.id);
  const isVendor = !!myBiz && myBiz.status === 'approved';
  const pendingBiz = !!myBiz && myBiz.status === 'pending';

  const kindFilter = (mode === 'skills' ? 'task' : 'result') as 'task' | 'result';
  const open = state.campaigns.filter((m) => ['open', 'shortlisting'].includes(m.status) && m.deadline > Date.now() && KIND_OF(m.campaignType) === kindFilter);
  const recommended = open
    .filter((m) => m.skills.some((s) => me.skills.includes(s)) || (kindFilter === 'result' && me.skills.includes('Sales & referrals')))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  const featured = open.length > 0 ? (recommended.length > 0 ? recommended : open.slice(0, 3)) : [];

  const typeCounts = new Map<string, number>();
  open.forEach((m) => typeCounts.set(m.campaignType, (typeCounts.get(m.campaignType) ?? 0) + 1));

  const firstName = publicName(me).split(' ')[0];

  return (
    <div>
      {/* Hero */}
      <div className="home-hero">
        <div className="row-between">
          <div>
            <div className="hero-greeting">{greeting()}, {firstName} 👋</div>
            <div className="hero-sub">{isVendor && myBiz ? `UNILAG · ${myBiz.businessName}` : me.role === 'ambassador' ? 'UNILAG · Campus ambassador' : 'UNILAG · Akoka'}</div>
          </div>
          <button className="hero-bell" onClick={() => nav('/app/notifications')} aria-label="Notifications">
            <IconBell size={19} />
            {unreadN > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: '#fff', fontSize: 9.5, minWidth: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', fontWeight: 800, padding: '0 4px', boxShadow: '0 2px 6px rgba(220,38,38,.5)' }}>
                {unreadN > 9 ? '9+' : unreadN}
              </span>
            )}
          </button>
        </div>

        {/* Passport progress */}
        <div className="hero-progress">
          <div className="hp-top">
            <div>
              <div className="hp-label">GrowthProof Passport</div>
              <div style={{ marginTop: 8 }}>
                <LevelBadge levelKey={level.key} name={level.name} light />
              </div>
            </div>
            <button className="hp-view" onClick={() => nav('/app/passport')}>View Passport</button>
          </div>
          <div className="hp-stats">
            <div className="hp-stat"><b>{level.entries}</b><span>Entries</span></div>
            <div className="hp-stat"><b>{level.avgRating > 0 ? level.avgRating.toFixed(1) + '★' : '—'}</b><span>Rating</span></div>
            <div className="hp-stat"><b>{level.onTimePct === null ? '—' : `${level.onTimePct}%`}</b><span>{level.onTimePct === null ? 'No jobs yet' : 'On-time'}</span></div>
            <div className="hp-stat"><b>{level.squadCampaigns}</b><span>Squads</span></div>
          </div>
          {level.next && (
            <>
              <div className="hp-bar"><div style={{ width: `${level.next.progress}%` }} /></div>
              <div className="hp-next">🎯 {level.next.text}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '8px 20px 36px' }}>
        {/* Earning-path switch */}
        <EarnSwitch mode={mode} onChange={(m) => actions.setEarnMode(m)} />

        {/* Verification state — a new student must verify before joining anything */}
        {me.verificationStatus !== 'verified' && (
          <div className="verify-banner" style={{ margin: '0 0 14px' }}>
            <span style={{ fontSize: 20 }}>{me.verificationStatus === 'suspended' ? '🚫' : '🪪'}</span>
            <p>
              {me.verificationStatus === 'suspended' ? (
                <><strong>Your account is suspended.</strong> Contact an admin if you think this is a mistake.</>
              ) : me.verificationStatus === 'pending' ? (
                <><strong>Verification under review.</strong> You can browse — you’ll be able to join Campaigns as soon as an admin confirms your student ID.</>
              ) : me.verificationStatus === 'rejected' ? (
                <><strong>Your verification was declined.</strong> Tap “Review” to see why, then resubmit.</>
              ) : (
                <><strong>Verify your student ID first.</strong> Only verified UNILAG students can join Campaigns and earn GrowthProof.</>
              )}
            </p>
            {me.verificationStatus !== 'suspended' && (
              <button className="btn btn-sm btn-ghost" onClick={() => nav('/app/verify')}>
                {me.verificationStatus === 'pending' ? 'View status' : 'Verify now'}
              </button>
            )}
          </div>
        )}

        {/* How-it-works hint (dismissible, verified promoters only) */}
        {!hintOff && me.verificationStatus === 'verified' && !isVendor && me.role !== 'ambassador' && (
          <div className="how-card" style={{ marginBottom: 4 }}>
            <button className="guide-skip" onClick={() => { setHintOff(true); try { localStorage.setItem(`ch_homehint_${me.id}`, '1'); } catch { /* ignore */ } }} aria-label="Dismiss how-it-works">✕</button>
            <div className="how-title">✨ How GrowthProof works</div>
            <div className="col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 10 }}><span className="step-num">1</span><div><b>Join a Campaign</b><p>Pick one that fits your skills and tap <em>Join Campaign</em> to get your own referral code.</p></div></div>
              <div className="row" style={{ gap: 10 }}><span className="step-num">2</span><div><b>Bring a result</b><p>Make a sale, land a lead or finish the task — then submit proof from the Campaign page.</p></div></div>
              <div className="row" style={{ gap: 10 }}><span className="step-num">3</span><div><b>Vendor confirms → you earn GrowthProof</b><p>Confirmed results become verified Passport entries with your rating. More proof = better chances later.</p></div></div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn btn-soft btn-sm grow" onClick={() => { setHintOff(true); try { localStorage.setItem(`ch_homehint_${me.id}`, '1'); } catch { /* ignore */ } }}>Got it</button>
              <button className="btn btn-ghost btn-sm" onClick={replayGuide}>Replay intro</button>
            </div>
          </div>
        )}

        {/* Recommended */}
        {featured.length > 0 && (
          <div className="section">
            <SectionTitle title={mode === 'skills' ? 'Gigs matched to your skills' : 'Campaigns matched to your skills'} seeAll="See all" onClick={() => nav('/app/campaigns')} />
            {featured.map((m) => <CampaignCard key={m.id} campaign={m} owner={byId(state.users, m.ownerUserId)} />)}
          </div>
        )}

        {/* Tracks / types */}
        <div className="section">
          <SectionTitle title={mode === 'skills' ? 'Skill tracks' : 'Campaign types'} seeAll="Browse all" onClick={() => nav('/app/campaigns')} />
          <div className="row wrap" style={{ gap: 10 }}>
            {mode === 'skills'
              ? SKILL_TRACKS.map((t) => {
                  const count = open.filter((m) => t.types.includes(m.campaignType)).length;
                  return (
                    <div key={t.id} className="cat-tile" style={{ flex: '1 1 29%', minWidth: 96 }} onClick={() => nav(`/app/campaigns?type=${t.types[0]}`)}>
                      <div className="cat-emoji" style={{ background: TRACK_GRADIENT[t.id] ?? 'var(--mist-soft)' }}>{t.emoji}</div>
                      <div className="cat-name">{t.name}</div>
                      <div className="cat-count"><b>{count}</b> {count === 1 ? 'gig' : 'gigs'}</div>
                    </div>
                  );
                })
              : CAMPAIGN_TYPES.filter((t) => t.kind === 'result').map((t) => {
                  const count = typeCounts.get(t.id as CampaignType) ?? 0;
                  return (
                    <div key={t.id} className="cat-tile" style={{ flex: '1 1 29%', minWidth: 96 }} onClick={() => nav(`/app/campaigns?type=${t.id}`)}>
                      <div className="cat-emoji" style={{ background: TYPE_GRADIENT[t.id] ?? 'var(--mist-soft)' }}>{t.emoji}</div>
                      <div className="cat-name">{t.name}</div>
                      <div className="cat-count"><b>{count}</b> live</div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Current opportunities */}
        <div className="section">
          <SectionTitle title={mode === 'skills' ? 'Current opportunities' : 'Current opportunities'} seeAll={mode === 'skills' ? 'All Missions' : 'All Campaigns'} onClick={() => nav('/app/campaigns')} />
          <div className="col" style={{ gap: 12 }}>
            {open.slice(0, 3).map((m) => {
              const t = CAMPAIGN_TYPE_MAP[m.campaignType];
              const biz = byId(state.businesses, m.businessProfileId ?? '');
              const days = Math.ceil((m.deadline - Date.now()) / 86400000);
              return (
                <div key={m.id} className="card card-pad card-tap" style={{ display: 'flex', gap: 14 }} onClick={() => nav(`/app/campaign/${m.id}`)}>
                  <div className="op-cover" style={{ background: gradientFor(m.cover ?? coverFor(m.campaignType)) }} aria-hidden>{t?.emoji}</div>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 8 }}>
                      <span className="tag tag-green">{t?.name}</span>
                      <span className={`tag ${days <= 2 ? 'tag-red' : 'tag-slate'}`}>⏳ {days}d</span>
                    </div>
                    <div className="strong" style={{ marginTop: 8, fontSize: 15.5, color: 'var(--navy)', letterSpacing: '-0.01em', lineHeight: 1.35 }}>{m.title}</div>
                    {biz && <div className="subtle" style={{ fontSize: 12, marginTop: 3 }}>🏪 {biz.businessName}</div>}
                    <div className="row wrap" style={{ gap: 10, marginTop: 8, fontSize: 12, color: 'var(--slate)' }}>
                      <span className="row" style={{ gap: 4, fontWeight: 700, color: 'var(--green-dark)' }}>💰 {m.rewardType === 'per_result' ? `₦${m.rewardAmount.toLocaleString()}/result` : `₦${m.rewardAmount.toLocaleString()} fixed`}</span>
                      <span className="row" style={{ gap: 4, fontWeight: 600 }}>👥 {m.applicantsCount} {KIND_OF(m.campaignType) === 'result' ? 'promoters' : 'applicants'}</span>
                    </div>
                    {m.skills.slice(0, 3).length > 0 && (
                      <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
                        {m.skills.slice(0, 3).map((s) => <span key={s} className="skill-chip">{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create CTA */}
        <div className="banner banner-green" style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 28 }}>🏪</span>
          <div className="grow">
            <h3>{isVendor ? 'Have a product or service to sell?' : 'Run a student business?'}</h3>
            <p>{isVendor ? 'Promoters bring sales, leads and tickets — you confirm every result.' : 'Start a business and post Campaigns that pay promoters and creators.'}</p>
          </div>
          <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--green-dark)', fontWeight: 800, boxShadow: 'none', whiteSpace: 'nowrap' }} onClick={() => nav(isVendor ? '/app/create' : '/app/passport?vendor=1')}>
            {isVendor ? 'Create Campaign' : 'Start a business'}
          </button>
        </div>

        {/* Small activity */}
        <div className="section">
          <SectionTitle title="Campus activity" />
          <div className="card card-pad" style={{ padding: '6px 0' }}>
            <div className="list-item" style={{ cursor: 'default', borderRadius: 0 }}>
              <Avatar user={byId(state.users, 'u_aisha')} size="sm" showVerified />
              <div className="grow">
                <span style={{ fontSize: 13 }}><strong>Aisha</strong> earned GrowthProof for <strong>Product photography</strong>.</span>
                <div className="subtle" style={{ fontSize: 11 }}>{timeAgo(Date.now() - 30 * 86400000)} · Tee shoot for Morayo’s Fashion Corner</div>
              </div>
            </div>
            <div className="list-item" style={{ cursor: 'default' }}>
              <Avatar user={byId(state.users, 'u_morayo')} size="sm" showVerified />
              <div className="grow">
                <span style={{ fontSize: 13 }}><strong>Morayo’s Fashion Corner</strong> posted a new Campaign.</span>
                <div className="subtle" style={{ fontSize: 11 }}>3 days ago · ₦300 per confirmed lead</div>
              </div>
            </div>
            <div className="list-item" style={{ cursor: 'default' }}>
              <Avatar user={byId(state.users, 'u_salawu')} size="sm" showVerified />
              <div className="grow">
                <span style={{ fontSize: 13 }}><strong>Salawu</strong> earned GrowthProof for <strong>Ticket promotion</strong>.</span>
                <div className="subtle" style={{ fontSize: 11 }}>{timeAgo(Date.now() - 39 * 86400000)} · Culture Night — 12 tickets confirmed</div>
              </div>
            </div>
          </div>
        </div>

        {/* vendor-mode banner when business application is pending */}
        {pendingBiz && (
          <div className="verify-banner" style={{ margin: '0 0 14px' }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <p><strong>Student business application pending.</strong> Admins will review “{myBiz.businessName}” soon — you’ll be able to post Campaigns once approved.</p>
            <button className="btn btn-sm btn-ghost" onClick={() => nav('/app/help')}>Help</button>
          </div>
        )}
      </div>
    </div>
  );
}