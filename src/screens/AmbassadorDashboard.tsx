import { Link, useNavigate } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, levelInfo } from '../lib/store';
import { Avatar, LogoMark, toast } from '../components/ui';
import { IconUsers, IconMegaphone, IconFlag, IconTarget } from '../components/icons';
import { timeAgo } from '../lib/format';

export default function AmbassadorDashboard() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();

  if (!me) {
    return (
      <div className="app-frame" style={{ padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🎙️</div>
        <h2>Ambassador area</h2>
        <p className="subtle" style={{ margin: '8px 0 18px' }}>Log in with the ambassador demo account (chiamaka / password123).</p>
        <button className="btn btn-primary" onClick={() => nav('/login')}>Go to login</button>
      </div>
    );
  }

  const amb = me.ambassadorId ? state.ambassadors.find((a) => a.id === me.ambassadorId) : undefined;

  if (!amb) {
    return (
      <div className="app-frame" style={{ padding: '24px 18px' }}>
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <Link to="/app/home" style={{ color: 'var(--slate)', fontSize: 13.5 }}>← Back to app</Link>
        </div>
        <div style={{ textAlign: 'center', paddingTop: 30 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎙️</div>
          <h2>You’re not an ambassador yet</h2>
          <p className="subtle" style={{ marginTop: 8 }}>Admins promote verified students who recruit quality student businesses and promoters. Ask the admin demo account to promote you.</p>
        </div>
      </div>
    );
  }

  const referrals = state.ambassadorReferrals.filter((r) => r.ambassadorId === amb.id).sort((a, b) => b.createdAt - a.createdAt);
  const qualified = referrals.filter((r) => r.verified && r.completedCampaign).length;
  const toMilestone = Math.max(0, amb.monthlyTarget - amb.completedCampaigns);
  const reward = amb.rewardEarned.toLocaleString('en-NG');
  const level = levelInfo(me);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--navy)' }}>
      {/* header */}
      <div style={{ padding: '22px 18px 30px', color: '#fff' }}>
        <div className="row-between" style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 8 }}><LogoMark size={26} /><span style={{ fontWeight: 800, fontSize: 15 }}>Ambassador HQ</span></div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/app/home" style={{ color: '#cbd5e1', fontSize: 12.5 }}>← App</Link>
            <button onClick={() => { actions.logout(); nav('/'); }} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 12.5 }}>Log out</button>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <Avatar user={me} size="lg" showVerified />
          <div>
            <h1 style={{ color: '#fff', fontSize: 21, lineHeight: 1.2 }}>{publicName(me)}</h1>
            <p style={{ fontSize: 12.5, color: '#94a3b8' }}>Campus ambassador · UNILAG · building a quality GrowthProof campus</p>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <span className="tag tag-gold" style={{ fontSize: 10.5 }}>📗 {level.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg)', borderRadius: '26px 26px 0 0', padding: '20px 16px 40px', minHeight: 300 }}>
        {/* reward status */}
        <div className="card card-pad" style={{ border: '1.5px solid #f0d48a', background: 'linear-gradient(140deg,#ffffff,var(--gold-soft))', marginBottom: 16 }}>
          <div className="row-between">
            <div>
              <p className="subtle" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reward status</p>
              <p className="strong" style={{ fontSize: 24, color: 'var(--navy)' }}>₦{reward}</p>
              <p style={{ fontSize: 12.5, color: 'var(--slate)' }}>
                {amb.rewardStatus === 'qualified' ? '🏆 Qualified for payout — tap “Request payout” below.' : amb.rewardStatus === 'paid' ? '✓ Paid this cycle.' : `Earn more quality referrals to qualify.`}
              </p>
            </div>
            <span className="row" style={{ width: 52, height: 52, borderRadius: 16, background: '#fff', justifyContent: 'center', fontSize: 26 }}>🏆</span>
          </div>
          <div className="progress" style={{ marginTop: 12, background: '#efe3b6' }}>
            <div style={{ width: `${Math.min(100, Math.round((amb.completedCampaigns / amb.monthlyTarget) * 100))}%`, background: 'var(--gold)' }} />
          </div>
          <p className="subtle" style={{ fontSize: 11.5, marginTop: 6 }}>
            {toMilestone === 0 ? 'Monthly milestone reached — completed Campaigns target met.' : `${toMilestone} completed Campaign${toMilestone !== 1 ? 's' : ''} to this month’s milestone (${amb.monthlyTarget}).`}
          </p>
          {amb.rewardStatus === 'qualified' && (
            <button className="btn btn-gold btn-block" style={{ marginTop: 12 }} onClick={() => toast('In production: payout would be initiated by campus admin', 'info')}>Request payout</button>
          )}
        </div>

        {/* metric grid */}
        <div className="stat-grid">
          {[
            { n: amb.vendorsRecruited, l: 'Vendors', i: '🏪' },
            { n: amb.promotersRecruited, l: 'Promoters', i: '🎓' },
            { n: amb.approvedReferrals, l: 'Approved referrals', i: '✅' },
            { n: amb.completedCampaigns, l: 'Completed Campaigns', i: '📗' },
            { n: amb.retained30Days, l: 'Retained 30 days', i: '🔁' },
          ].map((m) => (
            <div key={m.l} className="stat-card">
              <div className="stat-icon">{m.i}</div>
              <div className="stat-num">{m.n}</div>
              <div className="stat-label">{m.l}</div>
            </div>
          ))}
        </div>

        {/* how rewards work */}
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--navy-soft)', color: '#e2e8f0' }}>
          <h3 style={{ color: '#fff', fontSize: 14.5, marginBottom: 8 }}>Quality-first rewards</h3>
          <div className="col" style={{ gap: 5, fontSize: 12.5, lineHeight: 1.55 }}>
            <p>✅ You earn on <strong style={{ color: '#fff' }}>verified active users</strong>, <strong style={{ color: '#fff' }}>completed accepted Campaigns</strong> and <strong style={{ color: '#fff' }}>contributors retained after 30 days</strong>.</p>
            <p>🚫 Never on raw sign-ups or app installs — those don’t count and won’t be paid.</p>
            <p>🛡️ You can’t approve your own friends, and you never resolve serious reports or disputes.</p>
          </div>
        </div>

        {/* referral ledger */}
        <div className="section">
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15.5 }}>Referral ledger ({referrals.length})</h3>
            <span className="subtle" style={{ fontSize: 12 }}>{qualified} fully qualified</span>
          </div>
          {referrals.length === 0 ? (
            <div className="card card-pad ta-center" style={{ borderStyle: 'dashed' }}>
              <p className="subtle" style={{ fontSize: 13 }}>Invite verified students with real skills and a track record. Quality counts.</p>
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {referrals.map((r) => {
                const u = byId(state.users, r.referredUserId);
                const wpCount = u ? state.growthproof.filter((w) => w.userId === u.id).length : 0;
                return (
                  <div key={r.id} className="card card-pad">
                    <div className="row-between">
                      <div className="row" style={{ gap: 10 }}>
                        <Avatar user={u} size="sm" showVerified />
                        <div>
                          <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{publicName(u)}</span>
                          <span className="subtle" style={{ display: 'block', fontSize: 11.5 }}>joined {timeAgo(r.createdAt)} · {wpCount} GrowthProof</span>
                        </div>
                      </div>
                      <span className="strong" style={{ fontSize: 15, color: '#b8860b' }}>₦{r.earned.toLocaleString('en-NG')}</span>
                    </div>
                    <div className="row wrap" style={{ gap: 5, marginTop: 8 }}>
                      {r.verified ? <span className="tag tag-green">Verified ✓</span> : <span className="tag tag-slate">Unverified</span>}
                      {r.completedCampaign ? <span className="tag tag-green">Completed Campaign ✓</span> : <span className="tag tag-amber">No Campaign yet</span>}
                      {r.retained30Days ? <span className="tag tag-green">Retained 30d ✓</span> : <span className="tag tag-slate">Not retained</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* tasks */}
        <div className="section">
          <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>This week’s playbook</h3>
          <div className="card">
            {[
              { icon: <IconTarget size={16} />, t: 'Recruit 2 student businesses with real products', d: 'Fashion, food, prints, design, events — anything a student actually sells.' },
              { icon: <IconUsers size={16} />, t: 'Help 5 students finish verification', d: 'Walk them through ID + selfie upload. You don’t approve — admins do.' },
              { icon: <IconMegaphone size={16} />, t: 'Share live Campaigns in department groups', d: 'Approved Campaigns only — never your own or friends’ Campaigns.' },
              { icon: <IconFlag size={16} />, t: 'Flag suspicious listings to admin', d: 'Scams, fake identities, or cheating content → report, don’t ignore.' },
            ].map((x, i) => (
              <div key={i} className="list-item" style={{ cursor: 'default' }}>
                <span className="row" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--green-soft)', color: 'var(--green)', justifyContent: 'center', flex: 'none' }}>{x.icon}</span>
                <div>
                  <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{x.t}</span>
                  <span className="subtle" style={{ display: 'block', fontSize: 12 }}>{x.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
