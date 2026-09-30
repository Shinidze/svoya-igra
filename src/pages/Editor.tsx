import { useState } from 'react';
import { supabase } from '../supabase';
import { Board, Category, GroupCode, groupName } from '../types';

const newQuestion = (i: number) => ({ price: (i + 1) * 100, text: '', answer: '' });
const newCategory = (qCount: number): Category => ({
  name: '',
  questions: Array.from({ length: qCount }, (_, i) => newQuestion(i)),
});

export default function Editor({ group }: { group: GroupCode }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [cats, setCats] = useState<Category[]>(() => [newCategory(5), newCategory(5), newCategory(5)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateCat = (ci: number, fn: (c: Category) => Category) =>
    setCats((prev) => prev.map((c, i) => (i === ci ? fn(c) : c)));

  const validate = (): string => {
    if (!title.trim()) return 'Введи название игры';
    if (cats.length === 0) return 'Добавь хотя бы одну тему';
    for (const [ci, c] of cats.entries()) {
      if (!c.name.trim()) return `Тема №${ci + 1}: нет названия`;
      if (c.questions.length === 0) return `Тема «${c.name}»: нет вопросов`;
      for (const [qi, q] of c.questions.entries()) {
        if (!q.text.trim() || !q.answer.trim()) return `Тема «${c.name}», вопрос №${qi + 1}: заполни вопрос и ответ`;
        if (!Number.isFinite(q.price) || q.price <= 0) return `Тема «${c.name}», вопрос №${qi + 1}: цена должна быть больше 0`;
      }
    }
    return '';
  };

  const save = async () => {
    const err = validate();
    if (err) return setError(err);
    setError('');
    setSaving(true);
    const board: Board = {
      categories: cats.map((c) => ({
        name: c.name.trim(),
        questions: c.questions.map((q) => ({ price: Math.round(q.price), text: q.text.trim(), answer: q.answer.trim() })),
      })),
    };
    const { data, error } = await supabase
      .from('games')
      .insert({ group_code: group, title: title.trim(), author: author.trim(), board })
      .select('id')
      .single();
    setSaving(false);
    if (error) return setError('Не удалось сохранить: ' + error.message);
    window.location.hash = `#/g/${group}/play/${data.id}`;
  };

  return (
    <main className="container wide">
      <h2>Новая игра · {groupName(group)}</h2>

      <div className="card form-row">
        <label>
          Название игры
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Экономика за 15 минут" />
        </label>
        <label>
          Твоё имя (необязательно)
          <input value={author} maxLength={40} onChange={(e) => setAuthor(e.target.value)} placeholder="Аноним" />
        </label>
      </div>

      <div className="editor-cols">
        {cats.map((c, ci) => (
          <div key={ci} className="card cat">
            <input
              className="cat-name"
              value={c.name}
              maxLength={40}
              placeholder={`Тема ${ci + 1}`}
              onChange={(e) => updateCat(ci, (x) => ({ ...x, name: e.target.value }))}
            />
            {c.questions.map((q, qi) => (
              <div key={qi} className="q-block">
                <div className="q-head">
                  <span>Вопрос {qi + 1}</span>
                  <label className="price">
                    Цена
                    <input
                      type="number"
                      min={1}
                      value={q.price}
                      onChange={(e) =>
                        updateCat(ci, (x) => ({
                          ...x,
                          questions: x.questions.map((qq, i) => (i === qi ? { ...qq, price: Number(e.target.value) } : qq)),
                        }))
                      }
                    />
                  </label>
                  <button
                    className="icon"
                    title="Удалить вопрос"
                    onClick={() => updateCat(ci, (x) => ({ ...x, questions: x.questions.filter((_, i) => i !== qi) }))}
                  >✕</button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Текст вопроса"
                  value={q.text}
                  onChange={(e) =>
                    updateCat(ci, (x) => ({ ...x, questions: x.questions.map((qq, i) => (i === qi ? { ...qq, text: e.target.value } : qq)) }))
                  }
                />
                <input
                  placeholder="Ответ"
                  value={q.answer}
                  onChange={(e) =>
                    updateCat(ci, (x) => ({ ...x, questions: x.questions.map((qq, i) => (i === qi ? { ...qq, answer: e.target.value } : qq)) }))
                  }
                />
              </div>
            ))}
            <div className="cat-actions">
              <button
                className="btn ghost small"
                onClick={() =>
                  updateCat(ci, (x) => ({
                    ...x,
                    questions: [...x.questions, newQuestion(x.questions.length)],
                  }))
                }
              >+ Вопрос</button>
              <button className="btn ghost small danger" onClick={() => setCats((p) => p.filter((_, i) => i !== ci))}>Удалить тему</button>
            </div>
          </div>
        ))}
        <button className="add-cat" onClick={() => setCats((p) => [...p, newCategory(p[0]?.questions.length ?? 5)])}>
          + Добавить тему
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn big" disabled={saving} onClick={save}>
        {saving ? 'Сохраняю…' : 'Сохранить и играть'}
      </button>
    </main>
  );
}
