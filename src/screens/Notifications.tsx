import { useNavigate } from 'react-router-dom';
import { useApp, currentUser } from '../lib/store';
import { IconBack } from '../components/icons';
import { timeAgo } from '../lib/format';

const KIND_ICON: Record<string, string> = {
  verification: '🪪',
  organisation: '🏛️',
  campaign: '🎯',
  application: '📨',
  assignment: '🤝',
  workspace: '🛠️',
  growthproof: '📗',
  skillcheck: '🏅',
  message: '💬',
  squad: '👥',
  report: '🛡️',
  system: '🔔',
};

export default function Notifications() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  if (!me) return null;

  const list = state.notifications
    .filter((n) => n.userId === me.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const unread = list.filter((n) => !n.read).length;

  return (
    <div>
      <div className="top-bar">
        <div className="row-between">
          <div className="row" style={{ gap: 6 }}>
            <h1 style={{ fontSize: 20 }}>Notifications</h1>
            {unread > 0 && <span className="status status-completed" style={{ fontSize: 11 }}>{unread} new</span>}
          </div>
          {unread > 0 && (
            <button className="btn btn-sm btn-soft" onClick={() => { actions.markAllNotificationsRead(); }}>
              Mark all read
            </button>
          )}
        </div>
      </div>
      <div style={{ padding: '2px 16px' }}>
        {list.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 40 }}>
            <div className="emoji">🔕</div>
            <h3>All caught up</h3>
            <p className="subtle">Campaign updates, messages and GrowthProof moments will land here.</p>
          </div>
        ) : (
          <div className="card">
            {list.map((n) => (
              <div
                key={n.id}
                className="notif-item"
                style={{ background: n.read ? 'transparent' : 'var(--green-soft)' }}
                onClick={() => {
                  actions.markNotificationRead(n.id);
                  if (n.link) nav(n.link);
                }}
              >
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--green)', flex: 'none', marginTop: 5 }} />}
                {n.read && <span style={{ width: 8, flex: 'none' }} />}
                <span style={{ fontSize: 20, flex: 'none' }}>{KIND_ICON[n.kind] ?? '🔔'}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row-between" style={{ gap: 8 }}>
                    <span className="strong" style={{ fontSize: 13.5, color: 'var(--navy)' }}>{n.title}</span>
                    <span className="subtle" style={{ fontSize: 10.5, flex: 'none' }}>{timeAgo(n.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 2, lineHeight: 1.45 }}>{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
