import Decimal from 'break_infinity.js';
import { GENERATORS, UPGRADES, EPOCHS, ACHIEVEMENTS, PRESTIGE_UPGRADES, GeneratorData } from './data';

export interface GameState {
  time: Decimal; // Δt - main currency
  totalTimeEarned: Decimal;
  allTimeEarned: Decimal; // across all prestiges
  shards: number; // premium currency 💎
  aeonites: number; // prestige currency
  
  clickPower: number;
  clickMultiplier: number;
  critChance: number;
  critMultiplier: number;
  autoClickRate: number;
  globalMultiplier: number;
  
  generators: Record<string, number>; // generator id -> count
  generatorMultipliers: Record<string, number>; // generator id -> multiplier
  
  upgrades: Record<string, number>; // upgrade id -> level
  
  currentEpoch: number;
  epochProgress: Decimal; // time accumulated in current epoch
  bossesDefeated: number[];
  currentBossHp: Decimal | null;
  bossActive: boolean;
  
  totalClicks: number;
  totalCrits: number;
  maxCombo: number;
  
  achievements: string[]; // unlocked achievement ids
  
  prestigeCount: number;
  prestigeUpgrades: string[]; // purchased prestige upgrade ids
  
  lastSaveTime: number;
  lastOnlineTime: number;
  
  dailyRewardDay: number;
  lastDailyReward: number;
  
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
    language: string;
  };
  
  dialogSeen: string[];
}

export function createInitialState(): GameState {
  return {
    time: new Decimal(0),
    totalTimeEarned: new Decimal(0),
    allTimeEarned: new Decimal(0),
    shards: 0,
    aeonites: 0,
    
    clickPower: 1,
    clickMultiplier: 1,
    critChance: 5,
    critMultiplier: 5,
    autoClickRate: 0,
    globalMultiplier: 1,
    
    generators: {},
    generatorMultipliers: {},
    
    upgrades: {},
    
    currentEpoch: 0,
    epochProgress: new Decimal(0),
    bossesDefeated: [],
    currentBossHp: null,
    bossActive: false,
    
    totalClicks: 0,
    totalCrits: 0,
    maxCombo: 0,
    
    achievements: [],
    
    prestigeCount: 0,
    prestigeUpgrades: [],
    
    lastSaveTime: Date.now(),
    lastOnlineTime: Date.now(),
    
    dailyRewardDay: 0,
    lastDailyReward: 0,
    
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      vibrationEnabled: true,
      language: 'ru',
    },
    
    dialogSeen: [],
  };
}

export function getGeneratorCost(gen: GeneratorData, owned: number): Decimal {
  return gen.baseCost.mul(Math.pow(1.15, owned));
}

export function getGeneratorIncome(gen: GeneratorData, owned: number, state: GameState): Decimal {
  if (owned === 0) return new Decimal(0);
  const baseIncome = gen.baseIncome.mul(owned);
  const genMulti = state.generatorMultipliers[gen.id] || 1;
  const milestoneMulti = Math.pow(2, Math.floor(owned / 25));
  const prestigeMulti = 1 + (state.aeonites * 0.01);
  const prestigeUpgradeMulti = state.prestigeUpgrades.includes('p_income') ? 1.5 : 1;
  return baseIncome.mul(genMulti).mul(milestoneMulti).mul(state.globalMultiplier).mul(prestigeMulti).mul(prestigeUpgradeMulti);
}

export function getTotalPassiveIncome(state: GameState): Decimal {
  let total = new Decimal(0);
  for (const gen of GENERATORS) {
    if (gen.epoch > state.currentEpoch) continue;
    const owned = state.generators[gen.id] || 0;
    total = total.add(getGeneratorIncome(gen, owned, state));
  }
  return total;
}

export function getClickValue(state: GameState): Decimal {
  const base = state.clickPower * state.clickMultiplier;
  const prestigeMulti = 1 + (state.aeonites * 0.01);
  const prestigeUpgradeMulti = state.prestigeUpgrades.includes('p_income') ? 1.5 : 1;
  return new Decimal(base).mul(state.globalMultiplier).mul(prestigeMulti).mul(prestigeUpgradeMulti);
}

export function getUpgradeCost(upgrade: typeof UPGRADES[0], level: number): Decimal {
  return upgrade.cost.mul(Math.pow(upgrade.costMultiplier, level));
}

