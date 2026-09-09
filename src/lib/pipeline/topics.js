// ─── 探索模式每日輪替主題庫 (Daily Discovery Topics for CaféPrism) ───
// 跨光譜共用主題：學術文獻、產業新聞、社群討論共同旋轉，達成深度交叉驗證與豐富度
export const DISCOVERY_TOPICS = [
  {
    topic: 'extraction_dynamics',
    label: '萃取動力學與粒徑分布',
    openAlexQuery: 'coffee extraction kinetics grind particle distribution brewing',
    scholarQuery: 'coffee extraction kinetics OR "particle size distribution" OR "brewing dynamics"',
    newsQuery: 'specialty coffee extraction brewing grind size yield',
    redditQuery: 'extraction yield grind size particle distribution',
    keywords: ['extraction', 'grind', 'particle', 'yield', 'channeling', 'fines', 'burr', 'microns'],
  },
  {
    topic: 'roasting_chemistry',
    label: '烘焙化學反應與香氣物質',
    openAlexQuery: 'coffee roasting chemistry Maillard aroma compounds volatiles',
    scholarQuery: '"coffee roasting" OR "roasting chemistry" OR "Maillard reaction" coffee aroma',
    newsQuery: 'coffee roasting profiles roaster chemistry flavor aroma',
    redditQuery: 'roasting profile Maillard development time temperature ROR',
    keywords: ['roasting', 'maillard', 'roaster', 'development', 'caramelization', 'ror', 'aroma'],
  },
  {
    topic: 'water_minerals',
    label: '水質化學與礦物質影響',
    openAlexQuery: 'coffee brewing water chemistry magnesium bicarbonate extraction',
    scholarQuery: '"water quality" OR "water composition" OR magnesium coffee extraction brewing',
    newsQuery: 'coffee water filtration chemistry magnesium minerals brewing',
    redditQuery: 'water recipe minerals magnesium buffer ZeroWater Lotus',
    keywords: ['water', 'magnesium', 'calcium', 'bicarbonate', 'buffer', 'tds', 'filtration', 'gh', 'kh'],
  },
  {
    topic: 'fermentation_processing',
    label: '發酵處理法與厭氧微批次',
    openAlexQuery: 'coffee fermentation yeast microbial anaerobic processing sensory',
    scholarQuery: '"coffee fermentation" OR "anaerobic fermentation" OR "yeast" coffee processing',
    newsQuery: 'coffee processing anaerobic fermentation yeast microlot producer',
    redditQuery: 'anaerobic fermentation thermal shock co-ferment processing',
    keywords: ['fermentation', 'anaerobic', 'yeast', 'microbial', 'thermal shock', 'maceration', 'processing'],
  },
  {
    topic: 'espresso_percolation',
    label: '義式濃縮流體力學與壓力曲線',
    openAlexQuery: 'espresso extraction percolation pressure fluid dynamics crema',
    scholarQuery: 'espresso percolation OR "fluid dynamics" OR "crema" espresso extraction',
    newsQuery: 'espresso machine pressure profiling flow control puck screen',
    redditQuery: 'pressure profiling flow control puck prep channeling basket',
    keywords: ['espresso', 'pressure', 'profiling', 'flow', 'puck', 'basket', 'crema', 'percolation'],
  },
  {
    topic: 'cultivars_genetics',
    label: '品種基因與杯測風味品質',
    openAlexQuery: 'Coffea arabica cultivars genetics disease resistance climate cup quality',
    scholarQuery: '"Coffea arabica" OR "coffee cultivars" OR "coffee genetics" cup quality',
    newsQuery: 'specialty coffee varieties gesha arabica genetics climate farm',
    redditQuery: 'varietal Gesha Eugenioides heirloom Bourbon Typica cultivar',
    keywords: ['arabica', 'cultivar', 'varietal', 'gesha', 'bourbon', 'eugenioides', 'genetics', 'typica'],
  },
  {
    topic: 'sensory_flavor',
    label: '感官科學與風味輪評價',
    openAlexQuery: 'coffee sensory evaluation flavor perception volatile organic compounds taste',
    scholarQuery: '"sensory evaluation" OR "flavor perception" OR "volatile compounds" specialty coffee',
    newsQuery: 'specialty coffee cupping sensory flavor wheel tasting notes',
    redditQuery: 'tasting notes flavor wheel sensory palate cup tasting',
    keywords: ['sensory', 'cupping', 'flavor', 'palate', 'taste', 'notes', 'acidity', 'sweetness'],
  },
  {
    topic: 'bioactive_health',
    label: '生物活性物質與健康效應',
    openAlexQuery: 'coffee chlorogenic acids caffeine antioxidant metabolism human health',
    scholarQuery: '"chlorogenic acid" OR "caffeine metabolism" OR "coffee antioxidant" health',
    newsQuery: 'coffee caffeine health study antioxidants benefits metabolism',
    redditQuery: 'caffeine metabolism decaf chlorogenic health effect',
    keywords: ['caffeine', 'antioxidant', 'chlorogenic', 'polyphenols', 'health', 'metabolism', 'decaf'],
  },
];

/**
 * 依據今日日期計算輪替的主題（每日自動切換，永不撞題）
 */
export function getDailyDiscoveryTopic(date = new Date()) {
  const dayNumber = Math.floor(date.getTime() / 86400000);
  const index = Math.abs(dayNumber) % DISCOVERY_TOPICS.length;
  return DISCOVERY_TOPICS[index];
}
