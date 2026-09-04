import type { CampaignKind, CampaignStatus, CampaignType, Effort, PaymentArrangement, ResultStatus, SkillCheckStatus, SkillCheckTrack } from './types';

/* ---------- Campaign types ---------- */

export const CAMPAIGN_TYPES: { id: CampaignType | 'all'; name: string; emoji: string; blurb: string; kind: CampaignKind | 'all' }[] = [
  { id: 'all', name: 'All campaign types', emoji: '🧭', blurb: '', kind: 'all' },
  { id: 'sale', name: 'Per confirmed sale', emoji: '🛍️', blurb: 'Promoters bring paying customers for your product or service.', kind: 'result' },
  { id: 'lead', name: 'Per verified customer lead', emoji: '📇', blurb: 'Promoters bring customers genuinely interested in what you sell.', kind: 'result' },
  { id: 'ticket_sale', name: 'Per event ticket sold', emoji: '🎟️', blurb: 'Promoters sell tickets to your event, show or experience.', kind: 'result' },
  { id: 'content_task', name: 'Content creation task', emoji: '🎨', blurb: 'Creators make posts, designs, writing or brand assets for your business.', kind: 'task' },
  { id: 'promotion_task', name: 'Campus promotion task', emoji: '📣', blurb: 'Promoters run campus activations, stalls or awareness for your business.', kind: 'task' },
  { id: 'media_task', name: 'Product photography / video task', emoji: '📸', blurb: 'Creators shoot and edit product photos, videos or reels.', kind: 'task' },
  { id: 'research_task', name: 'Market research task', emoji: '🔎', blurb: 'Researchers interview students and summarise feedback about your business.', kind: 'task' },
];

export const CAMPAIGN_TYPE_MAP: Record<CampaignType, { name: string; emoji: string; kind: CampaignKind }> = {
  sale: { name: 'Per confirmed sale', emoji: '🛍️', kind: 'result' },
  lead: { name: 'Per verified customer lead', emoji: '📇', kind: 'result' },
  ticket_sale: { name: 'Per event ticket sold', emoji: '🎟️', kind: 'result' },
  content_task: { name: 'Content creation task', emoji: '🎨', kind: 'task' },
  promotion_task: { name: 'Campus promotion task', emoji: '📣', kind: 'task' },
  media_task: { name: 'Product photography / video task', emoji: '📸', kind: 'task' },
  research_task: { name: 'Market research task', emoji: '🔎', kind: 'task' },
};

export const KIND_OF = (t: CampaignType): CampaignKind => CAMPAIGN_TYPE_MAP[t]?.kind ?? 'task';

export const RESULT_TYPES: CampaignType[] = ['sale', 'lead', 'ticket_sale'];
export const TASK_TYPES: CampaignType[] = ['content_task', 'promotion_task', 'media_task', 'research_task'];

/** Skill-Gig tracks shown under “Earn with Skills” (fixed-price, deliverable tasks). */
export const SKILL_TRACKS: { id: string; name: string; emoji: string; blurb: string; types: CampaignType[] }[] = [
  { id: 'design_content', name: 'Design & content', emoji: '🎨', blurb: 'Flyers, menus, WhatsApp/Instagram posts, product copy', types: ['content_task'] },
  { id: 'photo_video', name: 'Photo & video', emoji: '📸', blurb: 'Product photos, short reels, event coverage', types: ['media_task'] },
  { id: 'promotion_assets', name: 'Campus promotion assets', emoji: '📣', blurb: 'Flyer distribution plans, event/media support, research', types: ['promotion_task', 'research_task'] },
];

export const SKILL_TRACK_MAP: Record<string, { name: string; emoji: string; types: CampaignType[] }> = Object.fromEntries(SKILL_TRACKS.map((t) => [t.id, t]));

/** Which skill track (or null) a task Campaign belongs to. */
export function skillTrackFor(t: CampaignType): string | null {
  const hit = SKILL_TRACKS.find((s) => s.types.includes(t));
  return hit ? hit.id : null;
}

