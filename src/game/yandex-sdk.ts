/**
 * Yandex Games SDK Integration Module
 * Хранитель Времени (Chrono Keeper)
 * 
 * Интеграция:
 * - YaGames.init() — инициализация
 * - LoadingAPI.ready() — сигнал о готовности игры
 * - Player API — облачные сохранения
 * - Adv API — реклама (rewarded + interstitial)
 * - Payments API — внутриигровые покупки
 * - Leaderboards API — рейтинги
 * - i18n API — автоопределение языка
 */

// Типизация Yandex Games SDK
declare global {
  interface Window {
    YaGames?: {
      init: (options?: { signed?: boolean }) => Promise<YSdk>;
    };
  }
}

export interface YSdk {
  adv: {
    showFullscreenAdv: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      }
    }) => void;
    showRewardedVideo: (options?: {
      callbacks?: {
        onOpen?: () => void;
        onRewarded?: () => void;
        onClose?: (wasShown: boolean) => void;
        onError?: (error: unknown) => void;
      }
    }) => void;
    getBannerAdvStatus: () => Promise<{ stickyAdvIsShowing: boolean; reason?: string }>;
    showBannerAdv: () => Promise<{ stickyAdvIsShowing: boolean }>;
    hideBannerAdv: () => Promise<{ stickyAdvIsShowing: boolean }>;
  };
  features: {
    LoadingAPI?: {
      ready: () => void;
    };
    GameplayAPI?: {
      start: () => void;
      stop: () => void;
    };
  };
  getPlayer: (options?: { signed?: boolean; scopes?: boolean }) => Promise<YSdkPlayer>;
  getLeaderboards: () => Promise<YSdkLeaderboards>;
  getPayments: (options?: { signed?: boolean }) => Promise<YSdkPayments>;
  getEnvironment: () => { app: string; browser: string; i18n: { lang: string; tld: string } };
}

export interface YSdkPlayer {
  getUniqueID: () => string;
  getName: () => string;
  getPhoto: (size?: 'small' | 'medium' | 'large') => string;
  setData: (data: Record<string, unknown>, flush?: boolean) => Promise<void>;
  getData: (keys?: string[]) => Promise<Record<string, unknown>>;
  setStats: (stats: Record<string, number>) => Promise<void>;
  getStats: (keys?: string[]) => Promise<Record<string, number>>;
}

export interface YSdkLeaderboards {
  setLeaderboardScore: (leaderboardName: string, score: number) => Promise<void>;
  getLeaderboardEntries: (leaderboardName: string, options?: {
    quantityTop?: number;
    includeUser?: boolean;
    quantityAround?: number;
  }) => Promise<{ leaderboard: unknown; entries: Array<{ score: number; extraData?: string; rank: number; player: { name: string; uniqueID: string; photo: { size: string; url: string } } }> }>;
  getLeaderboardPlayerEntry: (leaderboardName: string) => Promise<{ score: number; extraData?: string; rank: number }>;
}

export interface YSdkPayments {
  purchase: (options: { id: string; developerPayload?: string }) => Promise<unknown>;
  getPurchases: () => Promise<Array<{ purchaseToken: string; productId: string; developerPayload?: string }>>;
  consumePurchase: (purchaseToken: string) => Promise<void>;
  getCatalog: () => Promise<Array<{ id: string; title: string; description: string; imageUri: string; price: string; priceCurrencyCode: string; priceValue: string; priceCurrencyImage: string }>>;
}

// Singleton SDK instance
let ysdk: YSdk | null = null;
let player: YSdkPlayer | null = null;
let leaderboards: YSdkLeaderboards | null = null;
let payments: YSdkPayments | null = null;
let isInitialized = false;
let initCallbacks: Array<(sdk: YSdk | null) => void> = [];

// Ad tracking
let lastInterstitialTime = 0;
let rewardedAdsToday = 0;
let lastAdDay = new Date().toDateString();
const MAX_REWARDED_PER_DAY = 10;
const MIN_INTERSTITIAL_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Инициализация Yandex Games SDK
 */
export async function initYandexSDK(): Promise<YSdk | null> {
  if (isInitialized) return ysdk;

  try {
    // Check if SDK is available
    if (typeof window.YaGames === 'undefined') {
      console.warn('[YSdk] YaGames is not defined. Running in standalone mode.');
      isInitialized = true;
      notifyCallbacks(null);
      return null;
    }

    // Initialize SDK
    ysdk = await window.YaGames.init();
    console.log('[YSdk] Initialized successfully');

    // Get player
    try {
      player = await ysdk.getPlayer({ scopes: false });
      console.log('[YSdk] Player loaded:', player.getUniqueID());
    } catch (e) {
      console.warn('[YSdk] Failed to get player:', e);
    }

    // Get leaderboards
    try {
      leaderboards = await ysdk.getLeaderboards();
      console.log('[YSdk] Leaderboards loaded');
    } catch (e) {
      console.warn('[YSdk] Failed to get leaderboards:', e);
    }

    // Get payments
    try {
      payments = await ysdk.getPayments();
      console.log('[YSdk] Payments loaded');
    } catch (e) {
      console.warn('[YSdk] Failed to get payments:', e);
    }

    // Reset daily ad counter if new day
    const today = new Date().toDateString();
    if (today !== lastAdDay) {
      rewardedAdsToday = 0;
      lastAdDay = today;
    }

    isInitialized = true;
    notifyCallbacks(ysdk);
    return ysdk;
  } catch (error) {
    console.error('[YSdk] Initialization failed:', error);
    isInitialized = true;
    notifyCallbacks(null);
    return null;
  }
}

