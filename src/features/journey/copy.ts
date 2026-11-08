import { usePreferences } from "../../theme/preferences";
const en = {
  title: "Your biodiversity journey",
  eyebrow: "SMALL DISCOVERIES. BIG CONNECTIONS.",
  headline: "A neighborhood full of life.",
  intro:
    "Meet a plant. Follow its flower visitors. Discover how they help seeds—and new plants—grow.",
  open: "See my journey",
  start: "Explore a bee-visited plant",
  save: "Choose a plant to save",
  care: "Visit my saved plants",
  chooseCheckInPlant: "Choose a plant for check-ins",
  checkInHelp:
    "Some saved plants do not have check-ins yet. Choose a plant with an “{action}” button to record these days.",
  again: "Explore another plant",
  preview: "Your adventure starts here",
  previewHelp:
    "Try the learning challenge freely. Sign in to save plants and keep your journey progress.",
  map: "Your field guide path",
  mapHelp:
    "Go at your own pace. No garden needed. These checkpoints can be explored in any order.",
  steps: ["Explore a plant", "Save a plant", "Notice what changes"],
  descriptions: [
    "Open a plant from search to start your discoveries.",
    "Save a plant to My Garden—your personal field guide. It can be a plant you simply observe.",
    "Open a saved plant and record a check-in on 3 different days. Look for flowers or visitors. Breaks are welcome.",
  ],
  done: "Complete",
  next: "Try next",
  later: "To explore",
  checkpoints: "checkpoints complete",
  days: "different days",
  loading: "Finding your place in the journey…",
  unavailable:
    "Your saved journey is unavailable. You can still explore and practice below.",
  retry: "Refresh journey",
  rewards: "Pollen & avatars",
  rewardsHelp:
    "Pollen is earned game currency for avatar styles. It does not measure real pollen or biodiversity.",
  observe: "Take a closer look",
  observation:
    "Watch a flower from a respectful distance. Which visitors arrive? Do they visit another flower of the same kind? No visitors today is a useful observation too.",
  local: "Think beyond one flower",
  localHelp:
    "A variety of locally native plants, flowering in different seasons, can support different pollinators. Check a local plant guide with an adult before planting.",
  practice: "A little practice, a new connection",
  complete: "Keep your curiosity growing",
};
type Copy = {
  [K in keyof typeof en]: (typeof en)[K] extends string[] ? string[] : string;
};
const copies: Record<string, Copy> = {
  en,
  es: {
    title: "Tu camino por la biodiversidad",
    eyebrow: "PEQUEÑOS HALLAZGOS. GRANDES CONEXIONES.",
    headline: "Un vecindario lleno de vida.",
    intro:
      "Conoce una planta. Sigue a sus visitantes. Descubre cómo ayudan a formar semillas y nuevas plantas.",
    open: "Ver mi camino",
    start: "Explorar una planta visitada por abejas",
    save: "Elegir una planta para guardar",
    care: "Visitar mis plantas guardadas",
    chooseCheckInPlant: "Elegir una planta para registrar visitas",
    checkInHelp:
      "Algunas plantas guardadas aún no permiten registrar visitas. Elige una planta con el botón «{action}» para registrar estos días.",
    again: "Explorar otra planta",
    preview: "Tu aventura empieza aquí",
    previewHelp:
      "Prueba el reto libremente. Inicia sesión para guardar plantas y tu progreso.",
    map: "El camino de tu guía de campo",
    mapHelp:
      "A tu ritmo y sin jardín. Puedes explorar estos pasos en cualquier orden.",
    steps: ["Explora una planta", "Guarda una planta", "Observa los cambios"],
    descriptions: [
      "Abre una planta desde la búsqueda para comenzar.",
      "Guarda una planta en Mi jardín, tu guía personal. Puede ser una planta que solo observas.",
      "Abre una planta guardada y registra una revisión en 3 días distintos. Busca flores o visitantes. Puedes tomar descansos.",
    ],
    done: "Completado",
    next: "Siguiente idea",
    later: "Por explorar",
    checkpoints: "pasos completados",
    days: "días distintos",
    loading: "Buscando tu lugar en el camino…",
    unavailable:
      "Tu progreso no está disponible. Puedes seguir explorando y practicando.",
    retry: "Actualizar progreso",
    rewards: "Polen y avatares",
    rewardsHelp:
      "El Polen es una moneda del juego para estilos de avatar. No mide polen real ni biodiversidad.",
    observe: "Mira más de cerca",
    observation:
      "Observa una flor a una distancia respetuosa. ¿Quién la visita? ¿Visita otra flor del mismo tipo? No ver visitantes también es una observación útil.",
    local: "Piensa más allá de una flor",
    localHelp:
      "Varias plantas nativas locales que florecen en distintas estaciones pueden apoyar a diferentes polinizadores. Consulta una guía local con un adulto antes de plantar.",
    practice: "Un poco de práctica, una nueva conexión",
    complete: "Sigue cultivando tu curiosidad",
  },
  fr: {
    title: "Ton parcours biodiversité",
    eyebrow: "PETITES DÉCOUVERTES. GRANDS LIENS.",
    headline: "Un quartier plein de vie.",
    intro:
      "Découvre une plante et ses visiteurs. Comprends comment ils aident à former des graines et de nouvelles plantes.",
    open: "Voir mon parcours",
    start: "Explorer une plante visitée par les abeilles",
    save: "Choisir une plante à enregistrer",
    care: "Voir mes plantes enregistrées",
    chooseCheckInPlant: "Choisir une plante pour noter mes visites",
    checkInHelp:
      "Certaines plantes enregistrées ne proposent pas encore de suivi. Choisis une plante avec le bouton « {action} » pour noter ces jours.",
    again: "Explorer une autre plante",
    preview: "Ton aventure commence ici",
    previewHelp:
      "Essaie le défi librement. Connecte-toi pour enregistrer tes plantes et ta progression.",
    map: "Le parcours de ton carnet nature",
    mapHelp:
      "À ton rythme, sans jardin. Explore ces étapes dans l’ordre que tu veux.",
    steps: [
      "Explore une plante",
      "Enregistre une plante",
      "Observe les changements",
    ],
    descriptions: [
      "Ouvre une plante depuis la recherche pour commencer.",
      "Enregistre une plante dans Mon jardin, ton carnet nature. Tu peux simplement l’observer.",
      "Ouvre une plante enregistrée et note une visite sur 3 jours différents. Cherche des fleurs ou des visiteurs. Les pauses sont permises.",
    ],
    done: "Terminé",
    next: "À essayer ensuite",
    later: "À explorer",
    checkpoints: "étapes terminées",
    days: "jours différents",
    loading: "Recherche de ta place dans le parcours…",
    unavailable:
      "Ton parcours enregistré est indisponible. Tu peux continuer à explorer et à t’entraîner.",
    retry: "Actualiser le parcours",
    rewards: "Pollen et avatars",
    rewardsHelp:
      "Le Pollen est une monnaie du jeu pour les avatars. Il ne mesure ni le vrai pollen ni la biodiversité.",
    observe: "Regarde de plus près",
    observation:
      "Observe une fleur à distance respectueuse. Qui la visite ? Le visiteur rejoint-il une fleur du même type ? Aucun visiteur est aussi une observation utile.",
    local: "Au-delà d’une seule fleur",
    localHelp:
      "Des plantes locales indigènes variées qui fleurissent à différentes saisons peuvent aider divers pollinisateurs. Consulte un guide local avec un adulte avant de planter.",
    practice: "Un peu de pratique, un nouveau lien",
    complete: "Continue à cultiver ta curiosité",
  },
  de: {
    title: "Dein Weg durch die Artenvielfalt",
    eyebrow: "KLEINE ENTDECKUNGEN. GROSSE ZUSAMMENHÄNGE.",
    headline: "Eine Nachbarschaft voller Leben.",
    intro:
      "Lerne eine Pflanze und ihre Blütenbesucher kennen. Entdecke, wie sie Samen und neuen Pflanzen helfen.",
    open: "Meinen Weg ansehen",
    start: "Eine von Bienen besuchte Pflanze erkunden",
    save: "Eine Pflanze zum Speichern auswählen",
    care: "Meine gespeicherten Pflanzen besuchen",
    chooseCheckInPlant: "Eine Pflanze für Besuchsnotizen wählen",
    checkInHelp:
      "Bei manchen gespeicherten Pflanzen kannst du noch keine Besuche erfassen. Wähle dafür eine Pflanze mit der Schaltfläche „{action}“.",
    again: "Eine weitere Pflanze erkunden",
    preview: "Hier beginnt dein Abenteuer",
    previewHelp:
      "Probiere die Lernaufgabe aus. Melde dich an, um Pflanzen und Fortschritt zu speichern.",
    map: "Dein Weg zum Naturtagebuch",
    mapHelp:
      "In deinem Tempo, auch ohne Garten. Du kannst die Schritte in beliebiger Reihenfolge erkunden.",
    steps: [
      "Erkunde eine Pflanze",
      "Speichere eine Pflanze",
      "Beobachte Veränderungen",
    ],
    descriptions: [
      "Öffne eine Pflanze über die Suche und beginne deine Entdeckungen.",
      "Speichere eine Pflanze in Mein Garten, deinem Naturtagebuch. Du kannst sie auch nur beobachten.",
      "Öffne eine gespeicherte Pflanze und notiere an 3 verschiedenen Tagen einen Besuch. Suche Blüten oder Besucher. Pausen sind erlaubt.",
    ],
    done: "Abgeschlossen",
    next: "Als Nächstes",
    later: "Zu erkunden",
    checkpoints: "Schritte abgeschlossen",
    days: "verschiedene Tage",
    loading: "Dein Fortschritt wird geladen…",
    unavailable:
      "Dein gespeicherter Fortschritt ist nicht verfügbar. Du kannst weiter erkunden und üben.",
    retry: "Fortschritt aktualisieren",
    rewards: "Pollen und Avatare",
    rewardsHelp:
      "Pollen sind Spielpunkte für Avatar-Stile. Sie messen weder echten Pollen noch Artenvielfalt.",
    observe: "Schau genauer hin",
    observation:
      "Beobachte eine Blüte aus respektvollem Abstand. Welche Besucher kommen? Besuchen sie eine weitere Blüte derselben Art? Auch keine Besucher sind eine nützliche Beobachtung.",
    local: "Mehr als eine Blüte",
    localHelp:
      "Verschiedene heimische Pflanzen mit unterschiedlichen Blütezeiten können verschiedene Bestäuber unterstützen. Prüfe vor dem Pflanzen mit einem Erwachsenen einen örtlichen Pflanzenführer.",
    practice: "Ein wenig Übung, ein neuer Zusammenhang",
    complete: "Lass deine Neugier weiterwachsen",
  },
  "zh-Hans": {
    title: "你的生物多样性之旅",
    eyebrow: "小小发现，紧密相连。",
    headline: "充满生命的社区。",
    intro: "认识植物，观察花朵的访客，了解它们如何帮助植物结籽、繁衍。",
    open: "查看我的旅程",
    start: "探索蜜蜂访花的植物",
    save: "选择要收藏的植物",
    care: "查看已收藏的植物",
    chooseCheckInPlant: "选择可记录观察的植物",
    checkInHelp:
      "有些已收藏的植物暂不支持观察打卡。请选择带有“{action}”按钮的植物来记录这些日子。",
    again: "探索另一种植物",
    preview: "冒险从这里开始",
    previewHelp: "自由尝试学习挑战。登录后可保存植物和旅程进度。",
    map: "你的自然观察路线",
    mapHelp: "按自己的节奏，无需花园。这些步骤可以按任意顺序探索。",
    steps: ["探索植物", "收藏植物", "留意变化"],
    descriptions: [
      "从搜索结果打开一种植物，开始探索。",
      "把植物保存到“我的花园”，建立个人观察手册。也可以只是你观察的植物。",
      "打开已收藏的植物，在3个不同的日子记录观察。寻找花朵或访客，中间可以休息。",
    ],
    done: "已完成",
    next: "接下来试试",
    later: "待探索",
    checkpoints: "个步骤已完成",
    days: "个不同的日子",
    loading: "正在查找你的旅程进度…",
    unavailable: "暂时无法加载进度。你仍可继续探索和练习。",
    retry: "刷新旅程",
    rewards: "花粉积分与头像",
    rewardsHelp: "花粉是兑换头像样式的游戏积分，不代表真实花粉或生物多样性。",
    observe: "仔细看一看",
    observation:
      "保持适当距离观察一朵花。有哪些访客？它们会去同种植物的其他花朵吗？今天没有访客也是有用的观察。",
    local: "不止关注一朵花",
    localHelp:
      "在不同季节开花的多种本地原生植物，可以支持不同的传粉动物。种植前请与成年人一起查阅当地植物指南。",
    practice: "小小练习，新的联系",
    complete: "让好奇心继续生长",
  },
  ja: {
    title: "生物多様性の旅",
    eyebrow: "小さな発見、大きなつながり。",
    headline: "命あふれる身近な場所。",
    intro:
      "植物と花を訪れる生き物を知ろう。種や新しい植物の成長をどう助けるのかな？",
    open: "自分の旅を見る",
    start: "ハチが訪れる植物を探る",
    save: "保存する植物を選ぶ",
    care: "保存した植物を見る",
    chooseCheckInPlant: "観察を記録できる植物を選ぶ",
    checkInHelp:
      "保存した植物の中には、まだ観察を記録できないものもあります。「{action}」ボタンがある植物を選んで記録しましょう。",
    again: "別の植物を探る",
    preview: "ここから冒険が始まる",
    previewHelp:
      "学習チャレンジは自由に試せます。ログインすると植物と進み具合を保存できます。",
    map: "自分の観察ガイドを作ろう",
    mapHelp: "自分のペースで、庭がなくても大丈夫。どの順番でも進めます。",
    steps: ["植物を探る", "植物を保存する", "変化に気づく"],
    descriptions: [
      "検索結果から植物を開いて発見を始めよう。",
      "「マイガーデン」に植物を保存して観察ガイドを作ろう。観察するだけの植物でも大丈夫。",
      "保存した植物を開き、別々の3日間に観察を記録しよう。花や訪問者を探してみて。休んでも大丈夫。",
    ],
    done: "完了",
    next: "次に試そう",
    later: "これから探る",
    checkpoints: "ステップ完了",
    days: "日間の観察",
    loading: "旅の進み具合を確認中…",
    unavailable: "保存した進み具合を読み込めません。探索や練習は続けられます。",
    retry: "旅を更新",
    rewards: "花粉ポイントとアバター",
    rewardsHelp:
      "花粉ポイントはアバター用のゲーム内通貨です。本物の花粉や生物多様性を測るものではありません。",
    observe: "よく見てみよう",
    observation:
      "花から適切な距離をとって観察しよう。どんな生き物が来る？同じ種類の別の花にも行くかな？訪問者がいないことも大切な観察です。",
    local: "一輪の花から広げよう",
    localHelp:
      "異なる季節に咲く地域の在来植物の多様さは、さまざまな送粉者を支えます。植える前に大人と地域の植物ガイドを確認しよう。",
    practice: "少し練習して、つながりを発見",
    complete: "好奇心を育て続けよう",
  },
  ko: {
    title: "나의 생물다양성 여정",
    eyebrow: "작은 발견, 커다란 연결.",
    headline: "생명으로 가득한 우리 동네.",
    intro:
      "식물과 꽃을 찾는 방문자를 만나 보세요. 이들은 씨앗과 새로운 식물이 자라는 것을 어떻게 도울까요?",
    open: "내 여정 보기",
    start: "벌이 찾는 식물 탐험하기",
    save: "저장할 식물 고르기",
    care: "저장한 식물 보기",
    chooseCheckInPlant: "관찰을 기록할 식물 고르기",
    checkInHelp:
      "저장한 식물 중에는 아직 관찰을 기록할 수 없는 것도 있어요. “{action}” 버튼이 있는 식물을 골라 이 날짜들을 기록하세요.",
    again: "다른 식물 탐험하기",
    preview: "여기서 모험이 시작돼요",
    previewHelp:
      "학습 도전은 자유롭게 해 보세요. 식물과 진행 상황을 저장하려면 로그인하세요.",
    map: "나만의 자연 관찰 길",
    mapHelp: "정원 없이도 내 속도로 해요. 순서는 자유롭게 선택할 수 있어요.",
    steps: ["식물 탐험하기", "식물 저장하기", "변화 관찰하기"],
    descriptions: [
      "검색 결과에서 식물을 열어 발견을 시작하세요.",
      "내 정원에 식물을 저장해 관찰 안내서를 만드세요. 관찰만 하는 식물도 좋아요.",
      "저장한 식물을 열고 서로 다른 3일에 관찰을 기록하세요. 꽃이나 방문자를 찾아보세요. 쉬어도 괜찮아요.",
    ],
    done: "완료",
    next: "다음에 해 보기",
    later: "탐험할 것",
    checkpoints: "단계 완료",
    days: "서로 다른 날",
    loading: "여정의 진행 상황을 찾는 중…",
    unavailable:
      "저장한 여정을 불러올 수 없어요. 탐험과 연습은 계속할 수 있어요.",
    retry: "여정 새로고침",
    rewards: "꽃가루 포인트와 아바타",
    rewardsHelp:
      "꽃가루는 아바타 꾸미기에 쓰는 게임 포인트예요. 실제 꽃가루나 생물다양성을 측정하지 않아요.",
    observe: "자세히 살펴봐요",
    observation:
      "적당한 거리를 두고 꽃을 관찰하세요. 누가 찾아오나요? 같은 종류의 다른 꽃으로 가나요? 방문자가 없는 날도 유용한 관찰이에요.",
    local: "꽃 한 송이 너머로",
    localHelp:
      "서로 다른 계절에 꽃피는 다양한 지역 자생 식물은 여러 꽃가루받이 동물을 도울 수 있어요. 심기 전에 어른과 지역 식물 안내서를 확인하세요.",
    practice: "작은 연습, 새로운 연결",
    complete: "호기심을 계속 키워요",
  },
};
export function useJourneyCopy() {
  const { preferences } = usePreferences();
  return copies[preferences.locale] ?? en;
}
