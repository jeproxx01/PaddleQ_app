'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { db, type Session, type TournamentTeam, type Player } from '@/db/db';
import { useSessionId } from '@/features/layout/SessionContext';
import { getTournamentLeaderboard } from '@/features/tournament/tournamentService';
import { Trophy, Medal, Award, Download, ArrowLeft, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';

export default function SummaryPage() {
  const sessionId = useSessionId();
  const [session, setSession] = useState<Session | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const s = await db.sessions.get(sessionId);
    setSession(s ?? null);

    if (s?.gameMode === 'winner-takes-all-round-robin') {
      const leaderboard = await getTournamentLeaderboard(sessionId);
      setTeams(leaderboard);
    } else {
      const allPlayers = await db.players.toArray();
      setPlayers(
        allPlayers
          .filter((p) => p.gamesPlayed > 0)
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      );
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(id);
  }, [loadData]);

  if (loading || !session) {
    return <div className="p-8 text-text-secondary">Loading session summary…</div>;
  }

  const exportCsv = () => {
    let csv = '';
    if (session.gameMode === 'winner-takes-all-round-robin') {
      csv = 'Rank,Team,Wins,Losses,TotalPoints,PointsConceded,Diff\n';
      teams.forEach((t, i) => {
        const diff = t.totalPoints - t.pointsConceded;
        csv += `${i + 1},"${t.name}",${t.wins},${t.losses},${t.totalPoints},${t.pointsConceded},${diff}\n`;
      });
    } else {
      csv = 'Player,SkillLevel,GamesPlayed,Wins,Losses,WinRate\n';
      players.forEach((p) => {
        const rate = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
        csv += `"${p.name}",${p.skillLevel},${p.gamesPlayed},${p.wins},${p.losses},${rate}%\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.name.replace(/\s+/g, '_')}_summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isTournament = session.gameMode === 'winner-takes-all-round-robin';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-card-border">
        <div>
          <Link
            href={`/sessions/${sessionId}`}
            className="text-xs text-text-secondary hover:text-white flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Board
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-volt" />
            Session Summary & Recap
          </h1>
          <p className="text-sm text-text-secondary mt-1">{session.name}</p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="h-11 px-4 rounded-xl bg-obsidian-dark hover:bg-card-border border border-card-border hover:border-volt/50 text-white font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-volt" />
          Export Standings (.CSV)
        </button>
      </div>

      {/* Tournament Podium (Winner Takes All) */}
      {isTournament && teams.length >= 2 && (
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-volt" /> Tournament Podium
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* 2nd Place */}
            <div className="rounded-2xl bg-card-surface border border-slate-700/60 p-5 text-center flex flex-col items-center order-2 sm:order-1">
              <span className="p-3 rounded-full bg-slate-400/10 text-slate-300 border border-slate-400/30 mb-2">
                <Medal className="w-6 h-6" />
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">2nd Place</span>
              <h3 className="text-base font-bold text-white mt-1">{teams[1]?.name}</h3>
              <p className="text-xl font-mono font-bold text-slate-300 mt-2">
                {teams[1]?.totalPoints} pts
              </p>
            </div>

            {/* 1st Place Champion */}
            <div className="rounded-2xl bg-gradient-to-b from-amber-500/20 to-card-surface border-2 border-volt p-6 text-center flex flex-col items-center shadow-lg shadow-volt/10 order-1 sm:order-2">
              <span className="p-3 rounded-full bg-volt/20 text-volt border border-volt/40 mb-2">
                <Trophy className="w-8 h-8" />
              </span>
              <span className="text-xs font-mono font-black text-volt uppercase tracking-wider">
                1st Place • Prize Winner
              </span>
              <h3 className="text-lg font-black text-white mt-1">{teams[0]?.name}</h3>
              <p className="text-2xl font-mono font-black text-volt mt-2">
                {teams[0]?.totalPoints} pts
              </p>
            </div>

            {/* 3rd Place */}
            {teams[2] && (
              <div className="rounded-2xl bg-card-surface border border-amber-900/60 p-5 text-center flex flex-col items-center order-3">
                <span className="p-3 rounded-full bg-amber-700/10 text-amber-500 border border-amber-700/30 mb-2">
                  <Award className="w-6 h-6" />
                </span>
                <span className="text-xs font-mono font-bold text-amber-500 uppercase">3rd Place</span>
                <h3 className="text-base font-bold text-white mt-1">{teams[2]?.name}</h3>
                <p className="text-xl font-mono font-bold text-amber-400 mt-2">
                  {teams[2]?.totalPoints} pts
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standings Table */}
      <div className="rounded-2xl bg-card-surface border border-card-border p-5">
        <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          {isTournament ? <Award className="w-5 h-5 text-cyan" /> : <Users className="w-5 h-5 text-cyan" />}
          {isTournament ? 'Complete Tournament Standings' : 'Player Win / Loss Performance'}
        </h2>

        {isTournament ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border/60 text-xs text-text-secondary uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3 text-center">Record</th>
                  <th className="py-2.5 px-3 text-center">Conceded</th>
                  <th className="py-2.5 px-3 text-center">Diff</th>
                  <th className="py-2.5 px-3 text-right">Total Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40 font-mono">
                {teams.map((t, idx) => {
                  const diff = t.totalPoints - t.pointsConceded;
                  return (
                    <tr key={t.id} className="text-text-secondary hover:text-white transition-colors">
                      <td className="py-3 px-3 font-bold text-white">#{idx + 1}</td>
                      <td className="py-3 px-3 font-sans font-medium text-white">{t.name}</td>
                      <td className="py-3 px-3 text-center">{t.wins}W - {t.losses}L</td>
                      <td className="py-3 px-3 text-center text-text-secondary">{t.pointsConceded}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : ''}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-volt text-base">
                        {t.totalPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border/60 text-xs text-text-secondary uppercase">
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Skill</th>
                  <th className="py-2.5 px-3 text-center">Played</th>
                  <th className="py-2.5 px-3 text-center">Wins</th>
                  <th className="py-2.5 px-3 text-center">Losses</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border/40 font-mono">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-text-secondary">
                      No matches played yet in this session.
                    </td>
                  </tr>
                ) : (
                  players.map((p) => {
                    const rate = p.gamesPlayed ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                    return (
                      <tr key={p.id} className="text-text-secondary hover:text-white transition-colors">
                        <td className="py-3 px-3 font-sans font-medium text-white">{p.name}</td>
                        <td className="py-3 px-3 uppercase text-xs">{p.skillLevel}</td>
                        <td className="py-3 px-3 text-center">{p.gamesPlayed}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">{p.wins}</td>
                        <td className="py-3 px-3 text-center text-rose-400">{p.losses}</td>
                        <td className="py-3 px-3 text-right font-bold text-volt">{rate}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
