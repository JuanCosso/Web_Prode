"use client";

import React from "react";
import type { Match, Member, Me, LivePred, MyPred } from "./types";
import type { Room } from "./types";
import { KO_STAGES, STAGE_LABELS } from "./constants";
import { Flag, flagCodeFor } from "./flags";
import { getPillColor } from "./pillColor";

type Draft = Record<string, { h: string; a: string; pen: string }>;

export const MatchTable = React.memo(function MatchTable({
  list,
  groupLabel,
  membersOrdered,
  me,
  room,
  stageLocked,
  draft,
  allPredsByMatchUser,
  matchColWidth,
  onScoreInput,
  onPenSelect,
}: {
  list: Match[];
  groupLabel?: string;
  membersOrdered: Member[];
  me: Me;
  room: Room;
  stageLocked: boolean;
  draft: Draft;
  allPredsByMatchUser: Map<string, LivePred>;
  matchColWidth: number;
  onScoreInput: (matchId: string, field: "h" | "a", raw: string) => void;
  onPenSelect: (matchId: string, team: string) => void;
}) {
  const MATCH_COL = matchColWidth;
  const PLAYER_COL = 130;
  const tableMinWidth = MATCH_COL + membersOrdered.length * PLAYER_COL;
  const stickyBg = "#0d1526";

  return (
    <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
      {groupLabel && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="text-sm font-semibold">Grupo {groupLabel}</div>
          <div className="text-xs text-white/60">{list.length} partidos</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="text-xs"
          style={{
            minWidth: tableMinWidth,
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <colgroup>
            <col style={{ width: MATCH_COL }} />
            {membersOrdered.map((mb) => (
              <col key={mb.userId} style={{ width: PLAYER_COL }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                className="px-3 py-2 text-left font-semibold"
                style={{ position: "sticky", left: 0, zIndex: 20, background: stickyBg }}
              >
                Partido
              </th>
              {membersOrdered.map((mb) => (
                <th
                  key={mb.userId}
                  className={[
                    "px-2 py-2 text-center font-semibold bg-white/5",
                    mb.userId === me.id ? "text-white" : "text-white/80",
                  ].join(" ")}
                >
                  <span className="block">{mb.displayName}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((m) => {
              const kickoff = new Date(m.kickoffAt);
              const isKO = KO_STAGES.has(m.stage);
              const hasResult = m.homeGoals !== null && m.awayGoals !== null;
              const lockedLocal =
                room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE"
                  ? stageLocked
                  : Date.now() >= kickoff.getTime();
              const d = draft[m.id] ?? { h: "", a: "", pen: "" };
              const hN = parseInt(d.h, 10);
              const aN = parseInt(d.a, 10);
              const showPenSelector = isKO && !lockedLocal;

              return (
                <tr key={m.id} className="border-t border-white/8">
                  {/* Columna partido — sticky */}
                  <td
                    className="px-3 py-2.5 align-top"
                    style={{ position: "sticky", left: 0, zIndex: 10, background: stickyBg }}
                  >
                    <div className="text-[10px] text-white/40 mb-0.5">
                      {(m as any).kickoffLabel}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Flag code={flagCodeFor(m.homeTeam)} alt={m.homeTeam} />
                      <span className="font-medium">{m.homeTeam}</span>
                      <span className="text-white/30 text-[10px]">vs</span>
                      <Flag code={flagCodeFor(m.awayTeam)} alt={m.awayTeam} />
                      <span className="font-medium">{m.awayTeam}</span>
                    </div>
                    {hasResult && (
                      <div className="mt-0.5 text-[10px] text-white/50">
                        Real:{" "}
                        <span className="font-bold text-white/80">
                          {m.homeGoals}–{m.awayGoals}
                        </span>
                        {m.decidedByPenalties && (
                          <span className="ml-1 text-yellow-400/70">pen: {m.penWinner}</span>
                        )}
                      </div>
                    )}
                    {showPenSelector && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-yellow-400/70">Pen:</span>
                        {[m.homeTeam, m.awayTeam].map((team) => (
                          <button
                            key={team}
                            onClick={() => onPenSelect(m.id, team)}
                            className={[
                              "text-[10px] px-2 py-0.5 rounded border transition",
                              d.pen === team
                                ? "border-white/50 bg-white/15 text-white"
                                : "border-white/20 text-white/50 hover:bg-white/10",
                            ].join(" ")}
                          >
                            {team}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Columnas por jugador */}
                  {membersOrdered.map((mb) => {
                    const isMeCol = mb.userId === me.id;
                    const pred = allPredsByMatchUser.get(`${m.id}__${mb.userId}`);
                    const colorPredH = hasResult
                      ? (pred?.h ?? null)
                      : isMeCol
                      ? isNaN(hN) ? null : hN
                      : (pred?.h ?? null);
                    const colorPredA = hasResult
                      ? (pred?.a ?? null)
                      : isMeCol
                      ? isNaN(aN) ? null : aN
                      : (pred?.a ?? null);
                    const pillColor = getPillColor(m, colorPredH, colorPredA);

                    return (
                      <td key={mb.userId} className="px-2 py-2 align-middle text-center">
                        {isMeCol ? (
                          hasResult ? (
                            <div className="flex flex-col items-center gap-1">
                              {pred != null ? (
                                <>
                                  <span
                                    className={[
                                      "inline-block rounded-full px-2.5 py-0.5 text-xs tabular-nums",
                                      pillColor,
                                    ].join(" ")}
                                  >
                                    {pred.h}–{pred.a}
                                  </span>
                                  {isKO && pred.penWinner && m.decidedByPenalties && (
                                    <span
                                      className={[
                                        "text-[10px] font-medium px-1.5 py-px rounded",
                                        pred.penWinner === m.penWinner
                                          ? "bg-emerald-500/20 text-emerald-300"
                                          : "bg-red-500/20 text-red-400",
                                      ].join(" ")}
                                    >
                                      {pred.penWinner}
                                    </span>
                                  )}
                                  {isKO && pred.penWinner && !m.decidedByPenalties && (
                                    <span className="text-[10px] text-white/30 px-1.5">
                                      {pred.penWinner}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-white/20">—</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <input
                                  value={d.h}
                                  onChange={(e) => onScoreInput(m.id, "h", e.target.value)}
                                  disabled={lockedLocal}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                  maxLength={2}
                                />
                                <span className="text-white/40">-</span>
                                <input
                                  value={d.a}
                                  onChange={(e) => onScoreInput(m.id, "a", e.target.value)}
                                  disabled={lockedLocal}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                  maxLength={2}
                                />
                              </div>
                              {isKO && !lockedLocal && d.pen && (
                                <span className="text-[10px] text-yellow-400/70 truncate max-w-[88px]">
                                  {d.pen}
                                </span>
                              )}
                            </div>
                          )
                        ) : pred != null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={[
                                "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                                pillColor,
                              ].join(" ")}
                            >
                              {pred.h}–{pred.a}
                            </span>
                            {isKO && pred.penWinner && hasResult && m.decidedByPenalties && (
                              <span
                                className={[
                                  "text-[10px] font-medium px-1.5 py-px rounded",
                                  pred.penWinner === m.penWinner
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-red-500/20 text-red-400",
                                ].join(" ")}
                              >
                                {pred.penWinner}
                              </span>
                            )}
                            {isKO && pred.penWinner && (!hasResult || !m.decidedByPenalties) && (
                              <span className="text-[10px] text-white/30 px-1.5">
                                {pred.penWinner}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});