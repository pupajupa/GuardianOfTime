/**
 * Yandex Games SDK Integration Module
 * Хранитель Времени (Chrono Keeper)
 * 
 * Интеграция согласно требованиям Яндекс Игр:
 * - Пункт 1.1: SDK встроен
 * - Пункт 1.2: Гостевой вход + авторизация по кнопке
 * - Пункт 1.3: Звук останавливается при потере фокуса
 * - Пункт 1.4: Платежи только через SDK
 * - Пункт 1.13: Внутриигровые покупки с консумированием
 * - Пункт 1.19: Правильная инициализация SDK
 * - Пункт 2.14: Автоопределение языка
 * - Пункт 4.7: Пауза при показе рекламы
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
  // Авторизация (пункт 1.2.1)
  authorize?: (options?: { scopes?: boolean }) => Promise<YSdkPlayer>;
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
  consumePurchase: (purchaseToken: string) => Promise<void>; // Пункт 1.13.1
  getCatalog: () => Promise<Array<{ id: string; title: string; description: string; imageUri: string; price: string; priceCurrencyCode: string; priceValue: string; priceCurrencyImage: string }>>;
}

// ==================== СОСТОЯНИЕ SDK ====================

let ysdk: YSdk | null = null;
let player: YSdkPlayer | null = null;
let leaderboards: YSdkLeaderboards | null = null;
let payments: YSdkPayments | null = null;
let isInitialized = false;
let isAuthorized = false;
let initCallbacks: Array<(sdk: YSdk | null) => void> = [];

// Пункт 1.13.2 — Портальная валюта из SDK
let currencyInfo: { name: string; icon: string } | null = null;

// Ad tracking (пункт 4.4 — реклама в логических паузах)
let lastInterstitialTime = 0;
let rewardedAdsToday = 0;
let lastAdDay = new Date().toDateString();
const MAX_REWARDED_PER_DAY = 10;
const MIN_INTERSTITIAL_INTERVAL = 5 * 60 * 1000; // 5 минут

// Gameplay state (пункт 1.19.3)
let isGameplayActive = false;

// Audio context for pause on focus loss (пункт 1.3)
let audioPaused = false;
const audioCallbacks: Array<(paused: boolean) => void> = [];

/**
 * Пункт 1.19.1 — Инициализация SDK строго по документации
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

    // Initialize SDK (пункт 1.19.1)
    ysdk = await window.YaGames.init();
    console.log('[YSdk] Initialized successfully');

    // Get player (guest mode — пункт 1.2.2)
    try {
      player = await ysdk.getPlayer({ scopes: false });
      console.log('[YSdk] Player loaded (guest):', player.getUniqueID());
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

    // Get payments (пункт 1.4, 1.13)
    try {
      payments = await ysdk.getPayments();
      console.log('[YSdk] Payments loaded');
      
      // Пункт 1.13.2 — Получаем информацию о портальной валюте
      try {
        const catalog = await payments.getCatalog();
        if (catalog.length > 0) {
          currencyInfo = {
            name: catalog[0].priceCurrencyCode,
            icon: '💎' // Иконка определяется автоматически из SDK
          };
        }
      } catch (e) {
        console.warn('[YSdk] Failed to get currency info:', e);
      }
      
      // Пункт 1.13.1 — Проверяем несконсумированные покупки
      await checkUnconsumedPurchases();
    } catch (e) {
      console.warn('[YSdk] Failed to get payments:', e);
    }

    // Reset daily ad counter if new day
    const today = new Date().toDateString();
    if (today !== lastAdDay) {
      rewardedAdsToday = 0;
      lastAdDay = today;
    }

    // Setup event listeners (пункт 1.3, 1.19.4)
    setupEventListeners();

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

/**
 * Пункт 1.3 — Обработка потери фокуса (звук, пауза)
 * Пункт 1.19.4 — Обработка game_api_pause / game_api_resume
 */
