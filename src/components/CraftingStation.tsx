import React, { useState, useEffect } from 'react';
import { Sparkles, Gift, Handshake, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { UserProgress, RewardItem } from '../types';
import { Skeleton, ErrorRetry } from '../lib/ui';

interface Props {
  points: number;
  onCraft: (cost: number, reason?: string) => void;
  userId: string;
  progress?: UserProgress;
  onRefresh?: (progress?: any) => void;
}

export function CraftingStation({ points, onCraft, userId, progress, onRefresh }: Props) {
  const [recipes, setRecipes] = useState<RewardItem[]>([]);
  const [craftingId, setCraftingId] = useState<string | number | null>(null);
  const [crafted, setCrafted] = useState<(string | number)[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successItem, setSuccessItem] = useState<string | null>(null);
  
  // Redeem Form state
  const [showRedeemForm, setShowRedeemForm] = useState<string | number | null>(null);
  const [fullName, setFullName] = useState('');
  const [classNameStr, setClassNameStr] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/rewards')
      .then(res => {
        if (!res.ok) throw new Error("Không thể tải danh sách quà");
        return res.json();
      })
      .then(data => {
        setRecipes(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
        setLoading(false);
      });
  }, [refetchKey]);

  useEffect(() => {
    if (progress && progress.crafted) {
      setCrafted(progress.crafted);
    }
  }, [progress]);

  const confirmRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (showRedeemForm === null) return;
    const recipeId = showRedeemForm;
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    setShowRedeemForm(null);
    handleCraft(recipeId, recipe.cost, fullName, classNameStr);
  };

  const handleCraft = (recipeId: string | number, cost: number, name: string, cls: string) => {
    if (points >= cost) {
      setCraftingId(recipeId);
      setTimeout(() => {
        setCraftingId(null);
        setCrafted((prev) => [...prev, recipeId]);
        setSuccessItem(name);
        setShowConfetti(true);

        fetch('/api/user-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: userId,
            type: 'craft',
            data: recipeId,
            redeemInfo: { fullName: name, class: cls }
          })
        }).then(res => res.json()).then(result => {
          if (result.success && onRefresh) {
            onRefresh(result.progress);
          }
        });

        onCraft(cost, `Chế tạo vật phẩm: ${name}`);
        setTimeout(() => {
          setShowConfetti(false);
          setSuccessItem(null);
        }, 4000);
      }, 3000);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mt-4 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 z-[200] pointer-events-none">
          <Confetti
            numberOfPieces={300}
            recycle={false}
            run={true}
            gravity={0.25}
            colors={["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"]}
            tweenDuration={4000}
          />
        </div>
      )}
      {successItem && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-3xl p-6 shadow-2xl border border-emerald-100 text-center max-w-xs w-[90%]"
        >
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-lg font-black text-emerald-700 mb-1">Đổi Quà Thành Công!</h3>
          <p className="text-sm text-gray-600 font-medium">{successItem}</p>
          <button
            onClick={() => { setShowConfetti(false); setSuccessItem(null); }}
            className="mt-4 bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors"
          >
            Tuyệt vời!
          </button>
        </motion.div>
      )}

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 opacity-50"></div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-gray-800 flex items-center gap-2 text-xl tracking-tight">
          <Gift className="text-amber-500" /> Đổi Quà Thưởng
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
        Sử dụng <span className="font-bold text-emerald-600">Lõi Năng Lượng</span> (Điểm) để đổi quà tặng thực tế hoặc E-voucher!
      </p>

      {/* Form Modal */}
      <AnimatePresence>
        {showRedeemForm !== null && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white flex justify-between items-center">
                <h3 className="font-black text-lg">Thông tin nhận quà</h3>
                <button onClick={() => setShowRedeemForm(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={confirmRedeem} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và Tên</label>
                  <input required value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Nguyễn Văn A" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Lớp / Đơn vị</label>
                  <input required value={classNameStr} onChange={(e) => setClassNameStr(e.target.value)} type="text" placeholder="VD: 10A1 hoặc Khách" className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md">
                  Xác nhận đổi quà
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse bg-slate-100" />
          ))}
        </div>
      )}

      {error && <ErrorRetry message={error} onRetry={() => setRefetchKey(k => k + 1)} />}

      {!loading && !error && (
      <div className="space-y-4">
        {recipes.map(recipe => {
          const isCrafting = craftingId === recipe.id;
          const canAfford = points >= recipe.cost;

          return (
            <motion.div
              key={recipe.id}
              layout
              className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${recipe.borderClass || 'border-amber-200'} ${recipe.bgClass || 'bg-amber-50'} shadow-sm hover:shadow-md`}
            >
              <AnimatePresence>
                {isCrafting && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl"
                  >
                    <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                      <Sparkles size={40} className="text-amber-500 mb-3" />
                    </motion.div>
                    <span className="font-black text-amber-600 text-lg tracking-widest uppercase animate-pulse">
                      Đang Xử Lý Quà...
                    </span>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                      <motion.div 
                        className="h-full bg-amber-500"
                        initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 3, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="p-4 flex gap-4">
                <div className={`w-24 h-24 shrink-0 rounded-2xl flex items-center justify-center shadow-md bg-white relative overflow-hidden group border border-gray-100`}>
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-black text-gray-800 text-base">{recipe.name}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed mt-1 font-medium">{recipe.desc}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {recipe.ingredients && recipe.ingredients.map((ing, i) => (
                      <span key={i} className="text-[10px] uppercase font-bold text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white/60 border-t border-black/5 p-3 flex justify-between items-center backdrop-blur-sm">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  Giá: <span className={`text-sm ${canAfford ? 'text-amber-600' : 'text-red-500'}`}>{recipe.cost} EXP</span>
                </div>
                
                {isCrafting ? (
                  <div className="flex items-center gap-1.5 text-amber-600 font-black text-sm px-4 py-2 rounded-xl bg-amber-100 shadow-inner">
                    <Sparkles size={18} className="animate-spin" /> Đang Xử Lý...
                  </div>
                ) : (
                  <motion.button
                    whileHover={canAfford ? { scale: 1.05 } : {}}
                    whileTap={canAfford ? { scale: 0.95 } : {}}
                    onClick={() => setShowRedeemForm(recipe.id)}
                    disabled={!canAfford}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all shadow-sm ${
                        canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-md hover:shadow-orange-500/20'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Handshake size={16} className={canAfford ? 'animate-pulse' : ''} /> {canAfford ? 'Đổi Ngay' : 'Chưa đủ điểm'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
        {recipes.length === 0 && (
          <p className="text-center text-gray-500 p-4">Không có quà tặng nào.</p>
        )}
      </div>
      )}
    </div>
  );
}
