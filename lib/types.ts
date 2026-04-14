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

export type CoreDimensionVector = {
  social_energy: number;
  empathy_resonance: number;
  rational_logic: number;
  stress_resilience: number;
  behavioral_flexibility: number;
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
  traitFragmentIds?: string[];
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
  referee?: {
    actionType: string;
    success: boolean;
    roll: number;
    threshold: number;
    heartbeatDelta: number;
    pressureDelta: number;
    summary: string;
    directives: string[];
  };
};

export type ArenaMessage = {
  id: string;
  speaker: "system" | "participant";
  participantId?: string;
  text?: string;
  action?: string;
  dialogue?: string;
  createdAt: string;
};

export type ArenaEventCard = {
  id: string;
  title: string;
  summary: string;
  objective: string;
  stakes: string;
};

export type ArenaProxyPlanRecord = {
  participantId: string;
  actionType: "FLIRT" | "DEBATE" | "LEAD" | "RESIST" | "DECEIVE";
  intent: string;
};

export type RoundState = {
  round: number;
  title: string;
  status: "pending" | "streaming" | "done";
  chapter?: string;
  messages?: ArenaMessage[];
  checkpointCount: number;
  elimination?: string;
  scores: RoundScore[];
  skillEquips: SkillEquip[];
  proxyPlans?: ArenaProxyPlanRecord[];
  eventCard?: ArenaEventCard;
};

export type ArenaProxyMode = "self" | "ai";

export type ArenaPrepState = {
  mode: "rapid" | "immersive";
  seatOrder: string[];
  reservePersonaIds: string[];
  proxyMode?: ArenaProxyMode;
  briefing?: string;
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
  text?: string;
  action?: string;
  dialogue?: string;
  heartbeat: number;
  vibe: number;
  createdAt: string;
};

export type DatingBeat = {
  narration?: string;
  self?: {
    action: string;
    dialogue: string;
  };
  other?: {
    action: string;
    dialogue: string;
  };
};

export type DatingSceneCard = {
  id: string;
  title: string;
  summary: string;
  objective: string;
  risk: string;
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
  scene: DatingSceneCard;
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
  messages: DatingMessage[];
  heartbeat: number;
  vibe: number;
  status: DatingMatch["status"];
  scene: DatingSceneCard;
  options: DatingMatchOption[];
};

export type StreamRecord = {
  id: string;
  matchId: string;
  round: number;
  phase: "queued" | "typing" | "final";
  segments: string[];
  finalChapter: string;
  messages?: ArenaMessage[];
  elimination?: string;
  scoreBoard: RoundScore[];
  proxyPlans?: ArenaProxyPlanRecord[];
  eventCard?: ArenaEventCard;
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

export type TelemetryEventType =
  | "persona.imported"
  | "persona.overlay_updated"
  | "worldpack.uploaded"
  | "user.profile_updated"
  | "admin.config_updated"
  | "arena.match_created"
  | "arena.match_joined"
  | "arena.prep_saved"
  | "arena.support_added"
  | "arena.skill_equipped"
  | "arena.round_triggered"
  | "dating.dossier_created"
  | "dating.room_created"
  | "dating.turn_played";

export type TelemetryEvent = {
  id: string;
  type: TelemetryEventType;
  userId: string;
  entityId?: string;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
};

export type TelemetrySummary = {
  generatedAt: string;
  windowHours: number;
  totalEvents: number;
  countsByType: Partial<Record<TelemetryEventType, number>>;
  metrics: {
    personasImported: number;
    worldPacksUploaded: number;
    arenaMatchesCreated: number;
    arenaPrepSaved: number;
    arenaRoundsTriggered: number;
    arenaRoomsActivated: number;
    arenaPrepCompletionRate: number;
    arenaActivationRate: number;
    arenaAiProxyShare: number;
    datingRoomsCreated: number;
    datingRoomsActivated: number;
    datingTurnsPlayed: number;
    datingContinuationRate: number;
    datingSecondTurnRate: number;
    datingAverageTurnsPerRoom: number;
  };
  topArenaWorlds: Array<{ label: string; count: number }>;
  topDatingActions: Array<{ label: string; count: number }>;
  topArenaEventCards: Array<{ label: string; count: number }>;
  highlights: string[];
  narrativeSummary: string;
  summaryHash: string;
};

export type InsightPriority = "now" | "next" | "watch";

export type DirectorRecommendation = {
  title: string;
  why: string;
  action: string;
  priority: InsightPriority;
};

export type DirectorInsightSnapshot = {
  id: string;
  generatedAt: string;
  windowHours: number;
  eventCount: number;
  summaryHash: string;
  source: "openclaw" | "heuristic";
  headline: string;
  findings: string[];
  recommendations: DirectorRecommendation[];
  watchlist: string[];
};

export type GameplayConfig = {
  dating: {
    forceTrustCrisisAfterFirstTurn: boolean;
    tensionBoost: number;
    environmentPressure: number;
    skillCostDiamonds: number;
  };
  arena: {
    defaultProxyMode: ArenaProxyMode;
    openingPressureBoost: number;
    eventIntensity: number;
  };
};

export type GameplayConfigPatch = Partial<{
  dating: Partial<GameplayConfig["dating"]>;
  arena: Partial<GameplayConfig["arena"]>;
}>;

export type GameplayConfigDiffEntry = {
  path: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
};

export type GameplayConfigProposal = {
  id: string;
  title: string;
  reason: string;
  target: "dating" | "arena";
  priority: InsightPriority;
  patch: GameplayConfigPatch;
  diff: GameplayConfigDiffEntry[];
};

export type GameplayConfigHistoryEntry = {
  id: string;
  createdAt: string;
  action: "apply" | "rollback";
  proposalId?: string;
  proposalTitle?: string;
  reason: string;
  patch: GameplayConfigPatch;
  diff: GameplayConfigDiffEntry[];
  previousConfig: GameplayConfig;
  nextConfig: GameplayConfig;
};

export type ProjectChangeOperation = "replace" | "create";

export type ProjectChangeDraft = {
  path: string;
  operation: ProjectChangeOperation;
  reason: string;
  content: string;
  diff: string;
};

export type ProjectBuildVerification = {
  command: string;
  exitCode: number | null;
  status: "passed" | "failed";
  stdout: string;
  stderr: string;
  ranAt: string;
};

export type ProjectChangeProposal = {
  id: string;
  createdAt: string;
  prompt: string;
  summary: string;
  agentId: string;
  status: "draft" | "applied" | "rolled_back";
  changes: ProjectChangeDraft[];
};

export type ProjectChangeHistoryEntry = {
  id: string;
  proposalId: string;
  createdAt: string;
  action: "apply" | "rollback";
  summary: string;
  verification?: ProjectBuildVerification;
  files: Array<{
    path: string;
    before: string | null;
    after: string | null;
  }>;
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
  gameplayConfig: GameplayConfig;
  gameplayConfigHistory: GameplayConfigHistoryEntry[];
  projectChangeProposals: ProjectChangeProposal[];
  projectChangeHistory: ProjectChangeHistoryEntry[];
  telemetryEvents: TelemetryEvent[];
  insightSnapshots: DirectorInsightSnapshot[];
  webhooks: WebhookLog[];
};
