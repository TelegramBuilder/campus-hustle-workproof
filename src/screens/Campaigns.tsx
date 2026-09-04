import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp, currentUser, byId } from '../lib/store';
import { CampaignCard, Modal, Chip, EmptyState } from '../components/ui';
import { IconSearch, IconFilter } from '../components/icons';
import { CAMPAIGN_TYPES } from '../lib/domain';
import type { CampaignType } from '../lib/types';

export default function Campaigns() {
  const { state } = useApp();
  const me = currentUser();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [type, setType] = useState<string>(params.get('type') ?? 'all');
  const [effort, setEffort] = useState<string>('all');
  const [deadline, setDeadline] = useState<string>('any');
  const [elig, setElig] = useState<string>('all');
  const [sort, setSort] = useState<string>('closing');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const open = useMemo(
    // live only: exclude Campaigns whose deadline has already passed
    () => state.campaigns.filter((m) => ['open', 'shortlisting'].includes(m.status) && m.deadline > Date.now()),
    [state.campaigns]
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = open.filter((m) => {
      if (type !== 'all' && m.campaignType !== type) return false;
      if (effort !== 'all' && m.effort !== effort) return false;
      if (deadline === '3d' && m.deadline > Date.now() + 3 * 86400000) return false;
      if (deadline === '7d' && m.deadline > Date.now() + 7 * 86400000) return false;
      if (elig === 'squad' && m.squadEligible === 'individual') return false;
      if (elig === 'individual' && m.squadEligible === 'squad') return false;
      if (term) {
        const hay = (m.title + ' ' + m.brief + ' ' + m.skills.join(' ') + ' ' + m.zone).toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (sort === 'closing') list = [...list].sort((a, b) => a.deadline - b.deadline);
    if (sort === 'new') list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'recommended' && me) {
      list = [...list].sort((a, b) => {
        const sa = a.skills.filter((s) => me.skills.includes(s)).length;
        const sb = b.skills.filter((s) => me.skills.includes(s)).length;
        return sb - sa;
      });
    }
    return list;
  }, [open, q, type, effort, deadline, elig, sort, me]);

  const hasFilters = type !== 'all' || effort !== 'all' || deadline !== 'any' || elig !== 'all';

  return (
    <div>
      <div className="top-bar">
        <div className="row" style={{ gap: 10 }}>
          <div className="search-bar grow">
            <span className="search-icon"><IconSearch size={17} /></span>
            <input placeholder="Search Campaigns, skills, businesses…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className={`btn-icon ${hasFilters ? 'btn-primary' : 'btn-soft'}`} style={{ borderRadius: 999 }} onClick={() => setFiltersOpen(true)} aria-label="Filters">
            <IconFilter size={18} />
          </button>
        </div>
        <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
          <Chip active={sort === 'closing'} onClick={() => setSort('closing')}>Closing soon</Chip>
          <Chip active={sort === 'new'} onClick={() => setSort('new')}>Newest</Chip>
          <Chip active={sort === 'recommended'} onClick={() => setSort('recommended')}>Recommended</Chip>
        </div>
      </div>

      <div className="row wrap" style={{ gap: 6, padding: '4px 16px 10px' }}>
        {CAMPAIGN_TYPES.map((t) => (
          <Chip key={t.id} active={type === t.id} onClick={() => setType(type === t.id ? 'all' : t.id)}>
            {t.emoji} {t.id === 'all' ? 'All' : t.name}
          </Chip>
        ))}
      </div>

      <div style={{ padding: '2px 16px' }}>
        {results.length === 0 ? (
          <EmptyState emoji="🎯" title="No Campaigns match" sub="Try clearing filters or checking back soon — new Campaigns drop every week." />
        ) : (
          <div>
            <p className="subtle" style={{ marginBottom: 10, fontSize: 12.5 }}>{results.length} open Campaign{results.length !== 1 ? 's' : ''} on UNILAG</p>
            {results.map((m) => <CampaignCard key={m.id} campaign={m} owner={byId(state.users, m.ownerUserId)} />)}
          </div>
        )}
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter Campaigns">
        <div className="filter-row">
          <label>Campaign type</label>
          <div className="chips">
            {CAMPAIGN_TYPES.map((t) => <Chip key={t.id} active={type === t.id} onClick={() => setType(type === t.id ? 'all' : t.id)}>{t.emoji} {t.id === 'all' ? 'All' : t.name}</Chip>)}
          </div>
        </div>
        <div className="filter-row">
          <label>Effort (creator tasks)</label>
          <div className="chips">
            <Chip active={effort === 'all'} onClick={() => setEffort('all')}>Any</Chip>
            <Chip active={effort === 'small'} onClick={() => setEffort(effort === 'small' ? 'all' : 'small')}>Small · &lt;3h</Chip>
            <Chip active={effort === 'medium'} onClick={() => setEffort(effort === 'medium' ? 'all' : 'medium')}>Medium · 3–8h</Chip>
            <Chip active={effort === 'large'} onClick={() => setEffort(effort === 'large' ? 'all' : 'large')}>Large · 8+h</Chip>
          </div>
        </div>
        <div className="filter-row">
          <label>Deadline</label>
          <div className="chips">
            <Chip active={deadline === 'any'} onClick={() => setDeadline('any')}>Any</Chip>
            <Chip active={deadline === '3d'} onClick={() => setDeadline(deadline === '3d' ? 'any' : '3d')}>Next 3 days</Chip>
            <Chip active={deadline === '7d'} onClick={() => setDeadline(deadline === '7d' ? 'any' : '7d')}>Next 7 days</Chip>
          </div>
        </div>
        <div className="filter-row">
          <label>Eligibility</label>
          <div className="chips">
            <Chip active={elig === 'all'} onClick={() => setElig('all')}>Any</Chip>
            <Chip active={elig === 'individual'} onClick={() => setElig(elig === 'individual' ? 'all' : 'individual')}>Individual</Chip>
            <Chip active={elig === 'squad'} onClick={() => setElig(elig === 'squad' ? 'all' : 'squad')}>Squad eligible</Chip>
          </div>
        </div>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => setFiltersOpen(false)}>
          Show {results.length} Campaign{results.length !== 1 ? 's' : ''}
        </button>
      </Modal>
    </div>
  );
}
