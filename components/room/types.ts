export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type Member = {
  id: string;
  userId: string;
  displayName: string;
  contributionText: string;
  role: MemberRole;
};

export type PendingMember = {
  id: string;
  displayName: string;
};

export type Match = {
  id: string;
  stage: string;
  group?: string | null;
  matchday: number;
  kickoffAt: string;
  kickoffLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  decidedByPenalties: boolean;
  penWinner: string | null;
};

export type MyPred = {
  matchId: string;
  predHomeGoals: number;
  predAwayGoals: number;
  predPenWinner?: string | null;
};

export type LivePred = {
  matchId: string;
  userId: string;
  displayName: string;
  h: number;
  a: number;
  penWinner: string | null;
};

export type StandingRow = {
  userId: string;
  displayName: string;
  contributionText: string;
  points: number;
  exactHits: number;
  outcomeHits: number;
};

export type Room = {
  id: string;
  name: string;
  code: string;
  editPolicy: "STRICT_PER_MATCH" | "ALLOW_UNTIL_ROUND_CLOSE";
  accessType: "OPEN" | "CLOSED";
};

export type Me = {
  id: string;
  displayName: string;
};