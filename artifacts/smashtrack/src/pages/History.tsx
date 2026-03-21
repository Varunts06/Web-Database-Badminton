import React from "react";
import { useGetBets } from "@workspace/api-client-react";
import { format } from "date-fns";
import { formatCurrency, cn } from "@/lib/utils";
import { ArrowRight, Trophy, Map, Wallet, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

export function History() {
  const { data: bets, isLoading } = useGetBets();

  // Group bets by date
  const groupedBets = bets?.reduce((acc, bet) => {
    const dateStr = format(new Date(bet.createdAt), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(bet);
    return acc;
  }, {} as Record<string, typeof bets>) || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold text-white">Ledger History</h1>
        <p className="text-slate-400 mt-1">All matches, court fees, and top-ups.</p>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))
        ) : Object.keys(groupedBets).length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No transactions yet</h3>
            <p className="text-slate-400">Play matches or log court fees to see history here.</p>
          </div>
        ) : (
          Object.entries(groupedBets).sort((a,b) => b[0].localeCompare(a[0])).map(([dateStr, dayBets], groupIdx) => (
            <div key={dateStr} className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarDays size={16} className="text-primary" />
                <h3 className="font-bold text-slate-300">
                  {format(new Date(dateStr), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="flex-1 h-px bg-slate-800 ml-2" />
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                {dayBets.map((bet, i) => {
                  const isMatch = !!bet.matchId;
                  const isCourt = !!bet.courtBookingId;
                  const isManual = !isMatch && !isCourt;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (groupIdx * 0.1) + (i * 0.05) }}
                      key={bet.id} 
                      className={cn(
                        "p-4 sm:p-5 flex items-center justify-between gap-4",
                        i !== dayBets.length - 1 ? "border-b border-slate-800/50" : ""
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          isMatch ? "bg-orange-500/10 text-orange-500" : 
                          isCourt ? "bg-blue-500/10 text-blue-500" : 
                          "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {isMatch ? <Trophy size={18} /> : 
                           isCourt ? <Map size={18} /> : 
                           <Wallet size={18} />}
                        </div>
                        
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 text-sm sm:text-base font-medium">
                            <span className="text-red-400">{bet.fromPlayerName}</span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="text-emerald-400">{bet.toPlayerName}</span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
                            {bet.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="font-display font-bold text-white text-lg">
                          {formatCurrency(bet.amount)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
