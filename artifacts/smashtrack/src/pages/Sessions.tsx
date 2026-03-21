import React, { useState } from "react";
import { Link } from "wouter";
import { useGetSessions, useCreateSession, useGetPlayers, getGetSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, Users, ChevronRight, Check } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/Modal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const FIXED_PLAYER_NAMES = ["Varun", "Neeraj", "Lakshy", "Vivaan", "Bhaskar"];

export function Sessions() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useGetSessions();
  const { data: allPlayers } = useGetPlayers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [guestName, setGuestName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fixedPlayers = allPlayers?.filter(p => p.isFixed) ?? [];

  const { mutate: createSession, isPending } = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
        setIsModalOpen(false);
        setSelectedPlayerIds([]);
        setGuestName("");
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  });

  const togglePlayer = (id: number) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayerIds.length === 0) return;

    let playerIds = [...selectedPlayerIds];

    createSession({
      data: {
        date,
        playerIds,
        guestPlayerName: guestName.trim() || null,
        notes: null,
      }
    });
  };

  const openModal = () => {
    setSelectedPlayerIds(fixedPlayers.map(p => p.id));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Game Sessions</h1>
          <p className="text-slate-400 mt-1">Pick who's playing and track match bets.</p>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 glow-effect"
        >
          <Plus size={20} />
          New Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />
           ))
        ) : sessions?.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No sessions yet</h3>
            <p className="text-slate-400">Create your first game day to start tracking matches.</p>
          </div>
        ) : (
          sessions?.map((session, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={session.id}
            >
              <Link 
                href={`/sessions/${session.id}`}
                className="block bg-card hover:bg-slate-800/80 border border-border hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 group shadow-lg shadow-black/10"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CalendarDays size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-display">
                        {format(new Date(session.date), 'EEE, MMM d, yyyy')}
                      </h3>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>
                
                {/* Players row */}
                {(session.playerNames?.length > 0 || session.guestPlayerName) && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/50">
                    {session.playerNames?.map((name: string, idx: number) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {name}
                      </span>
                    ))}
                    {session.guestPlayerName && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium flex items-center gap-1">
                        <Users size={10} />
                        {session.guestPlayerName}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Game Session">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Date</label>
            <input 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [color-scheme:dark]"
            />
          </div>

          {/* Who's playing */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">Who's playing today?</label>
              <span className="text-xs text-slate-500">{selectedPlayerIds.length} selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {fixedPlayers.map(p => {
                const isSelected = selectedPlayerIds.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                      isSelected
                        ? "bg-primary/10 border-primary text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    <span className="font-semibold">{p.name}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isSelected ? "border-primary bg-primary" : "border-slate-600"
                    )}>
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest player */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Guest Player <span className="text-slate-500">(optional)</span></label>
            <input 
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Enter guest player's name"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending || selectedPlayerIds.length === 0}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isPending ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Start Session"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
