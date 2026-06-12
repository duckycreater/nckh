import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { REGIONS } from '../data/worldMap';

// ─── World Map Component ─────────────────────────────────────────────────────────
// Massive open-world style campaign map with 10 regions

interface WorldMapProps {
  playerLevel: number;
  unlockedRegions: string[];
  currentRegion: string;
  onSelectRegion: (regionId: string) => void;
  onBack: () => void;
}

export default function WorldMap({ playerLevel, unlockedRegions, currentRegion, onSelectRegion, onBack }: WorldMapProps) {
  const { t } = useTranslation();
  
  const [selectedRegion, setSelectedRegion] = useState<string | null>(currentRegion || null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showRegionDetail, setShowRegionDetail] = useState(false);

  const isRegionUnlocked = (regionId: string) => {
    const region = REGIONS.find(r => r.id === regionId);
    if (!region) return false;
    if (region.requiredPreviousRegion && !unlockedRegions.includes(region.requiredPreviousRegion)) return false;
    return playerLevel >= region.requiredPlayerLevel;
  };

  const regionGradients: Record<string, string> = {
    region_01: 'from-slate-600 via-zinc-700 to-stone-800',
    region_02: 'from-amber-700 via-orange-800 to-red-900',
    region_03: 'from-slate-800 via-zinc-900 to-neutral-950',
    region_04: 'from-green-800 via-emerald-900 to-teal-950',
    region_05: 'from-red-900 via-rose-950 to-neutral-950',
    region_06: 'from-cyan-800 via-blue-900 to-indigo-950',
    region_07: 'from-blue-900 via-sky-950 to-cyan-950',
    region_08: 'from-violet-950 via-purple-950 to-fuchsia-950',
    region_09: 'from-neutral-950 via-stone-950 to-zinc-950',
    region_10: 'from-yellow-600 via-amber-700 to-orange-800',
  };

  const regionIcons: Record<string, string> = {
    region_01: '🏚️',
    region_02: '🏪',
    region_03: '🏭',
    region_04: '🏢',
    region_05: '☢️',
    region_06: '♻️',
    region_07: '🌊',
    region_08: '⛔',
    region_09: '🔥',
    region_10: '👑',
  };

  const selectedRegionData = selectedRegion ? REGIONS.find(r => r.id === selectedRegion) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Star field */}
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: Math.random() * 2 + 1 + 'px',
                height: Math.random() * 2 + 1 + 'px',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 3 + 2 + 's',
              }}
            />
          ))}
        </div>
        
        {/* Title */}
        <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t('campaign.worldMap')}
            </h1>
            <p className="text-sm text-white/60">{t('campaign.worldMapSubtitle')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md">
            <span className="text-sm text-white/80">{t('campaign.playerLevel')}:</span>
            <span className="text-lg font-bold text-amber-400">{playerLevel}</span>
          </div>
        </div>

        {/* Map container */}
        <div className="absolute inset-0 top-20 flex items-center justify-center px-8">
          <div className="relative w-full max-w-5xl">
            {/* Region nodes arranged in a winding path */}
            <div className="flex flex-col gap-16">
              {/* Row 1: Regions 1-2 */}
              <div className="flex justify-between items-center">
                {REGIONS.slice(0, 2).map((region) => (
                  <RegionNode
                    key={region.id}
                    region={region}
                    isUnlocked={isRegionUnlocked(region.id)}
                    isSelected={selectedRegion === region.id}
                    isHovered={hoveredRegion === region.id}
                    gradient={regionGradients[region.id]}
                    icon={regionIcons[region.id]}
                    onHover={() => setHoveredRegion(region.id)}
                    onLeave={() => setHoveredRegion(null)}
                    onClick={() => { setSelectedRegion(region.id); setShowRegionDetail(true); }}
                    t={t}
                  />
                ))}
              </div>
              
              {/* Connector line */}
              <div className="relative h-8 flex justify-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/40 to-emerald-500/40" />
              </div>
              
              {/* Row 2: Regions 3-4 */}
              <div className="flex justify-between items-center">
                {REGIONS.slice(2, 4).map((region) => (
                  <RegionNode
                    key={region.id}
                    region={region}
                    isUnlocked={isRegionUnlocked(region.id)}
                    isSelected={selectedRegion === region.id}
                    isHovered={hoveredRegion === region.id}
                    gradient={regionGradients[region.id]}
                    icon={regionIcons[region.id]}
                    onHover={() => setHoveredRegion(region.id)}
                    onLeave={() => setHoveredRegion(null)}
                    onClick={() => { setSelectedRegion(region.id); setShowRegionDetail(true); }}
                    t={t}
                  />
                ))}
              </div>
              
              {/* Connector line */}
              <div className="relative h-8 flex justify-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/40 to-teal-500/40" />
              </div>
              
              {/* Row 3: Regions 5-6 */}
              <div className="flex justify-between items-center">
                {REGIONS.slice(4, 6).map((region) => (
                  <RegionNode
                    key={region.id}
                    region={region}
                    isUnlocked={isRegionUnlocked(region.id)}
                    isSelected={selectedRegion === region.id}
                    isHovered={hoveredRegion === region.id}
                    gradient={regionGradients[region.id]}
                    icon={regionIcons[region.id]}
                    onHover={() => setHoveredRegion(region.id)}
                    onLeave={() => setHoveredRegion(null)}
                    onClick={() => { setSelectedRegion(region.id); setShowRegionDetail(true); }}
                    t={t}
                  />
                ))}
              </div>
              
              {/* Connector line */}
              <div className="relative h-8 flex justify-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-500/40 to-cyan-500/40" />
              </div>
              
              {/* Row 4: Regions 7-8 */}
              <div className="flex justify-between items-center">
                {REGIONS.slice(6, 8).map((region) => (
                  <RegionNode
                    key={region.id}
                    region={region}
                    isUnlocked={isRegionUnlocked(region.id)}
                    isSelected={selectedRegion === region.id}
                    isHovered={hoveredRegion === region.id}
                    gradient={regionGradients[region.id]}
                    icon={regionIcons[region.id]}
                    onHover={() => setHoveredRegion(region.id)}
                    onLeave={() => setHoveredRegion(null)}
                    onClick={() => { setSelectedRegion(region.id); setShowRegionDetail(true); }}
                    t={t}
                  />
                ))}
              </div>
              
              {/* Connector line */}
              <div className="relative h-8 flex justify-center">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/40 to-violet-500/40" />
              </div>
              
              {/* Row 5: Regions 9-10 */}
              <div className="flex justify-between items-center">
                {REGIONS.slice(8, 10).map((region) => (
                  <RegionNode
                    key={region.id}
                    region={region}
                    isUnlocked={isRegionUnlocked(region.id)}
                    isSelected={selectedRegion === region.id}
                    isHovered={hoveredRegion === region.id}
                    gradient={regionGradients[region.id]}
                    icon={regionIcons[region.id]}
                    onHover={() => setHoveredRegion(region.id)}
                    onLeave={() => setHoveredRegion(null)}
                    onClick={() => { setSelectedRegion(region.id); setShowRegionDetail(true); }}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Region detail panel */}
      <AnimatePresence>
        {showRegionDetail && selectedRegionData && (
          <RegionDetailPanel
            region={selectedRegionData}
            isUnlocked={isRegionUnlocked(selectedRegionData.id)}
            playerLevel={playerLevel}
            onClose={() => setShowRegionDetail(false)}
            onStartCampaign={() => {
              onSelectRegion(selectedRegionData.id);
              setShowRegionDetail(false);
            }}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Region Node Component ────────────────────────────────────────────────────────
function RegionNode({ region, isUnlocked, isSelected, isHovered, gradient, icon, onHover, onLeave, onClick, t }: {
  region: any;
  isUnlocked: boolean;
  isSelected: boolean;
  isHovered: boolean;
  gradient: string;
  icon: string;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  t: any;
}) {
  return (
    <motion.div
      className={`relative cursor-pointer ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
      onHoverStart={isUnlocked ? onHover : undefined}
      onHoverEnd={isUnlocked ? onLeave : undefined}
      onClick={isUnlocked ? onClick : undefined}
      whileHover={isUnlocked ? { scale: 1.05 } : {}}
      whileTap={isUnlocked ? { scale: 0.95 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: REGIONS.indexOf(region) * 0.05 }}
    >
      {/* Glow effect */}
      {isUnlocked && (isSelected || isHovered) && (
        <div className={`absolute -inset-4 bg-gradient-to-br ${gradient} opacity-20 blur-xl rounded-3xl`} />
      )}
      
      {/* Node card */}
      <div className={`
        relative w-36 h-36 rounded-3xl bg-gradient-to-br ${gradient}
        border-2 transition-all duration-300 backdrop-blur-sm
        ${isSelected ? 'border-amber-400 shadow-lg shadow-amber-400/30' : isHovered ? 'border-white/50' : 'border-white/20'}
        ${isUnlocked ? '' : 'grayscale'}
      `}>
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl drop-shadow-lg">{icon}</span>
        </div>
        
        {/* Lock overlay */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl">
            <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
        
        {/* Level badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
          <span className="text-xs font-bold text-white">Lv.{region.requiredPlayerLevel}</span>
        </div>
        
        {/* Selected ring */}
        {isSelected && (
          <motion.div
            className="absolute -inset-2 rounded-3xl border-2 border-amber-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{ background: 'conic-gradient(from 0deg, transparent, #f59e0b, transparent)' }}
          />
        )}
      </div>
      
      {/* Region name */}
      <p className="mt-3 text-center text-sm font-semibold text-white/90 truncate px-2">
        {t(region.nameKey) || region.nameKey}
      </p>
    </motion.div>
  );
}

// ─── Region Detail Panel ─────────────────────────────────────────────────────────
function RegionDetailPanel({ region, isUnlocked, playerLevel, onClose, onStartCampaign, t }: {
  region: any;
  isUnlocked: boolean;
  playerLevel: number;
  onClose: () => void;
  onStartCampaign: () => void;
  t: any;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-end justify-center pb-8 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="pointer-events-auto w-full max-w-lg mx-4 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/20 p-6 shadow-2xl"
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{t(region.nameKey) || region.nameKey}</h2>
            <p className="text-sm text-white/60 mt-1">{t(region.descriptionKey) || region.descriptionKey}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{region.stages.length}</p>
            <p className="text-xs text-white/50">{t('campaign.stages')}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{region.stages.length * 3}</p>
            <p className="text-xs text-white/50">{t('campaign.totalStars')}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">Lv.{region.requiredPlayerLevel}+</p>
            <p className="text-xs text-white/50">{t('campaign.requiredLevel')}</p>
          </div>
        </div>
        
        {/* Stage preview */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {region.stages.map((stage: any, i: number) => (
            <div key={stage.id} className="flex-shrink-0 w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center">
              <span className="text-lg">{stage.type === 'boss' ? '👹' : stage.type === 'elite' ? '⚔️' : stage.type === 'miniboss' ? '💀' : '⚪'}</span>
              <span className="text-[10px] text-white/50 mt-1">{t('campaign.stage')} {i + 1}</span>
            </div>
          ))}
        </div>
        
        {/* CTA */}
        {isUnlocked ? (
          <button
            onClick={onStartCampaign}
            className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30 transition-all"
          >
            {t('campaign.startCampaign')}
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl text-center text-white/50">
            <p className="font-semibold">{t('campaign.locked')}</p>
            <p className="text-sm">{t('campaign.reachLevel')} {region.requiredPlayerLevel}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
