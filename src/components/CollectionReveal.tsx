import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getCardById, CARD_DEFINITIONS } from '../lib/cards';

interface CollectionRevealProps {
  cardIds: number[];
  isOpen: boolean;
  onClose: () => void;
  onCardCollected?: (cardId: number) => void;
}

export default function CollectionReveal({ cardIds, isOpen, onClose, onCardCollected }: CollectionRevealProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealPhase, setRevealPhase] = useState<'anticipation' | 'flip' | 'rarity' | 'stats' | 'done'>('anticipation');
  const [showDuplicate, setShowDuplicate] = useState(false);

  const currentCardId = cardIds[currentIndex];
  const card = currentCardId ? CARD_DEFINITIONS.find(c => c.id === currentCardId) : null;
  const rarityId = card?.rarity?.id ?? 'common';

  useEffect(() => {
    if (!isOpen || !cardIds.length) return;
    setCurrentIndex(0);
    setRevealPhase('anticipation');
    setShowDuplicate(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setRevealPhase('flip');
    }, 1000));

    timers.push(setTimeout(() => {
      setRevealPhase('rarity');
    }, 2000));

    timers.push(setTimeout(() => {
      setRevealPhase('stats');
    }, 3500));

    timers.push(setTimeout(() => {
      if (currentIndex < cardIds.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setRevealPhase('anticipation');
      } else {
        setRevealPhase('done');
      }
    }, 4500));

    return () => timers.forEach(clearTimeout);
  }, [isOpen, cardIds, currentIndex]);

  useEffect(() => {
    if (revealPhase === 'done' && currentCardId) {
      onCardCollected?.(currentCardId);
    }
  }, [revealPhase, currentCardId, onCardCollected]);

  const rarityConfig: Record<string, {
    color: string;
    bgColor: string;
    glowColor: string;
    particles: number;
    screenEffect: 'none' | 'flash' | 'shockwave' | 'explosion' | 'rainbow' | 'glitch';
    sound: string;
  }> = {
    common: { color: 'text-slate-600', bgColor: 'bg-slate-100', glowColor: '#94a3b8', particles: 4, screenEffect: 'none', sound: 'reveal' },
    uncommon: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', glowColor: '#10b981', particles: 8, screenEffect: 'flash', sound: 'reveal' },
    rare: { color: 'text-blue-600', bgColor: 'bg-blue-100', glowColor: '#3b82f6', particles: 12, screenEffect: 'shockwave', sound: 'reveal' },
    epic: { color: 'text-purple-600', bgColor: 'bg-purple-100', glowColor: '#a855f7', particles: 20, screenEffect: 'explosion', sound: 'fanfare' },
    legendary: { color: 'text-amber-500', bgColor: 'bg-amber-100', glowColor: '#f59e0b', particles: 35, screenEffect: 'explosion', sound: 'fanfare' },
    mythical: { color: 'text-red-600', bgColor: 'bg-red-100', glowColor: '#dc2626', particles: 50, screenEffect: 'rainbow', sound: 'fanfare' },
    event: { color: 'text-pink-600', bgColor: 'bg-pink-100', glowColor: '#ec4899', particles: 60, screenEffect: 'glitch', sound: 'fanfare' },
  };

  const config = rarityConfig[rarityId] ?? rarityConfig.common;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Screen flash effect */}
          <AnimatePresence>
            {revealPhase === 'flip' && (
              <motion.div
                className="absolute inset-0 z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: config.screenEffect === 'flash' ? 0.8 : config.screenEffect === 'shockwave' || config.screenEffect === 'explosion' ? 0.6 : 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  background: config.screenEffect === 'rainbow'
                    ? 'linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444)'
                    : config.screenEffect === 'explosion'
                    ? `radial-gradient(circle, ${config.glowColor}80 0%, transparent 70%)`
                    : config.screenEffect === 'shockwave'
                    ? `radial-gradient(circle, ${config.glowColor}60 0%, transparent 60%)`
                    : config.glowColor + '40',
                  backdropFilter: 'blur(4px)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Particle system */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
            {Array.from({ length: config.particles }).map((_, i) => (
              <motion.div
                key={`particle-${currentIndex}-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: config.glowColor,
                  left: '50%',
                  top: '50%',
                  boxShadow: `0 0 8px ${config.glowColor}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 600,
                  y: (Math.random() - 0.5) * 600,
                  opacity: 0,
                  scale: 0,
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 1.2, delay: revealPhase === 'flip' ? 0.1 : 0, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Card reveal */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 100, delay: 0.2 }}
          >
            {/* Card */}
            <motion.div
              className="relative w-64 h-96 rounded-2xl overflow-hidden"
              animate={
                config.screenEffect === 'explosion' && revealPhase === 'flip'
                  ? { scale: [1, 1.15, 1], x: [0, -8, 8, -4, 4, 0] }
                  : config.screenEffect === 'glitch' && revealPhase === 'flip'
                  ? { x: [0, -10, 10, -5, 5, 0], filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(180deg)', 'hue-rotate(0deg)'] }
                  : {}
              }
              transition={{ duration: 0.6 }}
            >
              {/* Card background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card?.element?.gradient ?? 'from-slate-400 to-slate-600'}`} />
              
              {/* Card content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-white">
                {/* Rarity badge */}
                <motion.div
                  className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold uppercase ${config.bgColor} ${config.color}`}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {t(rarityId)}
                </motion.div>

                {/* Card name */}
                <motion.h3
                  className="text-xl font-bold text-center mt-8 drop-shadow-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {card?.name ?? 'Unknown'}
                </motion.h3>

                {/* Card element icon */}
                <motion.div
                  className="text-6xl my-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                >
                  {card?.element?.icon ?? '🃏'}
                </motion.div>

                {/* Card subtitle */}
                <motion.p
                  className="text-sm text-white/80 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {card?.subtitle ?? ''}
                </motion.p>

                {/* Stats */}
                <motion.div
                  className="mt-auto grid grid-cols-3 gap-2 w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  {[
                    { label: 'ATK', value: card?.atk ?? 0, color: 'text-red-400' },
                    { label: 'HP', value: card?.hp ?? 0, color: 'text-green-400' },
                    { label: 'DEF', value: card?.def ?? 0, color: 'text-blue-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-black/30 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-white/60">{stat.label}</p>
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Rarity border glow */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: `0 0 30px ${config.glowColor}, 0 0 60px ${config.glowColor}40, inset 0 0 20px ${config.glowColor}20` }}
              />

              {/* Animated shimmer for rare+ */}
              {(rarityId === 'rare' || rarityId === 'epic' || rarityId === 'legendary' || rarityId === 'mythical' || rarityId === 'event') && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-30"
                  style={{
                    background: `linear-gradient(135deg, transparent 40%, ${config.glowColor}80 50%, transparent 60%)`,
                    backgroundSize: '200% 200%',
                    animation: 'card-shimmer 2s linear infinite',
                  }}
                />
              )}
            </motion.div>

            {/* NEW CARD badge */}
            {revealPhase === 'flip' && (
              <motion.div
                className="absolute -top-4 -right-4 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg rotate-12"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 12 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                ✨ {t('collection.newCard')}
              </motion.div>
            )}
          </motion.div>

          {/* Progress indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {cardIds.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-amber-400 scale-125' : i < currentIndex ? 'bg-emerald-400' : 'bg-white/30'}`}
              />
            ))}
          </div>

          {/* Done state */}
          {revealPhase === 'done' && (
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all"
              >
                {t('collection.viewCollection')}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