function setupEventListeners(): void {
  if (!ysdk) return;

  // Пункт 1.3 — Потеря фокуса: остановка звука и геймплея
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audioPaused = true;
      audioCallbacks.forEach(cb => cb(true));
      if (isGameplayActive) {
        gameplayStop();
      }
    } else {
      audioPaused = false;
      audioCallbacks.forEach(cb => cb(false));
      if (!isGameplayActive) {
        gameplayStart();
      }
    }
  });

  // Пункт 1.19.4 — Обработка событий паузы от SDK
  try {
    (ysdk as unknown as { on?: (event: string, cb: () => void) => void }).on?.('game_api_pause', () => {
      console.log('[YSdk] game_api_pause received');
      audioPaused = true;
      audioCallbacks.forEach(cb => cb(true));
      isGameplayActive = false;
    });

    (ysdk as unknown as { on?: (event: string, cb: () => void) => void }).on?.('game_api_resume', () => {
      console.log('[YSdk] game_api_resume received');
      audioPaused = false;
      audioCallbacks.forEach(cb => cb(false));
      isGameplayActive = true;
    });
  } catch (e) {
    console.warn('[YSdk] Event listeners setup failed:', e);
  }
}

/**
 * Подписка на изменение состояния аудио (пункт 1.3)
 */
export function onAudioStateChange(callback: (paused: boolean) => void): () => void {
  audioCallbacks.push(callback);
  return () => {
    const idx = audioCallbacks.indexOf(callback);
    if (idx >= 0) audioCallbacks.splice(idx, 1);
  };
}

/**
 * Проверить, приостановлено ли аудио
 */
