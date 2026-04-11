export type CurrencyWallet = {
  renown: number;
  diamonds: number;
  seasonPoints: number;
  supportStreak: number;
  lastClaimAt?: string;
};

export type TraitVector = {
  charm: number;
  resilience: number;
  focus: number;
  empathy: number;
  strategy: number;
  chaos: number;
  courage: number;
};

export type PrivacyLevel = "public" | "private";

export type PersonaSource = "ailiangbiao" | "upload" | "legend";

export type PersonaOverlay = {
  id: string;
  personaId: string;
  resumeSummary: string;
  publicBio: string;
  datingPreferences: string[];
  visualSkin: string;
  tonePreset: string;
  privacyLevel: PrivacyLevel;
  updatedAt: string;
};

export type PersonaSnapshot = {
  id: string;
  userId: string;
  source: PersonaSource;
  sourceProfileId?: string;
  assessmentVersion: string;
  name: string;
  relation: "SELF" | "OTHER";
  ageBand: "adult" | "teen" | "child";
  adultOnlyEligible: boolean;
  traitVector: TraitVector;
  publicTraitTags: string[];
  fears: string[];
  interests: string[];
  communicationStyle: string;
  careerTilt: string;
  riskFlags: string[];
  lockedHash: string;
  overlayId?: string;
  expiresAt: string;
  destroyScheduledAt?: string;
  deletedAt?: string;
  dataGhost?: {
    displayAlias: string;
    reason: string;
    publicOnly: boolean;
  };
};

export type MemoryTrait = {
  id: string;
  userId: string;
  personaId?: string;
  originMatchId: string;
  name: string;
  triggerType: string;
  modifier: Partial<TraitVector>;
  rarity: "common" | "rare" | "legendary";
  seasonId: string;
  summary: string;
};

export type WorldPack = {
  id: string;
  userId: string;
  title: string;
  theme: string;
  factions: string[];
  conflicts: string[];
  tone: string;
  tabooRules: string[];
  derivedFrom: "upload" | "curated";
  safetyStatus: "clean" | "warned";
  sanitizedSummary: string;
  sourceDigest: string;
  expiresAt: string;
};

export type MatchParticipant = {
  id: string;
  matchId: string;
  personaId: string;
  displayName: string;
  supportTotal: number;
  skillLoadout: string[];
  memoryTraitId?: string;
  isUserOwned: boolean;
  eliminated: boolean;
  roundScore: number;
  totalScore: number;
  ghosted: boolean;
};

export type SkillEquip = {
  participantId: string;
  skillId: string;
  appliedAt: string;
};

export type RoundScore = {
  participantId: string;
  delta: number;
  total: number;
  notes: string[];
};

export type RoundState = {
  round: number;
  title: string;
  status: "pending" | "streaming" | "done";
  chapter?: string;
  checkpointCount: number;
  elimination?: string;
  scores: RoundScore[];
  skillEquips: SkillEquip[];
};

export type ArenaPrepState = {
  mode: "rapid" | "immersive";
  seatOrder: string[];
  reservePersonaIds: string[];
  updatedAt: string;
};

export type ArenaMatch = {
  id: string;
  userId: string;
  seed: number;
  mode: "public" | "private";
  worldPackId: string;
  maxParticipants: number;
  participantIds: string[];
  publicStoryStatus: "draft" | "streaming" | "complete";
  supportPool: number;
  winnerId?: string;
  prep: ArenaPrepState;
  roundStates: RoundState[];
  createdAt: string;
  updatedAt: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  matchId: string;
  participantId: string;
  renownSpent: number;
  rewardTier: "bronze" | "silver" | "gold";
  status: "active" | "won" | "lost" | "refunded";
  createdAt: string;
};

export type DatingDossier = {
  id: string;
  userId: string;
  personaId: string;
  resumeFacts: string[];
  styleTags: string[];
  redFlags: string[];
  strengths: string[];
  goal: string;
  openingLines: string[];
  forbiddenTopics: string[];
  expiresAt: string;
};

export type DatingActionType = "FLIRT" | "LOGIC_TALK" | "PULL_BACK" | "USE_SKILL";

export type DatingMatchOption = {
  id: string;
  actionType: DatingActionType;
  label: string;
  flavor: string;
  costDiamonds?: number;
};

export type DatingMessage = {
  id: string;
  speaker: "self" | "other" | "system";
  text: string;
  heartbeat: number;
  vibe: number;
  createdAt: string;
};

export type DatingMatch = {
  id: string;
  userId: string;
  selfPersonaId: string;
  counterpartPersonaId: string;
  backdropTitle: string;
  backdropSummary: string;
  heartbeat: number;
  vibe: number;
  turnCount: number;
  status: "active" | "soulmatch" | "collapsed";
  transcript: DatingMessage[];
  currentOptions: DatingMatchOption[];
  createdAt: string;
  updatedAt: string;
};

export type DatingStreamRecord = {
  id: string;
  roomId: string;
  phase: "queued" | "typing" | "final";
  segments: string[];
  finalText: string;
  heartbeat: number;
  vibe: number;
  status: DatingMatch["status"];
  options: DatingMatchOption[];
};

export type StreamRecord = {
  id: string;
  matchId: string;
  round: number;
  phase: "queued" | "typing" | "final";
  segments: string[];
  finalChapter: string;
  elimination?: string;
  scoreBoard: RoundScore[];
  winnerId?: string;
};

export type ScratchUpload = {
  id: string;
  userId: string;
  kind: "resume" | "world" | "snapshot";
  originalName: string;
  cachedText: string;
  createdAt: string;
  deleteAfter: string;
};

export type UserRecord = {
  id: string;
  displayName: string;
  seasonId: string;
  wallet: CurrencyWallet;
  profile?: {
    fullName?: string;
    phone?: string;
    email?: string;
    city?: string;
    bio?: string;
  };
  linkedAiliangbiao?: {
    status: "linked" | "unlinked";
    linkedAt?: string;
    externalUserId?: string;
  };
  createdAt: string;
  updatedAt: string;
  deleteRequestedAt?: string;
};

export type WebhookLog = {
  eventId: string;
  type: string;
  processedAt: string;
  status: "accepted" | "ignored";
};

export type AppDatabase = {
  users: UserRecord[];
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
  memoryTraits: MemoryTrait[];
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  supportTickets: SupportTicket[];
  datingDossiers: DatingDossier[];
  datingMatches: DatingMatch[];
  datingStreams: DatingStreamRecord[];
  streams: StreamRecord[];
  scratchUploads: ScratchUpload[];
  webhooks: WebhookLog[];
};
