import { useNavigate, Navigate } from 'react-router-dom';
import { currentUser } from '../lib/store';
import { LogoMark } from '../components/ui';

export default function Splash() {
  const nav = useNavigate();
  if (currentUser()) return <Navigate to="/app/home" replace />;

  return (
    <div className="splash">
      <div className="splash-logo">
        <LogoMark size={92} />
        <div className="wordmark" style={{ marginTop: 20, fontSize: 28 }}>
          <span style={{ color: '#fff' }}>Campus</span>
          <span style={{ color: '#7ee2bd' }}>Hustle</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>GROWTHPROOF</div>
        <p className="tagline" style={{ marginTop: 14 }}>Build proof. Earn trust. Get hired.</p>
      </div>
      <div className="splash-cta">
        <button className="btn btn-lg btn-block" style={{ background: '#fff', color: 'var(--navy)', fontWeight: 800 }} onClick={() => nav('/onboarding')}>Get started</button>
        <button
          className="btn btn-lg btn-block"
          style={{ border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff' }}
          onClick={() => nav('/login')}
        >
          Log in
        </button>
        <p className="splash-note">Verified UNILAG students only · Campus Campaigns · Real GrowthProof</p>
      </div>
    </div>
  );
}