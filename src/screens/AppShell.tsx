import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp, currentUser, totalUnread } from '../lib/store';
import { IconHome, IconTarget, IconPlus, IconChat, IconPassport } from '../components/icons';

export default function AppShell() {
  const { state } = useApp();
  const location = useLocation();
  const me = currentUser();
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

  return (
    <div className="app-frame">
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
          {item({ to: '/app/campaigns', icon: <IconTarget size={21} />, label: 'Campaigns' })}
          <NavLink to="/app/create" className="nav-item">
            <span className="nav-post"><IconPlus size={24} /></span>
            <span style={{ marginTop: 2 }}>Create</span>
          </NavLink>
          {item({ to: '/app/inbox', icon: <IconChat size={21} />, label: 'Inbox', badge: unread })}
          {item({ to: '/app/passport', icon: <IconPassport size={21} />, label: 'Passport' })}
        </nav>
      )}
    </div>
  );
}