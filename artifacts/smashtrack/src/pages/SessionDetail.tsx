import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetSession, 
  useGetPlayers, 
  useCreateMatch, 
  useDeleteMatch,
  getGetSessionQueryKey,
  getGetPlayersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trophy, ArrowLeft, Swords, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const queryClient = useQueryClient();
  
  const { data: session, isLoading: isLoadingSession } = useGetSession(sessionId);
  const { data: players } = useGetPlayers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [t1p1, setT1p1] = useState("");
  const [t1p2, setT1p2] = useState("");
  const [t2p1, setT2p1] = useState("");
  const [t2p2, setT2p2] = useState("");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [betAmount, setBetAmount] = useState(20);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
    queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
  };

  const { mutate: createMatch, isPending } = useCreateMatch({
    mutation: { onSuccess: () => { invalidate(); setIsModalOpen(false); setWinner(null); } }
  });

  const { mutate: deleteMatch } = useDeleteMatch({
    mutation: { onSuccess: () => { invalidate(); } }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!winner || !t1p1 || !t1p2 || !t2p1 || !t2p2) return;
    createMatch({ data: { sessionId, team1Player1Id: parseInt(t1p1), team1Player2Id: parseInt(t1p2), team2Player1Id: parseInt(t2p1), team2Player2Id: parseInt(t2p2), winnerTeam: winner, betAmount } });
  };

  const handleDeleteMatch = (matchId: number) => {
    if (confirm("Delete this match? Bets will be reversed and balances restored.")) {
      deleteMatch({ id: matchId });
    }
  };

  const getAvailablePlayers = (currentPosValue: string) => {
    const selected = [t1p1, t1p2, t2p1, t2p2].filter(v => v !== "" && v !== currentPosValue);
    return players?.filter(p => !selected.includes(p.id.toString())) || [];
  };

  if (isLoadingSession) return <div className="p-8 text-center text-slate-400">Loading session details...</div>;
  if (!session) return <div className="p-8 text-center text-red-400">Session not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link href="/sessions" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
        <ArrowLeft size={16} /> Back to Sessions
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            {format(new Date(session.date), 'EEEE, MMMM d')}
          </h1>
          {session.guestPlayerName && <p className="text-slate-400 mt-1">Guest: {session.guestPlayerName}</p>}
          {session.playerNames?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {session.playerNames.map((name: string, idx: number) => (
                <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{name}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 glow-effect">
          <Swords size={20} />
          Record Match
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Matches Played ({session.matches?.length || 0})</h2>
        
        {session.matches?.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No matches recorded</h3>
            <p className="text-slate-400">Record a match to start updating balances.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {session.matches?.map((match, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={match.id}
                className="bg-card border border-border rounded-2xl p-6 shadow-lg relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                    Match {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      ₹{match.betAmount} pool
                    </span>
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Delete match"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-stretch justify-between gap-4 relative z-10">
                  <div className={cn("flex-1 p-4 rounded-xl border-2 text-center transition-colors", match.winnerTeam === 1 ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-slate-800 bg-slate-900/50")}>
                    {match.winnerTeam === 1 && <Trophy size={16} className="text-primary mx-auto mb-2" />}
                    <div className="font-bold text-white">{match.team1Player1Name}</div>
                    <div className="font-bold text-white">{match.team1Player2Name}</div>
                  </div>

                  <div className="flex items-center justify-center text-slate-500 font-display font-bold italic pt-4">VS</div>

                  <div className={cn("flex-1 p-4 rounded-xl border-2 text-center transition-colors", match.winnerTeam === 2 ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-slate-800 bg-slate-900/50")}>
                    {match.winnerTeam === 2 && <Trophy size={16} className="text-primary mx-auto mb-2" />}
                    <div className="font-bold text-white">{match.team2Player1Name}</div>
                    <div className="font-bold text-white">{match.team2Player2Name}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Match" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold z-10">VS</div>
            </div>

            <div className={cn("space-y-4 p-5 rounded-2xl border-2 transition-all", winner === 1 ? "border-primary bg-primary/5" : "border-slate-800 bg-slate-900/30")}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display font-bold text-lg text-white">Team 1</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="winner" checked={winner === 1} onChange={() => setWinner(1)} className="w-4 h-4 text-primary focus:ring-primary bg-slate-950 border-slate-700" />
                  <span className={cn("text-sm font-bold uppercase", winner===1 ? "text-primary" : "text-slate-400")}>Winner</span>
                </label>
              </div>
              <select value={t1p1} onChange={e => setT1p1(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary">
                <option value="">Select Player 1</option>
                {getAvailablePlayers(t1p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={t1p2} onChange={e => setT1p2(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary">
                <option value="">Select Player 2</option>
                {getAvailablePlayers(t1p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className={cn("space-y-4 p-5 rounded-2xl border-2 transition-all", winner === 2 ? "border-primary bg-primary/5" : "border-slate-800 bg-slate-900/30")}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-display font-bold text-lg text-white">Team 2</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="winner" checked={winner === 2} onChange={() => setWinner(2)} className="w-4 h-4 text-primary focus:ring-primary bg-slate-950 border-slate-700" />
                  <span className={cn("text-sm font-bold uppercase", winner===2 ? "text-primary" : "text-slate-400")}>Winner</span>
                </label>
              </div>
              <select value={t2p1} onChange={e => setT2p1(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary">
                <option value="">Select Player 1</option>
                {getAvailablePlayers(t2p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={t2p2} onChange={e => setT2p2(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary">
                <option value="">Select Player 2</option>
                {getAvailablePlayers(t2p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Total Bet Pool</p>
              <p className="text-xs text-slate-400">Losers pay winners equally</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">₹</span>
              <input type="number" value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value))} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-center focus:outline-none focus:border-primary" />
            </div>
          </div>

          <button type="submit" disabled={isPending || !winner || !t1p1 || !t1p2 || !t2p1 || !t2p2} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed glow-effect flex justify-center items-center">
            {isPending ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Save Match & Settle Bets"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