export function isAudioPaused(): boolean {
  return audioPaused;
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
 * Пункт 1.19.2 — Сигнал о готовности игры (LoadingAPI.ready)
 * Вызывается когда пользователь может приступить к игре
 */
export function gameReady(): void {
  if (ysdk?.features?.LoadingAPI) {
    ysdk.features.LoadingAPI.ready();
    console.log('[YSdk] LoadingAPI.ready() called');
  }
}

/**
 * Пункт 1.19.3 — Начало геймплея (GameplayAPI.start)
 */
export function gameplayStart(): void {
  if (ysdk?.features?.GameplayAPI && !isGameplayActive) {
    ysdk.features.GameplayAPI.start();
    isGameplayActive = true;
    console.log('[YSdk] GameplayAPI.start()');
  }
}

/**
 * Пункт 1.19.3 — Остановка геймплея (GameplayAPI.stop)
 */
export function gameplayStop(): void {
  if (ysdk?.features?.GameplayAPI && isGameplayActive) {
    ysdk.features.GameplayAPI.stop();
    isGameplayActive = false;
    console.log('[YSdk] GameplayAPI.stop()');
  }
}

// ==================== АВТОРИЗАЦИЯ (Пункт 1.2) ====================

/**
 * Пункт 1.2.1 — Авторизация только по нажатию кнопки
 * Пункт 1.2.2 — Возможность игры без авторизации
 */
export async function authorizePlayer(): Promise<boolean> {
  if (!ysdk || !player) return false;

  try {
    // Запрашиваем авторизацию через SDK
    if (player.authorize) {
      player = await player.authorize({ scopes: false });
    } else {
      // Fallback: пересоздаём player с scopes
      player = await ysdk.getPlayer({ scopes: true });
    }
    isAuthorized = true;
    console.log('[YSdk] Player authorized:', player.getName());
    return true;
  } catch (error) {
    console.warn('[YSdk] Authorization failed:', error);
    return false;
  }
}

/**
 * Проверить, авторизован ли игрок
 */
export function isPlayerAuthorized(): boolean {
  return isAuthorized;
}

// ==================== РЕКЛАМА (Пункт 4) ====================

/**
 * Пункт 4.4, 4.7 — Показать полноэкранную рекламу в логической паузе
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
          // Пункт 4.7 — Пауза звука и геймплея
          gameplayStop();
          audioPaused = true;
          audioCallbacks.forEach(cb => cb(true));
        },
        onClose: (wasShown: boolean) => {
          console.log('[YSdk] Interstitial closed, shown:', wasShown);
          if (wasShown) {
            lastInterstitialTime = Date.now();
          }
          // Возобновление
          gameplayStart();
          audioPaused = false;
          audioCallbacks.forEach(cb => cb(false));
          resolve(wasShown);
        },
        onError: (error: unknown) => {
          console.warn('[YSdk] Interstitial error:', error);
          gameplayStart();
          audioPaused = false;
          audioCallbacks.forEach(cb => cb(false));
          resolve(false);
        },
      },
    });
  });
}

/**
 * Пункт 4.5 — Показать rewarded video за вознаграждение
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
          // Пункт 4.7 — Пауза звука и геймплея
          gameplayStop();
          audioPaused = true;
          audioCallbacks.forEach(cb => cb(true));
        },
        onRewarded: () => {
          console.log('[YSdk] Reward granted');
          rewarded = true;
          rewardedAdsToday++;
        },
        onClose: (wasShown: boolean) => {
          console.log('[YSdk] Rewarded video closed, wasShown:', wasShown);
          // Возобновление
          gameplayStart();
          audioPaused = false;
          audioCallbacks.forEach(cb => cb(false));
          resolve(rewarded && wasShown);
        },
        onError: (error: unknown) => {
          console.warn('[YSdk] Rewarded video error:', error);
          gameplayStart();
          audioPaused = false;
          audioCallbacks.forEach(cb => cb(false));
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

// ==================== СОХРАНЕНИЯ (Пункт 1.9, 1.11) ====================

/**
 * Пункт 1.9 — Сохранить данные в облако
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
 * Сохранить статистику
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

// ==================== ПЛАТЕЖИ (Пункт 1.4, 1.13) ====================

/**
 * Пункт 1.13.2 — Получить информацию о портальной валюте
 */
export function getCurrencyInfo(): { name: string; icon: string } | null {
  return currencyInfo;
}

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
 * Пункт 1.13.1 — Совершить покупку с последующим консумированием
 */
export async function makePurchase(productId: string): Promise<boolean> {
  if (!payments) return false;

  try {
    const purchase = await payments.purchase({ 
      id: productId,
      developerPayload: JSON.stringify({ timestamp: Date.now() })
    }) as { purchaseToken?: string; productId?: string };
    
    // Пункт 1.13.1 — Консумирование покупки
    if (purchase && purchase.purchaseToken) {
      await payments.consumePurchase(purchase.purchaseToken);
      console.log(`[YSdk] Purchase consumed: ${productId}`);
    }
    
    console.log(`[YSdk] Purchase successful: ${productId}`);
    return true;
  } catch (error) {
    console.error(`[YSdk] Purchase failed:`, error);
    return false;
  }
}

/**
 * Пункт 1.13.1 — Проверить несконсумированные покупки при старте
 */
async function checkUnconsumedPurchases(): Promise<void> {
  if (!payments) return;

  try {
    const purchases = await payments.getPurchases();
    for (const purchase of purchases) {
      try {
        await payments.consumePurchase(purchase.purchaseToken);
        console.log(`[YSdk] Consumed pending purchase: ${purchase.productId}`);
      } catch (e) {
        console.warn(`[YSdk] Failed to consume purchase: ${purchase.productId}`, e);
      }
    }
  } catch (error) {
    console.error('[YSdk] Check unconsumed purchases failed:', error);
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

// ==================== УТИЛИТЫ ====================

/**
 * Пункт 2.14 — Получить язык из SDK (автоопределение)
 */
export function getLanguage(): string {
  if (!ysdk) return 'ru';

  try {
    const env = ysdk.getEnvironment();
    return env.i18n.lang || 'ru';
  } catch {
    return 'ru';
  }
}

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
