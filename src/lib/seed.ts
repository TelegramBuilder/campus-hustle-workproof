import type { AppState, User, Campaign, GrowthProofEntry, CampaignApplication, Conversation, Message, SkillCheck, CampaignAssignment, StudentBusinessProfile, ResultProofEntry } from './types';

const NOW = Date.now();
const MIN = 60000;
const HOUR = 3600000;
const DAY = 86400000;
const ago = (ms: number) => NOW - ms;
const inDays = (d: number) => NOW + d * DAY;

/** Demo-grade salted hash (FNV-1a based, deterministic).
 *  Never use this for real credentials — a server-side KDF (bcrypt/argon2) is mandatory. */
export function hashPassword(username: string, password: string): string {
  const s = `wp1::${username.toLowerCase().trim()}::${password}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 = (h1 ^ s.charCodeAt(i)) >>> 0;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = (h2 ^ (s.charCodeAt(i) + 31)) >>> 0;
    h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  return 'v1$' + h1.toString(16) + h2.toString(16);
}

function user(u: Partial<User> & Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'verificationStatus' | 'photo'>): User {
  return {
    role: 'student',
    email: `${u.username}@student.unilag.edu.ng`,
    phone: '08012345678',
    passwordHash: hashPassword(u.username ?? 'user', 'password123'),
    campusId: 'c_unilag',
    skills: [],
    showDepartment: false,
    warnCount: 0,
    portfolio: [],
    stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 },
    createdAt: ago(120 * DAY),
    ...u,
  };
}

function campaign(m: Partial<Campaign> & Pick<Campaign, 'id' | 'ownerUserId' | 'title' | 'campaignType' | 'rewardType' | 'rewardAmount' | 'brief' | 'deadline'>): Campaign {
  return {
    businessProfileId: undefined,
    targetResults: undefined,
    confirmedResults: 0,
    campaignCode: `CH-${m.id.slice(2, 6).toUpperCase()}${String(m.id.length).slice(0, 1)}`,
    payment: 'paid_outside',
    skills: [],
    squadEligible: 'individual',
    zone: 'Main Gate',
    status: 'open',
    applicantsCount: 0,
    resultProofs: [],
    changeRequests: [],
    createdAt: ago(10 * DAY),
    ...m,
  };
}

function wp(w: Partial<GrowthProofEntry> & Pick<GrowthProofEntry, 'id' | 'userId' | 'campaignId' | 'campaignTitle' | 'role' | 'campaignType' | 'skills' | 'businessName' | 'acceptedAt'>): GrowthProofEntry {
  return {
    rating: 5,
    onTime: true,
    feedback: 'Confirmed result — great work.',
    visibility: 'campus',
    verified: true,
    ...w,
  };
}

function app(a: Partial<CampaignApplication> & Pick<CampaignApplication, 'id' | 'campaignId' | 'applicantId' | 'message'>): CampaignApplication {
  return {
    availability: 'Flexible',
    growthproofRefs: [],
    portfolioLinks: [],
    status: 'pending',
    createdAt: ago(2 * DAY),
    ...a,
  };
}

function conv(c: Partial<Conversation> & Pick<Conversation, 'id' | 'participantIds'>): Conversation {
  return { lastMessageAt: ago(1 * DAY), fileSharingOpen: false, blockedBy: [], ...c };
}

function msg(m: Partial<Message> & Pick<Message, 'id' | 'conversationId' | 'senderId' | 'text'>): Message {
  return { kind: 'text', createdAt: ago(1 * DAY), readBy: [], ...m };
}

function proof(p: Partial<ResultProofEntry> & Pick<ResultProofEntry, 'id' | 'promoterId' | 'description' | 'status' | 'createdAt'>): ResultProofEntry {
  return { decidedAt: undefined, decidedBy: undefined, ...p };
}

export function buildSeed(): AppState {
  const unilag = {
    id: 'c_unilag',
    name: 'University of Lagos',
    shortName: 'UNILAG',
    city: 'Akoka, Lagos',
    country: 'Nigeria',
    live: true,
    zones: ['Main Gate', 'Library', 'Jaja Hall', 'Moremi Hall', 'New Hall', 'Fagunwa Hall', 'Faculty of Science', 'Faculty of Engineering', 'Faculty of Social Sciences', 'Faculty of Law', 'Faculty of Management Sciences', 'Sports Centre', 'Afri-Hall'],
    faculties: ['Faculty of Science', 'Faculty of Engineering', 'Faculty of Law', 'Faculty of Social Sciences', 'Faculty of Management Sciences', 'Faculty of Arts', 'Faculty of Education', 'College of Medicine', 'Faculty of Environmental Sciences', 'Other'],
  };

  const users: User[] = [
    user({ id: 'u_super', firstName: 'Amina', lastName: 'Bello', username: 'super', role: 'superadmin', verificationStatus: 'verified', photo: 'g5', email: 'amina.bello@campushustle.io', bio: 'Super admin — building proof of work for African students.' }),
    user({ id: 'u_admin', firstName: 'Kunle', lastName: 'Adeyemi', username: 'admin', role: 'admin', verificationStatus: 'verified', photo: 'g3', email: 'kunle.adeyemi@unilag.edu.ng', bio: 'Campus admin, UNILAG. Verifies students, approves student businesses and moderates Campaigns.', stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 } }),
    user({ id: 'u_chuka', firstName: 'Chuka', lastName: 'Okafor', username: 'chuka', role: 'ambassador', verificationStatus: 'verified', photo: 'g2', ambassadorId: 'amb_1', faculty: 'Faculty of Management Sciences', department: 'Business Administration', level: '400', showDepartment: true, bio: 'Campus ambassador — recruiting student vendors and quality promoters who stick.' }),
    user({ id: 'u_bola', firstName: 'Bola', lastName: 'Fashola', username: 'bola', role: 'ambassador', verificationStatus: 'verified', photo: 'g4', ambassadorId: 'amb_2', faculty: 'Faculty of Social Sciences', department: 'Mass Communication', level: '300', showDepartment: true }),
    /* The demo student — 2 GrowthProof entries, close to Proven Contributor */
    user({ id: 'u_salawu', firstName: 'Salawu', lastName: 'Oladipo', username: 'salawu', displayName: 'Salawu', verificationStatus: 'verified', photo: 'g1', faculty: 'Faculty of Social Sciences', department: 'Mass Communication', level: '300', showDepartment: true, matricNo: '220403012', bio: 'Designer and campus promoter. Brand kits for student businesses and events, and I sell tickets and leads I actually believe in.', skills: ['Graphic design', 'Social media', 'Content writing', 'Sales & referrals'], stats: { acceptedCampaigns: 2, lateDeliveries: 0, onTimeCampaigns: 2, totalApplications: 6 }, portfolio: [
      { id: 'pf_1', title: 'Inter-Hall Debate poster series', description: 'Poster + 6 social posts that filled the hall for the finals.', file: 'debate_poster_series.zip' },
      { id: 'pf_2', title: 'Faculty Week teaser kit', description: 'Carousel templates the committee reused all week.', link: 'behance.net/salawu/facweek' },
    ], createdAt: ago(200 * DAY) }),
    /* Product photographer — referenced in the activity feed */
    user({ id: 'u_aisha', firstName: 'Aisha', lastName: 'Mohammed', username: 'aisha', displayName: 'Aisha', verificationStatus: 'verified', photo: 'g7', faculty: 'College of Medicine', department: 'Physiotherapy', level: '400', bio: 'Product and event photographer — clean catalogue shots for student businesses, edited in 5 days.', skills: ['Photography', 'Videography', 'Social media'], stats: { acceptedCampaigns: 1, lateDeliveries: 0, onTimeCampaigns: 1, totalApplications: 3 }, createdAt: ago(180 * DAY) }),
    /* Student vendors */
    user({ id: 'u_funmilayo', firstName: 'Funmilayo', lastName: 'Bakare', username: 'funmilayo', displayName: 'Funmilayo', verificationStatus: 'verified', photo: 'g4', faculty: 'Faculty of Management Sciences', department: 'Accounting', level: '300', bio: 'Runs Funmi’s Fashion Corner — custom-print tees and campus merch. Posts referral Campaigns and hires creators.', skills: ['Social media', 'Sales & referrals', 'Event support'], stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 }, createdAt: ago(140 * DAY) }),
    user({ id: 'u_damilola', firstName: 'Damilola', lastName: 'Adewale', username: 'damilola', displayName: 'Damilola', verificationStatus: 'verified', photo: 'g5', faculty: 'Faculty of Law', department: 'Law', level: '400', bio: 'Runs Dami’s Design Studio — brand kits, posters and social kits for student businesses and campus events.', skills: ['Graphic design', 'Content writing', 'Event support'], stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 }, createdAt: ago(150 * DAY) }),
    user({ id: 'u_segun', firstName: 'Segun', lastName: 'Taiwo', username: 'segun', displayName: 'Segun', verificationStatus: 'verified', photo: 'g6', faculty: 'Faculty of Environmental Sciences', department: 'Architecture', level: '400', bio: 'Runs New Hall Events Co — open mics, game nights and hall-week experiences with tickets sold by student promoters.', skills: ['Event support', 'Sales & referrals'], stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 }, createdAt: ago(130 * DAY) }),
    user({ id: 'u_kunbi', firstName: 'Kunbi', lastName: 'Ojo', username: 'kunbi', displayName: 'Kunbi', verificationStatus: 'verified', photo: 'g8', faculty: 'Faculty of Science', department: 'Mathematics', level: '500', bio: 'Runs Kunbi’s Study Kits — revision packs, past-question compilations and stationery bundles.', skills: ['Tutoring', 'Study support'], stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 }, createdAt: ago(120 * DAY) }),
    user({ id: 'u_taiwo', firstName: 'Taiwo', lastName: 'Akinwunmi', username: 'taiwo', displayName: 'Taiwo', verificationStatus: 'verified', photo: 'g3', faculty: 'Faculty of Arts', department: 'English Language', level: '300', bio: 'Starting a proofreading and writing-formatting service.', skills: ['Content writing'], stats: { acceptedCampaigns: 0, lateDeliveries: 0, onTimeCampaigns: 0, totalApplications: 0 }, createdAt: ago(90 * DAY) }),
    /* Contributors and promoters */
    user({ id: 'u_ngozi', firstName: 'Ngozi', lastName: 'Okonkwo', username: 'ngozi', displayName: 'Ngozi', verificationStatus: 'verified', photo: 'g2', faculty: 'Faculty of Arts', department: 'English Language', level: '300', bio: 'Content writer — scripts, captions, speech drafts.', skills: ['Content writing', 'Social media'], stats: { acceptedCampaigns: 4, lateDeliveries: 0, onTimeCampaigns: 4, totalApplications: 9 }, createdAt: ago(170 * DAY) }),
    user({ id: 'u_tunde', firstName: 'Tunde', lastName: 'Bakare', username: 'tunde', displayName: 'Tunde', verificationStatus: 'verified', photo: 'g3', faculty: 'Faculty of Science', department: 'Mathematics', level: '500', bio: 'Research support — survey design and field interviews on campus.', skills: ['Excel / data support', 'Study support'], stats: { acceptedCampaigns: 1, lateDeliveries: 1, onTimeCampaigns: 0, totalApplications: 5 }, createdAt: ago(160 * DAY) }),
    user({ id: 'u_funke', firstName: 'Funke', lastName: 'Lawal', username: 'funke', displayName: 'Funke', verificationStatus: 'verified', photo: 'g8', faculty: 'Faculty of Arts', department: 'English Language', level: '400', bio: 'Promoter for student businesses — leads and ticket sales with receipts.', skills: ['Sales & referrals', 'Content writing'], stats: { acceptedCampaigns: 1, lateDeliveries: 0, onTimeCampaigns: 1, totalApplications: 4 }, createdAt: ago(140 * DAY) }),
    user({ id: 'u_seyi', firstName: 'Seyi', lastName: 'Akin', username: 'seyi', displayName: 'Seyi', verificationStatus: 'verified', photo: 'g2', faculty: 'Faculty of Environmental Sciences', department: 'Fine & Applied Arts', level: '400', bio: 'Squad Lead — Seyi & Co Media. Product films, event recaps.', skills: ['Photography', 'Videography', 'Event support'], stats: { acceptedCampaigns: 3, lateDeliveries: 0, onTimeCampaigns: 3, totalApplications: 8 }, createdAt: ago(160 * DAY) }),
    user({ id: 'u_ruth', firstName: 'Ruth', lastName: 'Ibekwe', username: 'ruth', displayName: 'Ruth', verificationStatus: 'verified', photo: 'g1', faculty: 'Faculty of Environmental Sciences', department: 'Architecture', level: '300', bio: 'Social media support in Seyi & Co Media.', skills: ['Social media', 'Graphic design'], stats: { acceptedCampaigns: 2, lateDeliveries: 0, onTimeCampaigns: 2, totalApplications: 5 }, createdAt: ago(150 * DAY) }),
    user({ id: 'u_emeka', firstName: 'Emeka', lastName: 'Nwosu', username: 'emeka', displayName: 'Emeka', verificationStatus: 'verified', photo: 'g5', faculty: 'Faculty of Engineering', department: 'Electrical & Electronics Engineering', level: '400', bio: 'Videographer and editor.', skills: ['Videography', 'Photography'], stats: { acceptedCampaigns: 3, lateDeliveries: 0, onTimeCampaigns: 3, totalApplications: 7 }, createdAt: ago(140 * DAY) }),
    user({ id: 'u_kemi', firstName: 'Kemi', lastName: 'Ade', username: 'kemi', displayName: 'Kemi', verificationStatus: 'verified', photo: 'g4', faculty: 'Faculty of Social Sciences', department: 'Mass Communication', level: '300', bio: 'MC, host and promo-stall lead. Hall weeks, society nights.', skills: ['MC / hosting', 'Event support', 'Social media'], stats: { acceptedCampaigns: 1, lateDeliveries: 0, onTimeCampaigns: 1, totalApplications: 3 }, createdAt: ago(130 * DAY) }),
    user({ id: 'u_yomi', firstName: 'Yomi', lastName: 'Alabi', username: 'yomi', displayName: 'Yomi', verificationStatus: 'verified', photo: 'g6', faculty: 'Faculty of Social Sciences', department: 'Geography', level: '300', bio: '', skills: ['Sales & referrals', 'Printing / formatting'], stats: { acceptedCampaigns: 1, lateDeliveries: 0, onTimeCampaigns: 1, totalApplications: 2 }, createdAt: ago(100 * DAY) }),
    /* Verification queue */
    user({ id: 'u_tobi', firstName: 'Tobi', lastName: 'Afolabi', username: 'tobi', verificationStatus: 'pending', photo: 'g4', faculty: 'Faculty of Science', department: 'Computer Science', level: '200', createdAt: ago(4 * DAY) }),
    user({ id: 'u_simi', firstName: 'Simi', lastName: 'George', username: 'simi', verificationStatus: 'pending', photo: 'g7', faculty: 'Faculty of Social Sciences', department: 'Economics', level: '100', createdAt: ago(3 * DAY) }),
    user({ id: 'u_gbenga', firstName: 'Gbenga', lastName: 'Adepoju', username: 'gbenga', verificationStatus: 'pending', photo: 'g3', faculty: 'Faculty of Engineering', department: 'Mechanical Engineering', level: '100', createdAt: ago(2 * DAY) }),
    user({ id: 'u_femi', firstName: 'Femi', lastName: 'Adewale', username: 'femi', verificationStatus: 'unverified', photo: 'g8', faculty: 'Faculty of Management Sciences', department: 'Business Administration', level: '200', createdAt: ago(1 * DAY) }),
  ];

  const businesses: StudentBusinessProfile[] = [
    { id: 'biz_funmi', userId: 'u_funmilayo', businessName: 'Funmi’s Fashion Corner', category: 'Fashion & merch', cover: 'g3', bio: 'Custom-print tees, hoodies and campus merch delivered around UNILAG. I pay verified promoters per confirmed sale or lead.', services: ['Custom-print tees', 'Hoodies & sweatshirts', 'Campus merch bundles'], evidenceNote: 'Instagram @funmisfashion — 400+ followers, 90+ confirmed orders.', status: 'approved', createdAt: ago(75 * DAY) },
    { id: 'biz_dami', userId: 'u_damilola', businessName: 'Dami’s Design Studio', category: 'Design & creative studio', cover: 'g7', bio: 'Brand kits, posters and social content for student businesses and campus events.', services: ['Brand kits', 'Poster + social sets', 'Event key visuals'], evidenceNote: 'Portfolio on Behance + 12 client groups served.', status: 'approved', createdAt: ago(80 * DAY) },
    { id: 'biz_segun', userId: 'u_segun', businessName: 'New Hall Events Co', category: 'Events & entertainment', cover: 'g2', bio: 'Open mics, game nights and hall-week experiences. Tickets sold by student promoters with a code on every purchase.', services: ['Open mic nights', 'Game nights', 'Hall-week experiences'], evidenceNote: 'Ran 3 paid events last semester with full halls.', status: 'approved', createdAt: ago(70 * DAY) },
    { id: 'biz_kunbi', userId: 'u_kunbi', businessName: 'Kunbi’s Study Kits', category: 'Books & study materials', cover: 'g8', bio: 'Revision packs, past-question compilations and stationery bundles for science courses.', services: ['Revision packs', 'Past-question compilations', 'Stationery bundles'], evidenceNote: 'Sales ledger from two revision cohorts.', status: 'approved', createdAt: ago(60 * DAY) },
    { id: 'biz_taiwo', userId: 'u_taiwo', businessName: 'Taiwo’s Proofing Desk', category: 'Campus services', cover: 'g6', bio: 'Proofreading and document formatting for projects, reports and proposals.', services: ['Proofreading', 'Document formatting', 'CV reviews'], evidenceNote: 'Two sample reports attached.', status: 'pending', createdAt: ago(2 * DAY) },
  ];

  const campaigns: Campaign[] = [
    /* --- past campaigns that produced GrowthProof entries --- */
    campaign({
      id: 'm_done_1', ownerUserId: 'u_damilola', businessProfileId: 'biz_dami',
      title: 'Brand kit for the Inter-Hall Debate Finals',
      campaignType: 'content_task', rewardType: 'fixed_task', rewardAmount: 15000, rewardDescription: 'Flat ₦15,000 for the full kit — hero graphic, 6 posts and editable sources.',
      brief: 'The Debate exec hired my studio to build a launch kit for the Inter-Hall Finals: one hero graphic and six social posts announcing the matchup across all faculties. Needs to work on notice boards and as WhatsApp/Instagram posts.',
      desiredOutcome: 'A kit the client can post as-is — packed hall on finals night.',
      deliverables: ['1 hero graphic (1080×1350)', '6 announcement posts', 'Editable source files'],
      deadline: ago(60 * DAY), effort: 'small', payment: 'paid_outside', budgetRange: '₦12,000 – ₦15,000',
      skills: ['Graphic design', 'Social media'], squadEligible: 'individual', zone: 'Faculty of Law',
      status: 'growthproof_issued', applicantsCount: 4, createdAt: ago(75 * DAY),
      snapshot: { title: 'Brand kit for the Inter-Hall Debate Finals', brief: 'The Debate exec hired my studio to build a launch kit for the Inter-Hall Finals: one hero graphic and six social posts announcing the matchup across all faculties. Needs to work on notice boards and as WhatsApp/Instagram posts.', desiredOutcome: 'A kit the client can post as-is — packed hall on finals night.', deliverables: ['1 hero graphic (1080×1350)', '6 announcement posts', 'Editable source files'], deadline: ago(60 * DAY), checklist: ['Hero graphic delivered', 'Posts match brand colours', 'Venue and time correct', 'Client approves'], capturedAt: ago(62 * DAY) },
    }),
    campaign({
      id: 'm_done_2', ownerUserId: 'u_segun', businessProfileId: 'biz_segun',
      title: 'Tickets for the Faculty Week Culture Night',
      campaignType: 'ticket_sale', rewardType: 'per_result', rewardAmount: 500, rewardDescription: '₦500 per ticket sold through your referral code.',
      targetResults: 60, confirmedResults: 12,
      brief: 'Faculty Week Culture Night at the Main Auditorium — food village, live band and the talent finals. Promoters sell tickets with their referral code and I confirm each sale against the guest list at the door.',
      desiredOutcome: 'A full 60-seat culture night with every promoter’s sales confirmed the same evening.',
      deadline: ago(38 * DAY), payment: 'paid_outside',
      skills: ['Sales & referrals'], squadEligible: 'individual', zone: 'Faculty of Management Sciences',
      status: 'closed', applicantsCount: 5, createdAt: ago(55 * DAY),
      resultProofs: [
        proof({ id: 'rp_old_1', promoterId: 'u_salawu', description: 'Sold 12 tickets to my department (Economics 300) — batch receipt #FW23-014.', customerRef: 'FW23-014', amount: 6000, status: 'vendor_confirmed', createdAt: ago(40 * DAY), decidedBy: 'u_segun', decidedAt: ago(39 * DAY), note: 'Verified against guest list — 12 names in.' }),
      ],
    }),
    /* Aisha's past media task */
    campaign({
      id: 'm_media_past', ownerUserId: 'u_funmilayo', businessProfileId: 'biz_funmi',
      title: 'Product shoot for the Fashion Corner summer tee drop',
      campaignType: 'media_task', rewardType: 'fixed_task', rewardAmount: 20000, rewardDescription: 'Flat ₦20,000 — 15 edited product shots + 3 lifestyle shots.',
      brief: 'Shoot the new summer tee collection for Funmi’s Fashion Corner: 15 clean product shots on a neutral background plus 3 lifestyle shots worn around campus, delivered as an edited set in 5 days.',
      desiredOutcome: 'A catalogue I can post on Instagram and reuse for order forms all semester.',
      deliverables: ['15 edited product shots', '3 lifestyle shots', 'Drive link with final set'],
      deadline: ago(32 * DAY), effort: 'large', payment: 'paid_outside', budgetRange: '₦18,000 – ₦25,000',
      skills: ['Photography'], squadEligible: 'individual', zone: 'Sports Centre',
      status: 'growthproof_issued', applicantsCount: 2, createdAt: ago(45 * DAY),
      snapshot: { title: 'Product shoot for the Fashion Corner summer tee drop', brief: 'Shoot the new summer tee collection for Funmi’s Fashion Corner: 15 clean product shots on a neutral background plus 3 lifestyle shots worn around campus, delivered as an edited set in 5 days.', desiredOutcome: 'A catalogue I can post on Instagram and reuse for order forms all semester.', deliverables: ['15 edited product shots', '3 lifestyle shots', 'Drive link with final set'], deadline: ago(32 * DAY), checklist: ['15 product shots delivered', '3 lifestyle shots', 'Edits approved by vendor'], capturedAt: ago(35 * DAY) },
    }),
    /* Tunde's past research task */
    campaign({
      id: 'm_research_past', ownerUserId: 'u_kunbi', businessProfileId: 'biz_kunbi',
      title: 'Pricing survey for the MTH101 revision pack',
      campaignType: 'research_task', rewardType: 'fixed_task', rewardAmount: 8000, rewardDescription: 'Flat ₦8,000 for 40 interviews + written summary.',
      brief: 'Interview 40 science students about the MTH101 revision pack: what price feels fair, which topics they need most, and whether they would buy print or PDF. Deliver a one-page summary with quotes.',
      desiredOutcome: 'A price and format decision I can defend before printing the next batch.',
      deliverables: ['40 interview notes', 'One-page summary', 'Top-3 price point recommendation'],
      deadline: ago(21 * DAY), effort: 'medium', payment: 'volunteer',
      skills: ['Excel / data support', 'Study support'], squadEligible: 'individual', zone: 'Library',
      status: 'growthproof_issued', applicantsCount: 3, createdAt: ago(30 * DAY),
    }),
    /* Past squad media campaign */
    campaign({
      id: 'm_squad_past', ownerUserId: 'u_segun', businessProfileId: 'biz_segun',
      title: 'Open Mic recap film (3 minutes)',
      campaignType: 'media_task', rewardType: 'fixed_task', rewardAmount: 30000, rewardDescription: 'Split among the squad — ₦30,000 total.',
      brief: 'Produce a 3-minute recap film of the Hall Week Open Mic: stage highlights, crowd reaction and backstage. Squad covers two stages at once on different nights.',
      desiredOutcome: 'A shareable aftermovie New Hall Events posts on every channel.',
      deliverables: ['3-minute edited film', '30-second social cut', 'BTS photo set'],
      deadline: ago(26 * DAY), effort: 'large', payment: 'paid_outside', budgetRange: '₦28,000 – ₦35,000',
      skills: ['Videography', 'Photography', 'Social media'], squadEligible: 'squad', zone: 'New Hall',
      status: 'growthproof_issued', applicantsCount: 2, createdAt: ago(35 * DAY),
      snapshot: { title: 'Open Mic recap film (3 minutes)', brief: 'Produce a 3-minute recap film of the Hall Week Open Mic: stage highlights, crowd reaction and backstage. Squad covers two stages at once on different nights.', desiredOutcome: 'A shareable aftermovie New Hall Events posts on every channel.', deliverables: ['3-minute edited film', '30-second social cut', 'BTS photo set'], deadline: ago(26 * DAY), checklist: ['3-minute film delivered', 'Social cut delivered', 'BTS photos delivered'], capturedAt: ago(28 * DAY) },
    }),
    /* Kemi's past lead campaign */
    campaign({
      id: 'm_kemi_past', ownerUserId: 'u_damilola', businessProfileId: 'biz_dami',
      title: 'Client leads for the Design Studio',
      campaignType: 'lead', rewardType: 'per_result', rewardAmount: 400, rewardDescription: '₦400 per confirmed lead who asks for a quote.',
      targetResults: 15, confirmedResults: 6,
      brief: 'Bring me leads who need brand work: student businesses, hall week committees, society launches. A lead counts when the person asks for a quote and confirms your referral.',
      desiredOutcome: 'A steady pipeline of quote requests I can convert to paid kits.',
      deadline: ago(16 * DAY), payment: 'paid_outside',
      skills: ['Sales & referrals'], squadEligible: 'individual', zone: 'Faculty of Law',
      status: 'closed', applicantsCount: 4, createdAt: ago(28 * DAY),
      resultProofs: [
        proof({ id: 'rp_kemi_1', promoterId: 'u_kemi', description: 'Referred the Mass Comm Society president — she wants a logo + poster set quote.', customerRef: 'MC-SOC-01', status: 'vendor_confirmed', createdAt: ago(20 * DAY), decidedBy: 'u_damilola', decidedAt: ago(19 * DAY), note: 'Quote sent, logo confirmed.' }),
      ],
    }),

    /* --- live result campaigns --- */
    campaign({
      id: 'm_lead_1', ownerUserId: 'u_funmilayo', businessProfileId: 'biz_funmi',
      title: 'Leads for the Fashion Corner grand sale',
      campaignType: 'lead', rewardType: 'per_result', rewardAmount: 300, rewardDescription: '₦300 per lead who asks for the sale price list. Bonus ₦1,500 for the top promoter this week.',
      targetResults: 25, confirmedResults: 2,
      brief: 'The grand sale is on: everything 20–40% off for UNILAG students. Bring me leads — students who want the price list or want to place an order. I confirm each lead by chat, then your GrowthProof is issued the same day.',
      desiredOutcome: '25 warm leads that turn into orders across the two sale weeks.',
      deadline: inDays(5), payment: 'paid_outside',
      skills: ['Sales & referrals', 'Social media'], squadEligible: 'individual', zone: 'Faculty of Management Sciences',
      status: 'open', applicantsCount: 3, createdAt: ago(3 * DAY),
      resultProofs: [
        proof({ id: 'rp_1', promoterId: 'u_salawu', description: 'Adaeze from Accounting 200 asked for the price list — she wants 3 tees for her hall team.', customerRef: 'Chat: Funmi’s Fashion corner', status: 'submitted', createdAt: ago(5 * HOUR) }),
        proof({ id: 'rp_2', promoterId: 'u_funke', description: 'Referred my whole hostel floor — 6 people asked for the sale list for hoodies.', customerRef: 'Moremi A-floor group', status: 'vendor_confirmed', createdAt: ago(2 * DAY), decidedBy: 'u_funmilayo', decidedAt: ago(1 * DAY), note: 'Confirmed in the floor group — 6 names.', growthproofId: 'wp_funke_1' }),
        proof({ id: 'rp_3', promoterId: 'u_emeka', description: 'Claim: sold 2 tees to ENGR300 students.', customerRef: '', status: 'rejected', createdAt: ago(3 * DAY), decidedBy: 'u_funmilayo', decidedAt: ago(2 * DAY), note: 'No receipt or chat to verify — please resubmit with one.' }),
      ],
    }),
    campaign({
      id: 'm_tickets_1', ownerUserId: 'u_segun', businessProfileId: 'biz_segun',
      title: 'Tickets for the New Hall Open Mic night',
      campaignType: 'ticket_sale', rewardType: 'per_result', rewardAmount: 400, rewardDescription: '₦400 per ticket sold with your referral code.',
      targetResults: 40, confirmedResults: 0,
      brief: 'Open Mic night at New Hall — 12 acts, live band and a food village. Sell tickets through your referral code; I confirm each sale against the door list after the night.',
      desiredOutcome: 'A full hall and every promoter’s confirmed ticket count on their Passport.',
      deadline: inDays(7), payment: 'paid_outside', budgetRange: 'Early bird ₦1,500 · Door ₦2,000',
      skills: ['Sales & referrals'], squadEligible: 'individual', zone: 'New Hall',
      status: 'open', applicantsCount: 2, createdAt: ago(2 * DAY),
      resultProofs: [],
    }),

    /* --- live task campaigns --- */
    campaign({
      id: 'm_media_1', ownerUserId: 'u_funmilayo', businessProfileId: 'biz_funmi',
      title: 'Product photos for the hoodie restock',
      campaignType: 'media_task', rewardType: 'fixed_task', rewardAmount: 18000, rewardDescription: 'Flat ₦18,000 — 20 edited shots of the new hoodies.',
      brief: 'Photograph the new hoodie colours for the Fashion Corner restock: 20 clean product shots plus 2 lifestyle shots worn around campus. Same style as my summer tee shoot.',
      desiredOutcome: 'A restock catalogue ready for Instagram and order forms.',
      deliverables: ['20 edited product shots', '2 lifestyle shots', 'Drive link with final set'],
      deadline: inDays(3), effort: 'large', payment: 'paid_outside', budgetRange: '₦15,000 – ₦20,000',
      skills: ['Photography'], squadEligible: 'individual', zone: 'Sports Centre',
      status: 'in_progress', applicantsCount: 2, createdAt: ago(6 * DAY),
      snapshot: { title: 'Product photos for the hoodie restock', brief: 'Photograph the new hoodie colours for the Fashion Corner restock: 20 clean product shots plus 2 lifestyle shots worn around campus. Same style as my summer tee shoot.', desiredOutcome: 'A restock catalogue ready for Instagram and order forms.', deliverables: ['20 edited product shots', '2 lifestyle shots', 'Drive link with final set'], deadline: inDays(3), checklist: ['20 product shots delivered', '2 lifestyle shots', 'Style matches summer tee set'], capturedAt: ago(5 * DAY) },
    }),
    campaign({
      id: 'm_squad_1', ownerUserId: 'u_segun', businessProfileId: 'biz_segun',
      title: 'Sizzle reel for the game night series',
      campaignType: 'media_task', rewardType: 'fixed_task', rewardAmount: 35000, rewardDescription: 'Split across the squad — ₦35,000 total.',
      brief: 'Shoot a 60-second sizzle reel for the New Hall game night series: b-roll of the games, crowd reactions and winner moments. Squad covers two venues in one evening.',
      desiredOutcome: 'A punchy reel that sells the next game night.',
      deliverables: ['60-second sizzle reel', 'Raw b-roll archive', '3 vertical clips'],
      deadline: inDays(9), effort: 'large', payment: 'paid_outside', budgetRange: '₦30,000 – ₦40,000',
      skills: ['Videography', 'Photography', 'Social media'], squadEligible: 'squad', zone: 'New Hall',
      status: 'in_progress', applicantsCount: 2, createdAt: ago(8 * DAY),
      snapshot: { title: 'Sizzle reel for the game night series', brief: 'Shoot a 60-second sizzle reel for the New Hall game night series: b-roll of the games, crowd reactions and winner moments. Squad covers two venues in one evening.', desiredOutcome: 'A punchy reel that sells the next game night.', deliverables: ['60-second sizzle reel', 'Raw b-roll archive', '3 vertical clips'], deadline: inDays(9), checklist: ['60-second reel delivered', 'Archive shared', '3 vertical clips'], capturedAt: ago(7 * DAY) },
    }),
    campaign({
      id: 'm_newhall_1', ownerUserId: 'u_segun', businessProfileId: 'biz_segun',
      title: 'Promo stall for the Open Mic — 2 days',
      campaignType: 'promotion_task', rewardType: 'fixed_task', rewardAmount: 6000, rewardDescription: '₦6,000 per day for running the stall (2 days).',
      brief: 'Run the New Hall Events promo stall for two days before the Open Mic: hand out flyers, answer ticket questions, collect early-bird sign-ups with the referral codes on display.',
      desiredOutcome: 'Early-bird target of 60 tickets before the door opens.',
      deliverables: ['Stall run 2 days (report per day)', '60 flyers distributed', 'Early-bird sign-up log'],
      deadline: inDays(5), effort: 'medium', payment: 'paid_outside', budgetRange: '₦10,000 – ₦12,000',
      skills: ['Event support', 'Sales & referrals'], squadEligible: 'individual', zone: 'New Hall',
      status: 'shortlisting', applicantsCount: 3, createdAt: ago(5 * DAY),
    }),
    campaign({
      id: 'm_debate_1', ownerUserId: 'u_damilola', businessProfileId: 'biz_dami',
      title: 'Poster + social kit for the Finals rematch',
      campaignType: 'content_task', rewardType: 'fixed_task', rewardAmount: 12000, rewardDescription: 'Flat ₦12,000 for poster + 6 posts.',
      brief: 'The rematch between Jaja and Moremi halls is my studio’s biggest gig this month: one A3 poster and six social posts. Poster must work on notice boards and as a digital flyer.',
      desiredOutcome: 'A packed auditorium and a portfolio piece my studio reuses.',
      deliverables: ['1 A3 poster (print + PDF)', '6 social posts (4:5)', 'Hall matchup graphics'],
      deadline: inDays(4), effort: 'medium', payment: 'paid_outside', budgetRange: '₦10,000 – ₦14,000',
      skills: ['Graphic design', 'Social media'], squadEligible: 'both', zone: 'Faculty of Law',
      status: 'open', applicantsCount: 4, createdAt: ago(2 * DAY),
    }),
    campaign({
      id: 'm_research_1', ownerUserId: 'u_kunbi', businessProfileId: 'biz_kunbi',
      title: 'Which science courses need revision packs?',
      campaignType: 'research_task', rewardType: 'fixed_task', rewardAmount: 10000, rewardDescription: 'Flat ₦10,000 for 30 interviews + summary.',
      brief: 'Interview 30 science students across CHM, PHY and BIO departments: which courses are hardest, what they already buy, and what a revision pack is worth to them. Summarise with short quotes.',
      desiredOutcome: 'A course-by-course decision on what to print next.',
      deliverables: ['30 interview notes', 'Course ranking summary', 'Pricing recommendation'],
      deadline: inDays(10), effort: 'medium', payment: 'volunteer',
      skills: ['Excel / data support', 'Study support'], squadEligible: 'individual', zone: 'Library',
      status: 'open', applicantsCount: 1, createdAt: ago(4 * DAY),
    }),
    /* Pending review for the admin queue */
    campaign({
      id: 'm_design_1', ownerUserId: 'u_taiwo', businessProfileId: 'biz_taiwo',
      title: 'Proofreading flyer for Taiwo’s Proofing Desk',
      campaignType: 'promotion_task', rewardType: 'fixed_task', rewardAmount: 5000, rewardDescription: 'Flat ₦5,000 — design + print 100 flyers.',
      brief: 'Design and print 100 flyers for my new proofreading service: clean layout, QR code to a sample edit request form, and A4 + half-A4 versions for notice boards.',
      desiredOutcome: 'Enough sign-ups to fill my first two weeks.',
      deliverables: ['A4 + half-A4 print files', '100 flyers printed'],
      deadline: inDays(12), effort: 'small', payment: 'volunteer',
      skills: ['Graphic design', 'Printing / formatting'], squadEligible: 'individual', zone: 'Faculty of Arts',
      status: 'pending_review', applicantsCount: 0, createdAt: ago(1 * DAY),
    }),
  ];

  /* GrowthProof entries */
  const growthproof: GrowthProofEntry[] = [
    wp({ id: 'wp_1', userId: 'u_salawu', campaignId: 'm_done_1', campaignTitle: 'Brand kit for the Inter-Hall Debate Finals', role: 'Designer', campaignType: 'content_task', skills: ['Graphic design', 'Social media'], businessName: 'Dami’s Design Studio', acceptedAt: ago(58 * DAY), rating: 5, onTime: true, feedback: 'Salawu turned the brief around in three days — the trials announcement post alone got 1,200+ views.', visibility: 'public' }),
    wp({ id: 'wp_2', userId: 'u_salawu', campaignId: 'm_done_2', campaignTitle: 'Tickets for the Faculty Week Culture Night', role: 'Ticket promoter', campaignType: 'ticket_sale', skills: ['Sales & referrals'], businessName: 'New Hall Events Co', acceptedAt: ago(39 * DAY), rating: 5, onTime: true, feedback: '12 tickets confirmed against the door list, all in one batch. Salawu is the promoter other vendors ask about.', visibility: 'public' }),
    wp({ id: 'wp_3', userId: 'u_aisha', campaignId: 'm_media_past', campaignTitle: 'Product shoot for the Fashion Corner summer tee drop', role: 'Product photographer', campaignType: 'media_task', skills: ['Photography'], businessName: 'Funmi’s Fashion Corner', acceptedAt: ago(30 * DAY), rating: 5, onTime: true, feedback: '18 clean shots, delivered a day early, zero chasing. The catalogue posts doubled order enquiries.', visibility: 'campus' }),
    wp({ id: 'wp_4', userId: 'u_ngozi', campaignId: 'm_done_1', campaignTitle: 'Brand kit for the Inter-Hall Debate Finals', role: 'Writer', campaignType: 'content_task', skills: ['Content writing'], businessName: 'Dami’s Design Studio', acceptedAt: ago(58 * DAY), rating: 5, onTime: true, feedback: 'Copy was sharp and on-voice for the client.', visibility: 'campus' }),
    wp({ id: 'wp_5', userId: 'u_tunde', campaignId: 'm_research_past', campaignTitle: 'Pricing survey for the MTH101 revision pack', role: 'Research support', campaignType: 'research_task', skills: ['Excel / data support', 'Study support'], businessName: 'Kunbi’s Study Kits', acceptedAt: ago(20 * DAY), rating: 4, onTime: false, feedback: 'Solid interviews and honest quotes — summary landed one day late.', visibility: 'campus' }),
    wp({ id: 'wp_6', userId: 'u_seyi', campaignId: 'm_squad_past', campaignTitle: 'Open Mic recap film (3 minutes)', role: 'Squad Lead · Videographer', campaignType: 'media_task', skills: ['Videography', 'Event support'], businessName: 'New Hall Events Co', acceptedAt: ago(25 * DAY), rating: 5, onTime: true, feedback: 'Squad covered two stages at once without missing a beat.', visibility: 'campus' }),
    wp({ id: 'wp_7', userId: 'u_ruth', campaignId: 'm_squad_past', campaignTitle: 'Open Mic recap film (3 minutes)', role: 'Social media support', campaignType: 'media_task', skills: ['Social media'], businessName: 'New Hall Events Co', acceptedAt: ago(25 * DAY), rating: 5, onTime: true, feedback: 'Posted live updates through the whole night.', visibility: 'campus' }),
    wp({ id: 'wp_8', userId: 'u_emeka', campaignId: 'm_squad_past', campaignTitle: 'Open Mic recap film (3 minutes)', role: 'Videographer', campaignType: 'media_task', skills: ['Videography'], businessName: 'New Hall Events Co', acceptedAt: ago(25 * DAY), rating: 5, onTime: true, feedback: 'Footage cut together beautifully.', visibility: 'campus' }),
    wp({ id: 'wp_9', userId: 'u_kemi', campaignId: 'm_kemi_past', campaignTitle: 'Client leads for the Design Studio', role: 'Lead promoter', campaignType: 'lead', skills: ['Sales & referrals'], businessName: 'Dami’s Design Studio', acceptedAt: ago(15 * DAY), rating: 5, onTime: true, feedback: 'Referred the Mass Comm Society president — closed a logo + poster kit from one lead.', visibility: 'campus' }),
    wp({ id: 'wp_funke_1', userId: 'u_funke', campaignId: 'm_lead_1', campaignTitle: 'Leads for the Fashion Corner grand sale', role: 'Lead promoter', campaignType: 'lead', skills: ['Sales & referrals'], businessName: 'Funmi’s Fashion Corner', acceptedAt: ago(1 * DAY), rating: 5, onTime: true, feedback: 'Six leads from one hostel floor group — confirmed in the chat.', visibility: 'campus' }),
    wp({ id: 'wp_yomi_1', userId: 'u_yomi', campaignId: 'm_tickets_1', campaignTitle: 'Tickets for the New Hall Open Mic night', role: 'Ticket promoter', campaignType: 'ticket_sale', skills: ['Sales & referrals'], businessName: 'New Hall Events Co', acceptedAt: ago(4 * DAY), rating: 5, onTime: true, feedback: 'First 4 early-bird tickets sold within hours of joining.', visibility: 'campus' }),
  ];

  const applications: CampaignApplication[] = [
    /* joined promoters on live result campaigns */
    app({ id: 'ap_lead_salawu', campaignId: 'm_lead_1', applicantId: 'u_salawu', message: 'Joined as a promoter — I already have one lead in.', availability: 'Flexible', status: 'joined', referralCode: 'REF-8K2P', createdAt: ago(2 * DAY) }),
    app({ id: 'ap_lead_funke', campaignId: 'm_lead_1', applicantId: 'u_funke', message: 'Joined as a promoter.', availability: 'Flexible', status: 'joined', referralCode: 'REF-4Q7M', createdAt: ago(3 * DAY) }),
    app({ id: 'ap_lead_emeka', campaignId: 'm_lead_1', applicantId: 'u_emeka', message: 'Joined as a promoter.', availability: 'Flexible', status: 'joined', referralCode: 'REF-9T3N', createdAt: ago(3 * DAY) }),
    app({ id: 'ap_tix_yomi', campaignId: 'm_tickets_1', applicantId: 'u_yomi', message: 'Joined — selling to my hall.', availability: 'Evenings', status: 'joined', referralCode: 'REF-2V5B', createdAt: ago(5 * DAY) }),
    app({ id: 'ap_tix_kemi', campaignId: 'm_tickets_1', applicantId: 'u_kemi', message: 'Joined — I MC at New Hall so I know everyone coming.', availability: 'Flexible', status: 'joined', referralCode: 'REF-6H9D', createdAt: ago(1 * DAY) }),
    /* creator applications (task campaigns) */
    app({ id: 'ap_1', campaignId: 'm_debate_1', applicantId: 'u_salawu', message: 'I built the Debate Finals kit last season for Dami’s studio — poster and six posts, three days early. I can match the client brand exactly.', availability: 'Any day after 2pm', growthproofRefs: ['wp_1'], portfolioLinks: ['behance.net/salawu/debate'], status: 'pending', createdAt: ago(1 * DAY) }),
    app({ id: 'ap_2', campaignId: 'm_debate_1', applicantId: 'u_ngozi', message: 'I wrote the launch copy for the same client last season — I can write the six posts while the designer builds the poster.', availability: 'Weekends + evenings', growthproofRefs: ['wp_4'], status: 'pending', createdAt: ago(20 * HOUR) }),
    app({ id: 'ap_3', campaignId: 'm_media_1', applicantId: 'u_aisha', message: 'I shot your summer tee drop last semester — 18 shots, delivered a day early. I’d love to shoot the hoodies the same way.', availability: 'Any day next week', growthproofRefs: ['wp_3'], status: 'selected', createdAt: ago(5 * DAY) }),
    app({ id: 'ap_4', campaignId: 'm_newhall_1', applicantId: 'u_kemi', message: 'I hosted two New Hall events this semester and I run a promo stall every week for the hall association.', availability: 'Both stall days', growthproofRefs: ['wp_9'], status: 'shortlisted', createdAt: ago(3 * DAY) }),
    app({ id: 'ap_5', campaignId: 'm_research_1', applicantId: 'u_tunde', message: 'I ran your pricing survey last term — 40 interviews. Happy to run this one the same way.', availability: 'Weekdays after 4pm', growthproofRefs: ['wp_5'], status: 'pending', createdAt: ago(8 * HOUR) }),
    app({ id: 'ap_6', campaignId: 'm_squad_1', applicantId: 'u_seyi', squadId: 'sq_media', message: 'Our squad covered the Open Mic recap together — photos, video and live updates. We can shoot the game-night reel end to end.', availability: 'All event evenings', growthproofRefs: ['wp_6', 'wp_7', 'wp_8'], status: 'selected', createdAt: ago(7 * DAY) }),
    app({ id: 'ap_7', campaignId: 'm_research_1', applicantId: 'u_funke', message: 'I can help find interviewees in the sciences — happy to support the logistics.', availability: 'Flexible', status: 'declined', createdAt: ago(3 * DAY) }),
  ];

  const assignments: CampaignAssignment[] = [
    { id: 'as_1', campaignId: 'm_media_1', contributorIds: ['u_aisha'], status: 'in_progress', deadline: inDays(3), createdAt: ago(5 * DAY), paymentArrangedBy: [] },
    { id: 'as_2', campaignId: 'm_squad_1', contributorIds: ['u_seyi', 'u_ruth', 'u_emeka'], squadId: 'sq_media', status: 'in_progress', deadline: inDays(9), createdAt: ago(7 * DAY), paymentArrangedBy: [] },
  ];

  const skillChecks: SkillCheck[] = [
    { id: 'sc_1', userId: 'u_salawu', track: 'design_content', submissionName: 'portfolio_3_examples.zip', notes: 'Poster series + 2 portfolio pieces.', status: 'skill_checked', submittedAt: ago(12 * DAY), reviewerId: 'u_admin', reviewedAt: ago(10 * DAY), feedback: 'Strong composition and clear use of brief. Skill-Checked for Design and Content.' },
    { id: 'sc_2', userId: 'u_aisha', track: 'event_support', submissionName: 'run_of_show_and_promo.pdf', notes: 'Run-of-show for Hall Week sports day + promo plan.', status: 'skill_checked', submittedAt: ago(14 * DAY), reviewerId: 'u_admin', reviewedAt: ago(13 * DAY), feedback: 'Thorough run-of-show with realistic cue times. Skill-Checked for Event Support.' },
  ];

  const squads = [
    { id: 'sq_media', name: 'Seyi & Co Media', leadId: 'u_seyi', campusId: 'c_unilag', createdAt: ago(30 * DAY) },
  ];
  const squadMembers = [
    { squadId: 'sq_media', userId: 'u_seyi', role: 'Squad Lead · Videographer', status: 'accepted' as const },
    { squadId: 'sq_media', userId: 'u_emeka', role: 'Videographer', status: 'accepted' as const },
    { squadId: 'sq_media', userId: 'u_ruth', role: 'Social media support', status: 'accepted' as const },
  ];

  const conversations: Conversation[] = [
    conv({ id: 'cv_1', participantIds: ['u_salawu', 'u_funmilayo'], campaignId: 'm_lead_1', lastMessageAt: ago(5 * HOUR), fileSharingOpen: true }),
    conv({ id: 'cv_2', participantIds: ['u_salawu', 'u_damilola'], campaignId: 'm_done_1', lastMessageAt: ago(2 * DAY), fileSharingOpen: true }),
    conv({ id: 'cv_3', participantIds: ['u_aisha', 'u_funmilayo'], campaignId: 'm_media_1', lastMessageAt: ago(1 * HOUR), fileSharingOpen: true }),
    conv({ id: 'cv_4', participantIds: ['u_ngozi', 'u_damilola'], campaignId: 'm_debate_1', lastMessageAt: ago(3 * HOUR), fileSharingOpen: true }),
    conv({ id: 'cv_5', participantIds: ['u_seyi', 'u_segun'], campaignId: 'm_squad_1', lastMessageAt: ago(30 * MIN), fileSharingOpen: true }),
    conv({ id: 'cv_6', participantIds: ['u_salawu', 'u_chuka'], lastMessageAt: ago(1 * DAY), fileSharingOpen: false }),
  ];

  const messages: Message[] = [
    msg({ id: 'm_1', conversationId: 'cv_1', senderId: 'u_salawu', text: 'Hi Funmilayo! I just submitted proof for a lead — Adaeze from Accounting 200 wants the price list for 3 tees.', createdAt: ago(5 * HOUR) }),
    msg({ id: 'm_2', conversationId: 'cv_1', senderId: 'u_funmilayo', text: 'Nice one — saw the proof. Chatting with her now; I’ll confirm it today. Keep sharing your code REF-8K2P!', createdAt: ago(4 * HOUR), readBy: ['u_salawu'] }),
    msg({ id: 'm_3', conversationId: 'cv_2', senderId: 'u_damilola', text: 'The Debate exec loved the kit. Your GrowthProof entry is live on your Passport 🎉', createdAt: ago(2 * DAY), readBy: ['u_salawu'] }),
    msg({ id: 'm_4', conversationId: 'cv_3', senderId: 'u_funmilayo', text: 'Reminder — hoodie shoot is Saturday. Bring your backdrop; the new colours are ready at my room block gate by 8am.', createdAt: ago(1 * HOUR), readBy: ['u_aisha'] }),
    msg({ id: 'm_5', conversationId: 'cv_4', senderId: 'u_damilola', text: 'Your writing sample was excellent. Are you free to discuss the poster + posts this week?', createdAt: ago(3 * HOUR) }),
    msg({ id: 'm_6', conversationId: 'cv_5', senderId: 'u_segun', text: 'Squad confirmed for the sizzle reel. Game night coverage starts Thursday 7pm.', createdAt: ago(30 * MIN) }),
    msg({ id: 'm_7', conversationId: 'cv_6', senderId: 'u_chuka', text: 'Hey Salawu! One confirmed result from Proven Contributor — know any vendors who should post Campaigns on GrowthProof?', createdAt: ago(1 * DAY), readBy: ['u_salawu'] }),
  ];

  const auditLog = [
    { id: 'al_1', actorId: 'u_admin', action: 'approve_business', targetType: 'business', targetId: 'biz_dami', detail: 'Dami’s Design Studio approved', createdAt: ago(80 * DAY) },
    { id: 'al_2', actorId: 'u_admin', action: 'approve_business', targetType: 'business', targetId: 'biz_funmi', detail: 'Funmi’s Fashion Corner approved', createdAt: ago(75 * DAY) },
    { id: 'al_3', actorId: 'u_funmilayo', action: 'confirm_result_proof', targetType: 'campaign', targetId: 'm_lead_1', detail: 'Confirmed lead proof from Funke', createdAt: ago(1 * DAY) },
    { id: 'al_4', actorId: 'u_segun', action: 'confirm_result_proof', targetType: 'campaign', targetId: 'm_done_2', detail: 'Confirmed 12 tickets from Salawu', createdAt: ago(39 * DAY) },
  ];

  return {
    version: 1,
    sessionUserId: null,
    campuses: [unilag],
    users,
    verifications: [
      { id: 'v_1', userId: 'u_tobi', campusId: unilag.id, matricNo: '220502031', idDocumentName: 'student_id_tobi.jpg', selfieName: 'selfie_tobi.jpg', submittedAt: ago(3 * DAY), attempt: 1 },
      { id: 'v_2', userId: 'u_simi', campusId: unilag.id, matricNo: '230203012', idDocumentName: 'student_id_simi.jpg', selfieName: 'selfie_simi.jpg', submittedAt: ago(2 * DAY), attempt: 1 },
      { id: 'v_3', userId: 'u_gbenga', campusId: unilag.id, matricNo: '230404077', idDocumentName: 'student_id_gbenga.jpg', selfieName: 'selfie_gbenga.jpg', submittedAt: ago(1 * DAY), attempt: 1 },
    ],
    businesses,
    campaigns,
    applications,
    assignments,
    deliverables: [],
    conversations,
    messages,
    growthproof,
    skillChecks,
    squads,
    squadMembers,
    reviews: [
      { id: 'rv_1', targetId: 'u_salawu', authorId: 'u_damilola', growthproofId: 'wp_1', campaignId: 'm_done_1', rating: 5, reason: 'quality', text: 'Sharp, on-brand and delivered three days early.', hidden: false, createdAt: ago(58 * DAY) },
      { id: 'rv_2', targetId: 'u_salawu', authorId: 'u_segun', growthproofId: 'wp_2', campaignId: 'm_done_2', rating: 5, reason: 'reliability', text: '12 tickets confirmed against the door list, all in one batch.', hidden: false, createdAt: ago(39 * DAY) },
      { id: 'rv_3', targetId: 'u_aisha', authorId: 'u_funmilayo', growthproofId: 'wp_3', campaignId: 'm_media_past', rating: 5, reason: 'quality', text: '18 shots, delivered a day early, zero chasing.', hidden: false, createdAt: ago(30 * DAY) },
      { id: 'rv_4', targetId: 'u_seyi', authorId: 'u_segun', growthproofId: 'wp_6', campaignId: 'm_squad_past', rating: 5, reason: 'communication', text: 'Squad lead who actually coordinates.', hidden: false, createdAt: ago(25 * DAY) },
      { id: 'rv_5', targetId: 'u_kemi', authorId: 'u_damilola', growthproofId: 'wp_9', campaignId: 'm_kemi_past', rating: 5, reason: 'professionalism', text: 'One lead closed a logo + poster kit.', hidden: false, createdAt: ago(15 * DAY) },
      { id: 'rv_6', targetId: 'u_tunde', authorId: 'u_kunbi', growthproofId: 'wp_5', campaignId: 'm_research_past', rating: 4, reason: 'communication', text: 'Excellent interviews; watch the delivery date.', hidden: false, createdAt: ago(20 * DAY) },
    ],
    reports: [
      { id: 'rep_1', reporterId: 'u_ngozi', targetType: 'user', targetId: 'u_femi', reason: 'scam', details: 'New account messaging people offering “guaranteed” paid referrals before verification.', status: 'open', createdAt: ago(18 * HOUR) },
      { id: 'rep_2', reporterId: 'u_aisha', targetType: 'campaign', targetId: 'm_debate_1', reason: 'other', details: 'Duplicate poster Campaign posted by a non-owner account — resolved by admin after owner confirmed.', status: 'resolved', resolvedBy: 'u_admin', resolvedAt: ago(3 * DAY), resolution: 'Duplicate removed; user warned about impersonation.', createdAt: ago(3 * DAY) },
    ],
    notifications: [
      { id: 'n_1', userId: 'u_salawu', kind: 'message', title: 'New message from Funmilayo', body: '“Nice one — saw the proof…”', link: '/app/chat/cv_1', createdAt: ago(4 * HOUR), read: false },
      { id: 'n_2', userId: 'u_salawu', kind: 'campaign', title: 'Campaign matches your skills', body: '“Leads for the Fashion Corner grand sale” is still open — you joined as a promoter.', link: '/app/campaign/m_lead_1', createdAt: ago(3 * DAY), read: true },
      { id: 'n_3', userId: 'u_salawu', kind: 'result', title: 'Result proof submitted', body: 'Your lead proof is with Funmilayo — you’ll be notified when she confirms it.', link: '/app/campaign/m_lead_1', createdAt: ago(5 * HOUR), read: true },
      { id: 'n_4', userId: 'u_salawu', kind: 'growthproof', title: 'GrowthProof entry issued', body: '“Tickets for the Faculty Week Culture Night” added to your Passport.', link: '/app/passport', createdAt: ago(38 * DAY), read: true },
      { id: 'n_5', userId: 'u_salawu', kind: 'system', title: 'One confirmed result from Proven Contributor', body: 'Complete one more accepted Campaign (needs 3 GrowthProof entries, rating ≥ 4.0) to reach Proven Contributor.', link: '/app/passport', createdAt: ago(1 * DAY), read: false },
      { id: 'n_6', userId: 'u_admin', kind: 'verification', title: 'New verification submitted', body: 'Gbenga Adepoju submitted documents.', link: '/admin/verifications', createdAt: ago(2 * DAY), read: false },
      { id: 'n_7', userId: 'u_admin', kind: 'business', title: 'Student business application', body: 'Taiwo applied to run “Taiwo’s Proofing Desk”.', link: '/admin/businesses', createdAt: ago(2 * DAY), read: false },
      { id: 'n_8', userId: 'u_admin', kind: 'campaign', title: 'Campaign awaiting review', body: '“Proofreading flyer for Taiwo’s Proofing Desk”.', link: '/admin/campaigns', createdAt: ago(1 * DAY), read: false },
      { id: 'n_9', userId: 'u_funmilayo', kind: 'result', title: 'New result proof to confirm', body: 'Salawu submitted a lead on “Leads for the Fashion Corner grand sale”.', link: '/app/campaign/m_lead_1', createdAt: ago(5 * HOUR), read: false },
      { id: 'n_10', userId: 'u_chuka', kind: 'system', title: 'Reward status updated', body: 'You’re one completed Campaign away from your monthly reward.', link: '/ambassador', createdAt: ago(2 * DAY), read: false },
    ],
    ambassadors: [
      { id: 'amb_1', userId: 'u_chuka', campusId: unilag.id, vendorsRecruited: 4, promotersRecruited: 18, approvedReferrals: 14, completedCampaigns: 9, retained30Days: 12, rewardStatus: 'qualified', rewardEarned: 24000, monthlyTarget: 10 },
      { id: 'amb_2', userId: 'u_bola', campusId: unilag.id, vendorsRecruited: 2, promotersRecruited: 11, approvedReferrals: 8, completedCampaigns: 4, retained30Days: 7, rewardStatus: 'pending', rewardEarned: 9000, monthlyTarget: 8 },
    ],
    ambassadorReferrals: [
      { id: 'ar_1', ambassadorId: 'amb_1', referredUserId: 'u_salawu', verified: true, completedCampaign: true, retained30Days: true, earned: 3000, createdAt: ago(60 * DAY) },
      { id: 'ar_2', ambassadorId: 'amb_1', referredUserId: 'u_ngozi', verified: true, completedCampaign: true, retained30Days: true, earned: 3000, createdAt: ago(55 * DAY) },
      { id: 'ar_3', ambassadorId: 'amb_1', referredUserId: 'u_kemi', verified: true, completedCampaign: true, retained30Days: false, earned: 2000, createdAt: ago(45 * DAY) },
      { id: 'ar_4', ambassadorId: 'amb_1', referredUserId: 'u_funke', verified: true, completedCampaign: true, retained30Days: true, earned: 3000, createdAt: ago(40 * DAY) },
      { id: 'ar_5', ambassadorId: 'amb_2', referredUserId: 'u_aisha', verified: true, completedCampaign: true, retained30Days: true, earned: 3000, createdAt: ago(42 * DAY) },
      { id: 'ar_6', ambassadorId: 'amb_2', referredUserId: 'u_yomi', verified: true, completedCampaign: false, retained30Days: false, earned: 1500, createdAt: ago(30 * DAY) },
      { id: 'ar_7', ambassadorId: 'amb_2', referredUserId: 'u_emeka', verified: true, completedCampaign: true, retained30Days: true, earned: 3000, createdAt: ago(28 * DAY) },
    ],
    analytics: [],
    auditLog,
    onboardingStep: 'splash',
  };
}
