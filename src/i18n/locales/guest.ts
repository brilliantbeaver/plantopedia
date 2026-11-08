const en = {
  continueExploring: "Continue exploring",
  guestMode: "Exploring as a guest",
  guestExploreTitle: "Every discovery starts with curiosity.",
  guestExploreBody:
    "Find a plant by name. Sign in when you're ready to keep its story.",
  guestSearchPlaceholder: "Try sunflower",
  guestNoMatch: "No match in this guide. Try another plant name.",
  guestTitle: "Keep every discovery.",
  guestBody:
    "Sign in to save your discoveries and make this little corner of nature yours.",
  guestCta: "Sign in or create an account",
  guestHistoryBenefit: "Find your searches again, on any device",
  guestGardenBenefit: "Build your own private plant collection",
  guestScanBenefit: "Identify photos, track care, and earn Pollen",
  guestPrivacy: "Your garden and history stay private to your account.",
  guestSearchTitle: "Found something worth keeping?",
  guestSearchBody: "Sign in to save searches and identify plants from photos.",
  guestSaveAction: "Sign in to save this plant",
  guestScanAction: "Sign in to scan a photo",
  guestFeatureTitle: "A home for your discoveries.",
  guestFeatureBody:
    "Sign in to use your garden, photo identification, care tracking, rewards, and AI chat.",
  searchHistoryEmpty: "Your searches will appear here, saved to your profile.",
  searchHistorySaveError:
    "Your search is ready, but we couldn't save it to your profile.",
  retrySaveSearch: "Try saving search again",
  profileProgress:
    "Your Pollen, quests, and avatars are saved to your profile.",
  profileSightingLater: "Save sighting · identify later",
} as const;
type GuestCopy = { [K in keyof typeof en]: string };
export const guestCopy: Record<
  "en" | "fr" | "es" | "de" | "zh-Hans" | "ja" | "ko",
  GuestCopy
