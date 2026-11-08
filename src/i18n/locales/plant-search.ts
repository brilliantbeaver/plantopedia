const en = {
  searchLiveScope: "Search by common or scientific name.",
  searchLiveLoading: "Finding plants…",
  searchLiveError: "Live search is temporarily unavailable. Please try again.",
  searchOfflineResults:
    "Showing offline matches while live search is unavailable.",
  searchNoResults: "No results yet. Try another spelling or a scientific name.",
  searchOpenSource: "Read source",
  searchImageSource: "Image source",
};
type Copy = { [K in keyof typeof en]: string };
export const plantSearchCopy: Record<
  "en" | "fr" | "es" | "de" | "zh-Hans" | "ja" | "ko",
  Copy
> = {
  en,
  fr: {
    searchLiveScope: "Recherchez par nom commun ou scientifique.",
    searchLiveLoading: "Recherche de plantes…",
    searchLiveError: "La recherche en ligne est indisponible. Réessayez.",
    searchOfflineResults:
      "Résultats hors ligne pendant l’indisponibilité de la recherche.",
    searchNoResults:
      "Aucun résultat. Essayez une autre orthographe ou un nom scientifique.",
    searchOpenSource: "Lire la source",
    searchImageSource: "Source de l’image",
  },
  es: {
    searchLiveScope: "Busca por nombre común o científico.",
    searchLiveLoading: "Buscando plantas…",
    searchLiveError:
      "La búsqueda en línea no está disponible. Inténtalo de nuevo.",
    searchOfflineResults:
      "Resultados sin conexión mientras vuelve la búsqueda en línea.",
    searchNoResults:
      "Sin resultados. Prueba otra ortografía o un nombre científico.",
    searchOpenSource: "Leer fuente",
    searchImageSource: "Fuente de imagen",
  },
  de: {
    searchLiveScope: "Suche nach gebräuchlichem oder wissenschaftlichem Namen.",
    searchLiveLoading: "Pflanzen werden gesucht…",
    searchLiveError:
      "Die Online-Suche ist vorübergehend nicht verfügbar. Versuche es erneut.",
    searchOfflineResults:
      "Offline-Treffer, während die Online-Suche nicht verfügbar ist.",
    searchNoResults:
      "Keine Treffer. Versuche eine andere Schreibweise oder einen wissenschaftlichen Namen.",
    searchOpenSource: "Quelle lesen",
    searchImageSource: "Bildquelle",
  },
  "zh-Hans": {
    searchLiveScope: "按植物的俗名或学名搜索。",
    searchLiveLoading: "正在查找植物…",
    searchLiveError: "在线搜索暂时不可用，请重试。",
    searchOfflineResults: "在线搜索不可用，正在显示离线结果。",
    searchNoResults: "暂无结果，请尝试其他拼写或植物学名。",
    searchOpenSource: "阅读来源",
    searchImageSource: "图片来源",
  },
  ja: {
    searchLiveScope: "植物の一般名や学名で検索できます。",
    searchLiveLoading: "植物を検索中…",
    searchLiveError:
      "オンライン検索は一時的に利用できません。再試行してください。",
    searchOfflineResults:
      "オンライン検索が利用できないため、オフラインの結果を表示しています。",
    searchNoResults: "結果がありません。別の表記や学名をお試しください。",
    searchOpenSource: "出典を読む",
    searchImageSource: "画像の出典",
  },
  ko: {
    searchLiveScope: "일반 이름이나 학명으로 검색하세요.",
    searchLiveLoading: "식물을 찾는 중…",
    searchLiveError: "온라인 검색을 잠시 사용할 수 없어요. 다시 시도해 주세요.",
    searchOfflineResults:
      "온라인 검색을 사용할 수 없어 오프라인 결과를 표시해요.",
    searchNoResults: "결과가 없어요. 다른 철자나 학명으로 검색해 보세요.",
    searchOpenSource: "출처 읽기",
    searchImageSource: "이미지 출처",
  },
};
