/**
 * ГУРУ — api/gpt.js
 * GPT-4o-mini endpoint для чата и помощи с заполнением блоков
 *
 * POST /api/gpt
 * Body: { messages, project_context, mode }
 * mode: 'chat' | 'fill' (помощь с заполнением поля)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ ok: false, error: 'method_not_allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(200).json({ ok: false, error: 'missing_openai_key' });

  const { messages = [], project_context = {}, mode = 'chat', field_context = '' } = req.body || {};

  // Системный промпт
  const projectInfo = [
    project_context.name     && `Проект: ${project_context.name}`,
    project_context.type     && `Ниша: ${project_context.type}`,
    project_context.website  && `Сайт: ${project_context.website}`,
    project_context.usp      && `УТП: ${project_context.usp}`,
    project_context.offer    && `Оффер: ${project_context.offer}`,
    project_context.geography && `География: ${project_context.geography}`,
  ].filter(Boolean).join('\n');

  let systemPrompt;

  if (mode === 'fill') {
    systemPrompt = `Ты — эксперт-маркетолог платформы ГУРУ. Помогаешь заполнять маркетинговые блоки кратко и по делу.

${projectInfo ? `Контекст проекта:\n${projectInfo}\n` : ''}
${field_context ? `Блок который нужно заполнить: ${field_context}\n` : ''}

Правила:
- Отвечай только на русском
- Давай конкретный текст который можно сразу вставить в поле
- Без лишних объяснений — только готовый вариант
- Если нужно несколько вариантов — дай 2-3 пронумерованных`;
  } else {
    systemPrompt = `Ты — эксперт-маркетолог и бизнес-стратег платформы ГУРУ. Помогаешь маркетологу анализировать проект и принимать решения.

${projectInfo ? `Контекст проекта:\n${projectInfo}\n` : ''}

Правила:
- Отвечай только на русском
- Будь конкретным и практичным
- Давай actionable советы
- Не лей воду`;
  }

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ ok: false, error: data.error.message });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ ok: true, text, usage: data.usage });

  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message });
  }
};
