import { useState, useEffect, useRef, useCallback } from 'react';
import Decimal from 'break_infinity.js';
import {
  GameState, createInitialState, getGeneratorCost, getGeneratorIncome,
  getTotalPassiveIncome, getClickValue, getUpgradeCost, applyUpgrade,
  buyGenerator, getMaxBuyable, checkAchievements, calculatePrestigeAeonites,
  performPrestige, calculateOfflineIncome, saveGame, loadGame, exportSave, importSave
} from './game/engine';
import {
  GENERATORS, UPGRADES, EPOCHS, ACHIEVEMENTS, PRESTIGE_UPGRADES,
  STORY_DIALOGS, formatNumber
} from './game/data';

type Tab = 'world' | 'shop' | 'story' | 'tree' | 'profile';
type ShopTab = 'generators' | 'upgrades';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  isCrit: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = loadGame();
    return saved || createInitialState();
  });
  const [tab, setTab] = useState<Tab>('world');
  const [shopTab, setShopTab] = useState<ShopTab>('generators');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [showOffline, setShowOffline] = useState(false);
  const [offlineIncome, setOfflineIncome] = useState(new Decimal(0));
  const [dialogVisible, setDialogVisible] = useState(false);
  const [currentDialog, setCurrentDialog] = useState(0);
  const [dialogQueue, setDialogQueue] = useState<string[]>([]);
  const [showPrestige, setShowPrestige] = useState(false);
  const [showBoss, setShowBoss] = useState(false);
  const [buyAmount, setBuyAmount] = useState<number>(1);
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [newAchievement, setNewAchievement] = useState<string | null>(null);
  const [sphereScale, setSphereScale] = useState(1);
  const [isCritFlash, setIsCritFlash] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const nextId = useRef(0);
  const comboRef = useRef(0);
  const lastClickTime = useRef(0);

  // Check for offline income on load
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      const income = calculateOfflineIncome(saved);
      if (income.gt(0)) {
        setOfflineIncome(income);
        setShowOffline(true);
      }
    }
  }, []);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const passive = getTotalPassiveIncome(prev);
        if (passive.lte(0) && prev.autoClickRate <= 0) return prev;

        let newTime = prev.time.add(passive.div(10)); // 100ms tick
        let newTotalEarned = prev.totalTimeEarned.add(passive.div(10));
        let newEpochProgress = prev.epochProgress.add(passive.div(10));

        // Auto-click
        if (prev.autoClickRate > 0) {
          const autoValue = getClickValue(prev).mul(prev.autoClickRate).div(10);
          newTime = newTime.add(autoValue);
          newTotalEarned = newTotalEarned.add(autoValue);
          newEpochProgress = newEpochProgress.add(autoValue);
        }

        // Boss damage from passive
        let newBossHp = prev.currentBossHp;
        if (prev.bossActive && newBossHp) {
          const bossDamage = passive.add(getClickValue(prev).mul(prev.autoClickRate)).div(10);
          newBossHp = newBossHp.sub(bossDamage);
          if (newBossHp.lte(0)) {
            newBossHp = null;
          }
        }

        return {
          ...prev,
          time: newTime,
          totalTimeEarned: newTotalEarned,
          epochProgress: newEpochProgress,
          currentBossHp: newBossHp,
          lastOnlineTime: Date.now(),
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(stateRef.current);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Achievement checker
  useEffect(() => {
    const interval = setInterval(() => {
      const { newState, newAchievements } = checkAchievements(stateRef.current);
      if (newAchievements.length > 0) {
        setState(newState);
        setNewAchievement(newAchievements[0]);
        setTimeout(() => setNewAchievement(null), 3000);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Combo decay
  useEffect(() => {
    const interval = setInterval(() => {
      setComboTimer(prev => {
        if (prev <= 0) {
          setCombo(0);
          comboRef.current = 0;
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Check epoch progression
  useEffect(() => {
    const epoch = EPOCHS[state.currentEpoch];
    if (!epoch) return;

    if (state.epochProgress.gte(epoch.requiredTime) && !state.bossActive && !state.bossesDefeated.includes(state.currentEpoch)) {
      // Trigger boss
      setState(prev => ({
        ...prev,
        bossActive: true,
        currentBossHp: epoch.bossHp,
      }));
      // Show boss dialog
      const bossDialog = STORY_DIALOGS.find(d => d.epoch === state.currentEpoch && d.trigger === 'boss');
      if (bossDialog && !state.dialogSeen.includes(bossDialog.id)) {
        setDialogQueue([bossDialog.id]);
        setCurrentDialog(0);
        setDialogVisible(true);
        setState(prev => ({ ...prev, dialogSeen: [...prev.dialogSeen, bossDialog.id] }));
      }
    }
  }, [state.epochProgress, state.currentEpoch, state.bossActive, state.bossesDefeated]);

  // Check boss defeat
  useEffect(() => {
    if (state.bossActive && state.currentBossHp && state.currentBossHp.lte(0)) {
      setState(prev => ({
        ...prev,
        bossActive: false,
        currentBossHp: null,
        bossesDefeated: [...prev.bossesDefeated, prev.currentEpoch],
        shards: prev.shards + 20,
      }));
      setShowBoss(false);

      // Show end dialog
      const endDialog = STORY_DIALOGS.find(d => d.epoch === state.currentEpoch && d.trigger === 'end');
      if (endDialog && !state.dialogSeen.includes(endDialog.id)) {
        setDialogQueue([endDialog.id]);
        setCurrentDialog(0);
        setDialogVisible(true);
        setState(prev => ({ ...prev, dialogSeen: [...prev.dialogSeen, endDialog.id] }));
      }

      // Advance epoch
      if (state.currentEpoch < EPOCHS.length - 1) {
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            currentEpoch: prev.currentEpoch + 1,
            epochProgress: new Decimal(0),
          }));
          // Show start dialog for new epoch
          const startDialog = STORY_DIALOGS.find(d => d.epoch === state.currentEpoch + 1 && d.trigger === 'start');
          if (startDialog) {
            setDialogQueue([startDialog.id]);
            setCurrentDialog(0);
            setDialogVisible(true);
            setState(prev => ({ ...prev, dialogSeen: [...prev.dialogSeen, startDialog.id] }));
          }
        }, 1500);
      }
    }
  }, [state.currentBossHp, state.bossActive]);

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;
    lastClickTime.current = now;

    // Combo system
    if (timeSinceLastClick < 200) {
      comboRef.current = Math.min(comboRef.current + 1, 50);
      setCombo(comboRef.current);
      setComboTimer(2000);
    } else {
      comboRef.current = Math.max(0, comboRef.current - 2);
      setCombo(comboRef.current);
      setComboTimer(1000);
    }

    if (stateRef.current.maxCombo < comboRef.current) {
      setState(prev => ({ ...prev, maxCombo: comboRef.current }));
    }

    const comboMulti = comboRef.current >= 5 ? 2 : 1;
    let clickValue = getClickValue(stateRef.current).mul(comboMulti);
    const isCrit = Math.random() * 100 < stateRef.current.critChance;

    if (isCrit) {
      clickValue = clickValue.mul(stateRef.current.critMultiplier);
      setIsCritFlash(true);
      setTimeout(() => setIsCritFlash(false), 300);
    }

    // Boss damage
    if (stateRef.current.bossActive) {
      setState(prev => ({
        ...prev,
        currentBossHp: prev.currentBossHp ? prev.currentBossHp.sub(clickValue) : null,
      }));
    }

    setState(prev => ({
      ...prev,
      time: prev.time.add(clickValue),
      totalTimeEarned: prev.totalTimeEarned.add(clickValue),
      epochProgress: prev.epochProgress.add(clickValue),
      totalClicks: prev.totalClicks + 1,
      totalCrits: prev.totalCrits + (isCrit ? 1 : 0),
    }));

    // Visual effects
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX || rect.left + rect.width / 2;
      clientY = e.touches[0]?.clientY || rect.top + rect.height / 2;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const id = nextId.current++;
    setFloatingTexts(prev => [...prev.slice(-10), {
      id,
      x: clientX - rect.left + (Math.random() - 0.5) * 40,
      y: clientY - rect.top - 20,
      text: (isCrit ? '💥 ' : '') + formatNumber(clickValue),
      isCrit,
    }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);

    // Particles
    for (let i = 0; i < (isCrit ? 8 : 4); i++) {
      const pid = nextId.current++;
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      setParticles(prev => [...prev.slice(-20), {
        id: pid,
        x: clientX - rect.left,
        y: clientY - rect.top,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: isCrit ? '#fbbf24' : '#c084fc',
      }]);
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== pid)), 800);
    }

    setSphereScale(0.9);
    setTimeout(() => setSphereScale(1), 100);
  }, []);

  const handleBuyGenerator = (genId: string) => {
    setState(prev => buyGenerator(prev, genId, buyAmount));
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    setState(prev => applyUpgrade(prev, upgradeId));
  };

  const handlePrestige = () => {
    setState(prev => performPrestige(prev));
    setShowPrestige(false);
    setTab('world');
  };

  const handleOfflineCollect = (multiplier: number = 1) => {
    setState(prev => ({
      ...prev,
      time: prev.time.add(offlineIncome.mul(multiplier)),
      totalTimeEarned: prev.totalTimeEarned.add(offlineIncome.mul(multiplier)),
    }));
    setShowOffline(false);
  };

  const handleExport = () => {
    const code = exportSave(state);
    navigator.clipboard.writeText(code).catch(() => {});
    setImportText(code);
  };

  const handleImport = () => {
    const imported = importSave(importText);
    if (imported) {
      setState(imported);
      setShowExport(false);
      setImportText('');
    }
  };

  const epoch = EPOCHS[state.currentEpoch];
  const passiveIncome = getTotalPassiveIncome(state);
  const clickValue = getClickValue(state);
  const epochProgress = epoch ? state.epochProgress.div(epoch.requiredTime).toNumber() : 1;
  const aeonitesOnPrestige = calculatePrestigeAeonites(state);

  const renderWorldScreen = () => (
    <div className={`flex flex-col items-center h-full ${epoch?.bgClass || 'epoch-chaos'} relative overflow-hidden`}>
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-purple-400"
            style={{
              width: 2 + Math.random() * 4,
              height: 2 + Math.random() * 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse-glow ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Epoch progress bar */}
      <div className="w-full px-4 pt-2 relative z-10">
        <div className="flex justify-between text-xs text-purple-300 mb-1">
          <span>{epoch?.icon} {epoch?.name}</span>
          <span>{Math.min(100, (epochProgress * 100)).toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-purple-900/50 rounded-full overflow-hidden">
          <div className="progress-bar" style={{ width: `${Math.min(100, epochProgress * 100)}%` }} />
        </div>
      </div>

      {/* Combo indicator */}
      {combo >= 5 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 animate-combo-pulse">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 rounded-full text-xs font-bold text-white">
            🔥 КОМБО x{combo} — x2 КЛИК!
          </div>
        </div>
      )}

      {/* Main sphere area */}
      <div className="flex-1 flex items-center justify-center relative w-full" style={{ minHeight: '250px' }}>
        {/* Generator sprites orbiting */}
        {GENERATORS.filter(g => g.epoch === state.currentEpoch && (state.generators[g.id] || 0) > 0).slice(0, 6).map((gen, i) => (
          <div key={gen.id} className="absolute animate-orbit" style={{
            '--orbit-radius': `${80 + i * 15}px`,
            '--orbit-duration': `${6 + i * 2}s`,
            fontSize: '20px',
          } as React.CSSProperties}>
            {gen.icon}
          </div>
        ))}

        {/* The ChronoSphere */}
        <div className="relative">
          <button
            onClick={handleClick}
            className={`chrono-sphere w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center animate-pulse-glow relative z-10 ${isCritFlash ? 'crit' : ''}`}
            style={{ transform: `scale(${sphereScale})` }}
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl mb-1">⏳</div>
              <div className="text-xs text-purple-200 font-bold">КЛИК!</div>
            </div>
          </button>

          {/* Floating texts */}
          {floatingTexts.map(ft => (
            <div key={ft.id} className="absolute pointer-events-none animate-float-up font-bold z-30"
              style={{
                left: ft.x,
                top: ft.y,
                color: ft.isCrit ? '#fbbf24' : '#c084fc',
                fontSize: ft.isCrit ? '20px' : '16px',
                textShadow: ft.isCrit ? '0 0 10px #fbbf24' : '0 0 5px #c084fc',
              }}>
              {ft.text}
            </div>
          ))}

          {/* Particles */}
          {particles.map(p => (
            <div key={p.id} className="absolute w-2 h-2 rounded-full pointer-events-none animate-particle"
              style={{
                left: p.x,
                top: p.y,
                backgroundColor: p.color,
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                boxShadow: `0 0 6px ${p.color}`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Stats below sphere */}
      <div className="w-full px-4 pb-2 relative z-10">
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-purple-900/30 rounded-lg p-2">
            <div className="text-purple-300">⚡ Клик</div>
            <div className="text-white font-bold">{formatNumber(clickValue)} Δt</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-2">
            <div className="text-purple-300">📈 В секунду</div>
            <div className="text-white font-bold">{formatNumber(passiveIncome)} Δt/с</div>
          </div>
        </div>
      </div>

      {/* Boss indicator */}
      {state.bossActive && (
        <button onClick={() => setShowBoss(true)} className="absolute bottom-24 right-4 bg-red-900/80 border border-red-500 rounded-lg p-2 animate-boss-pulse z-20">
          <div className="text-2xl">{epoch?.bossIcon}</div>
          <div className="text-xs text-red-300">БОСС!</div>
        </button>
      )}
    </div>
  );

  const renderShopScreen = () => (
    <div className="flex flex-col h-full">
      {/* Shop tabs */}
      <div className="flex border-b border-purple-800">
        <button onClick={() => setShopTab('generators')}
          className={`flex-1 py-2 text-sm font-bold ${shopTab === 'generators' ? 'tab-active' : 'text-purple-400'}`}>
          ⚙️ Генераторы
        </button>
        <button onClick={() => setShopTab('upgrades')}
          className={`flex-1 py-2 text-sm font-bold ${shopTab === 'upgrades' ? 'tab-active' : 'text-purple-400'}`}>
          ⬆️ Улучшения
        </button>
      </div>

      {/* Buy amount selector */}
      {shopTab === 'generators' && (
        <div className="flex gap-1 p-2 border-b border-purple-800/50">
          {[1, 10, 25, 100].map(n => (
            <button key={n} onClick={() => setBuyAmount(n)}
              className={`flex-1 py-1 text-xs rounded ${buyAmount === n ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-300'}`}>
              x{n}
            </button>
          ))}
          <button onClick={() => setBuyAmount(999999)}
            className={`flex-1 py-1 text-xs rounded ${buyAmount === 999999 ? 'bg-purple-600 text-white' : 'bg-purple-900/50 text-purple-300'}`}>
            MAX
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
        {shopTab === 'generators' && GENERATORS.filter(g => g.epoch <= state.currentEpoch).map(gen => {
          const owned = state.generators[gen.id] || 0;
          const cost = getGeneratorCost(gen, owned);
          const income = getGeneratorIncome(gen, 1, state);
          const canAfford = state.time.gte(cost);
          const totalIncome = getGeneratorIncome(gen, owned, state);

          return (
            <div key={gen.id} className={`bg-purple-900/30 rounded-lg p-3 border ${canAfford ? 'border-purple-600/50' : 'border-purple-900/50'}`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{gen.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white truncate">{gen.name}</span>
                    <span className="text-purple-300 text-xs ml-2">x{owned}</span>
                  </div>
                  <div className="text-xs text-purple-400">{gen.description}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-green-400">+{formatNumber(totalIncome)}/с</span>
                    <span className={`text-xs font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                      {formatNumber(cost)} Δt
                    </span>
                  </div>
                </div>
                <button onClick={() => handleBuyGenerator(gen.id)} disabled={!canAfford}
                  className="btn-primary text-xs px-3 py-2 whitespace-nowrap disabled:opacity-30">
                  Купить
                </button>
              </div>
            </div>
          );
        })}

        {shopTab === 'upgrades' && UPGRADES.filter(u => u.epoch <= state.currentEpoch).map(upgrade => {
          const level = state.upgrades[upgrade.id] || 0;
          const maxed = level >= upgrade.maxLevel;
          const cost = getUpgradeCost(upgrade, level);
          const canAfford = state.time.gte(cost) && !maxed;

          return (
            <div key={upgrade.id} className={`bg-purple-900/30 rounded-lg p-3 border ${canAfford ? 'border-yellow-600/50' : 'border-purple-900/50'}`}>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{upgrade.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white">{upgrade.name}</span>
                    <span className="text-purple-300 text-xs">Ур. {level}/{upgrade.maxLevel}</span>
                  </div>
                  <div className="text-xs text-purple-400">{upgrade.description}</div>
                  {!maxed && (
                    <div className="text-xs text-yellow-400 font-bold mt-1">{formatNumber(cost)} Δt</div>
                  )}
                </div>
                <button onClick={() => handleBuyUpgrade(upgrade.id)} disabled={!canAfford}
                  className="btn-gold text-xs px-3 py-2 whitespace-nowrap disabled:opacity-30">
                  {maxed ? 'MAX' : 'Купить'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStoryScreen = () => {
    const currentEpochData = EPOCHS[state.currentEpoch];
    const dialogs = STORY_DIALOGS.filter(d => d.epoch <= state.currentEpoch);

    return (
      <div className="flex flex-col h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
        {/* Current epoch info */}
        <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/50">
          <div className="text-center">
            <div className="text-4xl mb-2">{currentEpochData?.icon}</div>
            <h2 className="text-lg font-bold text-white">{currentEpochData?.name}</h2>
            <p className="text-sm text-purple-300 mt-1">{currentEpochData?.description}</p>
          </div>
        </div>

        {/* Boss status */}
        {state.bossesDefeated.includes(state.currentEpoch) ? (
          <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/50 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-green-300 font-bold">Босс побеждён!</div>
          </div>
        ) : state.bossActive ? (
          <div className="bg-red-900/30 rounded-xl p-4 border border-red-700/50">
            <div className="text-center mb-2">
              <div className="text-3xl animate-boss-pulse">{currentEpochData?.bossIcon}</div>
              <div className="font-bold text-red-300">{currentEpochData?.bossName}</div>
            </div>
            <div className="w-full h-4 bg-red-950 rounded-full overflow-hidden">
              <div className="hp-bar" style={{ width: `${Math.max(0, (state.currentBossHp && currentEpochData) ? state.currentBossHp.div(currentEpochData.bossHp).toNumber() * 100 : 0)}%` }} />
            </div>
            <div className="text-center text-xs text-red-400 mt-1">
              HP: {formatNumber(state.currentBossHp || 0)} / {formatNumber(currentEpochData.bossHp)}
            </div>
            <p className="text-xs text-red-300 mt-2 text-center">Кликайте по Хроносфере чтобы нанести урон!</p>
          </div>
        ) : (
          <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/50 text-center">
            <div className="text-sm text-purple-300">Прогресс эпохи</div>
            <div className="w-full h-3 bg-purple-950 rounded-full overflow-hidden mt-2">
              <div className="progress-bar" style={{ width: `${Math.min(100, epochProgress * 100)}%` }} />
            </div>
            <div className="text-xs text-purple-400 mt-1">
              {formatNumber(state.epochProgress)} / {formatNumber(currentEpochData.requiredTime)} Δt
            </div>
          </div>
        )}

        {/* Prestige button */}
        {state.bossesDefeated.length > 0 && (
          <button onClick={() => setShowPrestige(true)} className="w-full btn-gold py-3 text-center">
            <div className="text-lg">🔄 Сдвиг Времени (Престиж)</div>
            <div className="text-xs opacity-80">Получить {aeonitesOnPrestige} Эонитов</div>
          </button>
        )}

        {/* Completed epochs */}
        <div>
          <h3 className="text-sm font-bold text-purple-300 mb-2">Пройденные эпохи:</h3>
          <div className="space-y-2">
            {EPOCHS.map((ep, i) => (
              <div key={ep.id} className={`flex items-center gap-2 p-2 rounded-lg ${state.bossesDefeated.includes(i) ? 'bg-green-900/20 border border-green-700/30' : 'bg-purple-900/20 border border-purple-800/30'}`}>
                <span className="text-xl">{ep.icon}</span>
                <span className="text-sm flex-1">{ep.name}</span>
                {state.bossesDefeated.includes(i) && <span className="text-green-400">✓</span>}
                {state.currentEpoch === i && <span className="text-yellow-400 text-xs">← Текущая</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Dialog archive */}
        <div>
          <h3 className="text-sm font-bold text-purple-300 mb-2">📜 Хроники ({state.dialogSeen.length} диалогов)</h3>
          <div className="space-y-2">
            {dialogs.filter(d => state.dialogSeen.includes(d.id)).map(d => (
              <div key={d.id} className="bg-purple-900/20 rounded-lg p-3 border border-purple-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{d.characterIcon}</span>
                  <span className="text-xs font-bold text-purple-300">{d.character}</span>
                </div>
                <p className="text-xs text-purple-200">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTreeScreen = () => (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
      <h2 className="text-lg font-bold text-center text-purple-200">🌳 Дерево Технологий</h2>

      {/* Branch: Power */}
      <div className="bg-red-900/20 rounded-xl p-4 border border-red-800/30">
        <h3 className="text-sm font-bold text-red-300 mb-3">⚔️ Ветвь Силы</h3>
        {UPGRADES.filter(u => u.type === 'click' && u.epoch <= state.currentEpoch).map(u => {
          const level = state.upgrades[u.id] || 0;
          const cost = getUpgradeCost(u, level);
          const canAfford = state.time.gte(cost) && level < u.maxLevel;
          return (
            <div key={u.id} className="flex items-center gap-2 mb-2">
              <span>{u.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{u.name} ({level}/{u.maxLevel})</div>
                <div className="text-xs text-red-300">{u.description}</div>
              </div>
              <button onClick={() => handleBuyUpgrade(u.id)} disabled={!canAfford}
                className="text-xs bg-red-800/50 border border-red-600/50 rounded px-2 py-1 text-red-200 disabled:opacity-30">
                {level >= u.maxLevel ? 'MAX' : formatNumber(cost)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Branch: Wisdom */}
      <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800/30">
        <h3 className="text-sm font-bold text-blue-300 mb-3">📚 Ветвь Мудрости</h3>
        {UPGRADES.filter(u => (u.type === 'generator' || u.type === 'global') && u.epoch <= state.currentEpoch).map(u => {
          const level = state.upgrades[u.id] || 0;
          const cost = getUpgradeCost(u, level);
          const canAfford = state.time.gte(cost) && level < u.maxLevel;
          return (
            <div key={u.id} className="flex items-center gap-2 mb-2">
              <span>{u.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{u.name} ({level}/{u.maxLevel})</div>
                <div className="text-xs text-blue-300">{u.description}</div>
              </div>
              <button onClick={() => handleBuyUpgrade(u.id)} disabled={!canAfford}
                className="text-xs bg-blue-800/50 border border-blue-600/50 rounded px-2 py-1 text-blue-200 disabled:opacity-30">
                {level >= u.maxLevel ? 'MAX' : formatNumber(cost)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Branch: Eternity (Prestige) */}
      <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-800/30">
        <h3 className="text-sm font-bold text-yellow-300 mb-3">♾️ Ветвь Вечности</h3>
        <div className="text-xs text-yellow-200 mb-2">Эониты: {state.aeonites} (каждый даёт +1% ко всему)</div>
        {PRESTIGE_UPGRADES.map(pu => {
          const owned = state.prestigeUpgrades.includes(pu.id);
          const canAfford = state.aeonites >= pu.cost && !owned;
          return (
            <div key={pu.id} className="flex items-center gap-2 mb-2">
              <span>{pu.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{pu.name}</div>
                <div className="text-xs text-yellow-300">{pu.description}</div>
              </div>
              <button onClick={() => {
                if (canAfford) {
                  setState(prev => ({
                    ...prev,
                    aeonites: prev.aeonites - pu.cost,
                    prestigeUpgrades: [...prev.prestigeUpgrades, pu.id],
                  }));
                }
              }} disabled={!canAfford}
                className="text-xs bg-yellow-800/50 border border-yellow-600/50 rounded px-2 py-1 text-yellow-200 disabled:opacity-30">
                {owned ? '✓' : `${pu.cost} 💫`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
      {/* Stats */}
      <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/50">
        <h3 className="text-sm font-bold text-purple-200 mb-3">📊 Статистика</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Всего кликов</div>
            <div className="text-white font-bold">{state.totalClicks.toLocaleString()}</div>
          </div>
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Крит-кликов</div>
            <div className="text-white font-bold">{state.totalCrits.toLocaleString()}</div>
          </div>
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Макс. комбо</div>
            <div className="text-white font-bold">x{state.maxCombo}</div>
          </div>
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Престижей</div>
            <div className="text-white font-bold">{state.prestigeCount}</div>
          </div>
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Эониты</div>
            <div className="text-white font-bold">{state.aeonites} 💫</div>
          </div>
          <div className="bg-purple-950/50 rounded p-2">
            <div className="text-purple-400">Боссов</div>
            <div className="text-white font-bold">{state.bossesDefeated.length}/5</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/50">
        <h3 className="text-sm font-bold text-purple-200 mb-3">🏆 Достижения ({state.achievements.length}/{ACHIEVEMENTS.length})</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = state.achievements.includes(ach.id);
            return (
              <div key={ach.id} className={`flex items-center gap-2 p-2 rounded ${unlocked ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-purple-950/30 border border-purple-800/20 opacity-50'}`}>
                <span className="text-lg">{unlocked ? ach.icon : '🔒'}</span>
                <div className="flex-1">
                  <div className="text-xs font-bold text-white">{ach.name}</div>
                  <div className="text-xs text-purple-400">{ach.description}</div>
                </div>
                {unlocked && <span className="text-yellow-400 text-xs">+{ach.reward}💎</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/50">
        <h3 className="text-sm font-bold text-purple-200 mb-3">⚙️ Настройки</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-purple-300">🔊 Звуки</span>
            <input type="checkbox" checked={state.settings.soundEnabled}
              onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, soundEnabled: e.target.checked } }))}
              className="w-5 h-5 accent-purple-500" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-purple-300">📳 Вибрация</span>
            <input type="checkbox" checked={state.settings.vibrationEnabled}
              onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, vibrationEnabled: e.target.checked } }))}
              className="w-5 h-5 accent-purple-500" />
          </label>
        </div>
      </div>

      {/* Save/Load */}
      <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/50">
        <h3 className="text-sm font-bold text-purple-200 mb-3">💾 Сохранения</h3>
        <div className="space-y-2">
          <button onClick={() => { saveGame(state); alert('Сохранено!'); }} className="w-full btn-primary text-sm">
            💾 Сохранить
          </button>
          <button onClick={() => setShowExport(true)} className="w-full btn-primary text-sm">
            📤 Экспорт/Импорт
          </button>
          <button onClick={() => {
            if (confirm('Вы уверены? Весь прогресс будет удалён!')) {
              localStorage.removeItem('chronoKeeper_save');
              setState(createInitialState());
            }
          }} className="w-full bg-red-900/50 border border-red-700/50 text-red-300 py-2 rounded-lg text-sm">
            🗑️ Сбросить прогресс
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-[#0a0014] via-[#1a0033] to-[#0d001a] overflow-hidden max-w-lg mx-auto relative">
      {/* Top bar */}
      <div className="bg-purple-950/80 backdrop-blur-sm border-b border-purple-800/50 px-3 py-2 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <div>
              <div className="text-sm font-bold text-white">{formatNumber(state.time)} Δt</div>
              <div className="text-xs text-purple-400">{formatNumber(passiveIncome)}/с</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-purple-300">{state.shards} 💎</div>
              {state.aeonites > 0 && <div className="text-xs text-yellow-300">{state.aeonites} 💫</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'world' && renderWorldScreen()}
        {tab === 'shop' && renderShopScreen()}
        {tab === 'story' && renderStoryScreen()}
        {tab === 'tree' && renderTreeScreen()}
        {tab === 'profile' && renderProfileScreen()}
      </div>

      {/* Bottom navigation */}
      <div className="bg-purple-950/90 backdrop-blur-sm border-t border-purple-800/50 flex z-30">
        {[
          { id: 'world' as Tab, icon: '🌍', label: 'Мир' },
          { id: 'shop' as Tab, icon: '🛒', label: 'Магазин' },
          { id: 'story' as Tab, icon: '📖', label: 'Сюжет' },
          { id: 'tree' as Tab, icon: '🌳', label: 'Дерево' },
          { id: 'profile' as Tab, icon: '👤', label: 'Профиль' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${tab === t.id ? 'text-purple-300 bg-purple-800/30' : 'text-purple-500'}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Offline income modal */}
      {showOffline && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 border border-purple-600 rounded-2xl p-6 max-w-sm w-full animate-fade-in text-center">
            <div className="text-4xl mb-3">🌙</div>
            <h3 className="text-lg font-bold text-white mb-2">С Возвращением!</h3>
            <p className="text-sm text-purple-300 mb-4">Пока вас не было, накопилось:</p>
            <div className="text-2xl font-bold text-yellow-400 mb-4">{formatNumber(offlineIncome)} Δt</div>
            <div className="space-y-2">
              <button onClick={() => handleOfflineCollect(1)} className="w-full btn-primary py-3">
                Забрать
              </button>
              <button onClick={() => handleOfflineCollect(3)} className="w-full btn-gold py-3">
                📺 Реклама → x3 ({formatNumber(offlineIncome.mul(3))} Δt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog modal */}
      {dialogVisible && dialogQueue.length > 0 && (
        <div className="absolute inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
          <div className="bg-purple-900 border border-purple-600 rounded-2xl p-4 max-w-sm w-full animate-slide-in">
            {(() => {
              const dialog = STORY_DIALOGS.find(d => d.id === dialogQueue[currentDialog]);
              if (!dialog) return null;
              return (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-3xl">{dialog.characterIcon}</div>
                    <div className="font-bold text-purple-200">{dialog.character}</div>
                  </div>
                  <p className="text-sm text-purple-100 mb-4 leading-relaxed">{dialog.text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (currentDialog < dialogQueue.length - 1) {
                        setCurrentDialog(prev => prev + 1);
                      } else {
                        setDialogVisible(false);
                        setDialogQueue([]);
                        setCurrentDialog(0);
                      }
                    }} className="flex-1 btn-primary py-2">
                      Далее →
                    </button>
                    <button onClick={() => { setDialogVisible(false); setDialogQueue([]); setCurrentDialog(0); }}
                      className="px-4 py-2 bg-purple-800/50 rounded-lg text-purple-300 text-sm">
                      Skip
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Boss battle overlay */}
      {showBoss && state.bossActive && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-red-900/90 to-purple-900/90 border border-red-600 rounded-2xl p-6 max-w-sm w-full animate-fade-in text-center">
            <div className="text-5xl mb-3 animate-boss-pulse">{epoch?.bossIcon}</div>
            <h3 className="text-lg font-bold text-red-200 mb-1">{epoch?.bossName}</h3>
            <div className="w-full h-5 bg-red-950 rounded-full overflow-hidden mb-2">
              <div className="hp-bar" style={{ width: `${Math.max(0, (state.currentBossHp?.div(epoch.bossHp).toNumber() || 0) * 100)}%` }} />
            </div>
            <div className="text-sm text-red-300 mb-4">
              HP: {formatNumber(state.currentBossHp || 0)} / {formatNumber(epoch.bossHp)}
            </div>
            <p className="text-xs text-red-200 mb-4">Кликайте по Хроносфере на главном экране!</p>
            <button onClick={() => setShowBoss(false)} className="btn-primary px-6 py-2">
              К Бою! ⚔️
            </button>
          </div>
        </div>
      )}

      {/* Prestige modal */}
      {showPrestige && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-yellow-900/90 to-purple-900/90 border border-yellow-600 rounded-2xl p-6 max-w-sm w-full animate-fade-in text-center">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-bold text-yellow-200 mb-2">Сдвиг Времени</h3>
            <p className="text-sm text-yellow-300 mb-4">Вы сбросите прогресс, но получите Эониты — вечную валюту!</p>
            <div className="bg-yellow-900/30 rounded-lg p-3 mb-4">
              <div className="text-sm text-yellow-400">Вы получите:</div>
              <div className="text-2xl font-bold text-yellow-200">{aeonitesOnPrestige} 💫 Эонитов</div>
              <div className="text-xs text-yellow-400 mt-1">Каждый даёт +1% ко всему доходу</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-3 mb-4 text-left text-xs text-red-300">
              <div className="font-bold mb-1">Будет сброшено:</div>
              <div>• Всё Время (Δt)</div>
              <div>• Все генераторы</div>
              <div>• Все обычные улучшения</div>
            </div>
            <div className="space-y-2">
              <button onClick={handlePrestige} disabled={aeonitesOnPrestige <= 0}
                className="w-full btn-gold py-3 disabled:opacity-30">
                Переродиться! 🔄
              </button>
              <button onClick={() => setShowPrestige(false)} className="w-full py-2 text-purple-300 text-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export/Import modal */}
      {showExport && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-purple-900 border border-purple-600 rounded-2xl p-4 max-w-sm w-full animate-fade-in">
            <h3 className="text-lg font-bold text-white mb-3">📤 Экспорт / Импорт</h3>
            <button onClick={handleExport} className="w-full btn-primary py-2 mb-3 text-sm">
              📋 Скопировать код сохранения
            </button>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
              placeholder="Вставьте код сохранения..."
              className="w-full h-24 bg-purple-950 border border-purple-700 rounded-lg p-2 text-xs text-purple-200 resize-none mb-3" />
            <button onClick={handleImport} disabled={!importText}
              className="w-full btn-primary py-2 mb-3 text-sm disabled:opacity-30">
              📥 Импортировать
            </button>
            <button onClick={() => setShowExport(false)} className="w-full py-2 text-purple-300 text-sm">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Achievement notification */}
      {newAchievement && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
          <div className="bg-gradient-to-r from-yellow-700 to-yellow-500 border border-yellow-400 rounded-xl px-4 py-2 shadow-lg">
            {(() => {
              const ach = ACHIEVEMENTS.find(a => a.id === newAchievement);
              if (!ach) return null;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ach.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-yellow-100">Достижение!</div>
                    <div className="text-xs text-yellow-200">{ach.name}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
