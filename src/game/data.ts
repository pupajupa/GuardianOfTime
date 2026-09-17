import Decimal from 'break_infinity.js';

export interface GeneratorData {
  id: string;
  name: string;
  icon: string;
  epoch: number;
  baseCost: Decimal;
  baseIncome: Decimal;
  description: string;
}

export interface UpgradeData {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: Decimal;
  epoch: number;
  type: 'click' | 'generator' | 'global';
  effect: {
    type: 'clickPower' | 'clickMulti' | 'critChance' | 'critMulti' | 'genMulti' | 'globalMulti' | 'autoClick';
    value: number;
    generatorId?: string;
  };
  maxLevel: number;
  costMultiplier: number;
}

export interface EpochData {
  id: number;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  bgClass: string;
  requiredTime: Decimal;
  bossName: string;
  bossHp: Decimal;
  bossIcon: string;
  description: string;
}

export interface StoryDialog {
  id: string;
  epoch: number;
  character: string;
  characterIcon: string;
  text: string;
  trigger: 'start' | 'mid' | 'boss' | 'end';
  triggerValue?: number;
}

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'click' | 'rich' | 'story' | 'collection';
  requirement: { type: string; value: number };
  reward: number; // shards
}

export const EPOCHS: EpochData[] = [
  {
    id: 0, name: 'Эпоха Хаоса', nameEn: 'Age of Chaos', icon: '🌀',
    color: '#a855f7', bgClass: 'epoch-chaos',
    requiredTime: new Decimal(1000),
    bossName: 'Парадокс Начала', bossHp: new Decimal(5000), bossIcon: '👁️',
    description: 'Великий Хронокатаклизм разорвал ткань времени. Вы — Эон, последний Хранитель.'
  },
  {
    id: 1, name: 'Эпоха Древних', nameEn: 'Age of Ancients', icon: '🏛️',
    color: '#22c55e', bgClass: 'epoch-ancient',
    requiredTime: new Decimal(1e6),
    bossName: 'Хроно-Фараон', bossHp: new Decimal(5e7), bossIcon: '👑',
    description: 'Древние цивилизации хранят секреты времени в своих храмах.'
  },
  {
    id: 2, name: 'Эпоха Пара', nameEn: 'Age of Steam', icon: '⚙️',
    color: '#f59e0b', bgClass: 'epoch-steam',
    requiredTime: new Decimal(1e12),
    bossName: 'Механический Титан', bossHp: new Decimal(5e13), bossIcon: '🤖',
    description: 'Индустриальная революция. Машины пожирают время.'
  },
  {
    id: 3, name: 'Эпоха Атома', nameEn: 'Age of Atom', icon: '⚛️',
    color: '#3b82f6', bgClass: 'epoch-atom',
    requiredTime: new Decimal(1e20),
    bossName: 'Квантовый Разрушитель', bossHp: new Decimal(5e21), bossIcon: '💀',
    description: 'Ретро-футуризм XX века. Атомная энергия и тайны времени.'
  },
  {
    id: 4, name: 'Эпоха Сингулярности', nameEn: 'Age of Singularity', icon: '🔮',
    color: '#06b6d4', bgClass: 'epoch-singularity',
    requiredTime: new Decimal(1e30),
    bossName: 'Архитектор Катаклизма', bossHp: new Decimal(5e31), bossIcon: '🌌',
    description: 'Кибернетическое будущее. Истина о Хронокатаклизме раскрыта.'
  }
];

