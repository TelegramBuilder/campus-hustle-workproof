import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, businessOf } from '../lib/store';

const KEY = 'ch_guide_v1';

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const PROMOTER: Slide[] = [
  {
    emoji: '👋',
    title: 'Welcome to GrowthProof',
    body: 'Two ways to earn on campus: complete fixed-price Skill Gigs (design, photos, content), or join Growth Campaigns that pay per sale, lead or ticket. Every confirmed result builds your Passport.',
  },
  {
    emoji: '🎯',
    title: '1. Join a Campaign',
    body: 'Open a Campaign that fits your skills and tap Join. You instantly get your own referral code — that’s how vendors know a result came from you.',
  },
  {
    emoji: '📸',
    title: '2. Bring a result, submit proof',
    body: 'Made a sale, signed up a lead or finished a task? Submit proof from the Campaign page — a screenshot, receipt or note the vendor can check.',
  },
  {
    emoji: '📗',
    title: '3. Earn GrowthProof',
    body: 'When the vendor confirms your result, a verified entry lands on your Passport with your rating and on-time record. More proof = better opportunities.',
  },
];

const VENDOR: Slide[] = [
  {
    emoji: '👋',
    title: 'Welcome, vendor',
    body: 'Your student business can post Campaigns that pay campus promoters and creators — sales, leads, tickets or defined tasks. You confirm every result, so nothing happens without your say-so.',
  },
  {
    emoji: '📣',
    title: '1. Post a Campaign',
    body: 'Tap the green Create button. Say what you need, what you pay per confirmed result, and what proof you need. It goes to admins for a quick review.',
  },
  {
    emoji: '✅',
    title: '2. Confirm results',
    body: 'Promoters join with their referral code and submit proof. Check it against your records (receipts, chats, door list) and confirm or reject from the Campaign page.',
  },
  {
    emoji: '📈',
    title: '3. Grow your business',
    body: 'Every confirmed result pays your promoter and builds their GrowthProof — and your reliability rating grows too. Trusted vendors attract the best campus talent.',
  },
];

const AMBASSADOR: Slide[] = [
  {
    emoji: '🛡️',
    title: 'Welcome, ambassador',
    body: 'Your job is to grow this campus safely: recruit real vendors and quality promoters, help with verification, and flag anything suspicious. You earn rewards for quality, not sign-ups.',
  },
  {
    emoji: '📊',
    title: 'Your dashboard',
    body: 'Open the ambassador dashboard (at the bottom of Home) to see vendors and contributors you recruited, completed Campaigns, and your reward status.',
  },
];

export function Guide() {
  const { state } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const [dismissed, setDismissed] = useState(() => seen(me?.id ?? ''));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onShow = () => { setDismissed(false); setStep(0); };
    window.addEventListener('ch:show-guide', onShow);
    return () => window.removeEventListener('ch:show-guide', onShow);
  }, []);

  if (!me || me.role === 'admin' || me.role === 'superadmin') return null;
  if (me.verificationStatus !== 'verified') return null; // verify first, intro later
  if (dismissed) return null;

  const biz = businessOf(me.id);
  const slides = me.role === 'ambassador' ? AMBASSADOR : biz?.status === 'approved' ? VENDOR : PROMOTER;
  const s = slides[Math.min(step, slides.length - 1)];
  const last = step >= slides.length - 1;
  void state;

  const done = () => {
    markSeen(me.id);
    setDismissed(true);
    if (me.role !== 'ambassador' && slides === PROMOTER) nav('/app/campaigns');
  };

  return (
    <div className="guide-overlay" role="dialog" aria-label="Quick intro">
      <div className="guide-card">
        <button className="guide-skip" onClick={done} aria-label="Skip intro">Skip</button>
        <div className="guide-emoji">{s.emoji}</div>
        <h2>{s.title}</h2>
        <p>{s.body}</p>
        <div className="guide-dots">
          {slides.map((_, d) => <i key={d} className={d === step ? 'on' : ''} />)}
        </div>
        <div className="row" style={{ gap: 10 }}>
          {!last && <button className="btn btn-soft grow" onClick={() => setStep((v) => Math.min(v + 1, slides.length - 1))}>Next</button>}
          {last && <button className="btn btn-primary grow" onClick={done}>{me.role === 'ambassador' ? 'Got it' : 'Got it — find a Campaign'}</button>}
        </div>
      </div>
    </div>
  );
}

function seen(uid: string): boolean {
  if (!uid) return true;
  try {
    const raw = localStorage.getItem(KEY);
    return !!raw && !!JSON.parse(raw)[uid];
  } catch { return false; }
}

function markSeen(uid: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[uid] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function resetGuide() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function replayGuide() {
  resetGuide();
  window.dispatchEvent(new Event('ch:show-guide'));
}