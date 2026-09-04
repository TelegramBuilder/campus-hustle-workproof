import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, currentUser, byId, publicName, totalUnread } from '../lib/store';
import { Avatar } from '../components/ui';
import { IconSearch, IconChat } from '../components/icons';
import { timeAgo, timeShort } from '../lib/format';
import { CAMPAIGN_TYPE_MAP } from '../lib/domain';

export default function Inbox() {
  const { state } = useApp();
  const nav = useNavigate();
  const me = currentUser();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'campaigns'>('all');

  const convs = useMemo(() => {
    if (!me) return [];
    return state.conversations
      .filter((c) => c.participantIds.includes(me.id))
      .map((c) => {
        const otherId = c.participantIds.find((p) => p !== me.id) ?? '';
        const other = byId(state.users, otherId);
        const campaign = c.campaignId ? byId(state.campaigns, c.campaignId) : undefined;
        const msgs = state.messages.filter((m) => m.conversationId === c.id);
        const last = msgs[msgs.length - 1];
        const unread = state.messages.filter((m) => m.conversationId === c.id && m.senderId !== me.id && !m.readBy.includes(me.id)).length;
        return { c, other, campaign, last, unread };
      })
      .filter((x) => x.other)
      .sort((a, b) => (b.last?.createdAt ?? b.c.lastMessageAt) - (a.last?.createdAt ?? a.c.lastMessageAt));
  }, [state, me]);

  const term = q.trim().toLowerCase();
  const filtered = convs.filter((x) => {
    if (tab === 'campaigns' && !x.campaign) return false;
    if (!term) return true;
    const hay = `${publicName(x.other)} ${x.campaign?.title ?? ''} ${x.last?.text ?? ''}`.toLowerCase();
    return hay.includes(term);
  });

  if (!me) return null;
  const unreadTotal = totalUnread(me.id);

  return (
    <div>
      <div className="top-bar">
        <div className="row-between">
          <div className="row" style={{ gap: 6 }}>
            <h1 style={{ fontSize: 20 }}>Inbox</h1>
            {unreadTotal > 0 && <span className="status status-completed" style={{ fontSize: 11 }}>{unreadTotal} unread</span>}
          </div>
        </div>
        <div className="search-bar" style={{ marginTop: 10 }}>
          <span className="search-icon"><IconSearch size={17} /></span>
          <input placeholder="Search conversations…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tabs" style={{ marginTop: 12 }}>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
          <button className={`tab ${tab === 'campaigns' ? 'active' : ''}`} onClick={() => setTab('campaigns')}>Campaign chats</button>
        </div>
      </div>

      <div style={{ padding: '2px 16px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 30 }}>
            <div className="emoji">💬</div>
            <h3>{q || tab === 'campaigns' ? 'No conversations found' : 'Your inbox is empty'}</h3>
            <p className="subtle">
              {q || tab === 'campaigns'
                ? 'Try another search, or start a conversation from any Campaign.'
                : 'Message a vendor, promoter or creator — chats open from Campaigns you join or apply to.'}
            </p>
            {!q && tab === 'all' && (
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={() => nav('/app/campaigns')}><IconChat size={16} /> Browse Campaigns</button>
              </div>
            )}
          </div>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map(({ c, other, campaign, last, unread }) => (
              <div key={c.id} className="card card-tap card-pad" onClick={() => nav(`/app/chat/${c.id}`)}>
                <div className="row" style={{ gap: 10 }}>
                  <Avatar user={other} size="md" showVerified />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row-between" style={{ gap: 8 }}>
                      <span className="strong" style={{ color: 'var(--navy)', fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {publicName(other)}
                        {c.blockedBy.includes(me.id) && <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 6 }}>· blocked by you</span>}
                        {c.blockedBy.length > 0 && !c.blockedBy.includes(me.id) && <span style={{ fontSize: 11, color: 'var(--danger)', marginLeft: 6 }}>· blocked</span>}
                      </span>
                      <span className="subtle" style={{ fontSize: 11, flex: 'none' }}>
                        {last ? timeAgo(last.createdAt) : timeShort(c.lastMessageAt)}
                      </span>
                    </div>
                    {campaign && (
                      <div className="row wrap" style={{ gap: 5, marginTop: 3 }}>
                        <span className="tag tag-navy" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                          {CAMPAIGN_TYPE_MAP[campaign.campaignType]?.emoji} {campaign.title.length > 38 ? campaign.title.slice(0, 38) + '…' : campaign.title}
                        </span>
                      </div>
                    )}
                    <div className="row-between" style={{ gap: 8, marginTop: 4 }}>
                      <span className="subtle" style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {last ? `${last.senderId === me.id ? 'You: ' : ''}${last.text}` : campaign ? 'Say hello about this Campaign' : 'Start a conversation'}
                      </span>
                      {unread > 0 && (
                        <span className="nav-badge" style={{ position: 'static', flex: 'none' }}>{unread > 9 ? '9+' : unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