export const GENERATORS: GeneratorData[] = [
  // Epoch 0 - Chaos
  { id: 'g0_0', name: 'Искра Времени', icon: '✨', epoch: 0, baseCost: new Decimal(10), baseIncome: new Decimal(1), description: 'Маленькая искра из хаоса' },
  { id: 'g0_1', name: 'Вихрь Энтропии', icon: '🌪️', epoch: 0, baseCost: new Decimal(100), baseIncome: new Decimal(5), description: 'Закручивает время в спираль' },
  { id: 'g0_2', name: 'Осколок Бездны', icon: '💎', epoch: 0, baseCost: new Decimal(1100), baseIncome: new Decimal(25), description: 'Фрагмент изначальной пустоты' },
  { id: 'g0_3', name: 'Пульс Хаоса', icon: '💜', epoch: 0, baseCost: new Decimal(12000), baseIncome: new Decimal(100), description: 'Сердцебиение вселенной' },
  { id: 'g0_4', name: 'Поток Хаоса', icon: '🌊', epoch: 0, baseCost: new Decimal(130000), baseIncome: new Decimal(500), description: 'Река неупорядоченного времени' },
  { id: 'g0_5', name: 'Врата Небытия', icon: '🕳️', epoch: 0, baseCost: new Decimal(1.4e6), baseIncome: new Decimal(2500), description: 'Портал в ничто' },
  { id: 'g0_6', name: 'Ядро Первородства', icon: '🔥', epoch: 0, baseCost: new Decimal(2e7), baseIncome: new Decimal(10000), description: 'Источник всего сущего' },
  { id: 'g0_7', name: 'Око Бездны', icon: '👁️‍🗨️', epoch: 0, baseCost: new Decimal(3.3e8), baseIncome: new Decimal(50000), description: 'Наблюдает за хаосом' },
  // Epoch 1 - Ancient
  { id: 'g1_0', name: 'Ученик Мага', icon: '🧙', epoch: 1, baseCost: new Decimal(1e5), baseIncome: new Decimal(500), description: 'Познаёт тайны времени' },
  { id: 'g1_1', name: 'Храм Вечности', icon: '🏛️', epoch: 1, baseCost: new Decimal(1e6), baseIncome: new Decimal(3000), description: 'Каменные стены хранят эпохи' },
  { id: 'g1_2', name: 'Жрец Хроноса', icon: '⚡', epoch: 1, baseCost: new Decimal(1e7), baseIncome: new Decimal(15000), description: 'Служитель бога времени' },
  { id: 'g1_3', name: 'Библиотека Эпох', icon: '📚', epoch: 1, baseCost: new Decimal(1e8), baseIncome: new Decimal(80000), description: 'Знания всех цивилизаций' },
  { id: 'g1_4', name: 'Песочные Часы', icon: '⏳', epoch: 1, baseCost: new Decimal(1e9), baseIncome: new Decimal(400000), description: 'Древний артефакт счёта' },
  { id: 'g1_5', name: 'Феникс Времени', icon: '🦅', epoch: 1, baseCost: new Decimal(1e10), baseIncome: new Decimal(2e6), description: 'Возрождается из пепла эпох' },
  { id: 'g1_6', name: 'Древо Жизни', icon: '🌳', epoch: 1, baseCost: new Decimal(1e11), baseIncome: new Decimal(1e7), description: 'Корни уходят в вечность' },
  { id: 'g1_7', name: 'Трон Хроноса', icon: '👑', epoch: 1, baseCost: new Decimal(1e12), baseIncome: new Decimal(5e7), description: 'Символ абсолютной власти над временем' },
  // Epoch 2 - Steam
  { id: 'g2_0', name: 'Паровой Механизм', icon: '⚙️', epoch: 2, baseCost: new Decimal(1e10), baseIncome: new Decimal(5e6), description: 'Шестерни крутят время' },
  { id: 'g2_1', name: 'Часовая Башня', icon: '🏰', epoch: 2, baseCost: new Decimal(1e11), baseIncome: new Decimal(3e7), description: 'Отсчитывает секунды вечности' },
  { id: 'g2_2', name: 'Фабрика Времени', icon: '🏭', epoch: 2, baseCost: new Decimal(1e12), baseIncome: new Decimal(1.5e8), description: 'Производит минуты оптом' },
  { id: 'g2_3', name: 'Дирижабль Эпох', icon: '🎈', epoch: 2, baseCost: new Decimal(1e13), baseIncome: new Decimal(8e8), description: 'Путешествует между эпохами' },
  { id: 'g2_4', name: 'Телеграф Времени', icon: '📡', epoch: 2, baseCost: new Decimal(1e14), baseIncome: new Decimal(4e9), description: 'Передаёт сигналы сквозь века' },
  { id: 'g2_5', name: 'Локомотив Вечности', icon: '🚂', epoch: 2, baseCost: new Decimal(1e15), baseIncome: new Decimal(2e10), description: 'Мчится по рельсам времени' },
  { id: 'g2_6', name: 'Механический Оракул', icon: '🔧', epoch: 2, baseCost: new Decimal(1e16), baseIncome: new Decimal(1e11), description: 'Предсказывает будущее' },
  { id: 'g2_7', name: 'Великий Часовой', icon: '⏰', epoch: 2, baseCost: new Decimal(1e17), baseIncome: new Decimal(5e11), description: 'Хранитель механического времени' },
  // Epoch 3 - Atom
  { id: 'g3_0', name: 'Атомный Реактор', icon: '☢️', epoch: 3, baseCost: new Decimal(1e16), baseIncome: new Decimal(5e10), description: 'Расщепляет время на атомы' },
  { id: 'g3_1', name: 'Космический Зонд', icon: '🛸', epoch: 3, baseCost: new Decimal(1e17), baseIncome: new Decimal(3e11), description: 'Исследует временные аномалии' },
  { id: 'g3_2', name: 'Квантовый Компьютер', icon: '💻', epoch: 3, baseCost: new Decimal(1e18), baseIncome: new Decimal(1.5e12), description: 'Вычисляет линии времени' },
  { id: 'g3_3', name: 'Портал Измерений', icon: '🌀', epoch: 3, baseCost: new Decimal(1e19), baseIncome: new Decimal(8e12), description: 'Открывает пути между мирами' },
  { id: 'g3_4', name: 'Лазерный Ускоритель', icon: '🔬', epoch: 3, baseCost: new Decimal(1e20), baseIncome: new Decimal(4e13), description: 'Ускоряет поток времени' },
  { id: 'g3_5', name: 'Нейросеть Времени', icon: '🧠', epoch: 3, baseCost: new Decimal(1e21), baseIncome: new Decimal(2e14), description: 'ИИ управляет хронопотоком' },
  { id: 'g3_6', name: 'Темпоральный Щит', icon: '🛡️', epoch: 3, baseCost: new Decimal(1e22), baseIncome: new Decimal(1e15), description: 'Защищает от временных парадоксов' },
  { id: 'g3_7', name: 'Звёздный Двигатель', icon: '🌟', epoch: 3, baseCost: new Decimal(1e23), baseIncome: new Decimal(5e15), description: 'Перемещает целые эпохи' },
  // Epoch 4 - Singularity
  { id: 'g4_0', name: 'Нано-Рой', icon: '🔬', epoch: 4, baseCost: new Decimal(1e22), baseIncome: new Decimal(5e14), description: 'Миллиарды наноботов чинят время' },
  { id: 'g4_1', name: 'Матрица Реальности', icon: '🌐', epoch: 4, baseCost: new Decimal(1e23), baseIncome: new Decimal(3e15), description: 'Симулирует временные линии' },
  { id: 'g4_2', name: 'Чёрная Дыра Времени', icon: '🕳️', epoch: 4, baseCost: new Decimal(1e24), baseIncome: new Decimal(1.5e16), description: 'Поглощает и создаёт время' },
  { id: 'g4_3', name: 'Мультивселенский Якорь', icon: '⚓', epoch: 4, baseCost: new Decimal(1e25), baseIncome: new Decimal(8e16), description: 'Стабилизирует реальность' },
  { id: 'g4_4', name: 'Кристалл Бесконечности', icon: '💠', epoch: 4, baseCost: new Decimal(1e26), baseIncome: new Decimal(4e17), description: 'Вмещает все возможные времена' },
  { id: 'g4_5', name: 'Сингулярный Разум', icon: '🤖', epoch: 4, baseCost: new Decimal(1e27), baseIncome: new Decimal(2e18), description: 'Превосходит понимание времени' },
  { id: 'g4_6', name: 'Ткань Реальности', icon: '🧬', epoch: 4, baseCost: new Decimal(1e28), baseIncome: new Decimal(1e19), description: 'Переплетает все эпохи' },
  { id: 'g4_7', name: 'Вечный Двигатель', icon: '♾️', epoch: 4, baseCost: new Decimal(1e29), baseIncome: new Decimal(5e19), description: 'Бесконечный источник времени' },
];