function notifyCallbacks(sdk: YSdk | null) {
  initCallbacks.forEach(cb => cb(sdk));
  initCallbacks = [];
}

/**
 * Подписка на инициализацию
 */
export function onSDKReady(callback: (sdk: YSdk | null) => void): void {
  if (isInitialized) {
    callback(ysdk);
  } else {
    initCallbacks.push(callback);
  }
}

/**
 * Сигнал о готовности игры (LoadingAPI)
 */
export function gameReady(): void {
  if (ysdk?.features?.LoadingAPI) {
    ysdk.features.LoadingAPI.ready();
    console.log('[YSdk] LoadingAPI.ready() called');
  }
}

/**
 * Начало геймплея
 */
export function gameplayStart(): void {
  if (ysdk?.features?.GameplayAPI) {
    ysdk.features.GameplayAPI.start();
  }
}

/**
 * Остановка геймплея (при паузе/сворачивании)
 */
export function gameplayStop(): void {
  if (ysdk?.features?.GameplayAPI) {
    ysdk.features.GameplayAPI.stop();
  }
}

// ==================== РЕКЛАМА ====================

/**
 * Показать полноэкранную рекламу (Interstitial)
 */
export function showInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ysdk) {
      console.log('[YSdk] Interstitial skipped - SDK not available');
      resolve(false);
      return;
    }

    const now = Date.now();
    if (now - lastInterstitialTime < MIN_INTERSTITIAL_INTERVAL) {
      console.log('[YSdk] Interstitial skipped - too frequent');
      resolve(false);
      return;
    }

    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {
          console.log('[YSdk] Interstitial opened');
          gameplayStop();
        },
        onClose: (wasShown: boolean) => {
          console.log('[YSdk] Interstitial closed, shown:', wasShown);
          if (wasShown) {
            lastInterstitialTime = Date.now();
          }
          gameplayStart();
          resolve(wasShown);
        },
        onError: (error: unknown) => {
          console.warn('[YSdk] Interstitial error:', error);
          resolve(false);
        },
      },
    });
  });
}

/**
 * Показать rewarded видео (за вознаграждение)
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ysdk) {
      console.log('[YSdk] Rewarded ad skipped - SDK not available');
      resolve(false);
      return;
    }

    // Check daily limit
    const today = new Date().toDateString();
    if (today !== lastAdDay) {
      rewardedAdsToday = 0;
      lastAdDay = today;
    }

    if (rewardedAdsToday >= MAX_REWARDED_PER_DAY) {
      console.log('[YSdk] Rewarded ad skipped - daily limit reached');
      resolve(false);
      return;
    }

    let rewarded = false;

    ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => {
          console.log('[YSdk] Rewarded video opened');
          gameplayStop();
        },
        onRewarded: () => {
          console.log('[YSdk] Reward granted');
          rewarded = true;
          rewardedAdsToday++;
        },
        onClose: (wasShown: boolean) => {
          console.log('[YSdk] Rewarded video closed, wasShown:', wasShown);
          gameplayStart();
          resolve(rewarded && wasShown);
        },
        onError: (error: unknown) => {
          console.warn('[YSdk] Rewarded video error:', error);
          resolve(false);
        },
      },
    });
  });
}

/**
 * Получить оставшиеся rewarded рекламы на сегодня
 */
export function getRemainingRewardedAds(): number {
  const today = new Date().toDateString();
  if (today !== lastAdDay) {
    return MAX_REWARDED_PER_DAY;
  }
  return Math.max(0, MAX_REWARDED_PER_DAY - rewardedAdsToday);
}

// ==================== СОХРАНЕНИЯ ====================

/**
 * Сохранить данные игрока в облако
 */
export async function saveToCloud(data: Record<string, unknown>): Promise<boolean> {
  if (!player) {
    console.warn('[YSdk] Player not available, cloud save skipped');
    return false;
  }

  try {
    await player.setData(data, true);
    console.log('[YSdk] Cloud save successful');
    return true;
  } catch (error) {
    console.error('[YSdk] Cloud save failed:', error);
    return false;
  }
}

/**
 * Загрузить данные из облака
 */
export async function loadFromCloud(keys?: string[]): Promise<Record<string, unknown> | null> {
  if (!player) {
    console.warn('[YSdk] Player not available, cloud load skipped');
    return null;
  }

  try {
    const data = await player.getData(keys);
    console.log('[YSdk] Cloud load successful');
    return data;
  } catch (error) {
    console.error('[YSdk] Cloud load failed:', error);
    return null;
  }
}