export function applyUpgrade(state: GameState, upgradeId: string): GameState {
  const upgrade = UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return state;
  
  const level = state.upgrades[upgradeId] || 0;
  if (level >= upgrade.maxLevel) return state;
  
  const cost = getUpgradeCost(upgrade, level);
  if (state.time.lt(cost)) return state;
  
  const newState = { ...state };
  newState.time = state.time.sub(cost);
  newState.upgrades = { ...state.upgrades, [upgradeId]: level + 1 };
  
  switch (upgrade.effect.type) {
    case 'clickPower':
      newState.clickPower = state.clickPower + upgrade.effect.value;
      break;
    case 'clickMulti':
      newState.clickMultiplier = state.clickMultiplier * upgrade.effect.value;
      break;
    case 'critChance':
      newState.critChance = Math.min(state.critChance + upgrade.effect.value, 100);
      break;
    case 'critMulti':
      newState.critMultiplier = state.critMultiplier + upgrade.effect.value;
      break;
    case 'autoClick':
      newState.autoClickRate = state.autoClickRate + upgrade.effect.value;
      break;
    case 'genMulti':
      if (upgrade.effect.generatorId) {
        newState.generatorMultipliers = { ...state.generatorMultipliers };
        newState.generatorMultipliers[upgrade.effect.generatorId] = (state.generatorMultipliers[upgrade.effect.generatorId] || 1) * upgrade.effect.value;
      }
      break;
    case 'globalMulti':
      newState.globalMultiplier = state.globalMultiplier * upgrade.effect.value;
      break;
  }
  
  return newState;
}

export function buyGenerator(state: GameState, genId: string, amount: number = 1): GameState {
  const gen = GENERATORS.find(g => g.id === genId);
  if (!gen) return state;
  if (gen.epoch > state.currentEpoch) return state;
  
  const owned = state.generators[genId] || 0;
  let totalCost = new Decimal(0);
  let bought = 0;
  
  for (let i = 0; i < amount; i++) {
    const cost = getGeneratorCost(gen, owned + i);
    if (state.time.sub(totalCost).lt(cost)) break;
    totalCost = totalCost.add(cost);
    bought++;
  }
  
  if (bought === 0) return state;
  
  const newState = { ...state };
  newState.time = state.time.sub(totalCost);
  newState.generators = { ...state.generators, [genId]: owned + bought };
  
  return newState;
}

export function getMaxBuyable(state: GameState, genId: string): number {
  const gen = GENERATORS.find(g => g.id === genId);
  if (!gen) return 0;
  
  const owned = state.generators[genId] || 0;
  let totalCost = new Decimal(0);
  let count = 0;
  
  while (count < 400) {
    const cost = getGeneratorCost(gen, owned + count);
    if (state.time.sub(totalCost).lt(cost)) break;
    totalCost = totalCost.add(cost);
    count++;
  }
  
  return count;
}

export function checkAchievements(state: GameState): { newState: GameState; newAchievements: string[] } {
  const newAchievements: string[] = [];
  let newState = { ...state };
  
  const totalGens = Object.values(state.generators).reduce((a, b) => a + b, 0);
  
  for (const ach of ACHIEVEMENTS) {
    if (state.achievements.includes(ach.id)) continue;
    
    let unlocked = false;
    switch (ach.requirement.type) {
      case 'clicks': unlocked = state.totalClicks >= ach.requirement.value; break;
      case 'totalTime': unlocked = state.totalTimeEarned.gte(ach.requirement.value); break;
      case 'generators': unlocked = totalGens >= ach.requirement.value; break;
      case 'epoch': unlocked = state.currentEpoch >= ach.requirement.value; break;
      case 'boss': unlocked = state.bossesDefeated.length >= ach.requirement.value; break;
      case 'prestige': unlocked = state.prestigeCount >= ach.requirement.value; break;
      case 'crits': unlocked = state.totalCrits >= ach.requirement.value; break;
      case 'combo': unlocked = state.maxCombo >= ach.requirement.value; break;
    }
    
    if (unlocked) {
      newAchievements.push(ach.id);
      newState.shards += ach.reward;
    }
  }
  
  newState.achievements = [...state.achievements, ...newAchievements];
  return { newState, newAchievements };
}

