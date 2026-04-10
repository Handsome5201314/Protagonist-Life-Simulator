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

export type ArenaMatch = {
  id: string;
  userId: string;
  seed: number;
  mode: "public" | "private";
  worldPackId: string;
  participantIds: string[];
  publicStoryStatus: "draft" | "streaming" | "complete";
  supportPool: number;
  winnerId?: string;
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
  streams: StreamRecord[];
  scratchUploads: ScratchUpload[];
  webhooks: WebhookLog[];
};
