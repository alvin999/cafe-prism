// ─── Parsing utility ─────────────────────────────────────────────────────────
export function parseAIGeneratedJSON(text) {
  let jsonStr = text.trim();

  // Advanced JSON extraction (ignores <thinking> blocks or markdown)
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (match) {
    jsonStr = match[0];
  } else {
    // If no {} found, fallback to basic replace
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  }

  // 1. Check for basic completeness (must end with })
  const isIncomplete = !jsonStr.trim().endsWith('}');

  let result = {};
  let repaired = false;

  try {
    result = JSON.parse(jsonStr);
  } catch (e) {
    repaired = true;
    // Fallback: Regex recovery for key fields (supporting both English and Chinese keys)
    const keyMap = {
      subject: ['subject', '主題', '主旨', '話題'],
      summary: ['summary', '摘要', '總結', '整理'],
      fun_fact: ['fun_fact', 'funFact', '冷知識', '趣聞', '趣事'],
      practical_tip: ['practical_tip', 'practicalTip', '實用建議', '實作建議', '技巧'],
      consensus: ['consensus', '共識', '共識論點'],
      conflicts: ['conflicts', '衝突', '分歧', '矛盾'],
      uncertainty: ['uncertainty', '不確定性', '待證實'],
      keyTerms: ['keyTerms', '關鍵詞', '關鍵字', '標籤']
    };

    const extract = (keys) => {
      for (const k of keys) {
        const re = new RegExp(`"${k}"\\s*:\\s*(?:\\[\\s*)?"([^"]+)"`, 'i');
        const match = jsonStr.match(re);
        if (match) return match[1];
      }
      return null;
    };

    result.subject = extract(keyMap.subject) || 'Coffee Research Card';
    result.summary = extract(keyMap.summary) || 'Failed to parse full summary.';
    result.fun_fact = extract(keyMap.fun_fact) || '';
    result.practical_tip = extract(keyMap.practical_tip) || '';
    result.consensus = extract(keyMap.consensus) || '';
    result.conflicts = extract(keyMap.conflicts) || '';
    result.uncertainty = extract(keyMap.uncertainty) || '';

    const kwMatch = jsonStr.match(/"(?:keyTerms|關鍵詞|關鍵字)"\s*:\s*\[([^\]]+)\]/);
    result.keyTerms = kwMatch ? kwMatch[1].split(',').map(s => s.replace(/"/g, '').trim()) : [];
  }

  // Ensure type consistency (arrays back to strings if AI messed up)
  ['consensus', 'conflicts', 'uncertainty'].forEach(k => {
    if (Array.isArray(result[k])) result[k] = result[k].join(', ');
  });

  return { data: result, repaired, incomplete: isIncomplete };
}


// ─── LLM caller ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function callLLM(settings, prompt, retries = 2) {
  const { provider, apiKey, model } = settings;

  const attemptFetch = async () => {
    if (settings.modelType === 'local') {
      const r = await fetch(`${settings.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.ollamaModel, prompt, stream: false }),
      });
      if (!r.ok) throw new Error(`Ollama request failed: ${r.status}`);
      const d = await r.json();
      return d.response;
    }

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`OpenAI error: ${await r.text()}`);
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`Anthropic error: ${await r.text()}`);
      const d = await r.json();
      return d.content?.[0]?.text || '';
    }

    if (provider === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          // Removing max_tokens prevents Groq from over-reserving the TPM bucket
          // which immediately hits the 6000 TPM free tier limit.
        }),
      });
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`Groq error: ${errText}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    throw new Error(`Unknown provider: ${provider}`);
  };

  try {
    return await attemptFetch();
  } catch (err) {
    if (err.message === 'RATE_LIMIT' && retries > 0) {
      const waitTime = (3 - retries) * 6000; // 第一次失敗等 6 秒，第二次等 12 秒
      console.warn(`Rate limit hit, waiting ${waitTime / 1000} seconds before retry...`);
      await delay(waitTime);
      return callLLM(settings, prompt, retries - 1);
    }
    throw err;
  }
}

export async function fetchGroqModels(apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error('Failed to fetch Groq models');
  const d = await r.json();
  // Filter for text models only (exclude whisper/image if any)
  return (d.data || []).map(m => ({ id: m.id, name: m.id }));
}

export async function fetchOllamaModels(ollamaUrl) {
  const endpoint = `${ollamaUrl}/api/tags`;
  const r = await fetch(endpoint);
  if (!r.ok) throw new Error('Ollama not found');
  const d = await r.json();
  return d.models || [];
}

export async function buildGroundedSummaryPrompt(articles, language) {
  const lang = language === 'zh' ? 'Traditional Chinese' : 'English';
  const excerpts = articles.slice(0, 8).map((a, i) =>
    `[Source ${i + 1}] Title: ${a.title}\nExcerpt: ${a.description.slice(0, 400)}\nURL: ${a.link}`
  ).join('\n\n');

  const hasReddit = articles.some(a => a.source === 'reddit');
  const hasPaper = articles.some(a => a.source === 'semantic_scholar');

  let dynamicFocus = "";
  if (hasReddit) dynamicFocus += "\n- Focus on counter-intuitive community experiments, hacks, or hot debates.";
  if (hasPaper) dynamicFocus += "\n- Explain the physics/chemistry simply, and state HOW this changes a barista's daily brewing routine.";

  return `You are an expert Coffee Scientist and an engaging storyteller. 
Your goal is to extract deep academic insights from the provided research and present them in a fascinating, practical way.

CONTENT FOCUS:${dynamicFocus}
1. Academic Depth: Explain the "why" (e.g., chemical reactions, physics of extraction).
2. Practicality: How does this change a barista's daily routine (e.g., V60, espresso)?
3. Interesting Hook: Find counter-intuitive facts or breaking myths.
4. BE CONCISE: Keep summary strictly under 4 sentences. Keep fun_fact under 2 sentences.

FORMAT RULES:
1. You may think and analyze outside the JSON format first using <thinking> tags.
2. After your thinking, provide the final output inside a SINGLE valid JSON block.
3. JSON KEYS must be in English. JSON VALUES must be in ${lang}.
4. CITATIONS: Use [1], [2] in "summary" to reference sources.

JSON STRUCTURE:
{
  "subject": "Engaging title here",
  "summary": "Deep, concise overview...",
  "fun_fact": "One highly interesting or counter-intuitive trivia...",
  "practical_tip": "Actionable advice for daily brewing...",
  "consensus": "...",
  "conflicts": "...",
  "uncertainty": "...",
  "keyTerms": ["...", "..."]
}

ARTICLES:
${excerpts}`;
}
