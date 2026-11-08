const en = {
  eyebrow: "FIELD CHALLENGE · GO AT YOUR PACE",
  title: "Small visitor. Big connection.",
  diagram:
    "A bee carries pollen from one flower to another flower of the same species.",
  firstFlower: "One flower",
  pollen: "Pollen travels",
  nextFlower: "Another flower",
  question:
    "A bee carries pollen between flowers of the same species. What can happen next?",
  optionWater: "The pollen waters the plant.",
  optionSeeds: "The plant can make seeds.",
  optionSpecies: "The flower becomes a new species.",
  waterFeedback:
    "Pollen is not water. It carries cells involved in plant reproduction. What could it help a flower make?",
  seedFeedback:
    "You made the connection! Pollination can help a flower produce seeds. Those seeds can grow into new plants.",
  speciesFeedback:
    "Pollination does not turn a flower into a different species. Think about how plants reproduce.",
  retry: "Try another answer. There is no penalty.",
  connection:
    "Biodiversity means variety among living things. Different locally native plants, flowering in different seasons, can feed different pollinators. You can start by observing flowers at school or in a park.",
  continue: "Explore a bee-visited plant",
  source: "Learning source: USDA Natural Resources Conservation Service",
};
type LearningCopy = { [K in keyof typeof en]: string };
export const learningCopy: Record<
  "en" | "es" | "fr" | "de" | "ja" | "ko" | "zh-Hans",
  LearningCopy