> = {
  en,
  fr: {
    continueExploring: "Continuer à explorer",
    guestMode: "Exploration en tant qu’invité",
    guestExploreTitle: "Chaque découverte commence par la curiosité.",
    guestExploreBody:
      "Trouvez une plante par son nom. Connectez-vous pour garder son histoire.",
    guestSearchPlaceholder: "Essayez tournesol",
    guestNoMatch:
      "Aucun résultat dans ce guide. Essayez un autre nom de plante.",
    guestTitle: "Gardez chaque découverte.",
    guestBody:
      "Connectez-vous pour enregistrer vos découvertes et créer votre coin de nature.",
    guestCta: "Se connecter ou créer un compte",
    guestHistoryBenefit: "Retrouvez vos recherches sur tous vos appareils",
    guestGardenBenefit: "Créez votre collection de plantes privée",
    guestScanBenefit:
      "Identifiez des photos, suivez les soins et gagnez du Pollen",
    guestPrivacy:
      "Votre jardin et votre historique restent privés à votre compte.",
    guestSearchTitle: "Une découverte à garder ?",
    guestSearchBody:
      "Connectez-vous pour enregistrer vos recherches et identifier des plantes à partir de photos.",
    guestSaveAction: "Se connecter pour garder cette plante",
    guestScanAction: "Se connecter pour identifier une photo",
    guestFeatureTitle: "Un espace pour vos découvertes.",
    guestFeatureBody:
      "Connectez-vous pour le jardin, l’identification photo, les soins, les récompenses et le chat IA.",
    searchHistoryEmpty:
      "Vos recherches apparaîtront ici, enregistrées dans votre profil.",
    searchHistorySaveError:
      "Les résultats sont prêts, mais la recherche n’a pas pu être enregistrée dans votre profil.",
    retrySaveSearch: "Réessayer d’enregistrer la recherche",
    profileProgress:
      "Votre Pollen, vos quêtes et vos avatars sont enregistrés dans votre profil.",
    profileSightingLater: "Enregistrer · identifier plus tard",
  },
  es: {
    continueExploring: "Seguir explorando",
    guestMode: "Explorando como invitado",
    guestExploreTitle: "Cada descubrimiento empieza con curiosidad.",
    guestExploreBody:
      "Busca una planta por su nombre. Inicia sesión para guardar su historia.",
    guestSearchPlaceholder: "Prueba girasol",
    guestNoMatch: "Sin resultados en esta guía. Prueba otro nombre de planta.",
    guestTitle: "Guarda cada descubrimiento.",
    guestBody:
      "Inicia sesión para guardar tus descubrimientos y crear tu rincón de naturaleza.",
    guestCta: "Iniciar sesión o crear una cuenta",
    guestHistoryBenefit: "Encuentra tus búsquedas en cualquier dispositivo",
    guestGardenBenefit: "Crea tu colección privada de plantas",
    guestScanBenefit: "Identifica fotos, registra cuidados y gana Polen",
    guestPrivacy: "Tu jardín y tu historial son privados para tu cuenta.",
    guestSearchTitle: "¿Encontraste algo para guardar?",
    guestSearchBody:
      "Inicia sesión para guardar búsquedas e identificar plantas a partir de fotos.",
    guestSaveAction: "Inicia sesión para guardar esta planta",
    guestScanAction: "Inicia sesión para identificar una foto",
    guestFeatureTitle: "Un hogar para tus descubrimientos.",
    guestFeatureBody:
      "Inicia sesión para usar el jardín, identificar fotos, registrar cuidados, ganar recompensas y chatear con IA.",
    searchHistoryEmpty:
      "Tus búsquedas aparecerán aquí, guardadas en tu perfil.",
    searchHistorySaveError:
      "Los resultados están listos, pero no pudimos guardar la búsqueda en tu perfil.",
    retrySaveSearch: "Volver a guardar la búsqueda",
    profileProgress: "Tu Polen, misiones y avatares se guardan en tu perfil.",
    profileSightingLater: "Guardar avistamiento · identificar después",
  },
  de: {
    continueExploring: "Weiter entdecken",
    guestMode: "Als Gast unterwegs",
    guestExploreTitle: "Jede Entdeckung beginnt mit Neugier.",
    guestExploreBody:
      "Suche eine Pflanze nach Namen. Melde dich an, um ihre Geschichte zu bewahren.",
    guestSearchPlaceholder: "Zum Beispiel Sonnenblume",
    guestNoMatch:
      "Kein Treffer in diesem Pflanzenführer. Versuche einen anderen Pflanzennamen.",
    guestTitle: "Bewahre jede Entdeckung.",
    guestBody:
      "Melde dich an, um deine Entdeckungen zu speichern und dein Stück Natur zu gestalten.",
    guestCta: "Anmelden oder Konto erstellen",
    guestHistoryBenefit: "Finde deine Suchen auf jedem Gerät wieder",
    guestGardenBenefit: "Erstelle deine private Pflanzensammlung",
    guestScanBenefit: "Bestimme Fotos, verfolge Pflege und sammle Pollen",
    guestPrivacy: "Dein Garten und Verlauf bleiben privat in deinem Konto.",
    guestSearchTitle: "Etwas zum Merken gefunden?",
    guestSearchBody:
      "Melde dich an, um Suchen zu speichern und Pflanzen anhand von Fotos zu bestimmen.",
    guestSaveAction: "Anmelden und diese Pflanze speichern",
    guestScanAction: "Anmelden und ein Foto bestimmen",
    guestFeatureTitle: "Ein Zuhause für deine Entdeckungen.",
    guestFeatureBody:
      "Melde dich für Garten, Fotobestimmung, Pflege, Belohnungen und KI-Chat an.",
    searchHistoryEmpty:
      "Deine Suchen erscheinen hier und werden in deinem Profil gespeichert.",
    searchHistorySaveError:
      "Die Ergebnisse sind da, aber die Suche konnte nicht im Profil gespeichert werden.",
    retrySaveSearch: "Suche erneut speichern",
    profileProgress:
      "Pollen, Aufgaben und Avatare werden in deinem Profil gespeichert.",
    profileSightingLater: "Sichtung speichern · später bestimmen",
  },
  "zh-Hans": {
    continueExploring: "继续探索",
    guestMode: "正在以访客身份探索",
    guestExploreTitle: "每一次发现，都始于好奇。",
    guestExploreBody: "按名称搜索植物。登录后，记录它的故事。",
    guestSearchPlaceholder: "试试向日葵",
    guestNoMatch: "本指南中没有匹配结果，请尝试其他植物名称。",
    guestTitle: "珍藏每一次发现。",
    guestBody: "登录以保存发现，打造属于你的自然天地。",
    guestCta: "登录或创建账户",
    guestHistoryBenefit: "在任意设备上找回搜索记录",
    guestGardenBenefit: "建立私密的植物收藏",
    guestScanBenefit: "识别照片、记录养护并赢取花粉",
    guestPrivacy: "花园和历史记录仅你的账户可见。",
    guestSearchTitle: "发现了值得珍藏的植物？",
    guestSearchBody: "登录以保存搜索记录，并通过照片识别植物。",
    guestSaveAction: "登录以保存这株植物",
    guestScanAction: "登录以识别照片",
    guestFeatureTitle: "为每一次发现安个家。",
    guestFeatureBody:
      "登录后即可使用花园、照片识别、养护记录、奖励及 AI 聊天。",
    searchHistoryEmpty: "你的搜索将显示在此处，并保存到个人资料中。",
    searchHistorySaveError: "搜索结果已就绪，但未能将搜索保存到个人资料中。",
    retrySaveSearch: "重试保存搜索",
    profileProgress: "花粉、任务和头像已保存到个人资料中。",
    profileSightingLater: "保存观察 · 稍后识别",
  },
  ja: {
    continueExploring: "探索を続ける",
    guestMode: "ゲストとして探索中",
    guestExploreTitle: "発見は、好奇心から。",
    guestExploreBody:
      "植物を名前で検索。ログインして、その物語を残しましょう。",
    guestSearchPlaceholder: "ひまわりで検索",
    guestNoMatch:
      "このガイドには一致する植物がありません。別の名前で検索してください。",
    guestTitle: "発見を、ずっと手元に。",
    guestBody:
      "ログインして発見を保存し、自分だけの自然のコーナーを作りましょう。",
    guestCta: "ログイン・アカウント作成",
    guestHistoryBenefit: "どの端末でも検索履歴を確認",
    guestGardenBenefit: "非公開の植物コレクションを作成",
    guestScanBenefit: "写真を識別し、お手入れを記録して花粉を獲得",
    guestPrivacy: "庭と履歴は自分のアカウントだけに表示されます。",
    guestSearchTitle: "残しておきたい発見はありましたか？",
    guestSearchBody:
      "ログインして検索履歴を保存し、写真から植物を識別しましょう。",
    guestSaveAction: "ログインしてこの植物を保存",
    guestScanAction: "ログインして写真を識別",
    guestFeatureTitle: "発見を残す、自分だけの場所。",
    guestFeatureBody:
      "ログインすると庭、写真識別、お手入れ記録、報酬、AI チャットを使えます。",
    searchHistoryEmpty:
      "検索履歴はここに表示され、プロフィールに保存されます。",
    searchHistorySaveError:
      "検索結果は表示できますが、プロフィールに検索を保存できませんでした。",
    retrySaveSearch: "検索の保存を再試行",
    profileProgress: "花粉、クエスト、アバターはプロフィールに保存されます。",
    profileSightingLater: "観察を保存・後で識別",
  },
  ko: {
    continueExploring: "계속 둘러보기",
    guestMode: "게스트로 둘러보는 중",
    guestExploreTitle: "모든 발견은 호기심에서 시작돼요.",
    guestExploreBody:
      "이름으로 식물을 찾아보세요. 로그인하면 이야기를 남길 수 있어요.",
    guestSearchPlaceholder: "해바라기를 검색하세요",
    guestNoMatch:
      "이 가이드에 일치하는 식물이 없어요. 다른 식물 이름을 검색해 보세요.",
    guestTitle: "모든 발견을 간직하세요.",
    guestBody: "로그인해 발견을 저장하고 나만의 자연 공간을 만들어 보세요.",
    guestCta: "로그인 또는 계정 만들기",
    guestHistoryBenefit: "어떤 기기에서든 검색 기록 확인",
    guestGardenBenefit: "나만의 비공개 식물 컬렉션 만들기",
    guestScanBenefit: "사진 식별, 관리 기록, 꽃가루 보상",
    guestPrivacy: "정원과 기록은 내 계정에서만 볼 수 있어요.",
    guestSearchTitle: "간직하고 싶은 발견이 있나요?",
    guestSearchBody:
      "로그인해 검색 기록을 저장하고 사진으로 식물을 식별하세요.",
    guestSaveAction: "로그인해 이 식물 저장",
    guestScanAction: "로그인해 사진 식별",
    guestFeatureTitle: "발견을 위한 나만의 공간.",
    guestFeatureBody:
      "로그인하면 정원, 사진 식별, 관리 기록, 보상과 AI 채팅을 이용할 수 있어요.",
    searchHistoryEmpty: "검색 기록이 여기에 표시되고 프로필에 저장돼요.",
    searchHistorySaveError:
      "검색 결과는 준비됐지만 프로필에 검색을 저장하지 못했어요.",
    retrySaveSearch: "검색 저장 다시 시도",
    profileProgress: "꽃가루, 퀘스트, 아바타가 프로필에 저장돼요.",
    profileSightingLater: "관찰 저장 · 나중에 식별",
  },
};
