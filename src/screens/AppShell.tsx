import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp, currentUser, totalUnread, currentEarnMode, cloudStatus } from '../lib/store';
import { Guide } from '../components/Guide';
import { IconHome, IconTarget, IconPlus, IconChat, IconPassport } from '../components/icons';

export default function AppShell() {
  const { state } = useApp();
  const location = useLocation();
  const me = currentUser();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ch_fallback_dismissed') === '1'; } catch { return false; }
  });
  const cloud = cloudStatus();
  const earnLabel = currentEarnMode() === 'skills' ? 'Missions' : 'Campaigns';
  void state;

  if (!me) return <Navigate to="/" replace />;

  const isChat = /^\/app\/chat\//.test(location.pathname);
  const unread = totalUnread(me.id);

  const item = ({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      {icon}
      {label}
      {badge !== undefined && badge > 0 && <span className="nav-badge">{badge > 9 ? '9+' : badge}</span>}
    </NavLink>
  );

  const dismissFallback = () => {
    try { localStorage.setItem('ch_fallback_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="app-frame">
      {cloud === 'fallback' && !dismissed && (
        <div className="cloud-fallback-banner" role="note">
          <span>
            <strong>Demo mode</strong> — cloud sync isn&apos;t connected yet, so edits stay on this device.
            Set up the Supabase database (Help &amp; safety → Cloud setup) to sync across devices.
          </span>
          <button onClick={dismissFallback} aria-label="Dismiss">×</button>
        </div>
      )}
      {isChat ? (
        <Outlet />
      ) : (
        <div className="app-scroll">
          <Outlet />
        </div>
      )}
      {!isChat && (
        <nav className="bottom-nav">
          {item({ to: '/app/home', icon: <IconHome size={21} />, label: 'Home' })}
          {item({ to: '/app/campaigns', icon: <IconTarget size={21} />, label: earnLabel })}
          <NavLink to="/app/create" className="nav-item">
            <span className="nav-post"><IconPlus size={24} /></span>
            <span style={{ marginTop: 2 }}>Create</span>
          </NavLink>
          {item({ to: '/app/inbox', icon: <IconChat size={21} />, label: 'Inbox', badge: unread })}
          {item({ to: '/app/passport', icon: <IconPassport size={21} />, label: 'Passport' })}
        </nav>
      )}
      <Guide key={me.id} />
    </div>
  );
}