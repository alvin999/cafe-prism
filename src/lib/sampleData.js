// ─── Key Validation Status Registry (跨頁面同步金鑰狀態，已知無效0秒秒切) ───────
const keyStatusMap = new Map();

function getKeyFingerprint(provider, apiKey) {
  if (!apiKey) return `${provider}_none`;
  const trimmed = apiKey.trim();
  return `${provider}_${trimmed.slice(0, 8)}_${trimmed.slice(-6)}`;
}

export const KeyStatus = {
  markInvalid: (provider, apiKey, errorReason) => {
    const fp = getKeyFingerprint(provider, apiKey);
    keyStatusMap.set(fp, {
      isValid: false,
      error: errorReason || '連線失敗或金鑰無效',
      timestamp: Date.now()
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:key-status-changed', {
        detail: { provider, isValid: false, error: errorReason }
      }));
    }
  },

  markValid: (provider, apiKey) => {
    const fp = getKeyFingerprint(provider, apiKey);
    keyStatusMap.set(fp, {
      isValid: true,
      error: null,
      timestamp: Date.now()
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cr:key-status-changed', {
        detail: { provider, isValid: true }
      }));
    }
  },

  getStatus: (provider, apiKey) => {
    const fp = getKeyFingerprint(provider, apiKey);
    const entry = keyStatusMap.get(fp);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 300000) { // 快取 5 分鐘
      keyStatusMap.delete(fp);
      return null;
    }
    return entry;
  },

  isKnownInvalid: (provider, apiKey) => {
    const st = KeyStatus.getStatus(provider, apiKey);
    return st ? st.isValid === false : false;
  }
};

/**
 * Sample Data for Demo Mode when no API key is configured.
 * 讓未輸入金鑰的使用者能立即看見 CaféPrism 的成果，而非漫長等待讀取。
 */

export function hasConfiguredModel(settings) {
  if (!settings) return false;
  if (settings.modelType === 'local') {
    return Boolean(settings.ollamaUrl && settings.ollamaModel);
  }
  const provider = settings.provider || 'groq';
  const apiKey = (settings.apiKeys && settings.apiKeys[provider]) || settings.apiKey;
  return Boolean(apiKey && apiKey.trim());
}

