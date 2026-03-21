import React, { useState } from "react";
import { 
  useGetCourtBookings, 
  useGetPlayers, 
  useCreateCourtBooking,
  getGetCourtBookingsQueryKey,
  getGetPlayersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Map, CreditCard, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/Modal";
import { cn, formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

export function CourtBookings() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useGetCourtBookings();
  const { data: players } = useGetPlayers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payerId, setPayerId] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [amount, setAmount] = useState(200);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { mutate: createBooking, isPending } = useCreateCourtBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCourtBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
        setIsModalOpen(false);
        setSelectedPlayers([]);
        setPayerId("");
      }
    }
  });

  const togglePlayer = (id: string) => {
    if (selectedPlayers.includes(id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p !== id));
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers([...selectedPlayers, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerId || selectedPlayers.length !== 4) return;
    
    createBooking({
      data: {
        payerId: parseInt(payerId),
        player1Id: parseInt(selectedPlayers[0]),
        player2Id: parseInt(selectedPlayers[1]),
        player3Id: parseInt(selectedPlayers[2]),
        player4Id: parseInt(selectedPlayers[3]),
        totalAmount: amount,
        date
      }
    });
  };

  const splitAmount = amount / 4;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Court Bookings</h1>
          <p className="text-slate-400 mt-1">Log payments and automatically split costs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 glow-effect"
        >
          <Plus size={20} />
          Log Court Fee
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary animate-pulse" />
          ))
        ) : bookings?.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No bookings logged</h3>
            <p className="text-slate-400">Log who paid for the court to split debts.</p>
          </div>
        ) : (
          bookings?.map((booking, i) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={booking.id} 
              className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display mb-1">
                    {format(new Date(booking.date), 'MMMM d, yyyy')}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CreditCard size={14} />
                    <span>Paid by <strong className="text-white">{booking.payerName}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex-1 max-w-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Players split</p>
                <div className="flex flex-wrap gap-2">
                  {[booking.player1Name, booking.player2Name, booking.player3Name, booking.player4Name].map((name, idx) => (
                    <span key={idx} className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md border border-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">Total Fee</p>
                <p className="text-2xl font-bold font-display text-emerald-400">{formatCurrency(booking.totalAmount)}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Court Payment">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Who Paid?</label>
            <select 
              value={payerId} 
              onChange={e => setPayerId(e.target.value)} 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
            >
              <option value="">Select Payer</option>
              {players?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-medium text-slate-300">Who Played? (Select exactly 4)</label>
              <span className={cn(
                "text-xs font-bold px-2 py-1 rounded-full",
                selectedPlayers.length === 4 ? "bg-primary/20 text-primary" : "bg-slate-800 text-slate-400"
              )}>
                {selectedPlayers.length}/4
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {players?.map(p => {
                const isSelected = selectedPlayers.includes(p.id.toString());
                const isDisabled = !isSelected && selectedPlayers.length >= 4;
                return (
                  <button
                    type="button"
                    key={p.id}
                    disabled={isDisabled}
                    onClick={() => togglePlayer(p.id.toString())}
                    className={cn(
                      "p-3 rounded-xl border text-left flex items-center justify-between transition-all",
                      isSelected 
                        ? "bg-primary/10 border-primary text-white" 
                        : isDisabled 
                          ? "bg-slate-950/50 border-slate-800/50 text-slate-600 cursor-not-allowed"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600"
                    )}
                  >
                    <span className="font-medium truncate">{p.name}</span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                      isSelected ? "border-primary bg-primary" : "border-slate-600"
                    )}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value) || 0)}
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                required 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary [color-scheme:dark]"
              />
            </div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-sm flex items-start gap-3">
            <CreditCard className="shrink-0 mt-0.5" size={18} />
            <p>
              The payer will be credited the full amount, and each of the 4 players will be debited <strong>₹{splitAmount.toFixed(2)}</strong>. (The payer's net change is +₹{(amount - splitAmount).toFixed(2)} if they played).
            </p>
          </div>

          <button 
            type="submit" 
            disabled={isPending || !payerId || selectedPlayers.length !== 4 || amount <= 0}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed glow-effect flex justify-center items-center"
          >
            {isPending ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Save & Split Bill"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
