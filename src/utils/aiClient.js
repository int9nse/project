// backend/src/utils/aiClient.js

/**
 * AI-клиент для OpenAI GPT-3.5 Turbo
 * Гарантированно читает ключ из process.env в момент вызова.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export const aiClient = {
  /**
   * @param {Array<{role:'user'|'assistant',content:string}>} messages
   * @param {string} sysPrompt — системный контекст (опционально)
   */
  chat: async (messages, sysPrompt = '') => {
    // Подхватываем ключ прямо перед запросом
    const KEY = process.env.OPENAI_API_KEY;
    if (!KEY) {
      throw new Error('OPENAI_API_KEY is not set. Проверьте файл backend/.env');
    }

    // Собираем полный массив сообщений
    const chat = [];
    if (sysPrompt) {
      chat.push({ role: 'system', content: sysPrompt });
    }
    chat.push(...messages);

    // Отправляем запрос
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-3.5-turbo',
        messages:    chat,
        temperature: 0.7,
        max_tokens:  1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status} — ${err}`);
    }

    const { choices } = await res.json();
    return { choices };
  },

  /**
   * Заглушка для эмбеддингов
   */
  embed: async texts => {
    return [];
  },
};
