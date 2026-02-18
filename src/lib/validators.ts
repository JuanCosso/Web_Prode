import { z } from "zod";

export const CreateRoomSchema = z.object({
  name: z.string().trim().min(3).max(40),
  editPolicy: z.enum(["STRICT_PER_MATCH", "ALLOW_UNTIL_ROUND_CLOSE"]).optional(),
  contributionText: z.string().trim().max(80).optional(),
});

export const JoinRoomSchema = z.object({
  code: z.string().trim().min(4).max(12),
  // ✅ join NO toca nombre; solo aporte opcional
  contributionText: z.string().trim().max(80).optional(),
});

export const UpsertPredictionSchema = z.object({
  matchId: z.string().min(10),
  predHomeGoals: z.number().int().min(0).max(20),
  predAwayGoals: z.number().int().min(0).max(20),
  predPenWinner: z.string().max(60).optional().nullable(),
});