export const GIG_LABEL = 'Skill Gig';
export const CAMPAIGN_LABEL = 'Growth Campaign';

export const CAMPAIGN_TYPE_NAMES = CAMPAIGN_TYPES.map((t) => t.name);
export const CAMPAIGN_KIND_LABEL: Record<CampaignKind, string> = {
  result: 'Result campaign',
  task: 'Creator task',
};

/** Short call-to-action nouns for GrowthProof roles per campaign type. */
export const ROLE_FOR_TYPE: Record<CampaignType, string> = {
  sale: 'Sales promoter',
  lead: 'Lead promoter',
  ticket_sale: 'Ticket promoter',
  content_task: 'Content creator',
  promotion_task: 'Campus promoter',
  media_task: 'Product media creator',
  research_task: 'Research support',
};

/** What a promoter submits as proof, per result campaign type. */
export const RESULT_PROOF_HINT: Record<CampaignType, string> = {
  sale: 'Describe the sale and add a reference the vendor can verify (receipt no., order id, chat).',
  lead: 'Describe the lead: what they want, and where the vendor can verify interest.',
  ticket_sale: 'Describe the ticket(s) sold and the buyer’s reference (receipt no., name + seat).',
  content_task: '',
  promotion_task: '',
  media_task: '',
  research_task: '',
};

export const RESULT_STATUS_LABEL: Record<ResultStatus, string> = {
  submitted: 'Submitted',
  vendor_confirmed: 'Confirmed',
  rejected: 'Rejected',
  disputed: 'Disputed',
};

/* ---------- Skills ---------- */

export const SKILLS = [
  'Graphic design',
  'Content writing',
  'Photography',
  'Videography',
  'Event support',
  'MC / hosting',
  'Social media',
  'Tutoring',
  'Study support',
  'Excel / data support',
  'Printing / formatting',
  'Sales & referrals',
  'Other',
];

/** Skill → role noun used on GrowthProof entries and contributor cards. */
const SKILL_ROLE: Record<string, string> = {
  'Graphic design': 'Designer',
  'Content writing': 'Writer',
  'Photography': 'Photographer',
  'Videography': 'Videographer',
  'Event support': 'Event support',
  'MC / hosting': 'MC / host',
  'Social media': 'Social media support',
  'Tutoring': 'Tutor',
  'Study support': 'Study mentor',
  'Excel / data support': 'Data analyst',
  'Printing / formatting': 'Print & format',
  'Sales & referrals': 'Promoter',
  'Other': 'Contributor',
};

/** Pick the most specific role label for a promoter/creator from the skills they match on a Campaign. */
export function roleForCampaign(userSkills: string[], campaignSkills: string[]): string {
  const matched = campaignSkills.find((s) => userSkills.includes(s) && SKILL_ROLE[s]);
  if (matched) return SKILL_ROLE[matched];
  const first = campaignSkills.find((s) => SKILL_ROLE[s]);
  return first ? SKILL_ROLE[first] : 'Contributor';
}

/* ---------- Status labels ---------- */

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  open: 'Open',
  shortlisting: 'Shortlisting',
  assigned: 'Assigned',
  in_progress: 'In progress',
  submitted: 'Submitted',
  revision_requested: 'Revision requested',
  accepted: 'Accepted',
  growthproof_issued: 'GrowthProof issued',
  closed: 'Closed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  rejected: 'Rejected',
};

export const CAMPAIGN_STATUS_CLASS: Record<CampaignStatus, string> = {
  draft: 'status-sent',
  pending_review: 'status-negotiating',
  open: 'status-accepted',
  shortlisting: 'status-negotiating',
  assigned: 'status-accepted',
  in_progress: 'status-scheduled',
  submitted: 'status-completed_by_buyer',
  revision_requested: 'status-negotiating',
  accepted: 'status-completed',
  growthproof_issued: 'status-completed',
  closed: 'status-cancelled',
  cancelled: 'status-cancelled',
  disputed: 'status-reported',
  rejected: 'status-rejected',
};