export function calculatePrestigeAeonites(state: GameState): number {
  const totalEarned = state.allTimeEarned.add(state.totalTimeEarned);
  if (totalEarned.lt(1e9)) return 0;
  return Math.floor(Math.sqrt(totalEarned.toNumber() / 1e9));
}

export function performPrestige(state: GameState): GameState {
  const aeonitesGained = calculatePrestigeAeonites(state);
  if (aeonitesGained <= 0) return state;
  
  const newState = createInitialState();
  newState.aeonites = state.aeonites + aeonitesGained;
  newState.shards = state.shards;
  newState.prestigeCount = state.prestigeCount + 1;
  newState.prestigeUpgrades = [...state.prestigeUpgrades];
  newState.achievements = [...state.achievements];
  newState.allTimeEarned = state.allTimeEarned.add(state.totalTimeEarned);
  newState.bossesDefeated = [...state.bossesDefeated];
  newState.currentEpoch = state.currentEpoch; // Keep epoch progress
  newState.dialogSeen = [...state.dialogSeen];
  newState.settings = { ...state.settings };
  newState.lastSaveTime = Date.now();
  newState.lastOnlineTime = Date.now();
  
  // Apply prestige upgrades
  if (newState.prestigeUpgrades.includes('p_auto')) {
    newState.autoClickRate = 1;
  }
  if (newState.prestigeUpgrades.includes('p_crit')) {
    newState.critChance = Math.min(100, newState.critChance + 10);
  }
  if (newState.prestigeUpgrades.includes('p_start')) {
    newState.time = new Decimal(1000);
    newState.totalTimeEarned = new Decimal(1000);
  }
  
  return newState;
}

export function calculateOfflineIncome(state: GameState): Decimal {
  const now = Date.now();
  const elapsed = Math.min((now - state.lastOnlineTime) / 1000, 8 * 3600); // Max 8 hours
  if (elapsed < 60) return new Decimal(0); // Less than 1 minute
  
  const passiveIncome = getTotalPassiveIncome(state);
  let offlineRate = 0.5; // Base 50%
  
  if (state.prestigeUpgrades.includes('p_offline')) {
    offlineRate += 0.25;
  }
  
  return passiveIncome.mul(elapsed).mul(offlineRate);
}

export function saveGame(state: GameState): void {
  const saveData = {
    ...state,
    time: state.time.toString(),
    totalTimeEarned: state.totalTimeEarned.toString(),
    allTimeEarned: state.allTimeEarned.toString(),
    epochProgress: state.epochProgress.toString(),
    currentBossHp: state.currentBossHp ? state.currentBossHp.toString() : null,
    lastSaveTime: Date.now(),
    lastOnlineTime: Date.now(),
  };
  localStorage.setItem('chronoKeeper_save', JSON.stringify(saveData));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem('chronoKeeper_save');
  if (!raw) return null;
  
  try {
    const data = JSON.parse(raw);
    return {
      ...data,
      time: new Decimal(data.time || '0'),
      totalTimeEarned: new Decimal(data.totalTimeEarned || '0'),
      allTimeEarned: new Decimal(data.allTimeEarned || '0'),
      epochProgress: new Decimal(data.epochProgress || '0'),
      currentBossHp: data.currentBossHp ? new Decimal(data.currentBossHp) : null,
    };
  } catch {
    return null;
  }
}

export function exportSave(state: GameState): string {
  const saveData = {
    ...state,
    time: state.time.toString(),
    totalTimeEarned: state.totalTimeEarned.toString(),
    allTimeEarned: state.allTimeEarned.toString(),
    epochProgress: state.epochProgress.toString(),
    currentBossHp: state.currentBossHp ? state.currentBossHp.toString() : null,
  };
  return btoa(JSON.stringify(saveData));
}

export function importSave(code: string): GameState | null {
  try {
    const data = JSON.parse(atob(code));
    return {
      ...data,
      time: new Decimal(data.time || '0'),
      totalTimeEarned: new Decimal(data.totalTimeEarned || '0'),
      allTimeEarned: new Decimal(data.allTimeEarned || '0'),
      epochProgress: new Decimal(data.epochProgress || '0'),
      currentBossHp: data.currentBossHp ? new Decimal(data.currentBossHp) : null,
    };
  } catch {
    return null;
  }
}
