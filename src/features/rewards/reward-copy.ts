import type { Preferences } from "@plantopedia/contracts";

const en = {
  journey: "Your journey",
  pollenHelp:
    "Pollen is an in-game reward for exploring plants and recording observations. Spend it on avatars; spending never lowers your level. It does not measure real-world biodiversity.",
  questHelp:
    "Open a plant profile from Search that lists bees as visitors to earn 20 Pollen today. A new plant species also earns 5 Pollen. Reading a profile does not record an outdoor sighting.",
  questComplete:
    "You explored a bee-visited plant today. Next, follow your journey or observe a flower from a safe distance.",
  xpHelp:
    "Reward Pollen also adds XP until you gain one level that day. At 100 XP your level rises and XP resets to 0. Further rewards today add Pollen only; XP starts growing again tomorrow.",
  plantingLimit:
    "Planting rewards apply to up to three eligible species per day, once per species. Extra planting check-ins are recorded without Pollen, including on later days.",
  progressLabel: "XP toward your next level",
  unavailable:
    "Your progress is not available yet. Try again to load your saved rewards.",
  shortfall: "Earn {count} more Pollen to unlock",
  avatars: "Make it yours",
  sprout: "Sprout",
  sunshine: "Sunshine",
  meadow: "Meadow",
  pollen: "Pollen guardian",
};
type RewardCopy = typeof en;
const copies: Record<Preferences["locale"], RewardCopy> = {
  en,
  fr: {
    journey: "Votre parcours",
    pollenHelp:
      "Le Pollen est une récompense du jeu pour explorer les plantes et noter des observations. Il permet de choisir des avatars sans réduire votre niveau. Il ne mesure pas la biodiversité réelle.",
    questHelp:
      "Ouvrez depuis la recherche une fiche de plante visitée par les abeilles pour gagner 20 Pollen aujourd’hui. Une nouvelle espèce rapporte aussi 5 Pollen. Lire une fiche ne compte pas comme une observation dehors.",
    questComplete:
      "Vous avez exploré une plante visitée par les abeilles. Continuez votre parcours ou observez une fleur à distance.",
    xpHelp:
      "Les récompenses ajoutent aussi de l’XP jusqu’à un niveau par jour. À 100 XP, le niveau augmente et l’XP revient à 0. Les autres récompenses du jour ajoutent seulement du Pollen ; l’XP reprend demain.",
    plantingLimit:
      "Les plantations rapportent du Pollen pour trois espèces admissibles par jour au maximum, une fois par espèce. Les plantations supplémentaires sont enregistrées sans Pollen, même les jours suivants.",
    progressLabel: "XP vers le prochain niveau",
    unavailable:
      "Votre progression n’est pas encore disponible. Réessayez de charger vos récompenses.",
    shortfall: "Encore {count} Pollen pour débloquer",
    avatars: "À votre image",
    sprout: "Pousse",
    sunshine: "Soleil",
    meadow: "Prairie",
    pollen: "Gardien du pollen",
  },
  es: {
    journey: "Tu recorrido",
    pollenHelp:
      "El Polen es una recompensa del juego por explorar plantas y registrar observaciones. Úsalo en avatares sin reducir tu nivel. No mide la biodiversidad real.",
    questHelp:
      "Abre desde Buscar una ficha de planta que reciba abejas para ganar 20 Polen hoy. Una especie nueva también da 5 Polen. Leer una ficha no registra una observación al aire libre.",
    questComplete:
      "Hoy exploraste una planta visitada por abejas. Sigue tu recorrido u observa una flor desde una distancia segura.",
    xpHelp:
      "Las recompensas también suman XP hasta subir un nivel al día. A los 100 XP subes de nivel y la XP vuelve a 0. Las demás recompensas de hoy solo suman Polen; mañana vuelve a crecer la XP.",
    plantingLimit:
      "Se recompensa plantar hasta tres especies aptas por día, una vez por especie. Las plantaciones adicionales se registran sin Polen, incluso en días posteriores.",
    progressLabel: "XP para el siguiente nivel",
    unavailable:
      "Tu progreso aún no está disponible. Vuelve a cargar tus recompensas.",
    shortfall: "Gana {count} Polen más para desbloquear",
    avatars: "Dale tu estilo",
    sprout: "Brote",
    sunshine: "Sol",
    meadow: "Pradera",
    pollen: "Guardián del polen",
  },
  de: {
    journey: "Dein Lernweg",
    pollenHelp:
      "Pollen sind Spielbelohnungen für das Erkunden von Pflanzen und das Festhalten von Beobachtungen. Tausche sie gegen Avatare ein, ohne dein Level zu senken. Sie messen keine echte Artenvielfalt.",
    questHelp:
      "Öffne über die Suche ein Pflanzenprofil mit Bienen als Besuchern: Das bringt heute 20 Pollen. Eine neue Pflanzenart bringt zusätzlich 5 Pollen. Das Lesen erfasst keine Beobachtung im Freien.",
    questComplete:
      "Du hast heute eine von Bienen besuchte Pflanze erkundet. Folge deinem Lernweg oder beobachte eine Blüte aus sicherer Entfernung.",
    xpHelp:
      "Belohnungen geben auch XP, bis du an diesem Tag ein Level aufsteigst. Bei 100 XP steigt dein Level und XP wird auf 0 gesetzt. Weitere Belohnungen geben heute nur Pollen; morgen wächst XP wieder.",
    plantingLimit:
      "Pflanzungen bringen für bis zu drei geeignete Arten pro Tag Pollen, einmal pro Art. Weitere Pflanzungen werden ohne Pollen erfasst, auch an späteren Tagen.",
    progressLabel: "XP bis zum nächsten Level",
    unavailable:
      "Dein Fortschritt ist noch nicht verfügbar. Lade deine Belohnungen erneut.",
    shortfall: "Noch {count} Pollen zum Freischalten",
    avatars: "Dein eigener Stil",
    sprout: "Keimling",
    sunshine: "Sonnenschein",
    meadow: "Wiese",
    pollen: "Pollenwächter",
  },
  "zh-Hans": {
    journey: "你的探索旅程",
    pollenHelp:
      "花粉是探索植物和记录观察获得的游戏奖励。可用来解锁头像，花费不会降低等级。花粉并不代表真实的生物多样性。",
    questHelp:
      "从搜索中打开一份访客包含蜜蜂的植物资料，今天可获得20花粉。新植物物种还可获得5花粉。阅读资料不等于户外观察记录。",
    questComplete:
      "今天你探索了一种蜜蜂会造访的植物。继续旅程，或在安全距离外观察一朵花。",
    xpHelp:
      "奖励花粉也会增加经验值，每天最多升一级。达到100经验值后升级，经验值归零。今天之后的奖励只增加花粉；明天再积累经验值。",
    plantingLimit:
      "每天最多奖励三种符合条件的植物，每个物种仅奖励一次。额外种植记录不奖励花粉，之后的日子也不会补发。",
    progressLabel: "距离下一级的经验值",
    unavailable: "暂时无法显示进度。请重试以加载已保存的奖励。",
    shortfall: "再获得{count}花粉即可解锁",
    avatars: "装扮你的头像",
    sprout: "嫩芽",
    sunshine: "阳光",
    meadow: "草甸",
    pollen: "花粉守护者",
  },
  ja: {
    journey: "あなたの探究の道",
    pollenHelp:
      "花粉は植物の探索や観察記録でもらえるゲーム内の報酬です。アバターに使ってもレベルは下がりません。実際の生物多様性を測るものではありません。",
    questHelp:
      "検索から、訪問者にハチが含まれる植物のページを開くと、今日は20花粉もらえます。初めての植物種はさらに5花粉。ページを読むことは野外観察の記録にはなりません。",
    questComplete:
      "今日はハチが訪れる植物を探索しました。探究を続けるか、安全な距離から花を観察しましょう。",
    xpHelp:
      "報酬は1日に1レベル上がるまでXPにも加算されます。100 XPでレベルが上がり、XPは0に戻ります。その日の残りの報酬は花粉だけに加算され、XPは翌日から再び増えます。",
    plantingLimit:
      "植え付けの報酬は1日3種まで、各種1回です。追加の植え付けは記録されますが、後日も花粉はもらえません。",
    progressLabel: "次のレベルまでのXP",
    unavailable:
      "進み具合をまだ表示できません。保存した報酬を再読み込みしてください。",
    shortfall: "あと{count}花粉で解放",
    avatars: "自分らしい姿に",
    sprout: "芽",
    sunshine: "日ざし",
    meadow: "草原",
    pollen: "花粉の守り手",
  },
  ko: {
    journey: "나의 탐구 여정",
    pollenHelp:
      "꽃가루는 식물을 탐구하고 관찰을 기록하면 받는 게임 보상이에요. 아바타에 써도 레벨은 내려가지 않아요. 실제 생물다양성을 측정하는 수치는 아니에요.",
    questHelp:
      "검색에서 방문자에 벌이 있는 식물 정보를 열면 오늘 20 꽃가루를 받아요. 새로운 식물 종은 5 꽃가루를 더 받아요. 정보 읽기는 야외 관찰 기록이 아니에요.",
    questComplete:
      "오늘 벌이 찾는 식물을 탐구했어요. 여정을 이어 가거나 안전한 거리에서 꽃을 관찰해 보세요.",
    xpHelp:
      "보상은 하루 한 레벨을 올릴 때까지 XP도 늘려 줘요. 100 XP가 되면 레벨이 오르고 XP는 0이 돼요. 그날의 나머지 보상은 꽃가루만 늘리고, XP는 내일부터 다시 늘어요.",
    plantingLimit:
      "심기 보상은 하루에 적합한 종 세 가지까지, 종마다 한 번 받아요. 추가 심기는 기록되지만 나중에도 꽃가루를 받지 못해요.",
    progressLabel: "다음 레벨까지의 XP",
    unavailable:
      "아직 진행 상황을 불러오지 못했어요. 저장된 보상을 다시 불러오세요.",
    shortfall: "{count} 꽃가루를 더 모으면 잠금 해제",
    avatars: "나만의 모습",
    sprout: "새싹",
    sunshine: "햇살",
    meadow: "초원",
    pollen: "꽃가루 지킴이",
  },
};
export function rewardCopy(locale: Preferences["locale"]) {
  return copies[locale];
}
