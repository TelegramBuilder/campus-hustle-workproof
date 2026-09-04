export type Role = 'student' | 'ambassador' | 'admin' | 'superadmin';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';

export type CampaignType = 'sale' | 'lead' | 'ticket_sale' | 'content_task' | 'promotion_task' | 'media_task' | 'research_task';

/** result = promoters bring confirmed results (sales, leads, tickets); task = creators deliver work. */
export type CampaignKind = 'result' | 'task';

export type RewardType = 'per_result' | 'fixed_task';

export type ResultStatus = 'submitted' | 'vendor_confirmed' | 'rejected' | 'disputed';

export type Effort = 'small' | 'medium' | 'large'; // <3h / 3–8h / 8+h
export type PaymentArrangement = 'paid_outside' | 'volunteer' | 'to_discuss';
export type SquadEligibility = 'individual' | 'squad' | 'both';

export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'open'
  | 'shortlisting'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'accepted'
  | 'growthproof_issued'
  | 'closed'
  | 'cancelled'
  | 'disputed'
  | 'rejected';

export type ApplicationStatus = 'pending' | 'shortlisted' | 'selected' | 'joined' | 'declined' | 'withdrawn';

export type GrowthProofVisibility = 'public' | 'campus' | 'private';

export type SkillCheckStatus = 'pending' | 'skill_checked' | 'needs_improvement';

/** Delayed at launch — kept so existing records typecheck. */
export type SkillCheckTrack = 'design_content' | 'event_support' | 'peer_learning';

export type ReviewReason = 'quality' | 'communication' | 'reliability' | 'professionalism' | 'value';

export type ReportReason =
  | 'scam'
  | 'harassment'
  | 'cheating'
  | 'illegal'
  | 'fake_identity'
  | 'no_show'
  | 'inappropriate'
  | 'other';

export type ReportTarget = 'user' | 'campaign' | 'message' | 'review' | 'business';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export type NotificationKind =
  | 'verification'
  | 'business'
  | 'campaign'
  | 'application'
  | 'assignment'
  | 'workspace'
  | 'growthproof'
  | 'result'
  | 'skillcheck'
  | 'message'
  | 'squad'
  | 'report'
  | 'system';

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  live: boolean;
  zones: string[];
  faculties: string[];
}

export interface UserStats {
  acceptedCampaigns: number;
  lateDeliveries: number;
  onTimeCampaigns: number;
  totalApplications: number;
}

export interface User {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  displayName?: string;
  username: string;
  email: string;
  phone: string;
  /** Demo-grade salted hash — never store real passwords client-side. */
  passwordHash: string;
  campusId: string;
  faculty?: string;
  department?: string;
  level?: string;
  bio?: string;
  skills: string[]; // up to 5, from SKILLS list
  photo: string;
  verificationStatus: VerificationStatus;
  matricNo?: string; // never public
  showDepartment: boolean;
  warnCount: number;
  suspended?: boolean;
  stats: UserStats;
  ratingSummary?: { avg: number; count: number };
  createdAt: number;
  ambassadorId?: string;
  portfolio: PortfolioExample[];
}

export interface PortfolioExample {
  id: string;
  title: string;
  description: string;
  link?: string;
  file?: string;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  campusId: string;
  matricNo: string;
  idDocumentName: string;
  selfieName: string;
  /** Evidence is name+metadata only in the demo; real uploads live server-side. */
  idDocMeta?: { name: string; size?: number; type?: string };
  selfieMeta?: { name: string; size?: number; type?: string };
  submittedAt: number;
  decidedBy?: string;
  decidedAt?: number;
  note?: string;
  /** Increments on every resubmission so admins see repeat attempts. */
  attempt: number;
}

