'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Award, Flame } from 'lucide-react';
import { db, type TournamentTeam, type TournamentFixture } from '../../db/db';
import { getTournamentLeaderboard, isTournamentComplete } from './tournamentService';

interface TournamentLeaderboardProps {
  sessionId: string;
}

export function TournamentLeaderboard({ sessionId }: TournamentLeaderboardProps) {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const loadData = useCallback(async () => {
    const leaderboard = await getTournamentLeaderboard(sessionId);
    setTeams(leaderboard);
    const allFixtures = await db.tournamentFixtures.where('sessionId').equals(sessionId).toArray();
    setFixtures(allFixtures.sort((a, b) => a.round - b.round));
    const complete = await isTournamentComplete(sessionId);
    setIsComplete(complete);
  }, [sessionId]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadData();
    }, 0);
    const interval = setInterval(loadData, 2000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [loadData]);

  if (teams.length === 0) {
    return null;
  }

  const champion = teams[0];

  return (
    <div className="rounded-2xl bg-card-surface border border-card-border p-6 shadow-xl mb-6">
      {/* Victory Celebration Header if Tournament Complete */}
      {isComplete && champion && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-volt/20 to-amber-500/20 border-2 border-volt text-center animate-pulse">
          <div className="flex items-center justify-center gap-2 text-volt mb-2">
            <Trophy className="w-8 h-8" />
            <span className="text-xs uppercase font-black tracking-widest bg-volt text-obsidian-dark px-3 py-1 rounded-full">
              Prize Winner Announced
            </span>
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            🏆 {champion.name} 🏆
          </h2>
          <p className="mt-2 text-sm text-volt font-mono font-bold">
            Grand Champion with {champion.totalPoints} Total Points!
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-card-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-volt/10 text-volt border border-volt/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Winner Takes All — Live Leaderboard
            </h2>
            <p className="text-xs text-text-secondary">
              Ranked by Total Points Scored • Highest Points Wins Prize
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-volt/10 text-volt border border-volt/30 font-bold">
          {fixtures.filter((f) => f.status === 'completed').length} / {fixtures.length} Matches Done
        </span>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-card-border/60 text-xs text-text-secondary uppercase">
              <th className="py-2.5 px-3">Rank</th>
              <th className="py-2.5 px-3">Team</th>
              <th className="py-2.5 px-3 text-center">Record</th>
              <th className="py-2.5 px-3 text-center">Diff</th>
              <th className="py-2.5 px-3 text-right">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border/40 font-mono">
            {teams.map((team, idx) => {
              const diff = team.totalPoints - team.pointsConceded;
              const isFirst = idx === 0;

              return (
                <tr
                  key={team.id}
                  className={`transition-colors ${
                    isFirst ? 'bg-volt/5 font-semibold text-white' : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isFirst
                          ? 'bg-volt text-obsidian-dark font-black'
                          : 'bg-obsidian-dark border border-card-border text-text-secondary'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans font-medium text-white flex items-center gap-2">
                    {team.name}
                    {isFirst && <Flame className="w-4 h-4 text-volt" />}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {team.wins}W - {team.losses}L
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : ''}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-lg text-volt">
                    {team.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
