import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, publicName, byId, levelInfo, unreadNotifications } from '../lib/store';
import { CampaignCard, SectionTitle, Avatar, LevelBadge } from '../components/ui';
import { IconBell } from '../components/icons';
import { greeting, timeAgo } from '../lib/format';
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_MAP, KIND_OF } from '../lib/domain';
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

export default function Home() {
  const { state } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  if (!me) return null;

  const level = levelInfo(me);
  const unreadN = unreadNotifications(me.id);
  const myBiz = state.businesses.find((b) => b.userId === me.id);
  const isVendor = !!myBiz && myBiz.status === 'approved';
  const pendingBiz = !!myBiz && myBiz.status === 'pending';

  const open = state.campaigns.filter((m) => ['open', 'shortlisting'].includes(m.status) && m.deadline > Date.now());
  const recommended = open
    .filter((m) => m.skills.some((s) => me.skills.includes(s)) || (KIND_OF(m.campaignType) === 'result' && me.skills.includes('Sales & referrals')))
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
            <div className="hero-sub">UNILAG · Akoka</div>
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

      <div style={{ padding: '0 16px' }}>
        {/* Recommended Campaigns */}
        {featured.length > 0 && (
          <div className="section">
            <SectionTitle title="Recommended for you" seeAll="See all" onClick={() => nav('/app/campaigns')} />
            {featured.map((m) => <CampaignCard key={m.id} campaign={m} owner={byId(state.users, m.ownerUserId)} />)}
          </div>
        )}

        {/* Campaign types */}
        <div className="section">
          <SectionTitle title="Campaign types" seeAll="Browse all" onClick={() => nav('/app/campaigns')} />
          <div className="row wrap" style={{ gap: 10 }}>
            {CAMPAIGN_TYPES.slice(1).map((t) => {
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
          <SectionTitle title="Current opportunities" seeAll="All Campaigns" onClick={() => nav('/app/campaigns')} />
          <div className="col" style={{ gap: 12 }}>
            {open.slice(0, 3).map((m) => {
              const t = CAMPAIGN_TYPE_MAP[m.campaignType];
              const biz = byId(state.businesses, m.businessProfileId ?? '');
              const days = Math.ceil((m.deadline - Date.now()) / 86400000);
              return (
                <div key={m.id} className="card card-pad card-tap" onClick={() => nav(`/app/campaign/${m.id}`)}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="tag tag-green">{t?.emoji} {t?.name}</span>
                    <span className={`tag ${days <= 2 ? 'tag-red' : 'tag-slate'}`}>⏳ {days}d left</span>
                  </div>
                  <div className="strong" style={{ marginTop: 9, fontSize: 15.5, color: 'var(--navy)', letterSpacing: '-0.01em' }}>{m.title}</div>
                  {biz && <div className="subtle" style={{ fontSize: 12, marginTop: 3 }}>🏪 {biz.businessName}</div>}
                  <div className="divider-soft" />
                  <div className="row wrap" style={{ gap: 8, fontSize: 12, color: 'var(--slate)' }}>
                    <span className="row" style={{ gap: 4, fontWeight: 700, color: 'var(--green-dark)' }}>💰 {m.rewardType === 'per_result' ? `₦${m.rewardAmount.toLocaleString()} per result` : `₦${m.rewardAmount.toLocaleString()} fixed`}</span>
                    <span className="row" style={{ gap: 4, fontWeight: 600 }}>👥 {m.applicantsCount} {KIND_OF(m.campaignType) === 'result' ? 'promoters' : 'applicants'}</span>
                  </div>
                  {m.skills.slice(0, 3).length > 0 && (
                    <div className="row wrap" style={{ gap: 6, marginTop: 9 }}>
                      {m.skills.slice(0, 3).map((s) => <span key={s} className="skill-chip">{s}</span>)}
                    </div>
                  )}
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
            <p>{isVendor ? 'Post a Campaign: promoters bring you sales, leads or tickets — or creators do the work. You confirm every result.' : 'Verified students can start a student business, then post Campaigns that pay promoters and creators.'}</p>
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
                <div className="subtle" style={{ fontSize: 11 }}>{timeAgo(Date.now() - 30 * 86400000)} · Funmi’s Fashion Corner tee shoot</div>
              </div>
            </div>
            <div className="list-item" style={{ cursor: 'default' }}>
              <Avatar user={byId(state.users, 'u_funmilayo')} size="sm" showVerified />
              <div className="grow">
                <span style={{ fontSize: 13 }}><strong>Funmi’s Fashion Corner</strong> posted a new Campaign.</span>
                <div className="subtle" style={{ fontSize: 11 }}>3 days ago · Leads for the grand sale — ₦300 per confirmed lead</div>
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