/** A verified student vendor's business profile. Approving it grants the right to post Campaigns. */
export interface StudentBusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  category: string; // e.g. Fashion & merch, Food & drinks, Beauty, Events, Design studio, Tech accessories…
  /** Gradient preset key (g1–g8) used as the business's cover visual. */
  cover?: string;
  bio?: string;
  services: string[]; // what the business sells / offers
  /** Optional sample link or evidence (menu, catalogue, Instagram) admins check. */
  evidenceNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  note?: string;
  createdAt: number;
}

export interface Campaign {
  id: string;
  ownerUserId: string; // the vendor (user) who owns this campaign
  businessProfileId?: string; // their StudentBusinessProfile
  title: string;
  campaignType: CampaignType;
  rewardType: RewardType;
  /** ₦ per confirmed result (per_result) or flat fee (fixed_task). */
  rewardAmount: number;
  rewardDescription?: string;
  /** Required for result campaigns: number of results the vendor is targeting. */
  targetResults?: number;
  /** Optional promoter slot cap — new vendors are auto-capped to 10 until they prove 3 completed outcomes. */
  maxPromoters?: number;
  /** Count of vendor-confirmed results (denormalised for fast display). */
  confirmedResults: number;
  /** Public code promoters can use to find/join the campaign. */
  campaignCode: string;
  /** Gradient preset key (g1–g8) for the cover visual; falls back to a per-type preset. */
  cover?: string;
  brief: string; // min 80 chars
  desiredOutcome?: string;
  deliverables?: string[]; // task campaigns only
  deadline: number;
  effort?: Effort;
  payment: PaymentArrangement;
  budgetRange?: string;
  skills: string[]; // up to 5
  squadEligible: SquadEligibility;
  zone: string;
  checklist?: string[]; // light acceptance items, task campaigns only
  status: CampaignStatus;
  applicantsCount: number;
  resultProofs: ResultProofEntry[]; // result campaigns only
  snapshot?: CampaignSnapshot; // immutable after assignment (task campaigns)
  changeRequests: ChangeRequest[];
  createdAt: number;
  reviewNote?: string; // admin rejection reason
}

export interface ResultProofEntry {
  id: string;
  promoterId: string; // joined promoter who brought the result
  /** What the promoter is claiming — e.g. "Sold 2 Faculty Week tees" or "Signed up 3 leads". */
  description: string;
  /** Optional non-PII reference the vendor can verify against (order id, receipt no., WhatsApp msg). */
  customerRef?: string;
  /** Optional order value the vendor can sanity-check the reward against. */
  amount?: number;
  attachment?: string;
  status: ResultStatus;
  createdAt: number;
  decidedBy?: string;
  decidedAt?: number;
  note?: string; // rejection / dispute reason from the vendor or admin
  growthproofId?: string; // set when confirmed
  /** Promoter marks that the vendor paid them (direct, outside the app) after confirmation. */
  paymentMarkedAt?: number;
}

export interface CampaignSnapshot {
  title: string;
  brief: string;
  desiredOutcome: string;
  deliverables: string[];
  deadline: number;
  checklist: string[];
  capturedAt: number;
}

export interface ChangeRequest {
  id: string;
  by: 'owner' | 'contributor';
  text: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  decidedBy?: string;
  decidedAt?: number;
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  applicantId: string; // individual, squad lead or joined promoter
  squadId?: string;
  message: string;
  availability: string;
  growthproofRefs: string[]; // growthproof entry ids
  portfolioLinks: string[];
  status: ApplicationStatus;
  /** Unique per (campaign, promoter) — generated on joining a result campaign. */
  referralCode?: string;
  createdAt: number;
}

export interface CampaignAssignment {
  id: string;
  campaignId: string;
  contributorIds: string[]; // all individual contributors (squad members or single)
  squadId?: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'revision_requested' | 'accepted';
  deadline: number; // may differ from campaign if revised via change request
  submittedAt?: number;
  /** Who has confirmed the outside-platform payment arrangement. */
  paymentArrangedBy: string[];
  paymentArrangedAt?: number; // set only after BOTH sides confirm
  createdAt: number;
}

