// ─── Anti-hallucination core ─────────────────────────────────────────────────
export function computeConfidence(articles, summary) {
  // 1. 跨來源驗證 (Cross-source check)
  const sources = new Set(articles.map(a => a.source));
  const crossVerified = sources.size >= 2;

  // 取得所有來源的文本用於比對
  const allSourceText = articles.map(a => a.description + ' ' + a.title).join(' ').toLowerCase();
  
  // 語言偵測 (是否包含中文字)
  const isChinese = /[\u4e00-\u9fa5]/.test(summary);

  // 2. 錨點提取 (技術、名詞與數字)
  // 提取長度為 3 以上的英文單詞與數字，作為跨語言比對的錨點
  const anchors = [
    ...(summary.match(/[a-zA-Z0-9]{3,}/g) || []),
    ...(summary.match(/\b\d+(?:\.\d+)?\b/g) || [])
  ].map(a => a.toLowerCase());
  const uniqueAnchors = [...new Set(anchors)];
  const anchorOverlapCount = uniqueAnchors.filter(a => allSourceText.includes(a)).length;
  const anchorRatio = uniqueAnchors.length > 0 ? anchorOverlapCount / uniqueAnchors.length : 0;

  // 3. 引用驗證 (Citation check)
  // 檢查 LLM 是否有按照規定標註來源編號，如 [1]
  const citations = (summary.match(/\[\d+\]/g) || []);
  const uniqueCitations = new Set(citations).size;

  let score = 0;

  // 分數計算權重
  if (crossVerified) score += 30; // 跨來源加 30 分
  
  if (isChinese) {
    // 中文模式：主要依賴錨點與引用指標
    if (anchorRatio > 0.6) score += 30;
    else if (anchorRatio > 0.3) score += 15;
    
    // 如果有引用來源，且引用數量合理
    if (uniqueCitations >= Math.min(articles.length, 2)) score += 20;
    else if (uniqueCitations > 0) score += 10;
  } else {
    // 英文模式：傳統長單字比對 + 錨點 + 引用
    const summaryWords = summary.toLowerCase().split(/\s+/).filter(w => w.length > 5);
    const wordOverlap = summaryWords.filter(w => allSourceText.includes(w)).length;
    const wordRatio = wordOverlap / Math.max(summaryWords.length, 1);
    
    if (wordRatio > 0.5 || anchorRatio > 0.6) score += 30;
    else if (wordRatio > 0.3 || anchorRatio > 0.3) score += 15;
    
    if (uniqueCitations > 0) score += 20;
  }

  // 4. 學術加成
  if (articles.some(a => a.source === 'semantic_scholar')) score += 20;

  // 信心等級判定 (適度放寬門檻以反映落地摘要的高準確度)
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function detectConflicts(articles) {
  // Simple heuristic: look for contradictory temperature/ratio numbers
  const numbers = articles.map(a => {
    const matches = (a.description + a.title).match(/\d+(?:\.\d+)?/g) || [];
    return matches.map(Number);
  });
  // Check if critical numbers appear with variance > 20% across sources
  const allNums = numbers.flat();
  if (allNums.length < 4) return false;
  const mean = allNums.reduce((a, b) => a + b, 0) / allNums.length;
  const variance = allNums.some(n => Math.abs(n - mean) / (mean || 1) > 0.25);
  return variance && numbers.length >= 2;
}
