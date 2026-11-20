/**
 * Control panel strings (addon-owned; the app language system is not used by addons).
 */

/** Panel languages. */
export type UiLang = 'en' | 'ru' | 'uk';

/** Key → per-language text. */
type Strings = Record<string, Record<UiLang, string>>;

/**
 * All panel strings. `{name}` placeholders are filled by {@link t}.
 * @example strings.play.ru; // 'Проиграть'
 */
const strings: Strings = {
  appTitle: {
    en: 'Stream Alerts',
    ru: 'Алерты для стрима',
    uk: 'Алерти для стріму',
  },

  // Header / tabs
  tabEditor: { en: 'Alerts', ru: 'Алерты', uk: 'Алерти' },
  tabFeed: { en: 'Feed', ru: 'Лента', uk: 'Стрічка' },
  tabSettings: {
    en: 'OBS & filters',
    ru: 'OBS и фильтры',
    uk: 'OBS і фільтри',
  },
  widgetConnected: {
    en: 'OBS connected ({n})',
    ru: 'OBS подключён ({n})',
    uk: 'OBS підключено ({n})',
  },
  widgetOffline: {
    en: 'OBS widget is not connected',
    ru: 'Виджет OBS не подключён',
    uk: 'Віджет OBS не підключено',
  },
  widgetOfflineHint: {
    en: 'Alerts wait in the queue until the widget is open in OBS. Copy the link on the «OBS & filters» tab.',
    ru: 'Алерты ждут в очереди, пока виджет не откроется в OBS. Ссылка — на вкладке «OBS и фильтры».',
    uk: 'Алерти чекають у черзі, доки віджет не відкриється в OBS. Посилання — на вкладці «OBS і фільтри».',
  },
  queueWaiting: {
    en: 'In queue: {n}',
    ru: 'В очереди: {n}',
    uk: 'У черзі: {n}',
  },
  nowPlaying: {
    en: 'On screen: {name}',
    ru: 'На экране: {name}',
    uk: 'На екрані: {name}',
  },
  pause: { en: 'Pause alerts', ru: 'Пауза алертов', uk: 'Пауза алертів' },
  resume: { en: 'Resume alerts', ru: 'Возобновить', uk: 'Відновити' },
  paused: { en: 'Paused', ru: 'На паузе', uk: 'На паузі' },
  skip: { en: 'Skip', ru: 'Пропустить', uk: 'Пропустити' },
  saved: { en: 'Saved', ru: 'Сохранено', uk: 'Збережено' },
  saving: { en: 'Saving…', ru: 'Сохранение…', uk: 'Збереження…' },

  // Kinds
  kind_donation: { en: 'Donations', ru: 'Донаты', uk: 'Донати' },
  kind_subscribe: { en: 'Subscriptions', ru: 'Подписки', uk: 'Підписки' },
  kind_subgift: {
    en: 'Gift subs',
    ru: 'Подарочные подписки',
    uk: 'Подарункові підписки',
  },
  kind_follow: { en: 'Follows', ru: 'Фолловы', uk: 'Фолови' },
  kind_custom: { en: 'Other events', ru: 'Другие события', uk: 'Інші події' },
  value_donation: {
    en: 'Amount, {cur}',
    ru: 'Сумма, {cur}',
    uk: 'Сума, {cur}',
  },
  value_subscribe: { en: 'Months', ru: 'Месяцы', uk: 'Місяці' },
  value_subgift: { en: 'Gifts', ru: 'Подарки', uk: 'Подарунки' },
  value_follow: { en: 'Value', ru: 'Значение', uk: 'Значення' },
  value_custom: { en: 'Value', ru: 'Значение', uk: 'Значення' },
  value_catalog: { en: 'Value', ru: 'Значение', uk: 'Значення' },
  kindsStandard: {
    en: 'Main events',
    ru: 'Основные события',
    uk: 'Основні події',
  },
  kindsUnavailable: {
    en: 'Source is off',
    ru: 'Источник выключен',
    uk: 'Джерело вимкнено',
  },
  kindsUnavailableHint: {
    en: 'The addon that sends these events is disabled or not installed. Designs are kept.',
    ru: 'Аддон, который присылает эти события, выключен или не установлен. Дизайны сохранены.',
    uk: 'Аддон, що надсилає ці події, вимкнено або не встановлено. Дизайни збережено.',
  },
  kindsCatalogEmpty: {
    en: 'Platform events (bits, channel rewards, …) appear here automatically when a platform addon such as Twitch is installed and enabled.',
    ru: 'События площадок (битсы, награды канала, …) появятся здесь автоматически, когда будет установлен и включён аддон площадки, например Twitch.',
    uk: 'Події платформ (бітси, нагороди каналу, …) з’являться тут автоматично, коли буде встановлено й увімкнено аддон платформи, наприклад Twitch.',
  },
  kindFromSource: {
    en: 'Event from «{source}»',
    ru: 'Событие из «{source}»',
    uk: 'Подія з «{source}»',
  },
  kindEnabled: {
    en: 'Show these alerts',
    ru: 'Показывать эти алерты',
    uk: 'Показувати ці алерти',
  },
  kindOff: { en: 'off', ru: 'выкл', uk: 'вимк' },

  // Variants
  variants: { en: 'Variants', ru: 'Варианты', uk: 'Варіанти' },
  baseVariant: { en: 'Base', ru: 'Основной', uk: 'Основний' },
  addVariant: { en: '+ Variant', ru: '+ Вариант', uk: '+ Варіант' },
  variantHint: {
    en: 'A variant replaces the base design when its condition matches (e.g. big donations). An exact amount («From» = «Up to») wins, otherwise the highest matching «From».',
    ru: 'Вариант заменяет основной дизайн, когда выполняется его условие (например, крупные донаты). Побеждает точная сумма («От» = «До»), иначе самый большой подходящий порог «От».',
    uk: 'Варіант замінює основний дизайн, коли виконується його умова (наприклад, великі донати). Перемагає точна сума («Від» = «До»), інакше найбільший відповідний поріг «Від».',
  },
  variantName: {
    en: 'Variant name',
    ru: 'Название варианта',
    uk: 'Назва варіанту',
  },
  newVariantName: { en: 'From {n}', ru: 'От {n}', uk: 'Від {n}' },
  newVariantNumbered: {
    en: 'Variant {n}',
    ru: 'Вариант {n}',
    uk: 'Варіант {n}',
  },
  variantOn: {
    en: 'Variant enabled',
    ru: 'Вариант включён',
    uk: 'Варіант увімкнено',
  },
  duplicate: { en: 'Duplicate', ru: 'Дублировать', uk: 'Дублювати' },
  delete: { en: 'Delete', ru: 'Удалить', uk: 'Видалити' },
  resetDesign: {
    en: 'Reset to default',
    ru: 'Сбросить к стандарту',
    uk: 'Скинути до стандарту',
  },
  confirmDeleteVariant: {
    en: 'Delete variant «{name}»?',
    ru: 'Удалить вариант «{name}»?',
    uk: 'Видалити варіант «{name}»?',
  },
  confirmReset: {
    en: 'Reset this design to the default look?',
    ru: 'Сбросить этот дизайн к стандартному виду?',
    uk: 'Скинути цей дизайн до стандартного вигляду?',
  },
  copyDesignTo: {
    en: 'Copy design to…',
    ru: 'Скопировать дизайн в…',
    uk: 'Скопіювати дизайн у…',
  },
  copiedDesign: {
    en: 'Design copied to «{name}»',
    ru: 'Дизайн скопирован в «{name}»',
    uk: 'Дизайн скопійовано в «{name}»',
  },

  // Groups
  grpCondition: {
    en: 'When to use',
    ru: 'Когда использовать',
    uk: 'Коли використовувати',
  },
  grpText: { en: 'Headline', ru: 'Заголовок', uk: 'Заголовок' },
  grpMessage: {
    en: 'Viewer message',
    ru: 'Сообщение зрителя',
    uk: 'Повідомлення глядача',
  },
  grpMedia: {
    en: 'Image & sound',
    ru: 'Картинка и звук',
    uk: 'Картинка і звук',
  },
  grpLayout: {
    en: 'Layout & card',
    ru: 'Расположение и плашка',
    uk: 'Розташування і плашка',
  },
  grpAnim: {
    en: 'Animation & timing',
    ru: 'Анимация и время',
    uk: 'Анімація і час',
  },
  grpTts: {
    en: 'Read aloud (TTS)',
    ru: 'Озвучка (TTS)',
    uk: 'Озвучення (TTS)',
  },

  // Text
  template: { en: 'Text', ru: 'Текст', uk: 'Текст' },
  templateHint: {
    en: 'Tokens in {braces} are filled in and highlighted.',
    ru: 'Токены в {скобках} подставляются и подсвечиваются.',
    uk: 'Токени в {дужках} підставляються й підсвічуються.',
  },
  font: { en: 'Font', ru: 'Шрифт', uk: 'Шрифт' },
  size: { en: 'Size', ru: 'Размер', uk: 'Розмір' },
  weight: { en: 'Weight', ru: 'Толщина', uk: 'Товщина' },
  color: { en: 'Color', ru: 'Цвет', uk: 'Колір' },
  accent: { en: 'Highlight', ru: 'Подсветка', uk: 'Підсвічування' },
  stroke: { en: 'Outline', ru: 'Обводка', uk: 'Обведення' },
  strokeColor: {
    en: 'Outline color',
    ru: 'Цвет обводки',
    uk: 'Колір обведення',
  },
  shadow: { en: 'Shadow', ru: 'Тень', uk: 'Тінь' },
  uppercase: { en: 'UPPERCASE', ru: 'ПРОПИСНЫЕ', uk: 'ВЕЛИКІ' },
  align: { en: 'Align', ru: 'Выравнивание', uk: 'Вирівнювання' },
  showMessage: {
    en: 'Show the viewer message',
    ru: 'Показывать сообщение зрителя',
    uk: 'Показувати повідомлення глядача',
  },
  maxLength: { en: 'Max length', ru: 'Макс. длина', uk: 'Макс. довжина' },
  chars: { en: 'chars', ru: 'симв.', uk: 'симв.' },

  // Media
  image: {
    en: 'Image / GIF / video',
    ru: 'Картинка / GIF / видео',
    uk: 'Картинка / GIF / відео',
  },
  sound: { en: 'Sound', ru: 'Звук', uk: 'Звук' },
  choose: { en: 'Choose…', ru: 'Выбрать…', uk: 'Обрати…' },
  none: { en: 'None', ru: 'Нет', uk: 'Немає' },
  imageSize: {
    en: 'Image width',
    ru: 'Ширина картинки',
    uk: 'Ширина картинки',
  },
  imageRadius: { en: 'Rounding', ru: 'Скругление', uk: 'Заокруглення' },
  volume: { en: 'Volume', ru: 'Громкость', uk: 'Гучність' },
  soundDelay: { en: 'Sound delay', ru: 'Задержка звука', uk: 'Затримка звуку' },
  listen: { en: 'Listen', ru: 'Прослушать', uk: 'Прослухати' },

  // Layout
  layout: { en: 'Layout', ru: 'Расположение', uk: 'Розташування' },
  'layout_image-above': {
    en: 'Image above',
    ru: 'Картинка сверху',
    uk: 'Картинка зверху',
  },
  'layout_image-below': {
    en: 'Image below',
    ru: 'Картинка снизу',
    uk: 'Картинка знизу',
  },
  'layout_image-left': {
    en: 'Image left',
    ru: 'Картинка слева',
    uk: 'Картинка зліва',
  },
  'layout_image-right': {
    en: 'Image right',
    ru: 'Картинка справа',
    uk: 'Картинка справа',
  },
  'layout_image-behind': {
    en: 'Text over image',
    ru: 'Текст поверх картинки',
    uk: 'Текст поверх картинки',
  },
  'layout_text-only': { en: 'Text only', ru: 'Только текст', uk: 'Лише текст' },
  'layout_image-only': {
    en: 'Image only',
    ru: 'Только картинка',
    uk: 'Лише картинка',
  },
  boxWidth: { en: 'Alert width', ru: 'Ширина алерта', uk: 'Ширина алерту' },
  padding: { en: 'Padding', ru: 'Отступы', uk: 'Відступи' },
  gap: {
    en: 'Image–text gap',
    ru: 'Зазор картинка–текст',
    uk: 'Зазор картинка–текст',
  },
  background: { en: 'Card color', ru: 'Цвет плашки', uk: 'Колір плашки' },
  bgOpacity: {
    en: 'Card opacity',
    ru: 'Непрозрачность плашки',
    uk: 'Непрозорість плашки',
  },
  bgOpacityHint: {
    en: '0 = no card, text only on stream',
    ru: '0 = без плашки, только текст',
    uk: '0 = без плашки, лише текст',
  },
  radius: { en: 'Rounding', ru: 'Скругление', uk: 'Заокруглення' },
  border: { en: 'Border', ru: 'Рамка', uk: 'Рамка' },
  borderColor: { en: 'Border color', ru: 'Цвет рамки', uk: 'Колір рамки' },
  cardShadow: { en: 'Card shadow', ru: 'Тень плашки', uk: 'Тінь плашки' },

  // Animation
  enter: { en: 'Entrance', ru: 'Появление', uk: 'Поява' },
  exit: { en: 'Exit', ru: 'Исчезновение', uk: 'Зникнення' },
  speed: { en: 'speed', ru: 'скорость', uk: 'швидкість' },
  duration: { en: 'On screen', ru: 'На экране', uk: 'На екрані' },
  textFx: {
    en: 'Highlight effect',
    ru: 'Эффект подсветки',
    uk: 'Ефект підсвічування',
  },
  anim_none: { en: 'None', ru: 'Без анимации', uk: 'Без анімації' },
  anim_fade: { en: 'Fade', ru: 'Плавно', uk: 'Плавно' },
  'anim_slide-up': { en: 'Slide up', ru: 'Выезд вверх', uk: 'Виїзд угору' },
  'anim_slide-down': { en: 'Slide down', ru: 'Выезд вниз', uk: 'Виїзд униз' },
  'anim_slide-left': {
    en: 'Slide left',
    ru: 'Выезд влево',
    uk: 'Виїзд ліворуч',
  },
  'anim_slide-right': {
    en: 'Slide right',
    ru: 'Выезд вправо',
    uk: 'Виїзд праворуч',
  },
  anim_zoom: { en: 'Zoom', ru: 'Масштаб', uk: 'Масштаб' },
  anim_pop: { en: 'Pop', ru: 'Выпрыгивание', uk: 'Вистрибування' },
  anim_bounce: { en: 'Bounce', ru: 'Подпрыгивание', uk: 'Підстрибування' },
  anim_flip: { en: 'Flip', ru: 'Переворот', uk: 'Переворот' },
  anim_spin: { en: 'Spin', ru: 'Вращение', uk: 'Обертання' },
  anim_blur: { en: 'Blur', ru: 'Размытие', uk: 'Розмиття' },
  fx_none: { en: 'None', ru: 'Нет', uk: 'Немає' },
  fx_wave: { en: 'Wave', ru: 'Волна', uk: 'Хвиля' },
  fx_pulse: { en: 'Pulse', ru: 'Пульс', uk: 'Пульс' },
  fx_shake: { en: 'Shake', ru: 'Тряска', uk: 'Тремтіння' },
  fx_glow: { en: 'Glow', ru: 'Свечение', uk: 'Світіння' },
  fx_rainbow: { en: 'Rainbow', ru: 'Радуга', uk: 'Веселка' },
  fx_jelly: { en: 'Jelly', ru: 'Желе', uk: 'Желе' },

  // Condition
  condMin: { en: 'From', ru: 'От', uk: 'Від' },
  condMax: { en: 'Up to', ru: 'До', uk: 'До' },
  condCurrency: { en: 'Currency', ru: 'Валюта', uk: 'Валюта' },
  condCurrencyApp: {
    en: 'App currency ({cur})',
    ru: 'Валюта приложения ({cur})',
    uk: 'Валюта застосунку ({cur})',
  },
  condCurrencyHint: {
    en: 'Amounts of this variant are compared in this currency (donations in another currency are converted). Use the donation service currency for exact amounts.',
    ru: 'Суммы этого варианта сравниваются в этой валюте (донаты в другой валюте пересчитываются). Для точных сумм выберите валюту сервиса донатов.',
    uk: 'Суми цього варіанта порівнюються в цій валюті (донати в іншій валюті перераховуються). Для точних сум оберіть валюту сервісу донатів.',
  },
  condMaxHint: {
    en: '0 = no upper limit',
    ru: '0 = без верхней границы',
    uk: '0 = без верхньої межі',
  },
  condValues: {
    en: 'Only for',
    ru: 'Только для',
    uk: 'Лише для',
  },
  condValuesHint: {
    en: 'Nothing selected = any value.',
    ru: 'Ничего не выбрано = любое значение.',
    uk: 'Нічого не вибрано = будь-яке значення.',
  },
  valuesLoading: {
    en: 'Loading…',
    ru: 'Загрузка…',
    uk: 'Завантаження…',
  },
  valuesEmpty: {
    en: 'The source returned no values.',
    ru: 'Источник не вернул ни одного значения.',
    uk: 'Джерело не повернуло жодного значення.',
  },
  valuesReload: { en: 'Refresh', ru: 'Обновить', uk: 'Оновити' },
  valuesMissing: {
    en: 'no longer available',
    ru: 'больше недоступно',
    uk: 'більше недоступне',
  },
  condPlatforms: {
    en: 'Only platforms',
    ru: 'Только платформы',
    uk: 'Лише платформи',
  },
  condPlatformsHint: {
    en: 'Platform ids separated by commas (twitch, donationalerts…). Empty = all.',
    ru: 'Id платформ через запятую (twitch, donationalerts…). Пусто = все.',
    uk: 'Id платформ через кому (twitch, donationalerts…). Порожньо = усі.',
  },
  baseConditionHint: {
    en: 'The base design is used when no variant matches.',
    ru: 'Основной дизайн используется, когда не подошёл ни один вариант.',
    uk: 'Основний дизайн використовується, коли не підійшов жоден варіант.',
  },

  // TTS
  ttsEnabled: {
    en: 'Read the alert aloud',
    ru: 'Озвучивать алерт',
    uk: 'Озвучувати алерт',
  },
  ttsHint: {
    en: 'Spoken by StreamKit+ TTS on this PC (OBS captures desktop audio).',
    ru: 'Озвучивает TTS StreamKit+ на этом ПК (OBS захватывает звук рабочего стола).',
    uk: 'Озвучує TTS StreamKit+ на цьому ПК (OBS захоплює звук робочого столу).',
  },
  ttsMin: { en: 'Only from', ru: 'Только от', uk: 'Лише від' },
  ttsTemplate: {
    en: 'Spoken text',
    ru: 'Текст озвучки',
    uk: 'Текст озвучення',
  },

  // Preview
  preview: { en: 'Preview', ru: 'Превью', uk: "Прев'ю" },
  play: { en: '▶ Play', ru: '▶ Проиграть', uk: '▶ Програти' },
  playMuted: { en: '🔇 Muted', ru: '🔇 Без звука', uk: '🔇 Без звуку' },
  playMutedHint: {
    en: 'Play the preview without the alert sound',
    ru: 'Проиграть превью без звука алерта',
    uk: 'Програти прев’ю без звуку алерту',
  },
  stopPreview: { en: '■ Stop', ru: '■ Стоп', uk: '■ Стоп' },
  testObs: { en: 'Send to OBS', ru: 'Отправить в OBS', uk: 'Надіслати в OBS' },
  testSent: {
    en: 'Test alert sent to OBS',
    ru: 'Тестовый алерт отправлен в OBS',
    uk: 'Тестовий алерт надіслано в OBS',
  },
  sample: { en: 'Sample data', ru: 'Тестовые данные', uk: 'Тестові дані' },
  sampleName: { en: 'Name', ru: 'Имя', uk: "Ім'я" },
  sampleAmount: { en: 'Amount', ru: 'Сумма', uk: 'Сума' },
  sampleMessage: { en: 'Message', ru: 'Сообщение', uk: 'Повідомлення' },
  bg: { en: 'Background', ru: 'Фон', uk: 'Тло' },
  bg_dark: { en: 'Dark', ru: 'Тёмный', uk: 'Темне' },
  bg_light: { en: 'Light', ru: 'Светлый', uk: 'Світле' },
  bg_game: { en: 'Game', ru: 'Игра', uk: 'Гра' },
  bg_checker: { en: 'Transparent', ru: 'Прозрачный', uk: 'Прозоре' },
  previewHint: {
    en: 'The frame is a 1920×1080 OBS scene. Placement is set on the «OBS & filters» tab.',
    ru: 'Рамка — сцена OBS 1920×1080. Положение задаётся на вкладке «OBS и фильтры».',
    uk: 'Рамка — сцена OBS 1920×1080. Положення задається на вкладці «OBS і фільтри».',
  },

  // Feed
  queueTitle: { en: 'Queue', ru: 'Очередь', uk: 'Черга' },
  clearQueue: {
    en: 'Clear queue',
    ru: 'Очистить очередь',
    uk: 'Очистити чергу',
  },
  history: {
    en: 'Recent events',
    ru: 'Последние события',
    uk: 'Останні події',
  },
  historyHint: {
    en: 'Every event from your platforms, including hidden ones. «Show» puts it on screen right away.',
    ru: 'Все события с ваших платформ, включая скрытые. «Показать» сразу выводит алерт на экран.',
    uk: 'Усі події з ваших платформ, зокрема приховані. «Показати» одразу виводить алерт на екран.',
  },
  clearHistory: { en: 'Clear', ru: 'Очистить', uk: 'Очистити' },
  confirmClearHistory: {
    en: 'Clear the event list?',
    ru: 'Очистить список событий?',
    uk: 'Очистити список подій?',
  },
  emptyHistory: {
    en: 'No events yet. Send a test alert from the «Alerts» tab.',
    ru: 'Событий пока нет. Отправьте тестовый алерт со вкладки «Алерты».',
    uk: 'Подій поки немає. Надішліть тестовий алерт із вкладки «Алерти».',
  },
  show: { en: 'Show', ru: 'Показать', uk: 'Показати' },
  testTag: { en: 'test', ru: 'тест', uk: 'тест' },
  st_queued: { en: 'In queue', ru: 'В очереди', uk: 'У черзі' },
  st_playing: { en: 'On screen', ru: 'На экране', uk: 'На екрані' },
  st_shown: { en: 'Shown', ru: 'Показан', uk: 'Показано' },
  st_hidden: { en: 'Hidden', ru: 'Скрыт', uk: 'Приховано' },
  st_disabled: { en: 'Type off', ru: 'Тип выключен', uk: 'Тип вимкнено' },
  st_blocked: {
    en: 'Blocked user',
    ru: 'Пользователь в блоке',
    uk: 'Користувач у блоці',
  },
  st_skipped: { en: 'Skipped', ru: 'Пропущен', uk: 'Пропущено' },
  st_expired: { en: 'Expired', ru: 'Устарел', uk: 'Застарів' },
  st_dropped: { en: 'Dropped', ru: 'Отброшен', uk: 'Відкинуто' },
  triggeredBy: {
    en: 'already shown by: {list}',
    ru: 'уже показано через: {list}',
    uk: 'уже показано через: {list}',
  },
  sys_overlay: { en: 'overlay', ru: 'оверлей', uk: 'оверлей' },
  sys_sounds: {
    en: 'sound effect',
    ru: 'звуковой эффект',
    uk: 'звуковий ефект',
  },
  sys_hotkeys: { en: 'hotkey', ru: 'хоткей', uk: 'хоткей' },
  sys_game: { en: 'game effect', ru: 'игровой эффект', uk: 'ігровий ефект' },
  sys_coop: {
    en: 'co-op sync',
    ru: 'кооп-синхронизация',
    uk: 'кооп-синхронізація',
  },
  sys_timer: { en: 'timer', ru: 'таймер', uk: 'таймер' },
  sys_addon: { en: 'another addon', ru: 'другой аддон', uk: 'інший аддон' },

  // Settings tab
  obsTitle: { en: 'Add to OBS', ru: 'Добавить в OBS', uk: 'Додати в OBS' },
  obsStep1: {
    en: 'In OBS add a «Browser» source.',
    ru: 'В OBS добавьте источник «Браузер».',
    uk: 'В OBS додайте джерело «Браузер».',
  },
  obsStep2: {
    en: 'Paste this link and set size 1920×1080.',
    ru: 'Вставьте эту ссылку и задайте размер 1920×1080.',
    uk: 'Вставте це посилання й задайте розмір 1920×1080.',
  },
  obsStep3: {
    en: 'Press «Send to OBS» on the «Alerts» tab to check.',
    ru: 'Нажмите «Отправить в OBS» на вкладке «Алерты», чтобы проверить.',
    uk: 'Натисніть «Надіслати в OBS» на вкладці «Алерти», щоб перевірити.',
  },
  obsMuted: {
    en: 'Add &muted=1 to the link for a silent copy (e.g. a second scene).',
    ru: 'Добавьте &muted=1 к ссылке для беззвучной копии (например, во второй сцене).',
    uk: 'Додайте &muted=1 до посилання для беззвучної копії (наприклад, у другій сцені).',
  },
  obsPrivate: {
    en: 'The link contains a private key — do not show it on stream.',
    ru: 'Ссылка содержит приватный ключ — не показывайте её на стриме.',
    uk: 'Посилання містить приватний ключ — не показуйте його на стрімі.',
  },
  copy: { en: 'Copy', ru: 'Копировать', uk: 'Копіювати' },
  copied: {
    en: 'Link copied',
    ru: 'Ссылка скопирована',
    uk: 'Посилання скопійовано',
  },
  stageTitle: {
    en: 'Position on screen',
    ru: 'Положение на экране',
    uk: 'Положення на екрані',
  },
  offsetX: { en: 'Shift X', ru: 'Сдвиг X', uk: 'Зсув X' },
  offsetY: { en: 'Shift Y', ru: 'Сдвиг Y', uk: 'Зсув Y' },
  scale: { en: 'Scale', ru: 'Масштаб', uk: 'Масштаб' },
  masterVolume: {
    en: 'Master volume',
    ru: 'Общая громкость',
    uk: 'Загальна гучність',
  },
  queueSettings: { en: 'Queue', ru: 'Очередь', uk: 'Черга' },
  gapMs: {
    en: 'Pause between alerts',
    ru: 'Пауза между алертами',
    uk: 'Пауза між алертами',
  },
  maxSize: {
    en: 'Max waiting alerts',
    ru: 'Макс. алертов в очереди',
    uk: 'Макс. алертів у черзі',
  },
  expireSec: {
    en: 'Drop alerts waiting longer than',
    ru: 'Отбрасывать алерты, ждущие дольше',
    uk: 'Відкидати алерти, що чекають довше',
  },
  expireHint: {
    en: '0 = never. Prevents a burst of old alerts when OBS opens late.',
    ru: '0 = никогда. Защищает от пачки старых алертов, если OBS открыт поздно.',
    uk: '0 = ніколи. Захищає від пачки старих алертів, якщо OBS відкрито пізно.',
  },
  filtersTitle: {
    en: 'Do not show events that already triggered…',
    ru: 'Не показывать события, которые уже запустили…',
    uk: 'Не показувати події, які вже запустили…',
  },
  filtersHint: {
    en: 'So viewers do not see the same event twice. Turn a switch off to show the alert anyway.',
    ru: 'Чтобы зрители не видели одно событие дважды. Выключите переключатель, чтобы всё равно показывать алерт.',
    uk: 'Щоб глядачі не бачили одну подію двічі. Вимкніть перемикач, щоб усе одно показувати алерт.',
  },
  hide_overlay: { en: 'Overlays', ru: 'Оверлеи', uk: 'Оверлеї' },
  hide_sounds: {
    en: 'Sound effects',
    ru: 'Звуковые эффекты',
    uk: 'Звукові ефекти',
  },
  hide_hotkeys: { en: 'Hotkeys', ru: 'Хоткеи', uk: 'Хоткеї' },
  hide_game: { en: 'Game effects', ru: 'Игровые эффекты', uk: 'Ігрові ефекти' },
  hide_coop: {
    en: 'Co-op sync effects',
    ru: 'Эффекты кооп-синхронизации',
    uk: 'Ефекти кооп-синхронізації',
  },
  hide_timer: {
    en: 'Timer extensions',
    ru: 'Продление таймера',
    uk: 'Продовження таймера',
  },
  hide_addon: {
    en: 'Triggers of other addons',
    ru: 'Триггеры других аддонов',
    uk: 'Тригери інших аддонів',
  },
  moderation: { en: 'Moderation', ru: 'Модерация', uk: 'Модерація' },
  blockedUsers: {
    en: 'Never alert for users',
    ru: 'Не показывать алерты от',
    uk: 'Не показувати алерти від',
  },
  blockedHint: {
    en: 'One name per line.',
    ru: 'Одно имя на строку.',
    uk: "Одне ім'я на рядок.",
  },
  bannedWords: {
    en: 'Hide words in messages',
    ru: 'Скрывать слова в сообщениях',
    uk: 'Приховувати слова в повідомленнях',
  },
  bannedHint: {
    en: 'One word per line, replaced with ***.',
    ru: 'Одно слово на строку, заменяется на ***.',
    uk: 'Одне слово на рядок, замінюється на ***.',
  },

  // Media picker
  mediaTitleImage: {
    en: 'Choose an image',
    ru: 'Выбор картинки',
    uk: 'Вибір картинки',
  },
  mediaTitleSound: {
    en: 'Choose a sound',
    ru: 'Выбор звука',
    uk: 'Вибір звуку',
  },
  builtin: { en: 'Built-in', ru: 'Встроенные', uk: 'Вбудовані' },
  library: { en: 'My files', ru: 'Мои файлы', uk: 'Мої файли' },
  link: { en: 'Link', ru: 'Ссылка', uk: 'Посилання' },
  upload: {
    en: 'Upload file…',
    ru: 'Загрузить файл…',
    uk: 'Завантажити файл…',
  },
  uploading: {
    en: 'Uploading… {p}%',
    ru: 'Загрузка… {p}%',
    uk: 'Завантаження… {p}%',
  },
  uploadHint: {
    en: 'Images, GIF, WebM/MP4 (transparent WebM works), MP3/OGG/WAV. Up to {size} per file.',
    ru: 'Картинки, GIF, WebM/MP4 (прозрачный WebM работает), MP3/OGG/WAV. До {size} на файл.',
    uk: 'Картинки, GIF, WebM/MP4 (прозорий WebM працює), MP3/OGG/WAV. До {size} на файл.',
  },
  libraryUsage: {
    en: 'Used {used} of {total}',
    ru: 'Занято {used} из {total}',
    uk: 'Зайнято {used} з {total}',
  },
  libraryEmpty: {
    en: 'No files yet.',
    ru: 'Файлов пока нет.',
    uk: 'Файлів поки немає.',
  },
  urlPlaceholder: {
    en: 'https://… (GIF, PNG, WebM, MP3)',
    ru: 'https://… (GIF, PNG, WebM, MP3)',
    uk: 'https://… (GIF, PNG, WebM, MP3)',
  },
  use: { en: 'Use', ru: 'Выбрать', uk: 'Обрати' },
  close: { en: 'Close', ru: 'Закрыть', uk: 'Закрити' },
  confirmDeleteFile: {
    en: 'Delete «{name}»? Alerts using it lose the file.',
    ru: 'Удалить «{name}»? Алерты, где он используется, останутся без файла.',
    uk: 'Видалити «{name}»? Алерти, де він використовується, залишаться без файлу.',
  },
  snd_chime: { en: 'Chime', ru: 'Перезвон', uk: 'Передзвін' },
  snd_coin: { en: 'Coin', ru: 'Монетка', uk: 'Монетка' },
  snd_fanfare: { en: 'Fanfare', ru: 'Фанфары', uk: 'Фанфари' },
  snd_levelup: { en: 'Level up', ru: 'Новый уровень', uk: 'Новий рівень' },
  snd_bell: { en: 'Bell', ru: 'Колокол', uk: 'Дзвін' },
  snd_pop: { en: 'Pop', ru: 'Хлопок', uk: 'Бульк' },
  snd_sparkle: { en: 'Sparkle', ru: 'Искры', uk: 'Іскри' },
  snd_whoosh: { en: 'Whoosh', ru: 'Свист', uk: 'Свист' },
  snd_drumroll: {
    en: 'Drum roll',
    ru: 'Барабанная дробь',
    uk: 'Барабанний дроб',
  },
  file: { en: 'File', ru: 'Файл', uk: 'Файл' },

  // Common
  yes: { en: 'Yes', ru: 'Да', uk: 'Так' },
  cancel: { en: 'Cancel', ru: 'Отмена', uk: 'Скасувати' },
  ms: { en: 'ms', ru: 'мс', uk: 'мс' },
  sec: { en: 's', ru: 'с', uk: 'с' },
  min: { en: 'min', ru: 'мин', uk: 'хв' },
  px: { en: 'px', ru: 'px', uk: 'px' },
  pct: { en: '%', ru: '%', uk: '%' },
  // DonationAlerts import
  daOpen: {
    en: 'Import from DonationAlerts',
    ru: 'Импорт из DonationAlerts',
    uk: 'Імпорт з DonationAlerts',
  },
  daTitle: {
    en: 'Import from DonationAlerts',
    ru: 'Импорт из DonationAlerts',
    uk: 'Імпорт з DonationAlerts',
  },
  daIntro: {
    en: 'Paste the alert widget link from DonationAlerts (Widgets → Alerts → group → "Show embed link"). Only donation variations that are switched on are imported; Twitch, YouTube and other platform alerts are skipped.',
    ru: 'Вставьте ссылку на виджет оповещений из DonationAlerts (Виджеты → Оповещения → группа → «Показать ссылку для встраивания»). Импортируются только включённые вариации донатов; алерты Twitch, YouTube и других площадок пропускаются.',
    uk: 'Вставте посилання на віджет сповіщень із DonationAlerts (Віджети → Сповіщення → група → «Показати посилання для вбудовування»). Імпортуються лише увімкнені варіації донатів; алерти Twitch, YouTube та інших платформ пропускаються.',
  },
  daSecretHint: {
    en: 'The link contains a secret token: it is used only for this import and is not saved.',
    ru: 'Ссылка содержит секретный токен: он используется только для этого импорта и не сохраняется.',
    uk: 'Посилання містить секретний токен: він використовується лише для цього імпорту й не зберігається.',
  },
  daLoad: { en: 'Load', ru: 'Загрузить', uk: 'Завантажити' },
  daLoading: { en: 'Loading…', ru: 'Загрузка…', uk: 'Завантаження…' },
  daFound: {
    en: 'Group {group}: {n} donation variations, amounts in {cur}.',
    ru: 'Группа {group}: вариаций донатов — {n}, суммы в {cur}.',
    uk: 'Група {group}: варіацій донатів — {n}, суми в {cur}.',
  },
  daEmpty: {
    en: 'No active donation variations found in this group.',
    ru: 'В этой группе нет включённых вариаций донатов.',
    uk: 'У цій групі немає увімкнених варіацій донатів.',
  },
  daEmptyOtherGroups: {
    en: 'No active donation variations in this group. Found in groups (count): {groups} — use the link of that group.',
    ru: 'В этой группе нет включённых вариаций донатов. Они есть в группах (количество): {groups} — используйте ссылку этой группы.',
    uk: 'У цій групі немає увімкнених варіацій донатів. Вони є в групах (кількість): {groups} — використайте посилання цієї групи.',
  },
  daDefaultName: {
    en: 'Default variation',
    ru: 'Вариация по умолчанию',
    uk: 'Варіація за замовчуванням',
  },
  daDefaultToBase: {
    en: 'replaces the base variant',
    ru: 'заменит базовый вариант',
    uk: 'замінить базовий варіант',
  },
  daNote_silent: {
    en: 'shows nothing in DonationAlerts (0 s, no image or sound)',
    ru: 'в DonationAlerts ничего не показывает (0 с, без картинки и звука)',
    uk: 'у DonationAlerts нічого не показує (0 с, без картинки й звуку)',
  },
  daNote_condition: {
    en: 'has an amount condition that is not supported',
    ru: 'содержит неподдерживаемое условие по сумме',
    uk: 'містить непідтримувану умову за сумою',
  },
  daMediaHint: {
    en: 'Images and sounds are played from DonationAlerts servers',
    ru: 'Картинки и звуки воспроизводятся с серверов DonationAlerts',
    uk: 'Картинки й звуки відтворюються із серверів DonationAlerts',
  },
  daCurrencyHint: {
    en: 'Imported conditions keep {cur}: donations in other currencies are converted before comparing.',
    ru: 'Импортированные условия сохраняют {cur}: донаты в других валютах пересчитываются перед сравнением.',
    uk: 'Імпортовані умови зберігають {cur}: донати в інших валютах перераховуються перед порівнянням.',
  },
  daModeAppend: {
    en: 'Add to current variants',
    ru: 'Добавить к текущим вариантам',
    uk: 'Додати до поточних варіантів',
  },
  daModeReplace: {
    en: 'Replace current variants',
    ru: 'Заменить текущие варианты',
    uk: 'Замінити поточні варіанти',
  },
  daImport: {
    en: 'Import ({n})',
    ru: 'Импортировать ({n})',
    uk: 'Імпортувати ({n})',
  },
  daImported: {
    en: 'Imported: {n}',
    ru: 'Импортировано: {n}',
    uk: 'Імпортовано: {n}',
  },
  daImportedLimit: {
    en: 'Imported: {n}, skipped {skipped} (limit {max} variants)',
    ru: 'Импортировано: {n}, пропущено {skipped} (лимит {max} вариантов)',
    uk: 'Імпортовано: {n}, пропущено {skipped} (ліміт {max} варіантів)',
  },
  err_daBadLink: {
    en: 'This is not a DonationAlerts alert widget link',
    ru: 'Это не ссылка на виджет оповещений DonationAlerts',
    uk: 'Це не посилання на віджет сповіщень DonationAlerts',
  },
  err_daFetchFailed: {
    en: 'Could not load the DonationAlerts page',
    ru: 'Не удалось загрузить страницу DonationAlerts',
    uk: 'Не вдалося завантажити сторінку DonationAlerts',
  },
  err_daNotWidget: {
    en: 'No alert settings on the page — check the link (the token may have been regenerated)',
    ru: 'На странице нет настроек оповещений — проверьте ссылку (токен мог быть перевыпущен)',
    uk: 'На сторінці немає налаштувань сповіщень — перевірте посилання (токен міг бути перевипущений)',
  },
  err_valuesFailed: {
    en: 'Could not load values from the source addon',
    ru: 'Не удалось загрузить значения из аддона-источника',
    uk: 'Не вдалося завантажити значення з аддона-джерела',
  },
  err_unauthorized: {
    en: 'Access denied — reopen the window',
    ru: 'Нет доступа — откройте окно заново',
    uk: 'Немає доступу — відкрийте вікно знову',
  },
  err_tooLarge: {
    en: 'File is too large',
    ru: 'Файл слишком большой',
    uk: 'Файл завеликий',
  },
  err_badType: {
    en: 'Unsupported file type',
    ru: 'Неподдерживаемый тип файла',
    uk: 'Непідтримуваний тип файлу',
  },
  err_libraryFull: {
    en: 'Media library is full — delete some files',
    ru: 'Медиатека заполнена — удалите часть файлов',
    uk: 'Медіатека заповнена — видаліть частину файлів',
  },
  err_nothingPlaying: {
    en: 'Nothing is on screen',
    ru: 'Сейчас ничего не показывается',
    uk: 'Зараз нічого не показується',
  },
  err_network: {
    en: 'StreamKit+ is not responding',
    ru: 'StreamKit+ не отвечает',
    uk: 'StreamKit+ не відповідає',
  },
  err_unknown: {
    en: 'Something went wrong',
    ru: 'Что-то пошло не так',
    uk: 'Щось пішло не так',
  },
};

/** Current language. */
let lang: UiLang = 'en';

/**
 * Sets the panel language.
 * @param next Language code from the worker.
 * @example setLang('ru');
 */
export const setLang = (next: string) => {
  lang = next === 'ru' || next === 'uk' ? next : 'en';
  document.documentElement.lang = lang;
};

/**
 * Current panel language.
 * @returns Language code.
 * @example getLang(); // 'uk'
 */
export const getLang = () => lang;

/**
 * Whether a key exists.
 * @param key Key.
 * @returns True when translated.
 * @example has('err_tooLarge'); // true
 */
export const has = (key: string) => key in strings;

/**
 * Translates a key and fills `{placeholders}`.
 * @param key Key.
 * @param vars Placeholder values.
 * @returns Text (the key itself when missing).
 * @example t('queueWaiting', { n: 3 }); // 'In queue: 3'
 */
export const t = (key: string, vars: Record<string, string | number> = {}) => {
  const entry = strings[key];
  const text = entry ? (entry[lang] ?? entry.en) : key;
  return text.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m
  );
};