export interface CampaignDeliverable {
  id: string;
  assignmentId: string;
  uploaderId: string;
  title: string;
  link?: string;
  file?: string;
  note?: string;
  createdAt: number;
}

export interface GrowthProofEntry {
  id: string;
  userId: string; // the promoter/contributor this entry belongs to
  campaignId: string;
  role: string; // individual's role ("Sales promoter", "Content designer"…)
  campaignType: CampaignType;
  skills: string[];
  acceptedAt: number;
  rating: number;
  onTime: boolean;
  feedback: string;
  businessName: string;
  campaignTitle: string;
  visibility: GrowthProofVisibility;
  verified: boolean;
  artifact?: string; // optional verified artifact name (e.g. deliverable link)
  corrected?: { by: string; note: string; at: number };
}

export interface SkillCheck {
  id: string;
  userId: string;
  track: SkillCheckTrack;
  submissionName: string;
  notes?: string;
  /** Reviewer scoring per the track rubric. */
  rubricScore?: { label: string; score: number; max: number }[];
  status: SkillCheckStatus;
  submittedAt: number;
  reviewerId?: string;
  reviewedAt?: number;
  feedback?: string;
  /** Attempt counter so resubmissions are visible to reviewers. */
  attempt?: number;
}

export interface Squad {
  id: string;
  name: string;
  leadId: string;
  campusId: string;
  image?: string;
  createdAt: number;
}

export interface SquadMember {
  squadId: string;
  userId: string;
  role: string; // Squad Lead, Designer, Writer, Photographer…
  status: 'invited' | 'accepted';
}

export interface Review {
  id: string;
  targetId: string; // user being reviewed
  authorId: string; // campaign owner (for contributor review) or contributor
  growthproofId?: string;
  campaignId: string;
  rating: number;
  reason: ReviewReason;
  text?: string;
  hidden: boolean;
  createdAt: number;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: number;
  resolvedBy?: string;
  resolvedAt?: number;
  resolution?: string;
  linkedCampaignId?: string;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  campaignId?: string;
  /** Both participants can independently block; empty means nobody has. */
  blockedBy: string[];
  lastMessageAt: number;
  fileSharingOpen: boolean; // true after assignment/shortlist
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  kind: 'text' | 'file' | 'image' | 'link';
  text: string;
  attachmentName?: string;
  attachmentMeta?: { name: string; size?: number; type?: string };
  createdAt: number;
  readBy: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  createdAt: number;
  read: boolean;
}

export interface Ambassador {
  id: string;
  userId: string;
  campusId: string;
  vendorsRecruited: number;
  promotersRecruited: number;
  approvedReferrals: number;
  completedCampaigns: number;
  retained30Days: number;
  rewardStatus: 'pending' | 'qualified' | 'paid';
  rewardEarned: number;
  monthlyTarget: number;
}

export interface AmbassadorReferral {
  id: string;
  ambassadorId: string;
  referredUserId: string;
  verified: boolean;
  completedCampaign: boolean;
  retained30Days: boolean;
  earned: number;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
  createdAt: number;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  props?: Record<string, string | number | boolean>;
  userId?: string;
  createdAt: number;
}

export interface AppState {
  version: number;
  sessionUserId: string | null;
  analytics: AnalyticsEvent[];
  campuses: Campus[];
  users: User[];
  verifications: VerificationRecord[];
  businesses: StudentBusinessProfile[];
  campaigns: Campaign[];
  applications: CampaignApplication[];
  assignments: CampaignAssignment[];
  deliverables: CampaignDeliverable[];
  growthproof: GrowthProofEntry[];
  skillChecks: SkillCheck[];
  squads: Squad[];
  squadMembers: SquadMember[];
  reviews: Review[];
  reports: Report[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
  ambassadors: Ambassador[];
  ambassadorReferrals: AmbassadorReferral[];
  auditLog: AuditLogEntry[];
  onboardingStep: 'splash' | 'explain' | 'campus' | 'signup' | 'verify' | 'skills';
  onboardingCampusId?: string;
}