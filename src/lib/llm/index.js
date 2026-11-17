import { KeyStatus } from '../sampleData.js';
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


// ─── Custom Errors for Fast-Fail Detection ─────────────────────────────────
export class LLMAuthError extends Error {
  constructor(message, provider) {
    super(message);
    this.name = 'LLMAuthError';
    this.provider = provider;
    this.isAuthError = true;
  }
}

export class LLMConnectionError extends Error {
  constructor(message, provider) {
    super(message);
    this.name = 'LLMConnectionError';
    this.provider = provider;
    this.isConnectionError = true;
  }
}

// ─── LLM caller ─────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function callLLM(settings, prompt, retries = 2, signal = null) {
  const { provider, model } = settings;
  const apiKey = (settings.apiKeys && settings.apiKeys[provider]) || settings.apiKey;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const attemptFetch = async () => {
    if (settings.modelType === 'local') {
      let r;
      try {
        r = await fetch(`${settings.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: settings.ollamaModel, prompt, stream: false }),
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至本地 Ollama (${settings.ollamaUrl})，請確認服務已啟動`, 'ollama');
      }
      if (!r.ok) {
        if (r.status === 404) {
          throw new LLMConnectionError(`Ollama 找不到模型 (${settings.ollamaModel})，請先執行 ollama pull`, 'ollama');
        }
        throw new LLMConnectionError(`Ollama 連線失敗 (HTTP ${r.status})`, 'ollama');
      }
      const d = await r.json();
      return d.response;
    }

    if (provider === 'openai') {
      let r;
      try {
        r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
          }),
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至 OpenAI 伺服器：${netErr.message}`, 'openai');
      }
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 401 || r.status === 403 || errText.includes('invalid_api_key')) {
          throw new LLMAuthError(`OpenAI API 金鑰無效或未授權 (HTTP ${r.status})`, 'openai');
        }
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`OpenAI error: ${errText}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    if (provider === 'anthropic') {
      let r;
      try {
        r = await fetch('https://api.anthropic.com/v1/messages', {
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
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至 Anthropic 伺服器：${netErr.message}`, 'anthropic');
      }
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 401 || r.status === 403 || errText.includes('authentication_error')) {
          throw new LLMAuthError(`Anthropic API 金鑰無效或未授權 (HTTP ${r.status})`, 'anthropic');
        }
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`Anthropic error: ${errText}`);
      }
      const d = await r.json();
      return d.content?.[0]?.text || '';
    }

    if (provider === 'groq') {
      let r;
      try {
        r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
          }),
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至 Groq 伺服器：${netErr.message}`, 'groq');
      }
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 401 || r.status === 403 || errText.includes('invalid_api_key')) {
          throw new LLMAuthError(`Groq API 金鑰無效或未授權 (HTTP ${r.status})`, 'groq');
        }
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`Groq error: ${errText}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    if (provider === 'gemini') {
      const selectedModel = model || 'gemini-2.0-flash';
      const cleanModel = selectedModel.replace(/^models\//, '');
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至 Gemini 伺服器：${netErr.message}`, 'gemini');
      }
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 400 && (errText.includes('API_KEY_INVALID') || errText.includes('API key not valid'))) {
          throw new LLMAuthError('Gemini API 金鑰無效 (API_KEY_INVALID)', 'gemini');
        }
        if (r.status === 401 || r.status === 403) {
          throw new LLMAuthError(`Gemini API 金鑰未授權 (HTTP ${r.status})`, 'gemini');
        }
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`Gemini error: ${errText}`);
      }
      const d = await r.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (provider === 'openrouter') {
      let r;
      try {
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'Cafe Prism',
        };
        if (typeof window !== 'undefined' && window.location?.origin) {
          headers['HTTP-Referer'] = window.location.origin;
        }
        r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal,
        });
      } catch (netErr) {
        if (netErr.name === 'AbortError') throw netErr;
        throw new LLMConnectionError(`無法連線至 OpenRouter 伺服器：${netErr.message}`, 'openrouter');
      }
      if (!r.ok) {
        const errText = await r.text();
        if (r.status === 401 || r.status === 403) {
          throw new LLMAuthError(`OpenRouter API 金鑰無效或未授權 (HTTP ${r.status})`, 'openrouter');
        }
        if (r.status === 429) throw new Error('RATE_LIMIT');
        throw new Error(`OpenRouter error: ${errText}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    throw new Error(`Unknown provider: ${provider}`);
  };

  try {
    return await attemptFetch();
  } catch (err) {
    if (signal?.aborted || err.name === 'AbortError') {
      throw err;
    }
    // 金鑰無效或網路連線失敗：立刻熔斷拋出，絕不重試浪費等待時間
    if (err.isAuthError || err.isConnectionError) {
      throw err;
    }
    if (err.message === 'RATE_LIMIT' && retries > 0) {
      const waitTime = (3 - retries) * 6000;
      console.warn(`Rate limit hit, waiting ${waitTime / 1000} seconds before retry...`);
      await delay(waitTime);
      return callLLM(settings, prompt, retries - 1, signal);
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
  // Filter for text generation models only (exclude whisper, guard, audio, vision, embedding, rerank)
  const excludePatterns = ['whisper', 'guard', 'audio', 'vision', 'image', 'tts', 'embedding', 'rerank'];
  return (d.data || [])
    .filter(m => {
      const id = (m.id || '').toLowerCase();
      return !excludePatterns.some(pattern => id.includes(pattern));
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(m => ({ id: m.id, name: m.id }));
}

export async function fetchOpenAIModels(apiKey) {
  const r = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error('Failed to fetch OpenAI models');
  const d = await r.json();
  const excludePatterns = [
    'instruct', 'realtime', 'audio', 'whisper', 'tts', 'dall-e',
    'embedding', 'babbage', 'davinci', 'curie', 'ada', 'moderation'
  ];
  return (d.data || [])
    .filter(m => {
      const id = (m.id || '').toLowerCase();
      const isChatFamily = id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3');
      return isChatFamily && !excludePatterns.some(pattern => id.includes(pattern));
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(m => ({ id: m.id, name: m.id }));
}

export async function fetchAnthropicModels(apiKey) {
  const r = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  });
  if (!r.ok) throw new Error('Failed to fetch Anthropic models');
  const d = await r.json();
  // Filter out legacy models (e.g. claude-1, claude-2.0)
  return (d.data || [])
    .filter(m => {
      const id = (m.id || '').toLowerCase();
      return !id.startsWith('claude-1') && !id.startsWith('claude-2.0');
    })
    .map(m => ({ id: m.id, name: m.display_name || m.id }));
}

export async function fetchGeminiModels(apiKey) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!r.ok) throw new Error('Failed to fetch Gemini models');
  const d = await r.json();
  const excludePatterns = ['embedding', 'aqa', 'imagen'];
  return (d.models || [])
    .filter(m => {
      const name = (m.name || '').toLowerCase();
      const hasGenContent = m.supportedGenerationMethods?.includes('generateContent');
      return hasGenContent && name.includes('gemini') && !excludePatterns.some(pattern => name.includes(pattern));
    })
    .map(m => {
      const id = m.name.replace(/^models\//, '');
      return { id, name: m.displayName || id };
    });
}

export async function fetchOpenRouterModels(apiKey) {
  const r = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error('Failed to fetch OpenRouter models');
  const d = await r.json();
  return (d.data || [])
    .filter(m => {
      const outputModalities = m.architecture?.output_modalities;
      if (Array.isArray(outputModalities)) {
        return outputModalities.includes('text');
      }
      const modality = (m.architecture?.modality || '').toLowerCase();
      return !modality || modality.endsWith('->text');
    })
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .map(m => ({ id: m.id, name: m.name || m.id }));
}

export async function fetchProviderModels(provider, apiKey) {
  if (!apiKey) return [];
  switch (provider) {
    case 'groq':
      return fetchGroqModels(apiKey);
    case 'openai':
      return fetchOpenAIModels(apiKey);
    case 'anthropic':
      return fetchAnthropicModels(apiKey);
    case 'gemini':
      return fetchGeminiModels(apiKey);
    case 'openrouter':
      return fetchOpenRouterModels(apiKey);
    default:
      return [];
  }
}

export async function fetchOllamaModels(ollamaUrl) {
  const endpoint = `${ollamaUrl}/api/tags`;
  const r = await fetch(endpoint);
  if (!r.ok) throw new Error('Ollama not found');
  const d = await r.json();
  const excludePatterns = ['embed', 'bge', 'nomic'];
  return (d.models || [])
    .map(m => (typeof m === 'string' ? m : m.name))
    .filter(name => {
      const lower = (name || '').toLowerCase();
      return !excludePatterns.some(pattern => lower.includes(pattern));
    });
}

export async function testLLMConnection(settings) {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const testPrompt = 'Respond with "OK".';
    await callLLM(settings, testPrompt, 0, controller.signal);
    const latencyMs = Math.round(performance.now() - start);
    return { success: true, latencyMs };
  } catch (err) {
    let message = err.message || 'Unknown error';
    if (err.name === 'AbortError' || controller.signal.aborted) {
      message = 'Request timeout (12s)';
    }
    return { success: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
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

// ─── Pre-flight API Key & Connection Fast Validation ─────────────────────────
const validKeyCache = new Map(); // key: `${provider}_${keyHash}`, val: timestamp

export async function validateAPIKeyPreflight(settings, signal = null) {
  if (settings.modelType === 'local') {
    if (!settings.ollamaUrl || !settings.ollamaModel) {
      throw new LLMConnectionError('尚未填寫本地 Ollama 位址或模型名稱', 'ollama');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500); // 1.5 秒極速快篩
    try {
      const r = await fetch(`${settings.ollamaUrl}/api/tags`, {
        signal: signal || controller.signal,
      });
      if (!r.ok) {
        throw new LLMConnectionError(`本地 Ollama 連線失敗 (HTTP ${r.status})`, 'ollama');
      }
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new LLMConnectionError(`無法連線至本地 Ollama (${settings.ollamaUrl})，請確認服務已啟動`, 'ollama');
    } finally {
      clearTimeout(timeout);
    }
    return true;
  }

  const provider = settings.provider || 'groq';
  const apiKey = (settings.apiKeys && settings.apiKeys[provider]) || settings.apiKey;

  if (!apiKey || !apiKey.trim()) {
    throw new LLMAuthError(`尚未輸入 ${provider.toUpperCase()} API 金鑰`, provider);
  }

  const trimmedKey = apiKey.trim();

  // 1. 若該金鑰在設定頁已知無效，0 秒立即熔斷，完全不浪費網路等待！
  const known = KeyStatus.getStatus(provider, trimmedKey);
  if (known && known.isValid === false) {
    throw new LLMAuthError(known.error || `${provider.toUpperCase()} 金鑰驗證無效`, provider);
  }

  const cacheKey = `${provider}_${trimmedKey.slice(0, 8)}_${trimmedKey.slice(-6)}`;
  const cachedTime = validKeyCache.get(cacheKey);
  if (cachedTime && Date.now() - cachedTime < 120000) {
    return true; // 2 分鐘內預檢通過，免重複發送請求
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500); // 1.5 秒極限快篩
  const activeSignal = signal || controller.signal;

  try {
    if (provider === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${trimmedKey}` },
        signal: activeSignal,
      });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new LLMAuthError('Groq API 金鑰無效或未授權 (401 Unauthorized)', 'groq');
        }
        if (r.status !== 429) {
          throw new LLMAuthError(`Groq 金鑰驗證失敗 (HTTP ${r.status})`, 'groq');
        }
      }
    } else if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${trimmedKey}` },
        signal: activeSignal,
      });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new LLMAuthError('OpenAI API 金鑰無效或未授權 (401 Unauthorized)', 'openai');
        }
        if (r.status !== 429) {
          throw new LLMAuthError(`OpenAI 金鑰驗證失敗 (HTTP ${r.status})`, 'openai');
        }
      }
    } else if (provider === 'gemini') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`, {
        signal: activeSignal,
      });
      if (!r.ok) {
        const text = await r.text();
        if (r.status === 400 || r.status === 401 || r.status === 403 || text.includes('API_KEY_INVALID')) {
          throw new LLMAuthError('Gemini API 金鑰無效 (API_KEY_INVALID)', 'gemini');
        }
        if (r.status !== 429) {
          throw new LLMAuthError(`Gemini 金鑰驗證失敗 (HTTP ${r.status})`, 'gemini');
        }
      }
    } else if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: activeSignal,
      });
      if (!r.ok) {
        const text = await r.text();
        if (r.status === 401 || r.status === 403 || text.includes('authentication_error')) {
          throw new LLMAuthError('Anthropic API 金鑰無效或未授權 (401 Unauthorized)', 'anthropic');
        }
        if (r.status !== 429) {
          throw new LLMAuthError(`Anthropic 金鑰驗證失敗 (HTTP ${r.status})`, 'anthropic');
        }
      }
    } else if (provider === 'openrouter') {
      const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${trimmedKey}` },
        signal: activeSignal,
      });
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          throw new LLMAuthError('OpenRouter API 金鑰無效或未授權 (401 Unauthorized)', 'openrouter');
        }
        if (r.status !== 429) {
          throw new LLMAuthError(`OpenRouter 金鑰驗證失敗 (HTTP ${r.status})`, 'openrouter');
        }
      }
    }

    validKeyCache.set(cacheKey, Date.now());
    KeyStatus.markValid(provider, trimmedKey);
    return true;
  } catch (err) {
    if (activeSignal.aborted && signal?.aborted) {
      throw err;
    }
    const finalErr = (err.isAuthError || err.isConnectionError)
      ? err
      : new LLMConnectionError(`無法連線至 ${provider.toUpperCase()} 服務，請確認網路連線`, provider);
    
    KeyStatus.markInvalid(provider, trimmedKey, finalErr.message);
    throw finalErr;
  } finally {
    clearTimeout(timeout);
  }
}