/**
 * Сохранить статистику игрока
 */
export async function saveStats(stats: Record<string, number>): Promise<boolean> {
  if (!player) return false;

  try {
    await player.setStats(stats);
    console.log('[YSdk] Stats saved');
    return true;
  } catch (error) {
    console.error('[YSdk] Stats save failed:', error);
    return false;
  }
}

/**
 * Загрузить статистику
 */
export async function loadStats(keys?: string[]): Promise<Record<string, number> | null> {
  if (!player) return null;

  try {
    const stats = await player.getStats(keys);
    console.log('[YSdk] Stats loaded');
    return stats;
  } catch (error) {
    console.error('[YSdk] Stats load failed:', error);
    return null;
  }
}

// ==================== ЛИДЕРБОРДЫ ====================

/**
 * Отправить результат в лидерборд
 */
export async function submitScore(leaderboardName: string, score: number): Promise<boolean> {
  if (!leaderboards) return false;

  try {
    await leaderboards.setLeaderboardScore(leaderboardName, score);
    console.log(`[YSdk] Score submitted to ${leaderboardName}: ${score}`);
    return true;
  } catch (error) {
    console.error(`[YSdk] Score submission failed:`, error);
    return false;
  }
}

/**
 * Получить записи лидерборда
 */
export async function getLeaderboardEntries(
  leaderboardName: string,
  quantityTop: number = 20,
  includeUser: boolean = true,
  quantityAround: number = 5
): Promise<Array<{ score: number; rank: number; playerName: string }> | null> {
  if (!leaderboards) return null;

  try {
    const result = await leaderboards.getLeaderboardEntries(leaderboardName, {
      quantityTop,
      includeUser,
      quantityAround,
    });

    return result.entries.map(entry => ({
      score: entry.score,
      rank: entry.rank,
      playerName: entry.player.name,
    }));
  } catch (error) {
    console.error('[YSdk] Leaderboard fetch failed:', error);
    return null;
  }
}

// ==================== ПЛАТЕЖИ ====================

/**
 * Получить каталог покупок
 */
export async function getCatalog(): Promise<Array<{
  id: string;
  title: string;
  description: string;
  price: string;
  priceValue: string;
}> | null> {
  if (!payments) return null;

  try {
    const catalog = await payments.getCatalog();
    return catalog.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      priceValue: item.priceValue,
    }));
  } catch (error) {
    console.error('[YSdk] Catalog fetch failed:', error);
    return null;
  }
}

/**
 * Совершить покупку
 */
export async function makePurchase(productId: string): Promise<boolean> {
  if (!payments) return false;

  try {
    await payments.purchase({ id: productId });
    console.log(`[YSdk] Purchase successful: ${productId}`);
    return true;
  } catch (error) {
    console.error(`[YSdk] Purchase failed:`, error);
    return false;
  }
}

/**
 * Получить активные покупки
 */
export async function getPurchases(): Promise<string[]> {
  if (!payments) return [];

  try {
    const purchases = await payments.getPurchases();
    return purchases.map(p => p.productId);
  } catch (error) {
    console.error('[YSdk] Purchases fetch failed:', error);
    return [];
  }
}

/**
 * Поглотить покупку (consumable)
 */
export async function consumePurchase(purchaseToken: string): Promise<boolean> {
  if (!payments) return false;

  try {
    await payments.consumePurchase(purchaseToken);
    console.log('[YSdk] Purchase consumed');
    return true;
  } catch (error) {
    console.error('[YSdk] Consume purchase failed:', error);
    return false;
  }
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить информацию об окружении
 */
export function getEnvironment(): { lang: string; tld: string; browser: string } | null {
  if (!ysdk) return null;

  try {
    const env = ysdk.getEnvironment();
    return {
      lang: env.i18n.lang,
      tld: env.i18n.tld,
      browser: env.browser,
    };
  } catch {
    return null;
  }
}

/**
 * Получить ID игрока
 */
export function getPlayerId(): string | null {
  if (!player) return null;
  try {
    return player.getUniqueID();
  } catch {
    return null;
  }
}

/**
 * Получить имя игрока
 */
export function getPlayerName(): string | null {
  if (!player) return null;
  try {
    return player.getName();
  } catch {
    return null;
  }
}

/**
 * Получить фото игрока
 */
export function getPlayerPhoto(size: 'small' | 'medium' | 'large' = 'medium'): string | null {
  if (!player) return null;
  try {
    return player.getPhoto(size);
  } catch {
    return null;
  }
}

/**
 * Проверить, инициализирован ли SDK
 */
export function isSDKInitialized(): boolean {
  return isInitialized && ysdk !== null;
}

/**
 * Проверить, доступен ли SDK (запущены ли мы на Яндекс Играх)
 */
export function isSDKAvailable(): boolean {
  return typeof window.YaGames !== 'undefined';
}
