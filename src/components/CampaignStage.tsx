import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getRegionById, getStageById } from '../data/worldMap';

// ─── Campaign Stage Component ─────────────────────────────────────────────────────
// Stage battle UI placeholder - shows stage info, enemy cards, and back button

interface CampaignStageProps {
  regionId: string;
  stageId: string;
  onBack: () => void;
}

export default function CampaignStage({ regionId, stageId, onBack }: CampaignStageProps) {
  const { t } = useTranslation();
  const region = getRegionById(regionId);
  const stage = getStageById(regionId, stageId);

  if (!region || !stage) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Stage not found</p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const stageEmoji = stage.type === 'boss' ? '👹' : stage.type === 'elite' ? '⚔️' : stage.type === 'miniboss' ? '💀' : '⚪';
  const stageColor = stage.type === 'boss' ? 'from-red-600 to-red-800' : 
                     stage.type === 'elite' ? 'from-purple-600 to-purple-800' : 
                     stage.type === 'miniboss' ? 'from-orange-600 to-orange-800' : 
                     'from-slate-600 to-slate-800';

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{stageEmoji}</span>
              <h1 className="text-xl font-bold text-white">
                {t(stage.nameKey) || stage.nameKey}
              </h1>
            </div>
            <p className="text-sm text-white/60">
              {t(region.nameKey) || region.nameKey} - {t('campaign.stage')} {region.stages.findIndex(s => s.id === stageId) + 1}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10">
            <span className="text-amber-400">⚡</span>
            <span className="text-white font-semibold">{stage.staminaCost}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Stage Type Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 rounded-3xl bg-gradient-to-r ${stageColor} p-6 text-center`}
        >
          <span className="text-6xl mb-4 block">{stageEmoji}</span>
          <h2 className="text-2xl font-bold text-white mb-2">
            {stage.type === 'boss' ? 'BOSS BATTLE' : 
             stage.type === 'elite' ? 'ELITE STAGE' : 
             stage.type === 'miniboss' ? 'MINIBOSS STAGE' : 'NORMAL STAGE'}
          </h2>
          <p className="text-white/80">
            {stage.type === 'boss' ? 'Defeat the boss to clear this stage!' :
             stage.type === 'elite' ? 'A powerful enemy awaits!' :
             stage.type === 'miniboss' ? 'A mini-boss guards this area!' : 'Clear all enemies to win!'}
          </p>
        </motion.div>

        {/* Enemy Cards Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>👾</span> Enemies
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {stage.trashCardIds.slice(0, 4).map((cardId, index) => (
              <motion.div
                key={cardId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/20 p-4 text-center"
              >
                <div className="w-16 h-20 mx-auto mb-2 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="text-3xl">🗑️</span>
                </div>
                <p className="text-sm text-white/80">Card #{cardId}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Boss Card (if applicable) */}
        {stage.bossCardId && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>👹</span> Boss
            </h3>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="rounded-3xl bg-gradient-to-br from-red-700 to-red-900 border-2 border-red-500 p-6 text-center"
            >
              <div className="w-24 h-32 mx-auto mb-4 rounded-2xl bg-black/30 flex items-center justify-center">
                <span className="text-5xl">👹</span>
              </div>
              <p className="text-xl font-bold text-white mb-1">Boss Card #{stage.bossCardId}</p>
              <p className="text-white/60">
                HP x{stage.hpMult} | ATK x{stage.atkMult}
              </p>
            </motion.div>
          </div>
        )}

        {/* Rewards Preview */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>🎁</span> Rewards (3 Stars)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {stage.stars.map((star, index) => (
              <div key={index} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[...Array(index + 1)].map((_, i) => (
                    <span key={i} className="text-amber-400">⭐</span>
                  ))}
                </div>
                <p className="text-emerald-400 font-semibold">+{star.xp} XP</p>
                <p className="text-amber-400">+{star.gold} Gold</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start Battle Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full py-4 rounded-2xl font-bold text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/30 transition-all"
        >
          ⚔️ Start Battle
        </motion.button>

        {/* Placeholder Notice */}
        <div className="mt-6 p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center">
          <p className="text-amber-300 text-sm">
            🔧 This is a placeholder. Full battle mechanics coming in Phase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
