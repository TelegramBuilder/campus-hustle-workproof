import { useNavigate, Navigate } from 'react-router-dom';
import { currentUser } from '../lib/store';
import { LogoMark } from '../components/ui';

export default function Splash() {
  const nav = useNavigate();
  if (currentUser()) return <Navigate to="/app/home" replace />;

  return (
    <div className="splash">
      <div className="splash-logo">
        <div className="splash-mark">
          <LogoMark size={96} />
        </div>
        <div className="wordmark" style={{ marginTop: 22, fontSize: 29 }}>
          <span style={{ color: '#fff' }}>Campus</span>
          <span style={{ color: '#7ee2bd' }}>Hustle</span>
        </div>
        <div className="splash-gold-line" />
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.32em', color: 'rgba(255,255,255,0.75)', marginTop: 14 }}>GROWTHPROOF</div>
        <p className="tagline" style={{ marginTop: 12 }}>Build proof. Earn trust. Get hired.</p>
      </div>
      <div className="splash-cta">
        <button className="btn btn-lg btn-block" style={{ background: 'linear-gradient(135deg,#ffc233,#eaa800)', color: 'var(--navy)', fontWeight: 800, boxShadow: '0 12px 28px rgba(244,180,0,0.35)' }} onClick={() => nav('/onboarding')}>
          Get started
        </button>
        <button
          className="btn btn-lg btn-block"
          style={{ border: '1.5px solid rgba(255,255,255,0.45)', color: '#fff', background: 'rgba(255,255,255,0.08)' }}
          onClick={() => nav('/login')}
        >
          Log in
        </button>
        <p className="splash-note">Verified UNILAG students only · Campus Campaigns · Real GrowthProof</p>
      </div>
    </div>
  );
}