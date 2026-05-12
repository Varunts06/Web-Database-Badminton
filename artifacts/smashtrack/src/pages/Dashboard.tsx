import React, { useState } from "react";
import { 
  useGetPlayers, 
  useCreatePlayer, 
  useUpdatePlayer, 
  useDeletePlayer,
  getGetPlayersQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus, TrendingUp, TrendingDown, Wallet, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Modal } from "@/components/Modal";
import { motion } from "framer-motion";

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: players, isLoading } = useGetPlayers();
  
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const invalidatePlayers = () => queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });

  const { mutate: createPlayer, isPending: isCreatingPlayer } = useCreatePlayer({
    mutation: { onSuccess: () => { invalidatePlayers(); setIsAddPlayerModalOpen(false); } }
  });

  const { mutate: updatePlayer, isPending: isUpdatingPlayer } = useUpdatePlayer({
    mutation: { onSuccess: () => { invalidatePlayers(); setIsEditPlayerModalOpen(false); setSelectedPlayerId(null); } }
  });

  const { mutate: updateBalance, isPending: isUpdatingBalance } = useUpdatePlayer({
    mutation: { onSuccess: () => { invalidatePlayers(); setIsTopUpModalOpen(false); setSelectedPlayerId(null); } }
  });

  const { mutate: deletePlayer, isPending: isDeletingPlayer } = useDeletePlayer({
    mutation: { onSuccess: () => { invalidatePlayers(); } }
  });

  const handleAddPlayer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPlayer({ data: { name: formData.get("name") as string, isFixed: false } });
  };

  const handleTopUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    const formData = new FormData(e.currentTarget);
    updateBalance({ id: selectedPlayerId, data: { amount: Number(formData.get("amount")), description: formData.get("description") as string || "Manual Top Up", name: undefined } });
  };

  const handleEditPlayer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlayerId) return;
    updatePlayer({ id: selectedPlayerId, data: { name: editName } });
  };

  const handleDeletePlayer = (id: number) => {
    if (confirm("Delete this guest player? This cannot be undone.")) {
      deletePlayer({ id });
    }
  };

  const openTopUp = (id: number) => { setSelectedPlayerId(id); setIsTopUpModalOpen(true); };
  const openEdit = (id: number, name: string) => { setSelectedPlayerId(id); setEditName(name); setIsEditPlayerModalOpen(true); };

  const selectedPlayer = players?.find(p => p.id === selectedPlayerId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-panel border-primary/20">
        <div className="absolute inset-0 z-0">
          <img src={`${import.meta.env.BASE_URL}images/hero-bg.png`} alt="Badminton court" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mb-2">
              Bet <span className="text-primary">Balances</span>
            </h1>
            <p className="text-slate-400 text-lg">Track who owes what from match bets.</p>
          </div>
          <button onClick={() => setIsAddPlayerModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-bold transition-all shadow-lg shadow-white/10 active:scale-95">
            <UserPlus size={20} />
            Add Guest Player
          </button>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-secondary animate-pulse" />)
        ) : (
          players?.map((player, index) => {
            const betBal = player.betBalance ?? 0;
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={player.id}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-lg shadow-black/20 group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      {player.name}
                      {!player.isFixed && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">Guest</span>}
                    </h3>
                    <p className="text-sm text-slate-400">Bet Balance</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", betBal > 0 ? "bg-emerald-500/10 text-emerald-500" : betBal < 0 ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-400")}>
                    <Wallet size={24} />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-3xl font-display font-bold tracking-tight", betBal > 0 ? "text-emerald-400" : betBal < 0 ? "text-red-400" : "text-white")}>
                      {formatCurrency(betBal)}
                    </span>
                    {betBal > 0 && <TrendingUp size={20} className="text-emerald-500 mb-1" />}
                    {betBal < 0 && <TrendingDown size={20} className="text-red-500 mb-1" />}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(player.id, player.name)} className="w-9 h-9 rounded-xl bg-secondary hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all" aria-label="Edit player">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => openTopUp(player.id)} className="w-9 h-9 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-slate-400 transition-all" aria-label="Adjust balance">
                      <Plus size={18} />
                    </button>
                    {!player.isFixed && (
                      <button onClick={() => handleDeletePlayer(player.id)} className="w-9 h-9 rounded-xl bg-secondary hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all" aria-label="Delete player">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Guest Player Modal */}
      <Modal isOpen={isAddPlayerModalOpen} onClose={() => setIsAddPlayerModalOpen(false)} title="Add Guest Player">
        <form onSubmit={handleAddPlayer} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Guest Player Name</label>
            <input name="name" required placeholder="e.g. Rahul" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <button type="submit" disabled={isCreatingPlayer} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center">
            {isCreatingPlayer ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Add Guest"}
          </button>
        </form>
      </Modal>

      {/* Edit Player Modal */}
      <Modal isOpen={isEditPlayerModalOpen} onClose={() => { setIsEditPlayerModalOpen(false); setSelectedPlayerId(null); }} title={`Edit Player — ${selectedPlayer?.name}`}>
        <form onSubmit={handleEditPlayer} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Player Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg" />
          </div>
          <button type="submit" disabled={isUpdatingPlayer || !editName.trim()} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center">
            {isUpdatingPlayer ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Save Name"}
          </button>
        </form>
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal isOpen={isTopUpModalOpen} onClose={() => { setIsTopUpModalOpen(false); setSelectedPlayerId(null); }} title={`Adjust Balance — ${selectedPlayer?.name}`}>
        <form onSubmit={handleTopUp} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Amount (₹)</label>
            <input name="amount" type="number" required placeholder="e.g. 100 or -50" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xl" />
            <p className="text-xs text-slate-500">Use negative to deduct from balance.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Note</label>
            <input name="description" placeholder="e.g. Paid cash" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <button type="submit" disabled={isUpdatingBalance} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center glow-effect">
            {isUpdatingBalance ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Confirm"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