export const UPGRADES: UpgradeData[] = [
  // Click upgrades
  { id: 'u_click1', name: 'Крепкий Палец', icon: '👆', description: '+1 к силе клика', cost: new Decimal(100), epoch: 0, type: 'click', effect: { type: 'clickPower', value: 1 }, maxLevel: 50, costMultiplier: 1.5 },
  { id: 'u_click2', name: 'Двойной Удар', icon: '✌️', description: 'x2 к силе клика', cost: new Decimal(1000), epoch: 0, type: 'click', effect: { type: 'clickMulti', value: 2 }, maxLevel: 10, costMultiplier: 5 },
  { id: 'u_crit1', name: 'Острый Глаз', icon: '👁️', description: '+5% шанс крита', cost: new Decimal(500), epoch: 0, type: 'click', effect: { type: 'critChance', value: 5 }, maxLevel: 10, costMultiplier: 3 },
  { id: 'u_crit2', name: 'Мощный Удар', icon: '💥', description: '+1x к крит-урону', cost: new Decimal(2000), epoch: 0, type: 'click', effect: { type: 'critMulti', value: 1 }, maxLevel: 10, costMultiplier: 4 },
  { id: 'u_auto1', name: 'Авто-кликер', icon: '🤖', description: '1 клик/сек автоматически', cost: new Decimal(5000), epoch: 0, type: 'click', effect: { type: 'autoClick', value: 1 }, maxLevel: 1, costMultiplier: 1 },
  { id: 'u_auto2', name: 'Быстрый Авто-кликер', icon: '⚡', description: '+2 клика/сек', cost: new Decimal(50000), epoch: 1, type: 'click', effect: { type: 'autoClick', value: 2 }, maxLevel: 1, costMultiplier: 1 },
  // Generator upgrades
  { id: 'u_gen0', name: 'Усиление Искр', icon: '✨', description: 'x2 к Искрам Времени', cost: new Decimal(1000), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_0' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen1', name: 'Усиление Вихрей', icon: '🌪️', description: 'x2 к Вихрям Энтропии', cost: new Decimal(5000), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_1' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen2', name: 'Усиление Осколков', icon: '💎', description: 'x2 к Осколкам Бездны', cost: new Decimal(25000), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_2' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen3', name: 'Усиление Пульсов', icon: '💜', description: 'x2 к Пульсам Хаоса', cost: new Decimal(100000), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_3' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen4', name: 'Усиление Потоков', icon: '🌊', description: 'x2 к Потокам Хаоса', cost: new Decimal(500000), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_4' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen5', name: 'Усиление Врат', icon: '🕳️', description: 'x2 к Вратам Небытия', cost: new Decimal(5e6), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_5' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen6', name: 'Усиление Ядра', icon: '🔥', description: 'x2 к Ядру Первородства', cost: new Decimal(5e7), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_6' }, maxLevel: 5, costMultiplier: 10 },
  { id: 'u_gen7', name: 'Усиление Ока', icon: '👁️‍🗨️', description: 'x2 к Оку Бездны', cost: new Decimal(5e8), epoch: 0, type: 'generator', effect: { type: 'genMulti', value: 2, generatorId: 'g0_7' }, maxLevel: 5, costMultiplier: 10 },
  // Global upgrades
  { id: 'u_global1', name: 'Мастер Времени', icon: '🏆', description: 'x2 ко всему доходу', cost: new Decimal(1e6), epoch: 1, type: 'global', effect: { type: 'globalMulti', value: 2 }, maxLevel: 5, costMultiplier: 100 },
  { id: 'u_global2', name: 'Властелин Эпох', icon: '👑', description: 'x3 ко всему доходу', cost: new Decimal(1e12), epoch: 2, type: 'global', effect: { type: 'globalMulti', value: 3 }, maxLevel: 3, costMultiplier: 1000 },
  { id: 'u_global3', name: 'Повелитель Вечности', icon: '♾️', description: 'x5 ко всему доходу', cost: new Decimal(1e20), epoch: 3, type: 'global', effect: { type: 'globalMulti', value: 5 }, maxLevel: 2, costMultiplier: 10000 },
];

export const STORY_DIALOGS: StoryDialog[] = [
  { id: 'd0_start', epoch: 0, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Я... последний Хранитель Времени. Хронокатаклизм разрушил всё. Но я чувствую — время ещё можно восстановить.', trigger: 'start' },
  { id: 'd0_mid', epoch: 0, character: 'Голос Хаоса', characterIcon: '🌀', text: 'Ты думаешь, что можешь починить то, что было разорвано? Наивный смертный...', trigger: 'mid', triggerValue: 500 },
  { id: 'd0_boss', epoch: 0, character: 'Парадокс Начала', characterIcon: '👁️', text: 'Я — причина всего. Я — тот, кто разорвал ткань времени. Ты не сможешь меня остановить!', trigger: 'boss' },
  { id: 'd0_end', epoch: 0, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Парадокс побеждён! Первая трещина залатана. Но впереди — целые эпохи...', trigger: 'end' },
  { id: 'd1_start', epoch: 1, character: 'Старый Мудрец', characterIcon: '🧓', text: 'Добро пожаловать в Эпоху Древних, Хранитель. Здесь магия переплетается с временем.', trigger: 'start' },
  { id: 'd1_boss', epoch: 1, character: 'Хроно-Фараон', characterIcon: '👑', text: 'Мои пирамиды стоят вечность! Ты не властен надо мной, смертный!', trigger: 'boss' },
  { id: 'd1_end', epoch: 1, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Древние тайны раскрыты. Время Древних восстановлено. Впереди — эра машин...', trigger: 'end' },
  { id: 'd2_start', epoch: 2, character: 'Инженер Крон', characterIcon: '👨‍🔧', text: 'Добро пожаловать в Эпоху Пара! Здесь время измеряется оборотами шестерёнок.', trigger: 'start' },
  { id: 'd2_boss', epoch: 2, character: 'Механический Титан', characterIcon: '🤖', text: 'МОИ ШЕСТЕРНИ НЕОСТАНОВИМЫ. ВРЕМЯ — ЭТО МЕХАНИЗМ.', trigger: 'boss' },
  { id: 'd2_end', epoch: 2, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Механизмы усмирены. Но атомная эра таит ещё большие опасности...', trigger: 'end' },
  { id: 'd3_start', epoch: 3, character: 'Профессор Квант', characterIcon: '👩‍🔬', text: 'Хранитель! Квантовая физика раскрыла природу времени. Но что-то пошло не так...', trigger: 'start' },
  { id: 'd3_boss', epoch: 3, character: 'Квантовый Разрушитель', characterIcon: '💀', text: 'Я — суперпозиция всех возможных концовок. Ты не можешь победить ВСЕ варианты!', trigger: 'boss' },
  { id: 'd3_end', epoch: 3, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Квантовая волна схлопнулась. Осталась одна эпоха... Сингулярность.', trigger: 'end' },
  { id: 'd4_start', epoch: 4, character: 'ИИ Нова', characterIcon: '🤖', text: 'Хранитель Эон. Я вычислила: Архитектор Катаклизма находится здесь, в Сингулярности.', trigger: 'start' },
  { id: 'd4_boss', epoch: 4, character: 'Архитектор Катаклизма', characterIcon: '🌌', text: 'Наконец-то ты добрался до меня, Эон. Я — тот, кто создал Хронокатаклизм. И знаешь почему? Чтобы ТЫ стал сильнее.', trigger: 'boss' },
  { id: 'd4_end', epoch: 4, character: 'Эон', characterIcon: '🧙‍♂️', text: 'Всё время восстановлено. Все эпохи на своих местах. Но цикл Вечности продолжается... Я готов к новому перерождению.', trigger: 'end' },
];

export const ACHIEVEMENTS: AchievementData[] = [
  { id: 'a_click100', name: 'Начало Пути', description: '100 кликов', icon: '👆', category: 'click', requirement: { type: 'clicks', value: 100 }, reward: 5 },
  { id: 'a_click1000', name: 'Быстрые Пальцы', description: '1000 кликов', icon: '✋', category: 'click', requirement: { type: 'clicks', value: 1000 }, reward: 10 },
  { id: 'a_click10000', name: 'Мастер Клика', description: '10000 кликов', icon: '🖐️', category: 'click', requirement: { type: 'clicks', value: 10000 }, reward: 25 },
  { id: 'a_click100000', name: 'Легенда Клика', description: '100000 кликов', icon: '💪', category: 'click', requirement: { type: 'clicks', value: 100000 }, reward: 50 },
  { id: 'a_rich1m', name: 'Миллионер', description: 'Накопить 1M Δt', icon: '💰', category: 'rich', requirement: { type: 'totalTime', value: 1e6 }, reward: 10 },
  { id: 'a_rich1b', name: 'Миллиардер', description: 'Накопить 1B Δt', icon: '💎', category: 'rich', requirement: { type: 'totalTime', value: 1e9 }, reward: 25 },
  { id: 'a_rich1t', name: 'Триллионер', description: 'Накопить 1T Δt', icon: '👑', category: 'rich', requirement: { type: 'totalTime', value: 1e12 }, reward: 50 },
  { id: 'a_gen10', name: 'Коллекционер', description: 'Купить 10 генераторов', icon: '🏗️', category: 'rich', requirement: { type: 'generators', value: 10 }, reward: 10 },
  { id: 'a_gen50', name: 'Промышленник', description: 'Купить 50 генераторов', icon: '🏭', category: 'rich', requirement: { type: 'generators', value: 50 }, reward: 25 },
  { id: 'a_gen200', name: 'Магнат', description: 'Купить 200 генераторов', icon: '🌆', category: 'rich', requirement: { type: 'generators', value: 200 }, reward: 50 },
  { id: 'a_epoch1', name: 'Первые Шаги', description: 'Пройти Эпоху Хаоса', icon: '🌀', category: 'story', requirement: { type: 'epoch', value: 1 }, reward: 20 },
  { id: 'a_epoch2', name: 'Древний Знаток', description: 'Пройти Эпоху Древних', icon: '🏛️', category: 'story', requirement: { type: 'epoch', value: 2 }, reward: 30 },
  { id: 'a_epoch3', name: 'Инженер Времени', description: 'Пройти Эпоху Пара', icon: '⚙️', category: 'story', requirement: { type: 'epoch', value: 3 }, reward: 40 },
  { id: 'a_epoch4', name: 'Атомный Мастер', description: 'Пройти Эпоху Атома', icon: '⚛️', category: 'story', requirement: { type: 'epoch', value: 4 }, reward: 50 },
  { id: 'a_epoch5', name: 'Сингулярность', description: 'Пройти Эпоху Сингулярности', icon: '🔮', category: 'story', requirement: { type: 'epoch', value: 5 }, reward: 100 },
  { id: 'a_boss1', name: 'Победитель Парадокса', description: 'Победить первого босса', icon: '🏆', category: 'story', requirement: { type: 'boss', value: 1 }, reward: 15 },
  { id: 'a_prestige1', name: 'Перерождение', description: 'Первый престиж', icon: '🔄', category: 'story', requirement: { type: 'prestige', value: 1 }, reward: 30 },
  { id: 'a_crit50', name: 'Крит-Мастер', description: '50 крит-кликов', icon: '💥', category: 'click', requirement: { type: 'crits', value: 50 }, reward: 15 },
  { id: 'a_crit500', name: 'Крит-Легенда', description: '500 крит-кликов', icon: '⚡', category: 'click', requirement: { type: 'crits', value: 500 }, reward: 40 },
  { id: 'a_combo10', name: 'Комбо-Мастер', description: 'Достичь комбо x10', icon: '🔥', category: 'click', requirement: { type: 'combo', value: 10 }, reward: 20 },
];

export const PRESTIGE_UPGRADES = [
  { id: 'p_start', name: 'Стартовый Бонус', icon: '🎁', description: '+1000 Δt на старте после престижа', cost: 5, effect: 'startBonus' },
  { id: 'p_offline', name: 'Оффлайн-Мастер', icon: '😴', description: '+25% к оффлайн-доходу', cost: 10, effect: 'offlineBonus' },
  { id: 'p_crit', name: 'Вечный Крит', icon: '💥', description: '+10% шанс крита навсегда', cost: 15, effect: 'critBonus' },
  { id: 'p_auto', name: 'Вечный Авто-кликер', icon: '🤖', description: 'Авто-кликер на старте', cost: 20, effect: 'autoStart' },
  { id: 'p_income', name: 'Поток Вечности', icon: '🌊', description: '+50% ко всему доходу навсегда', cost: 25, effect: 'incomeBonus' },
  { id: 'p_speed', name: 'Ускоритель', icon: '⚡', description: 'Генераторы работают на 25% быстрее', cost: 30, effect: 'speedBonus' },
];

export function formatNumber(n: Decimal | number): string {
  const num = n instanceof Decimal ? n : new Decimal(n);
  if (num.lt(0)) return '-' + formatNumber(num.neg());
  if (num.lt(1000)) return num.toFixed(num.lt(10) ? 1 : 0);
  if (num.lt(1e6)) return (num.toNumber() / 1e3).toFixed(1) + 'K';
  if (num.lt(1e9)) return (num.toNumber() / 1e6).toFixed(2) + 'M';
  if (num.lt(1e12)) return (num.toNumber() / 1e9).toFixed(2) + 'B';
  if (num.lt(1e15)) return (num.toNumber() / 1e12).toFixed(2) + 'T';
  if (num.lt(1e18)) return (num.toNumber() / 1e15).toFixed(2) + 'Qa';
  if (num.lt(1e21)) return (num.toNumber() / 1e18).toFixed(2) + 'Qi';
  if (num.lt(1e24)) return (num.toNumber() / 1e21).toFixed(2) + 'Sx';
  if (num.lt(1e27)) return (num.toNumber() / 1e24).toFixed(2) + 'Sp';
  if (num.lt(1e30)) return (num.toNumber() / 1e27).toFixed(2) + 'Oc';
  if (num.lt(1e33)) return (num.toNumber() / 1e30).toFixed(2) + 'No';
  if (num.lt(1e36)) return (num.toNumber() / 1e33).toFixed(2) + 'Dc';
  // For very large numbers, use scientific notation
  const exp = num.log10();
  const mantissa = Math.pow(10, exp - Math.floor(exp));
  return mantissa.toFixed(2) + 'e' + Math.floor(exp);
}
