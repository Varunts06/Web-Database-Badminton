import React, { useState } from "react";
import { Link } from "wouter";
import { useGetSessions, useCreateSession, getGetSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, Users, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/Modal";
import { motion } from "framer-motion";

export function Sessions() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useGetSessions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { mutate: createSession, isPending } = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
        setIsModalOpen(false);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSession({
      data: {
        date: formData.get("date") as string,
        guestPlayerName: formData.get("guestPlayerName") as string || null,
        notes: formData.get("notes") as string || null,
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Game Sessions</h1>
          <p className="text-slate-400 mt-1">Track matches across different game days.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
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
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CalendarDays size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-display">
                        {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      {session.notes && <p className="text-sm text-slate-400 line-clamp-1">{session.notes}</p>}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ChevronRight size={20} />
                  </div>
                </div>
                
                {session.guestPlayerName && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/50 text-sm text-slate-300">
                    <Users size={16} className="text-slate-500" />
                    Guest: <span className="font-semibold text-white">{session.guestPlayerName}</span>
                  </div>
                )}
              </Link>
            </motion.div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Session">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Date</label>
            <input 
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all [color-scheme:dark]"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Guest Player (Optional)</label>
            <input 
              name="guestPlayerName"
              placeholder="Did anyone else play today?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Notes (Optional)</label>
            <textarea 
              name="notes"
              placeholder="e.g. Great games, very intense!"
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
          >
            {isPending ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Create Session"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
