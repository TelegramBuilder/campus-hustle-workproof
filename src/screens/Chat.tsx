import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp, currentUser, byId, publicName } from '../lib/store';
import { Avatar, Modal, Field, Textarea, toast } from '../components/ui';
import { IconBack, IconSend, IconPaperclip, IconMore, IconFlag } from '../components/icons';
import { timeShort, dateShort } from '../lib/format';
import { CAMPAIGN_TYPE_MAP, MISSION_STATUS_LABEL, REPORT_REASONS } from '../lib/domain';

export default function Chat() {
  const { state, actions } = useApp();
  const nav = useNavigate();
  const { id } = useParams();
  const me = currentUser();
  const conv = byId(state.conversations, id ?? '');
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [repOpen, setRepOpen] = useState(false);
  const [rep, setRep] = useState({ reason: '', details: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) actions.markConversationRead(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, state.messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.messages.length]);

  if (!me || !conv) {
    return (
      <div style={{ height: '100%' }}>
        <div className="screen-header">
          <button className="btn-icon btn-soft" onClick={() => nav(-1)}><IconBack size={18} /></button>
          <h1>Conversation not found</h1>
        </div>
      </div>
    );
  }

  const otherId = conv.participantIds.find((p) => p !== me.id) ?? '';
  const other = byId(state.users, otherId);
  if (!other) return null;
  const campaign = conv.campaignId ? byId(state.campaigns, conv.campaignId) : undefined;
  const msgs = state.messages.filter((m) => m.conversationId === conv.id);
  const otherId0 = conv.participantIds.find((p) => p !== me.id) ?? '';
  const iBlocked = conv.blockedBy.includes(me.id);
  const theyBlocked = conv.blockedBy.includes(otherId0);
  const blocked = iBlocked || theyBlocked;
  const assignment = campaign ? state.assignments.find((a) => a.campaignId === campaign.id) : undefined;
  const imContributor = assignment?.contributorIds.includes(me.id) ?? false;
  const isOwner = campaign?.ownerUserId === me.id;
  const filesOpen = conv.fileSharingOpen || (assignment && ['assigned', 'in_progress', 'submitted', 'revision_requested'].includes(assignment.status)) === true || imContributor;

  const send = (kind: 'text' | 'file' | 'image' = 'text', attachmentName?: string, attachmentMeta?: { name: string; size?: number; type?: string }) => {
    if (kind === 'text' && !text.trim()) return;
    const err = actions.sendMessage(conv.id, kind === 'text' ? text.trim() : `Shared ${attachmentName}`, kind, attachmentName, attachmentMeta);
    if (err) { toast(err, 'error'); return; }
    if (kind === 'text') setText('');
  };

  const attach = (kind: 'file' | 'image') => {
    if (!filesOpen) {
      toast(conv.campaignId ? 'Files unlock once you’re assigned or shortlisted on this Campaign.' : 'Files unlock after a Campaign is assigned.', 'error');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    if (kind === 'image') input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const meta = { name: f.name, size: f.size, type: f.type };
      send(kind, f.name, meta);
    };
    input.click();
  };

  const fileReport = () => {
    if (!rep.reason) { toast('Choose a reason', 'error'); return; }
    actions.fileReport({ targetType: 'user', targetId: other.id, reason: rep.reason, details: rep.details, linkedCampaignId: campaign?.id });
    setRepOpen(false);
    setRep({ reason: '', details: '' });
    toast('Report sent — admins will review', 'success');
  };

  // day dividers
  const dayOf = (ts: number) => new Date(ts).toDateString();

  return (
    <div className="chat-shell">
      <div className="chat-status-strip" style={{ padding: '10px 16px', gap: 10 }}>
        <button className="btn-icon btn-soft" style={{ width: 34, height: 34, flex: 'none' }} onClick={() => campaign ? nav(`/app/campaign/${campaign.id}`) : nav(-1)} aria-label="Back">
          <IconBack size={17} />
        </button>
        <Avatar user={other} size="sm" showVerified />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="strong" style={{ fontSize: 14.5, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publicName(other)}</span>
            {other?.verificationStatus === 'verified' && <span className="tag tag-green" style={{ fontSize: 9.5, padding: '1px 7px' }}>Verified</span>}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {campaign ? `${CAMPAIGN_TYPE_MAP[campaign.campaignType]?.emoji} ${campaign.title} · ${MISSION_STATUS_LABEL[campaign.status]}` : 'Direct chat'}
          </div>
        </div>
        <button className="btn-icon btn-soft" style={{ width: 34, height: 34, flex: 'none' }} onClick={() => setMenuOpen(true)} aria-label="More"><IconMore size={18} /></button>
      </div>

      {campaign && (
        <div className="safety-tip" style={{ margin: '0 12px 8px', background: campaign.status === 'disputed' ? 'var(--danger-soft)' : 'var(--green-soft)', borderColor: campaign.status === 'disputed' ? 'var(--danger)' : 'var(--green-mist)' }}>
          <span>{campaign.status === 'disputed' ? '⚠️' : '📋'}</span>
          <span style={{ fontSize: 12 }}>
            {campaign.status === 'disputed'
              ? 'This Campaign is under dispute review — admins will resolve it.'
              : 'No payment happens on CampusHustle. Agree transfer or cash directly; never pay to “reserve” work.'}
          </span>
        </div>
      )}

      <div className="chat-messages">
        {msgs.length === 0 && (
          <div className="empty-state" style={{ paddingTop: 24 }}>
            <div className="emoji">👋</div>
            <h3>Say hello</h3>
            <p className="subtle">Introduce yourself and reference the Campaign or application that brought you here.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.senderId === me.id;
          const prev = msgs[i - 1];
          const showDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt);
          const showTime = !prev || prev.createdAt - m.createdAt > 10 * 60000 || prev.senderId !== m.senderId;
          return (
            <div key={m.id}>
              {showDay && <div className="chat-day"><span>{dateShort(m.createdAt)}</span></div>}
              <div className={`msg ${mine ? 'mine' : 'theirs'}`} key={`b${m.id}`}>
                {m.kind !== 'text' && <div className="row" style={{ gap: 5, fontWeight: 800, fontSize: 12.5 }}>{m.kind === 'image' ? '🖼️' : '📎'} {m.attachmentName}{m.attachmentMeta?.size ? ` · ${(m.attachmentMeta.size / 1024).toFixed(0)} KB` : ''}</div>}
                {m.text}
                {showTime && <div className={`msg-time ${mine ? '' : 'other'}`}>{timeShort(m.createdAt)}</div>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <div className="blocked-notice">
          <p>🔒 {iBlocked ? 'You blocked this conversation.' : `${publicName(other)} blocked this conversation.`}</p>
          {iBlocked && <button className="btn btn-sm btn-soft" onClick={() => { const e = actions.unblockConversation(conv.id); if (e) toast(e, 'error'); else toast('Unblocked', 'success'); }}>Unblock</button>}
          {!iBlocked && <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>Blocking is two-sided — you can still report them to admins.</p>}
        </div>
      ) : (
        <div className="chat-input-bar">
          <button className="btn-icon btn-soft" style={{ width: 40, height: 40, borderRadius: 12 }} onClick={() => attach('file')} aria-label="Attach file"><IconPaperclip size={18} /></button>
          <button className="btn-icon btn-soft" style={{ width: 40, height: 40, borderRadius: 12 }} onClick={() => attach('image')} aria-label="Send photo"><span style={{ fontSize: 17 }}>🖼️</span></button>
          <input
            className="chat-input"
            placeholder={conv.campaignId && !filesOpen ? 'Message… (files unlock after assignment)' : 'Message…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn-send" onClick={() => send()} aria-label="Send"><IconSend size={17} /></button>
        </div>
      )}

      {/* More menu */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Conversation options">
        <div className="col" style={{ gap: 10 }}>
          {campaign && (
            <button className="btn btn-ghost btn-block" onClick={() => { setMenuOpen(false); nav(`/app/campaign/${campaign.id}`); }}>
              📋 View Campaign
            </button>
          )}
          {other?.id === 'u_admin' && (
            <p className="subtle" style={{ fontSize: 12.5 }}>This is the campus admin — they’re here to help with safety, not Campaigns.</p>
          )}
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              setMenuOpen(false);
              nav(`/app/user/${other.id}`);
            }}
          >
            🪪 View {publicName(other)}’s Passport
          </button>
          <button className="btn btn-danger btn-block" onClick={() => { setMenuOpen(false); setRepOpen(true); }}>
            <IconFlag size={16} /> Report {publicName(other)}
          </button>
          {!iBlocked ? (
            <button className="btn btn-soft btn-block" onClick={() => { if (window.confirm(`Block ${publicName(other)}? You won’t receive their messages and they can’t message you.`)) { const e = actions.blockConversation(conv.id); if (e) toast(e, 'error'); else { setMenuOpen(false); toast('Blocked', 'success'); } } }}>
              🚫 Block {publicName(other)}
            </button>
          ) : (
            <button className="btn btn-soft btn-block" onClick={() => { const e = actions.unblockConversation(conv.id); if (e) toast(e, 'error'); else { setMenuOpen(false); toast('Unblocked', 'success'); } }}>Unblock</button>
          )}
          {other?.id === 'u_admin' && (
            <button className="btn btn-outline btn-block" onClick={() => { actions.fileReport({ targetType: 'user', targetId: 'u_admin', reason: 'other', details: 'Help request from chat' }); setMenuOpen(false); toast('Sent to admin', 'success'); }}>
              🆘 Request admin help
            </button>
          )}
        </div>
      </Modal>

      {/* Report modal */}
      <Modal open={repOpen} onClose={() => setRepOpen(false)} title={`Report ${publicName(other)}`}>
        <Field label="Reason">
          <div className="col" style={{ gap: 8 }}>
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className={`check-row ${rep.reason === r.id ? 'selected' : ''}`} onClick={() => setRep({ ...rep, reason: r.id })}>
                <span className="radio-dot" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Details (optional)">
          <Textarea placeholder="What should admins know? Share links, not passwords." value={rep.details} onChange={(e) => setRep({ ...rep, details: e.target.value })} />
        </Field>
        <p className="subtle" style={{ fontSize: 11.5, marginBottom: 8 }}>
          Never share OTPs, PINs or ID documents in reports or chats. Admins never ask for them.
        </p>
        <button className="btn btn-danger btn-lg btn-block" onClick={fileReport}>Submit report</button>
      </Modal>
    </div>
  );
}