/* Back-compat aliases so screens keep importing one name. */
export const TRACKS = CAMPAIGN_TYPES;
export const TRACK_MAP = CAMPAIGN_TYPE_MAP as unknown as Record<string, { name: string; emoji: string }>;
export const MISSION_STATUS_LABEL = CAMPAIGN_STATUS_LABEL;
export const MISSION_STATUS_CLASS = CAMPAIGN_STATUS_CLASS;

/* ---------- Misc labels ---------- */

export const EFFORT_LABEL: Record<Effort, string> = {
  small: 'Small · under 3 hours',
  medium: 'Medium · 3–8 hours',
  large: 'Large · 8+ hours',
};

export const PAYMENT_LABEL: Record<PaymentArrangement, string> = {
  paid_outside: 'Paid directly outside CampusHustle',
  volunteer: 'Volunteer',
  to_discuss: 'To be discussed',
};

export const SKILLCHECK_STATUS_LABEL: Record<SkillCheckStatus, string> = {
  pending: 'Pending',
  skill_checked: 'Skill-Checked',
  needs_improvement: 'Needs improvement',
};

export const SKILLCHECK_TRACK_LABEL: Record<SkillCheckTrack, string> = {
  design_content: 'Design and Content',
  event_support: 'Event Support',
  peer_learning: 'Peer Learning Support',
};

export const REPORT_REASONS = [
  { id: 'scam', label: 'Scam or fake Campaign' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'cheating', label: 'Academic cheating' },
  { id: 'illegal', label: 'Illegal or unsafe service' },
  { id: 'fake_identity', label: 'Fake identity' },
  { id: 'no_show', label: 'No-show' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'other', label: 'Other' },
];

export const BUSINESS_CATEGORIES = [
  'Fashion & merch',
  'Food & drinks',
  'Beauty & grooming',
  'Printing & stationery',
  'Events & entertainment',
  'Design & creative studio',
  'Photography & video',
  'Tech & accessories',
  'Books & study materials',
  'Campus services',
  'Other',
];

export const FACULTIES = [
  'Faculty of Science',
  'Faculty of Engineering',
  'Faculty of Law',
  'Faculty of Social Sciences',
  'Faculty of Management Sciences',
  'Faculty of Arts',
  'Faculty of Education',
  'College of Medicine',
  'Faculty of Environmental Sciences',
  'Other',
];

export const DEPARTMENTS = [
  'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biochemistry', 'Microbiology',
  'Electrical & Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Systems Engineering',
  'Law',
  'Economics', 'Political Science', 'Sociology', 'Psychology', 'Geography', 'Mass Communication',
  'Accounting', 'Business Administration', 'Actuarial Science', 'Insurance', 'Finance',
  'English Language', 'History', 'Philosophy', 'Linguistics', 'Music', 'Creative Arts',
  'Education', 'Guidance & Counselling',
  'Medicine & Surgery', 'Dentistry', 'Nursing Science', 'Physiotherapy', 'Pharmacy', 'Radiography',
  'Architecture', 'Urban & Regional Planning', 'Building', 'Estate Management', 'Quantity Surveying',
  'Other',
];

export const LEVELS = ['100', '200', '300', '400', '500', '600', 'Postgraduate'];

/** Rough vendor reliability summary for a user who owns campaigns. */
export function vendorReliability(confirmed: number, disputed: number, rejected: number): { label: string; tone: 'good' | 'warn' | 'bad' } {
  const total = confirmed + disputed + rejected;
  if (total === 0) return { label: 'No confirmed results yet', tone: 'warn' };
  const disputeRate = disputed / total;
  if (disputeRate > 0.15) return { label: 'High dispute rate — verify before committing', tone: 'bad' };
  if (confirmed / total >= 0.85) return { label: 'Reliable vendor — confirms results cleanly', tone: 'good' };
  return { label: 'Confirms most results fairly', tone: 'warn' };
}
