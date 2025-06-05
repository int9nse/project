import express from 'express';
import { Progress } from '../models/Progress.js';
import { Lesson }   from '../models/Lesson.js';
import { Material } from '../models/Material.js';
import { Chat }     from '../models/Chat.js';
import { aiClient } from '../utils/aiClient.js';
import { auth }     from '../middleware/auth.js';
import { getIO }    from '../socket.js';

const router = express.Router();

// GET /api/learning/chat/:lessonId — возвращает историю чата (массив сообщений)
router.get('/:lessonId', auth(), async (req, res) => {
  try {
    const uid      = req.user.id;
    const lessonId = req.params.lessonId;
    const chat     = await Chat.findOne({ userId: uid, lessonId });
    return res.json(chat?.messages || []);
  } catch (err) {
    console.error('GET /api/learning/chat/:lessonId error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Utility: разбивает произвольный текст на чанки примерно по 600 символов (по предложениям)
function splitText(text) {
  const maxLen   = 600;
  // Разбиваем на предложения с учётом точек, восклицательных и вопросительных знаков
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  const chunks   = [];
  let buffer     = '';

  for (const s of sentences) {
    if (!buffer) {
      buffer = s;
    } else if ((buffer + s).length <= maxLen) {
      buffer += s;
    } else {
      chunks.push(buffer.trim());
      buffer = s;
    }
  }
  if (buffer) {
    chunks.push(buffer.trim());
  }
  return chunks;
}

/**
 * POST /api/learning/chat/:lessonId
 * body: { message: string }
 */
router.post('/:lessonId', auth(), async (req, res) => {
  try {
    const uid      = req.user.id;
    const lessonId = req.params.lessonId;
    let   text     = (req.body.message || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Message required' });
    }

    // 1) Получаем или создаём прогресс пользователя для этого урока
    let prog = await Progress.findOne({ userId: uid, lessonId, completed: false })
      .sort({ updatedAt: -1 });
    if (!prog) {
      prog = await Progress.create({ userId: uid, lessonId, index: 0 });
    }

    // 2) Рестарт урока: если прислали «restart» или «reset»
    if (/^(restart|reset)$/i.test(text)) {
      prog.index     = 0;
      prog.completed = false;
      prog.score     = 0;
      await prog.save();
      text = 'start';
    }

    // 3) Загружаем Lesson и Material, составляем массив raw чанков
    const lesson = await Lesson.findById(lessonId);
    let raw = [];

    // 3.1) Пытаемся получить Material по topicId или lessonId
    const mat = await Material.findOne({ topicId: lessonId })
             || await Material.findOne({ lessonId });

    if (mat && Array.isArray(mat.chunks) && mat.chunks.length > 0) {
      // Для каждого элемента mat.chunks берём mat.chunks[i].text.
      // Если текст превышает 600 символов, разбиваем его на более мелкие части
      for (const c of mat.chunks) {
        const t = (c.text || '').trim();
        if (!t) continue;
        if (t.length > 600) {
          const subChunks = splitText(t);
          raw.push(...subChunks);
        } else {
          raw.push(t);
        }
      }
    } else {
      // 3.2) Если Material либо отсутствует, либо там пустой массив — дробим content урока
      const fullText = lesson.content || '';
      if (fullText.trim()) {
        raw = splitText(fullText);
      }
    }

    // Если вдруг raw всё ещё пуст (например, lesson.content пустой) — ставим заглушку
    if (!raw.length) {
      raw = [''];
    }

    const total = raw.length;

    // 4) Сохраняем сообщение пользователя (role:'user') в коллекции Chat
    await Chat.findOneAndUpdate(
      { userId: uid, lessonId },
      {
        $push:   { messages: { role: 'user', content: text, ts: new Date() } },
        $set:    { updatedAt: new Date() }
      },
      { upsert: true }
    );

    let resp = null;

    // ----- Логика ветвления по prog.index и тексту:

    // A) Если prog.index === 0 И text === 'start' → даём первый chunk
    if (prog.index === 0 && /^start$/i.test(text)) {
      prog.index = 1;
      await prog.save();
      resp = { type: 'chunk', chunk: raw[0], progress: 1, total };
    }
    // B) Между чанками: prog.index > 0 && prog.index <= total
    else if (prog.index > 0 && prog.index <= total && !resp) {
      // B1) Если text==='continue' или 'next' → выдаём следующий chunk
      if (/^(continue|next)$/i.test(text)) {
        if (prog.index === total) {
          // Если текущий индекс уже последний chunk
          // Переходим к финалу, увеличиваем индекс до total+1
          prog.index = total + 1;
          await prog.save();
          // Дадим последний пустой chunk (если raw[total - 1] уже отдан), дальше уходит в FINAL
          resp = { type: 'chunk', chunk: raw[total - 1], progress: total + 1, total };
        } else {
          // Обычный следующий chunk
          const idx = prog.index; // 0-based index в raw (поскольку raw[0] уже выдали при prog.index=1)
          prog.index++;
          await prog.save();
          resp = { type: 'chunk', chunk: raw[idx], progress: prog.index, total };
        }
      }
      // B2) Иначе — вопрос по текущему chunk
      else {
        const last = Math.min(prog.index - 1, raw.length - 1);
        const sys  = `Tutor: answer strictly based on this chunk:\n\n${raw[last]}`;
        const ai   = await aiClient.chat([{ role: 'user', content: text }], sys);
        resp      = { type: 'answer', answer: ai.choices[0].message.content };
      }
    }
    // C) FINAL QUESTIONS: prog.index === total+1 && ещё не completed
    if (!resp && prog.index === total + 1 && !prog.completed) {
      let questions = lesson.finalQuestions?.filter(q => q.trim()) || [];
      if (!questions.length) {
        const prompt =
`You are a tutor. Full lesson content:
---
${raw.join('\n\n')}
---
Generate 3 concise quiz questions strictly based on the above content, each on its own line.`
          .trim();
        const aiq = await aiClient.chat([{ role: 'user', content: prompt }]);
        questions = aiq.choices[0].message.content
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l);
      }
      prog.index++;
      await prog.save();
      resp = { type: 'final', questions };
    }
    // D) EVALUATE & COMPLETE: prog.index > total+1 && ещё не completed
    if (!resp && prog.index > total + 1 && !prog.completed) {
      const crit = lesson.criteria.map(c => `${c.name}: ${c.weight}`).join('\n');
      const evalP = `Evaluate strictly by criteria:\n${crit}\nUser Answers:\n${text}`;
      const ai   = await aiClient.chat([{ role: 'user', content: evalP }]);
      let score = 0, feedback = '';

      try {
        // Если AI вернул JSON { score, feedback }
        const js = JSON.parse(ai.choices[0].message.content);
        score     = js.score;
        feedback  = js.feedback;
      } catch {
        // Иначе парсим первое число из текста
        const m = ai.choices[0].message.content.match(/(\d+(?:\.\d+)?)/);
        score    = m ? parseFloat(m[1]) : 0;
        feedback = ai.choices[0].message.content;
      }

      prog.completed = true;
      prog.score     = score;
      await prog.save();

      // Уведомление админа через Socket.IO
      getIO().to('admin').emit('lessonPassed', { userId: uid, lessonId, score });

      // Создаём прогресс следующего урока (если есть)
      const nextL = await Lesson.findOne({ order: { $gt: lesson.order } }).sort({ order: 1 });
      if (nextL) {
        await Progress.create({ userId: uid, lessonId: nextL._id, index: 0 });
      }

      resp = { type: 'result', passed: score >= 60, score, feedback };
    }

    // Если никакая ветка не сработала → Invalid state
    if (!resp) {
      return res.status(400).json({ error: 'Invalid state' });
    }

    // 5) Сохраняем ответ AI в Chat
    let aiText = '';
    if (resp.type === 'chunk') {
      aiText = resp.chunk;
    } else if (resp.type === 'answer') {
      aiText = resp.answer;
    } else if (resp.type === 'final') {
      aiText = resp.questions.join('\n');
    } else {
      aiText = `Score: ${resp.score}\nFeedback: ${resp.feedback}`;
    }

    await Chat.findOneAndUpdate(
      { userId: uid, lessonId },
      {
        $push:   { messages: { role: 'assistant', content: aiText, ts: new Date() } },
        $set:    { updatedAt: new Date() }
      },
      { upsert: true }
    );

    return res.json(resp);
  } catch (err) {
    console.error('POST /api/learning/chat/:lessonId error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