export function getSampleCards(lang = 'zh') {
  const isZh = lang === 'zh';

  if (isZh) {
    return [
      {
        id: 'sample-scholar-1',
        primaryTitle: '雙重研磨與多峰微粒分布對濃縮咖啡萃取率與風味一致性的影響',
        summary: '結合流體力學與微萃取研究，雙重研磨（Bimodal Grinding）可顯著改善超細粉在粉餅底部的沉積壓實。在 9 bar 標準壓力下，特定雙峰粒徑分布使整體水流分布更均勻，可提升萃取率約 14.2%。\n⚠ 不過當細粉比例過低時，容易產生局部通道效應（Channeling），仍需依烘焙度彈性調整研磨策略。',
        fun_fact: '在顯微鏡下，咖啡豆內部細胞壁約 30～40 微米。研磨顆粒小於此尺寸時，細胞破裂直接釋放胞內水溶物，萃取過程完全不受細胞壁擴散限制！',
        practical_tip: '使用磨豆機進行粗磨後進行過篩微調再進行二次研磨，可顯著改善淺焙義式的尖銳酸質，使中後段甜感更具包覆性。',
        keyTerms: ['微粒分布 (Particle Size)', '萃取均勻度 (Extraction Uniformity)', '粉餅通道效應 (Channeling)', '雙重研磨 (Bimodal Grinding)'],
        consensus: '細粉適度存在能建立良好萃取阻力，但粒徑不均勻是導致通道效應與萃取不均的核心主因。',
        conflicts: '部分學者主張窄單峰研磨能帶來最高純淨度，但賽事與實務玩家測試顯示適度雙峰微粒能賦予濃縮咖啡更好的稠度與滑順感。',
        uncertainty: '不同脫水率之淺焙生豆在不同刀盤幾何（鬼齒/平刀/錐刀）下的精確破裂模型仍需更廣泛樣品驗證。',
        repaired: false,
        incomplete: false,
        noModel: false,
        llmError: false,
        isSample: true,
        primarySource: 'semantic_scholar',
        confidence: 'high',
        hasConflict: true,
        crossVerified: true,
        uncertainCount: 1,
        hash: 'demo-7f8a9b1c',
        timestamp: new Date().toISOString(),
        articles: [
          {
            title: 'Systematically Improving Espresso: Insights from Mathematical Modeling and Grind Distribution',
            link: 'https://doi.org/10.1016/j.matter.2019.12.019',
            source: 'semantic_scholar',
            journal: 'Matter (Cell Press)',
            authors: 'Cameron et al.',
            snippet: 'A multiscale mathematical model of coffee extraction demonstrates the influence of grind settings and compaction on beverage quality and yield reproducibility.'
          },
          {
            title: 'Particle Size Distribution of Roasted Coffee: Hydrodynamics and Mass Transfer',
            link: 'https://doi.org/10.1021/acs.jafc.9b01234',
            source: 'semantic_scholar',
            journal: 'Journal of Agricultural and Food Chemistry',
            authors: 'M. Petracco et al.',
            snippet: 'Analysis of bimodal particle size distributions on flow velocity and total dissolved solids in high pressure extraction systems.'
          }
        ]
      },
      {
        id: 'sample-reddit-1',
        primaryTitle: 'r/Coffee 熱議：「熱水預浸＋低溫慢萃」技法對冷萃甜感與芳香揮發物的盲測驗證',
        summary: '社群發燒主題「Hot Bloom Cold Brew」引發廣泛盲測討論：先以約 12% 總水量的 92°C 熱水預浸 45 秒釋放高沸點香氣，隨後注入冰水進行 14 小時低溫浸泡。\n盲測結果顯示此手法能有效保留產區花果酸甜，大幅改善傳統完全冷萃容易出現的木質調與雜味。',
        fun_fact: '許多人誤以為冷萃咖啡的咖啡因含量較低；但事實上長時間（14～16 小時）完全浸泡的總咖啡因溶出量，通常高於一般 3 分鐘的手沖熱咖啡！',
        practical_tip: '熱預浸比例切勿超過總水量的 15%，且接觸時間需嚴格控制在 45 秒內，隨即迅速注入冰塊降溫，避免萃出苦澀單寧。',
        keyTerms: ['熱預浸冷萃 (Hot Bloom Cold Brew)', '芳香揮發物 (Volatiles)', '杯測盲測 (Blind Tasting)', '低溫浸萃 (Cold Maceration)'],
        consensus: '低溫難以萃取某些水溶性較差的花果香氣分子，熱預浸能先解鎖高分子香氣，同時維持低溫萃取的圓潤甘甜。',
        conflicts: '部分咖啡師質疑熱預浸會加速氧化降解，導致冷萃保存期由原本的一週縮減為 3～4 天。',
        uncertainty: '不同處理法（日曬 vs 水洗）在熱預浸步驟的揮發物損失率差異尚待實驗量測。',
        repaired: true,
        incomplete: false,
        noModel: false,
        llmError: false,
        isSample: true,
        primarySource: 'reddit',
        confidence: 'medium',
        hasConflict: false,
        crossVerified: false,
        uncertainCount: 0,
        hash: 'demo-4d5e6f7a',
        timestamp: new Date().toISOString(),
        articles: [
          {
            title: 'Hot Bloom Cold Brew: Comprehensive blind testing with 20 participants',
            link: 'https://reddit.com/r/Coffee/comments/sample_hot_bloom',
            source: 'reddit',
            score: 412,
            numComments: 89,
            snippet: 'We ran side-by-side triangles with an Ethiopian washed Guji. The hot bloomed brew scored significantly higher in floral clarity and sweetness.'
          }
        ]
      },
      {
        id: 'sample-rss-1',
        primaryTitle: '精品咖啡市場新風向：特殊厭氧發酵熱潮降溫，高純淨度傳統處理法重回拍賣焦點',
        summary: '根據本季產區交易與競標數據，特殊酵母與厭氧發酵批次在經歷近年爆發性成長後，買家偏好出現結構性轉移。\n歐美精品烘豆商在年度採購中重新聚焦「產區風土（Terroir）純淨度」，頂級水洗與精緻慢速日曬微批次平均競標溢價再度超越重度厭氧批次。',
        fun_fact: '厭氧發酵起源於葡萄酒釀造工藝（Carbonic Maceration），2015 年由澳洲咖啡師在 WBC 世界大賽奪冠後在全球各大咖啡產區掀起旋風。',
        practical_tip: '沖煮特殊發酵處理咖啡豆時，因發酵使其細胞結構更為脆弱多孔，建議水溫調降至 88～90°C，並略微放粗研磨度以避免苦味堆疊。',
        keyTerms: ['厭氧發酵 (Anaerobic Fermentation)', '產區風土 (Terroir)', '微批次溢價 (Micro-lot Premium)', '乾淨度 (Cup Cleanliness)'],
        consensus: '特殊處理法為低海拔產區提供加值路徑，但過度發酵掩蓋品種與風土特徵的現象正受到專業杯測界反思。',
        conflicts: '消費者端對強烈熱帶水果調的發酵豆依然需求強勁，與專業評審對經典傳統風味的追求形成市場分歧。',
        uncertainty: '氣候變遷對微型氣候發酵菌種穩定度的長期影響仍缺少跨產季的縱向資料。',
        repaired: false,
        incomplete: false,
        noModel: false,
        llmError: false,
        isSample: true,
        primarySource: 'rss',
        confidence: 'medium',
        hasConflict: true,
        crossVerified: false,
        uncertainCount: 0,
        hash: 'demo-2c3b4a5d',
        timestamp: new Date().toISOString(),
        articles: [
          {
            title: 'Specialty Coffee Transaction Report: Buyers shifting back to classic clean profiles',
            link: 'https://dailycoffeenews.com/sample_market_report_2026',
            source: 'rss',
            snippet: 'Analysis of recent micro-lot auctions reveals a resurgence in demand for clean washed coffees, with green buyers prioritizing transparent variety characteristics.'
          }
        ]
      }
    ];
  }

  // English sample cards
  return [
    {
      id: 'sample-scholar-1-en',
      primaryTitle: 'Impact of Bimodal Particle Size Distribution on Espresso Extraction Dynamics',
      summary: 'Combining fluid mechanics with extraction modeling, bimodal particle grinding mitigates ultrafine fines migration to the basket floor. Under 9 bar pressure, an optimized distribution improves water flow uniformity and boosts extraction yield by up to 14.2%.\n⚠ However, insufficient fines can lead to localized channeling, requiring grind adjustments based on roast degree.',
      fun_fact: 'Under an electron microscope, coffee bean cell walls are roughly 30-40 microns. Particles smaller than this immediately expose soluble cell contents to water!',
      practical_tip: 'Sifting coarse grinds before a secondary micro-grind reduces harsh acidity in light roasts, producing a noticeably rounder sweetness.',
      keyTerms: ['Particle Size Distribution', 'Extraction Uniformity', 'Channeling Dynamics', 'Bimodal Grinding'],
      consensus: 'Fines provide necessary hydraulic resistance, but uneven distribution is the primary driver of channeling.',
      conflicts: 'While some advocate unimodal grinding for maximum clarity, practical trials suggest controlled bimodal fines deliver better espresso crema and body.',
      uncertainty: 'Predictive cracking models across different burr geometries (flat vs. conical) still require larger sample validation.',
      repaired: false,
      incomplete: false,
      noModel: false,
      llmError: false,
      isSample: true,
      primarySource: 'semantic_scholar',
      confidence: 'high',
      hasConflict: true,
      crossVerified: true,
      uncertainCount: 1,
      hash: 'demo-7f8a9b1c',
      timestamp: new Date().toISOString(),
      articles: [
        {
          title: 'Systematically Improving Espresso: Insights from Mathematical Modeling and Grind Distribution',
          link: 'https://doi.org/10.1016/j.matter.2019.12.019',
          source: 'semantic_scholar',
          journal: 'Matter (Cell Press)',
          authors: 'Cameron et al.',
          snippet: 'A multiscale mathematical model of coffee extraction demonstrates the influence of grind settings and compaction on beverage quality and yield reproducibility.'
        }
      ]
    },
    {
      id: 'sample-reddit-1-en',
      primaryTitle: 'r/Coffee: "Hot Bloom Cold Brew" Blind Testing Shows Enhanced Floral Aromatics',
      summary: 'Community experiments with hot bloom cold brew—pre-infusing coffee with 92°C water for 45s before adding ice water for a 14h cold maceration—revealed remarkable floral clarity over traditional full-cold maceration.',
      fun_fact: 'Despite popular belief, prolonged (14-16h) full immersion cold brew often extracts more total caffeine than a standard 3-minute hot pour-over!',
      practical_tip: 'Keep the hot bloom volume under 15% of total water and strictly within 45s, then immediately plunge with ice water to prevent extracting astringent tannins.',
      keyTerms: ['Hot Bloom Cold Brew', 'Volatile Aromatics', 'Triangle Blind Tasting', 'Cold Maceration'],
      consensus: 'Low temperatures struggle to extract high molecular weight floral volatiles; hot blooming unlocks aroma while preserving low-bitterness sweetness.',
      conflicts: 'Some baristas report hot blooming increases oxidation rate, reducing refrigerated shelf life from 7 days to 3-4 days.',
      uncertainty: 'Volatile loss differences between washed and natural processes during the bloom phase require empirical data.',
      repaired: true,
      incomplete: false,
      noModel: false,
      llmError: false,
      isSample: true,
      primarySource: 'reddit',
      confidence: 'medium',
      hasConflict: false,
      crossVerified: false,
      uncertainCount: 0,
      hash: 'demo-4d5e6f7a',
      timestamp: new Date().toISOString(),
      articles: [
        {
          title: 'Hot Bloom Cold Brew: Comprehensive blind testing with 20 participants',
          link: 'https://reddit.com/r/Coffee/comments/sample_hot_bloom',
          source: 'reddit',
          score: 412,
          numComments: 89,
          snippet: 'Side-by-side triangles with an Ethiopian washed Guji showed significantly higher scores in floral clarity and sweetness.'
        }
      ]
    },
    {
      id: 'sample-rss-1-en',
      primaryTitle: 'Specialty Green Coffee Market: Buyers Return to Clean Washed Profiles',
      summary: 'Auction data indicates buyer appetite for heavily infused and experimental anaerobic fermentations is stabilizing. Roasters are refocusing on transparent regional terroir, with high-scoring washed lots regaining premium bidding dominance.',
      fun_fact: 'Anaerobic maceration borrowed from winemaking became a global coffee sensation after an Australian barista claimed the 2015 World Barista Championship with it.',
      practical_tip: 'Specialty fermented coffees are more porous and extract rapidly. Lower water temperature to 88-90°C with a slightly coarser grind to prevent over-extraction.',
      keyTerms: ['Anaerobic Fermentation', 'Regional Terroir', 'Micro-lot Premium', 'Cup Cleanliness'],
      consensus: 'Experimental fermentations add value to lower altitudes, but over-fermentation masking varietal nuance is facing pushback.',
      conflicts: 'Retail consumers still love intensely fruity anaerobic profiles, creating a divergence with competition-grade scoring standards.',
      uncertainty: 'Long-term effects of microclimate yeast stability under climate shifts require multi-season tracking.',
      repaired: false,
      incomplete: false,
      noModel: false,
      llmError: false,
      isSample: true,
      primarySource: 'rss',
      confidence: 'medium',
      hasConflict: true,
      crossVerified: false,
      uncertainCount: 0,
      hash: 'demo-2c3b4a5d',
      timestamp: new Date().toISOString(),
      articles: [
        {
          title: 'Specialty Coffee Transaction Report: Buyers shifting back to classic clean profiles',
          link: 'https://dailycoffeenews.com/sample_market_report_2026',
          source: 'rss',
          snippet: 'Analysis of recent micro-lot auctions reveals a resurgence in demand for clean washed coffees, with green buyers prioritizing transparent variety characteristics.'
        }
      ]
    }
  ];
}

export function getSampleSourceStatus() {
  return {
    semantic_scholar: { status: 'success', count: 2, error: null },
    reddit: { status: 'success', count: 1, error: null },
    rss: { status: 'success', count: 1, error: null },
  };
}