> = {
  en,
  es: {
    eyebrow: "RETO DE CAMPO · A TU RITMO",
    title: "Pequeño visitante. Gran conexión.",
    diagram: "Una abeja lleva polen de una flor a otra de la misma especie.",
    firstFlower: "Una flor",
    pollen: "El polen viaja",
    nextFlower: "Otra flor",
    question:
      "Una abeja lleva polen entre flores de la misma especie. ¿Qué puede pasar después?",
    optionWater: "El polen riega la planta.",
    optionSeeds: "La planta puede producir semillas.",
    optionSpecies: "La flor se convierte en otra especie.",
    waterFeedback:
      "El polen no es agua. Transporta células que participan en la reproducción de las plantas. ¿Qué podría ayudar a producir?",
    seedFeedback:
      "¡Encontraste la conexión! La polinización puede ayudar a una flor a producir semillas. De ellas pueden crecer nuevas plantas.",
    speciesFeedback:
      "La polinización no convierte una flor en otra especie. Piensa en cómo se reproducen las plantas.",
    retry: "Prueba otra respuesta. No hay penalización.",
    connection:
      "Biodiversidad significa variedad de seres vivos. Distintas plantas nativas de tu región que florecen en diferentes estaciones pueden alimentar a distintos polinizadores. Empieza observando flores en la escuela o en un parque.",
    continue: "Explora una planta que visitan las abejas",
    source: "Fuente: Servicio de Conservación de Recursos Naturales del USDA",
  },
  fr: {
    eyebrow: "DÉFI NATURE · À TON RYTHME",
    title: "Petite visite. Grand lien.",
    diagram:
      "Une abeille transporte du pollen d’une fleur à une autre de la même espèce.",
    firstFlower: "Une fleur",
    pollen: "Le pollen voyage",
    nextFlower: "Une autre fleur",
    question:
      "Une abeille transporte du pollen entre des fleurs de la même espèce. Que peut-il se passer ensuite ?",
    optionWater: "Le pollen arrose la plante.",
    optionSeeds: "La plante peut produire des graines.",
    optionSpecies: "La fleur devient une autre espèce.",
    waterFeedback:
      "Le pollen n’est pas de l’eau. Il transporte des cellules qui participent à la reproduction des plantes. Que pourrait-il aider à produire ?",
    seedFeedback:
      "Tu as trouvé le lien ! La pollinisation peut aider une fleur à produire des graines. Elles peuvent donner de nouvelles plantes.",
    speciesFeedback:
      "La pollinisation ne transforme pas une fleur en une autre espèce. Pense à la reproduction des plantes.",
    retry: "Essaie une autre réponse. Aucune pénalité.",
    connection:
      "La biodiversité, c’est la variété du vivant. Différentes plantes locales indigènes, fleurissant à différentes saisons, peuvent nourrir différents pollinisateurs. Commence par observer les fleurs à l’école ou dans un parc.",
    continue: "Explore une plante visitée par les abeilles",
    source:
      "Source : Service de conservation des ressources naturelles de l’USDA",
  },
  de: {
    eyebrow: "NATURRÄTSEL · IN DEINEM TEMPO",
    title: "Kleiner Besuch. Große Verbindung.",
    diagram:
      "Eine Biene trägt Pollen von einer Blüte zu einer anderen derselben Art.",
    firstFlower: "Eine Blüte",
    pollen: "Pollen wandert",
    nextFlower: "Andere Blüte",
    question:
      "Eine Biene trägt Pollen zwischen Blüten derselben Art. Was kann danach passieren?",
    optionWater: "Der Pollen gießt die Pflanze.",
    optionSeeds: "Die Pflanze kann Samen bilden.",
    optionSpecies: "Die Blüte wird zu einer neuen Art.",
    waterFeedback:
      "Pollen ist kein Wasser. Er trägt Zellen, die an der Fortpflanzung beteiligt sind. Was könnte die Blüte damit bilden?",
    seedFeedback:
      "Du hast die Verbindung entdeckt! Bestäubung kann einer Blüte helfen, Samen zu bilden. Daraus können neue Pflanzen wachsen.",
    speciesFeedback:
      "Bestäubung verwandelt eine Blüte nicht in eine andere Art. Denk daran, wie Pflanzen sich vermehren.",
    retry: "Versuche eine andere Antwort. Es gibt keinen Punktabzug.",
    connection:
      "Biodiversität bedeutet Vielfalt der Lebewesen. Verschiedene heimische Pflanzen, die zu verschiedenen Jahreszeiten blühen, können unterschiedliche Bestäuber ernähren. Beobachte zum Einstieg Blüten an der Schule oder im Park.",
    continue: "Entdecke eine von Bienen besuchte Pflanze",
    source: "Quelle: USDA Natural Resources Conservation Service",
  },
  ja: {
    eyebrow: "自然のクイズ · 自分のペースで",
    title: "小さな訪問者。大きなつながり。",
    diagram: "ハチが、同じ種類の花から別の花へ花粉を運びます。",
    firstFlower: "ひとつの花",
    pollen: "花粉を運ぶ",
    nextFlower: "別の花",
    question:
      "ハチが同じ種類の花の間で花粉を運びます。その後、何が起こるでしょう？",
    optionWater: "花粉が植物に水を与える。",
    optionSeeds: "植物が種を作れるようになる。",
    optionSpecies: "花が別の種類に変わる。",
    waterFeedback:
      "花粉は水ではありません。植物の繁殖に関わる細胞を運びます。花が何を作る助けになるでしょう？",
    seedFeedback:
      "つながりを発見！ 受粉は花が種を作る助けになります。その種から、新しい植物が育ちます。",
    speciesFeedback:
      "受粉で花が別の種類に変わるわけではありません。植物がどう増えるか考えてみましょう。",
    retry: "別の答えを選んでみよう。ペナルティはありません。",
    connection:
      "生物多様性とは、生き物の豊かさや多様さのことです。地域にもともとある植物が季節ごとに花を咲かせると、さまざまな送粉者の食べ物になります。学校や公園の花を観察することから始められます。",
    continue: "ハチが訪れる植物を調べる",
    source: "出典：米国農務省 自然資源保全局",
  },
  ko: {
    eyebrow: "자연 퀴즈 · 나만의 속도로",
    title: "작은 방문자, 커다란 연결.",
    diagram: "벌이 같은 종의 꽃에서 다른 꽃으로 꽃가루를 옮겨요.",
    firstFlower: "한 꽃",
    pollen: "꽃가루 이동",
    nextFlower: "다른 꽃",
    question:
      "벌이 같은 종의 꽃 사이에서 꽃가루를 옮겨요. 다음에는 어떤 일이 일어날 수 있을까요?",
    optionWater: "꽃가루가 식물에 물을 줘요.",
    optionSeeds: "식물이 씨앗을 만들 수 있어요.",
    optionSpecies: "꽃이 다른 종으로 바뀌어요.",
    waterFeedback:
      "꽃가루는 물이 아니에요. 식물의 번식에 필요한 세포를 옮겨요. 꽃이 무엇을 만드는 데 도움이 될까요?",
    seedFeedback:
      "연결을 발견했어요! 수분은 꽃이 씨앗을 만드는 데 도움이 돼요. 그 씨앗에서 새로운 식물이 자랄 수 있어요.",
    speciesFeedback:
      "수분이 꽃을 다른 종으로 바꾸지는 않아요. 식물이 어떻게 번식하는지 생각해 보세요.",
    retry: "다른 답을 골라 보세요. 불이익은 없어요.",
    connection:
      "생물다양성은 살아 있는 생물의 다양함을 뜻해요. 계절마다 꽃을 피우는 여러 지역 자생식물은 다양한 꽃가루받이 동물에게 먹이를 줄 수 있어요. 학교나 공원에서 꽃을 관찰하며 시작해 보세요.",
    continue: "벌이 찾아오는 식물 살펴보기",
    source: "출처: 미국 농무부 자연자원보전국",
  },
  "zh-Hans": {
    eyebrow: "自然挑战 · 按自己的节奏来",
    title: "小小访客，大大联系。",
    diagram: "蜜蜂把花粉从一朵花带到同一物种的另一朵花。",
    firstFlower: "一朵花",
    pollen: "花粉旅行",
    nextFlower: "另一朵花",
    question: "蜜蜂在同一物种的花之间传递花粉。接下来可能发生什么？",
    optionWater: "花粉给植物浇水。",
    optionSeeds: "植物可以产生种子。",
    optionSpecies: "花变成了另一个物种。",
    waterFeedback:
      "花粉不是水。它携带参与植物繁殖的细胞。它能帮助花产生什么呢？",
    seedFeedback:
      "你发现了联系！授粉可以帮助花产生种子。种子可以长成新的植物。",
    speciesFeedback: "授粉不会把花变成另一个物种。想想植物是如何繁殖的。",
    retry: "试试另一个答案，没有惩罚。",
    connection:
      "生物多样性指生物的丰富多样。不同的本地原生植物在不同季节开花，可以为各种传粉动物提供食物。你可以从观察学校或公园里的花开始。",
    continue: "探索一种蜜蜂会拜访的植物",
    source: "资料来源：美国农业部自然资源保护局",
  },
};
