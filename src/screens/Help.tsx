import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store';
import { toast } from '../components/ui';
import { resetGuide, replayGuide } from '../components/Guide';
import { IconBack } from '../components/icons';

const FAQS = [
  {
    q: 'What is GrowthProof exactly?',
    a: 'A verified work-experience network for UNILAG students. Student vendors post Campaigns that pay promoters and creators: bring a confirmed sale, lead or ticket, or do defined creator work. Every vendor-confirmed result becomes a portable GrowthProof Passport entry — proof of real work before you graduate.',
  },
  {
    q: 'How do I become a vendor and post Campaigns?',
    a: 'Any verified UNILAG student can register the business they actually run — merch, food, prints, design, events, tickets. Open your Passport, tap “Start a business”, fill in what you sell, and admins approve your profile. Approved vendors can then post Campaigns from the Create tab. No society or association membership needed.',
  },
  {
    q: 'Does CampusHustle handle payments?',
    a: 'No. CampusHustle does not hold or process payments. Rewards and task fees are paid directly by the vendor to promoters and creators via bank transfer or cash. The app only records the arrangement and marks it “confirmed by both sides”.',
  },
  {
    q: 'Why is a creator task “locked” after assignment?',
    a: 'Trust. Once a vendor assigns a creator, the brief, deliverables and deadline are frozen in an immutable snapshot so expectations never shift mid-work. Real changes go through a visible change request that the other side accepts. Result Campaigns don’t lock — each result is confirmed individually by the vendor.',
  },
  {
    q: 'What counts as academic cheating?',
    a: 'Completing graded work, exams, or assignments for another student is prohibited and will get Campaigns removed and accounts suspended. Legitimate tutoring, study support and revision help between students is fine — it is just not “academic cheating”.',
  },
  {
    q: 'Who can see my GrowthProof?',
    a: 'You control each entry: public, visible to verified UNILAG students only, or private. Your Passport never shows your matric number, ID documents, phone number, full legal name or exact location.',
  },
  {
    q: 'How do GrowthProof levels work?',
    a: 'Explorer → Contributor (1 confirmed result or accepted task) → Proven Contributor (3, rating 4.0+) → Trusted Specialist (10, rating 4.5+, strong on-time record) → Squad Leader. Levels are earned only through vendor-confirmed results — you can never buy one.',
  },
];

function clearLocalHints() {
  resetGuide();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ch_homehint_')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export default function Help() {
  const { actions } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div>
      <div className="screen-header">
        <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
        <h1>Help & safety</h1>
        <span />
      </div>
      <div style={{ padding: '4px 16px' }}>
        <div className="card card-pad" style={{ borderColor: 'var(--green-mist)', marginBottom: 16 }}>
          <h3 style={{ marginBottom: 6 }}>🛡️ Staying safe on GrowthProof</h3>
          <div className="col" style={{ gap: 8, fontSize: 13.5, lineHeight: 1.5 }}>
            <p>• Meet and work with verified students only — check the green badge.</p>
            <p>• Agree payment details directly. CampusHustle never holds or processes money.</p>
            <p>• Never send money upfront to “reserve” a Campaign or a spot.</p>
            <p>• Never share passwords, OTPs, PINs or ID documents in chat.</p>
            <p>• Meet in safe, public campus zones for any in-person handover.</p>
            <p>• Report scams, harassment or fake identities immediately — admins act fast.</p>
          </div>
        </div>

        <div className="card card-pad" style={{ borderColor: 'var(--green)', marginBottom: 16 }}>
          <h3 style={{ marginBottom: 6 }}>☁️ Cloud setup (sync across devices)</h3>
          <div className="col" style={{ gap: 8, fontSize: 13, lineHeight: 1.5 }}>
            <p>The app can share one campus &ldquo;world&rdquo; so a profile edit on your laptop appears on your phone. It needs a one-time database setup in Supabase:</p>
            <p>1. Open <strong>supabase.com → your project → SQL Editor</strong>.</p>
            <p>2. Paste the whole contents of <strong>schema.sql</strong> (repo root) and press <strong>Run</strong>. This creates the world, security rules, and the demo accounts (password <code>password123</code>).</p>
            <p>3. Under <strong>Authentication → Sign In / Providers → Email</strong>, switch <strong>Confirm email</strong> OFF so sign-ups log in instantly.</p>
            <p className="subtle" style={{ fontSize: 12 }}>Until that runs, you&apos;re on the local demo (a banner on Home reminds you). The moment the database is ready, logins switch to real accounts and edits sync automatically.</p>
          </div>
        </div>

        <div className="card card-pad" style={{ borderColor: 'var(--gold)', marginBottom: 16 }}>
          <h3 style={{ marginBottom: 6 }}>🗺️ Live now vs building</h3>
          <div className="col" style={{ gap: 8, fontSize: 13, lineHeight: 1.5 }}>
            <p><strong className="tag tag-green" style={{ marginRight: 6 }}>Live (pilot)</strong> Verified students complete fixed-price Skill Gigs · business owners confirm results · WorkProof Passport entries.</p>
            <p><strong className="tag tag-gold" style={{ marginRight: 6 }}>Prototype (roadmap)</strong> Growth Campaigns with referral codes · QR codes · sales/lead confirmation · payment-received tracking · Growth Teams.</p>
            <p className="subtle" style={{ fontSize: 12 }}>Campuses decide which phases to switch on. CampusHustle never holds or processes payments in any phase.</p>
          </div>
        </div>

        <div className="section">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Frequently asked</h3>
          {FAQS.map((f, i) => (
            <div key={i} className="card card-pad" style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setOpen(open === i ? null : i)}>
              <div className="row-between">
                <span className="strong" style={{ fontSize: 14, color: 'var(--navy)' }}>{f.q}</span>
                <span style={{ transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--slate)' }}>›</span>
              </div>
              {open === i && <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, marginTop: 8 }}>{f.a}</p>}
            </div>
          ))}
        </div>

        <div className="card card-pad ta-center" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 26 }}>🙋</div>
          <p className="strong" style={{ fontSize: 15, color: 'var(--navy)' }}>Still stuck?</p>
          <p className="subtle" style={{ fontSize: 12.5 }}>Campus ambassadors help students daily. Message your ambassador or file a report and admins will follow up.</p>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm grow" onClick={() => actions.fileReport({ targetType: 'user', targetId: 'u_admin', reason: 'other', details: 'Help request from Help & Safety' })}>
              Get help
            </button>
            <button className="btn btn-soft btn-sm grow" onClick={replayGuide}>
              ▶ Replay intro
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { clearLocalHints(); actions.resetDemo(); toast('Demo data reset — fresh seed loaded', 'success'); }}>
              Reset demo data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
