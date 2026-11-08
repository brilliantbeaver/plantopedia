import type { Preferences } from "@plantopedia/contracts";

const en = {
  observeTitle: "Notice what changed",
  observeHelp:
    "Look at this saved plant: are there new leaves, flowers, or visitors? Observe from a safe distance. You do not need a garden, and checking does not mean watering.",
  plantingTitle: "Planting is optional",
  plantingHelp:
    "Before planting, check local suitability with an adult or local plant guide. Only log a plant you actually planted. Observing plants also counts toward your journey.",
  regionHelp:
    "Regional guidance currently covers North Carolina only. Elsewhere, check a local source before choosing plants.",
  noPlantingReward:
    "Chinese wisteria can be invasive. Local suitability is not verified here, so logging it earns no planting Pollen. Observe existing plants instead.",
};
type ActivityCopy = Record<keyof typeof en, string>;
export const activityCopy: Record<Preferences["locale"], ActivityCopy> = {
  en,
  fr: {
    observeTitle: "Repère ce qui a changé",
    observeHelp:
      "Observe cette plante enregistrée : de nouvelles feuilles, fleurs ou des visiteurs ? Garde tes distances. Pas besoin de jardin ; vérifier ne veut pas dire arroser.",
    plantingTitle: "Planter reste facultatif",
    plantingHelp:
      "Avant de planter, vérifie avec un adulte ou un guide local que la plante convient à ta région. Enregistre uniquement une vraie plantation. Observer compte aussi dans ton parcours.",
    regionHelp:
      "Les conseils régionaux couvrent seulement la Caroline du Nord. Ailleurs, consulte une source locale avant de choisir des plantes.",
    noPlantingReward:
      "La glycine de Chine peut être envahissante. Son adaptation locale n’est pas vérifiée ici : l’enregistrer ne rapporte pas de Pollen de plantation. Observe plutôt les plantes existantes.",
  },
  es: {
    observeTitle: "Observa qué cambió",
    observeHelp:
      "Mira esta planta guardada: ¿hay hojas, flores o visitantes nuevos? Observa desde una distancia segura. No necesitas jardín; revisar no significa regar.",
    plantingTitle: "Plantar es opcional",
    plantingHelp:
      "Antes de plantar, comprueba con un adulto o una guía local si la planta es adecuada para tu región. Registra solo plantas que hayas plantado de verdad. Observar también cuenta en tu recorrido.",
    regionHelp:
      "La información regional solo cubre Carolina del Norte. En otras regiones, consulta una fuente local antes de elegir plantas.",
    noPlantingReward:
      "La glicinia china puede ser invasora. Aquí no se verifica su idoneidad local, así que registrarla no da Polen por plantación. Mejor observa plantas existentes.",
  },
  de: {
    observeTitle: "Entdecke Veränderungen",
    observeHelp:
      "Schau dir diese gespeicherte Pflanze an: Gibt es neue Blätter, Blüten oder Besucher? Halte sicheren Abstand. Du brauchst keinen Garten, und Nachsehen heißt nicht Gießen.",
    plantingTitle: "Pflanzen ist freiwillig",
    plantingHelp:
      "Prüfe vor dem Pflanzen mit einem Erwachsenen oder einem regionalen Pflanzenführer, ob die Art vor Ort geeignet ist. Trage nur ein, was du wirklich gepflanzt hast. Auch Beobachten zählt für deinen Weg.",
    regionHelp:
      "Regionale Hinweise gibt es derzeit nur für North Carolina. Frage anderswo eine lokale Quelle, bevor du Pflanzen auswählst.",
    noPlantingReward:
      "Chinesischer Blauregen kann invasiv sein. Seine lokale Eignung ist hier nicht bestätigt; das Eintragen gibt deshalb keine Pflanz-Pollen. Beobachte lieber vorhandene Pflanzen.",
  },
  "zh-Hans": {
    observeTitle: "发现有什么变化",
    observeHelp:
      "观察这株已保存的植物：有新的叶子、花朵或访客吗？保持安全距离。没有花园也可以观察，查看并不意味着浇水。",
    plantingTitle: "种植是可选活动",
    plantingHelp:
      "种植前，请与成年人一起或参考本地植物指南，确认植物是否适合当地。只记录你真正种下的植物。观察植物也能推进你的旅程。",
    regionHelp:
      "区域信息目前仅涵盖美国北卡罗来纳州。在其他地区，选择植物前请查阅当地资料。",
    noPlantingReward:
      "紫藤在一些地区可能具有入侵性。这里尚未确认它是否适合当地，因此记录种植不会获得种植花粉积分。可以观察已有的植物。",
  },
  ja: {
    observeTitle: "変化を見つけよう",
    observeHelp:
      "保存した植物に新しい葉、花、訪問者はいるかな？安全な距離から観察しよう。庭はなくても大丈夫。確認することと水やりは別だよ。",
    plantingTitle: "植えるかどうかは自由",
    plantingHelp:
      "植える前に、大人や地域の植物ガイドと一緒に、その植物が地域に適しているか確認しよう。本当に植えたときだけ記録してね。観察も旅の進歩になるよ。",
    regionHelp:
      "地域情報は現在ノースカロライナ州のみ。他の地域では、植物を選ぶ前に地元の情報を確認しよう。",
    noPlantingReward:
      "シナフジは侵略的になる場合があります。ここでは地域への適合を確認できないため、植栽の記録で花粉ポイントは増えません。今ある植物を観察しよう。",
  },
  ko: {
    observeTitle: "무엇이 달라졌을까?",
    observeHelp:
      "저장한 식물에 새 잎이나 꽃, 찾아온 동물이 있나요? 안전한 거리에서 관찰하세요. 정원이 없어도 괜찮아요. 살펴보는 것이 물을 주라는 뜻은 아니에요.",
    plantingTitle: "심기는 선택 활동이에요",
    plantingHelp:
      "심기 전에 어른이나 지역 식물 안내서와 함께 이 식물이 지역에 적합한지 확인하세요. 실제로 심은 식물만 기록하세요. 관찰도 여정의 진전으로 인정돼요.",
    regionHelp:
      "지역 안내는 현재 노스캐롤라이나주만 지원해요. 다른 지역에서는 식물을 고르기 전에 현지 자료를 확인하세요.",
    noPlantingReward:
      "중국 등나무는 침입종이 될 수 있어요. 여기서는 지역 적합성이 확인되지 않아 기록해도 심기 꽃가루 점수를 받지 않아요. 기존 식물을 관찰해 보세요.",
  },
};
