import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, publicName, byId, levelInfo } from '../lib/store';
import { CampaignCard, SectionTitle, Avatar, LevelBadge } from '../components/ui';
import { IconBell } from '../components/icons';
import { greeting, timeAgo } from '../lib/format';
import { unreadNotifications } from '../lib/store';
import { CAMPAIGN_TYPES, CAMPAIGN_TYPE_MAP, KIND_OF } from '../lib/domain';
import type { CampaignType } from '../lib/types';

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

  return (
    <div>
      <div className="top-bar">
        <div className="row-between">
          <div>
            <div className="strong" style={{ fontSize: 21, color: 'var(--navy)' }}>{greeting()}, {publicName(me).split(' ')[0]} 👋</div>
            <div className="subtle" style={{ fontSize: 12 }}>UNILAG · Akoka</div>
          </div>
          <button className="btn-icon btn-soft" style={{ position: 'relative', borderRadius: '50%' }} onClick={() => nav('/app/notifications')} aria-label="Notifications">
            <IconBell size={19} />
            {unreadN > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: 'var(--danger)', color: '#fff', fontSize: 9.5, minWidth: 17, height: 17, borderRadius: 999, display: 'grid', placeItems: 'center', fontWeight: 800, padding: '0 3px' }}>{unreadN > 9 ? '9+' : unreadN}</span>}
          </button>
        </div>
      </div>

      <div style={{ padding: '2px 16px' }}>
        {/* Passport progress card */}
        <div className="card card-pad" style={{ marginBottom: 18, border: '1.5px solid var(--green-mist)', background: 'linear-gradient(140deg,#ffffff, #f2faf7)' }}>
          <div className="row-between">
            <div>
              <p className="subtle" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>GrowthProof Passport</p>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <LevelBadge levelKey={level.key} name={level.name} />
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => nav('/app/passport')}>View Passport</button>
          </div>
          <div className="row wrap" style={{ gap: 16, marginTop: 12 }}>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>{level.entries}</span>
              <span className="subtle" style={{ fontSize: 11 }}>GrowthProof entries</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>{level.avgRating > 0 ? level.avgRating.toFixed(1) + '★' : '—'}</span>
              <span className="subtle" style={{ fontSize: 11 }}>Rating</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>{level.onTimePct === null ? '—' : `${level.onTimePct}%`}</span>
              <span className="subtle" style={{ fontSize: 11 }}>{level.onTimePct === null ? 'No Campaigns yet' : 'On-time'}</span>
            </div>
            <div className="col" style={{ gap: 0 }}>
              <span className="strong" style={{ fontSize: 18, color: 'var(--navy)' }}>{level.squadCampaigns}</span>
              <span className="subtle" style={{ fontSize: 11 }}>Squad work</span>
            </div>
          </div>
          {level.next && (
            <div className="earn-line" style={{ marginTop: 12 }}>
              <span>🎯</span>
              <span>{level.next.text}</span>
            </div>
          )}
        </div>

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
          <div className="row wrap" style={{ gap: 8 }}>
            {CAMPAIGN_TYPES.slice(1).map((t) => {
              const count = typeCounts.get(t.id as CampaignType) ?? 0;
              return (
                <div key={t.id} className="cat-tile" style={{ flex: '1 1 30%', minWidth: 100 }} onClick={() => nav(`/app/campaigns?type=${t.id}`)}>
                  <div className="cat-emoji">{t.emoji}</div>
                  <div className="cat-name">{t.name}</div>
                  <div className="subtle" style={{ fontSize: 10.5, marginTop: 3 }}>{count} live</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current opportunities */}
        <div className="section">
          <SectionTitle title="Current opportunities" seeAll="All Campaigns" onClick={() => nav('/app/campaigns')} />
          <div className="col" style={{ gap: 10 }}>
            {open.slice(0, 3).map((m) => {
              const t = CAMPAIGN_TYPE_MAP[m.campaignType];
              const biz = byId(state.businesses, m.businessProfileId ?? '');
              return (
                <div key={m.id} className="card card-pad card-tap" onClick={() => nav(`/app/campaign/${m.id}`)}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="tag tag-green">{t?.emoji} {t?.name}</span>
                    <span className="subtle" style={{ fontSize: 11.5 }}>⏳ {Math.ceil((m.deadline - Date.now()) / 86400000)}d left</span>
                  </div>
                  <div className="strong" style={{ marginTop: 8, fontSize: 15, color: 'var(--navy)' }}>{m.title}</div>
                  {biz && <div className="subtle" style={{ fontSize: 11.5, marginTop: 2 }}>🏪 {biz.businessName}</div>}
                  <div className="row wrap" style={{ gap: 8, marginTop: 8, fontSize: 12, color: 'var(--slate)' }}>
                    <span>💰 {m.rewardType === 'per_result' ? `₦${m.rewardAmount.toLocaleString()} per result` : `₦${m.rewardAmount.toLocaleString()} fixed`}</span>
                    <span>👥 {m.applicantsCount} {KIND_OF(m.campaignType) === 'result' ? 'promoters' : 'applicants'}</span>
                    {m.skills.slice(0, 3).map((s) => <span key={s} className="skill-chip">{s}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create CTA */}
        <div className="banner banner-green" style={{ marginBottom: 18 }}>
          <span style={{ fontSize: 26 }}>🏪</span>
          <div className="grow">
            <h3>{isVendor ? 'Have a product or service to sell?' : 'Run a student business?'}</h3>
            <p>{isVendor ? 'Post a Campaign: promoters bring you sales, leads or tickets — or creators do the work. You confirm every result.' : 'Verified students can start a student business, then post Campaigns that pay promoters and creators.'}</p>
          </div>
          <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--green-dark)', fontWeight: 800 }} onClick={() => nav(isVendor ? '/app/create' : '/app/passport?vendor=1')}>
            {isVendor ? 'Create Campaign' : 'Start a business'}
          </button>
        </div>

        {/* Small activity */}
        <div className="section">
          <SectionTitle title="Campus activity" />
          <div className="card">
            <div className="list-item" style={{ cursor: 'default' }}>
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
