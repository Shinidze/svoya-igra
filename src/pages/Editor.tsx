import { useState } from 'react';
import { supabase } from '../supabase';
import { Board, Category, GroupCode, Media, Question, groupName } from '../types';

const MAX_MB = 20;
const newQuestion = (i: number): Question => ({ price: (i + 1) * 100, text: '', answer: '' });
const newCategory = (qCount: number): Category => ({
  name: '',
  questions: Array.from({ length: qCount }, (_, i) => newQuestion(i)),
});

async function uploadMedia(file: File, group: GroupCode): Promise<Media> {
  const kind = file.type.split('/')[0];
  if (kind !== 'image' && kind !== 'audio' && kind !== 'video') throw new Error('Можно загружать только фото, аудио и видео');
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Файл больше ${MAX_MB} МБ`);
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${group}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { type: kind, url: data.publicUrl };
}

export function MediaView({ media }: { media?: Media }) {
  if (!media) return null;
  return (
    <div className="media-box">
      {media.type === 'image' && <img src={media.url} alt="" />}
      {media.type === 'audio' && <audio src={media.url} controls />}
      {media.type === 'video' && <video src={media.url} controls />}
    </div>
  );
}

export default function Editor({ group }: { group: GroupCode }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [cats, setCats] = useState<Category[]>(() => [newCategory(5), newCategory(5), newCategory(5)]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');

  const updateCat = (ci: number, fn: (c: Category) => Category) =>
    setCats((prev) => prev.map((c, i) => (i === ci ? fn(c) : c)));
  const updateQ = (ci: number, qi: number, patch: Partial<Question>) =>
    updateCat(ci, (c) => ({ ...c, questions: c.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) }));

  const onFile = async (ci: number, qi: number, file?: File) => {
    if (!file) return;
    setError('');
    setUploading(`${ci}-${qi}`);
    try {
      const media = await uploadMedia(file, group);
      updateQ(ci, qi, { media });
    } catch (e) {
      setError('Загрузка не удалась: ' + (e as Error).message);
    }
    setUploading('');
  };

  const toggleOptions = (ci: number, qi: number, q: Question) => {
    if (q.options) updateQ(ci, qi, { options: undefined, correct: undefined });
    else updateQ(ci, qi, { options: ['', ''], correct: 0 });
  };

  const setOption = (ci: number, qi: number, q: Question, oi: number, value: string) =>
    updateQ(ci, qi, { options: (q.options ?? []).map((o, i) => (i === oi ? value : o)) });

  const removeOption = (ci: number, qi: number, q: Question, oi: number) => {
    const opts = (q.options ?? []).filter((_, i) => i !== oi);
    let correct = q.correct ?? 0;
    if (oi < correct) correct -= 1;
    if (correct >= opts.length) correct = 0;
    updateQ(ci, qi, { options: opts, correct });
  };

  const validate = (): string => {
    if (!title.trim()) return 'Введи название игры';
    if (cats.length === 0) return 'Добавь хотя бы одну тему';
    for (const [ci, c] of cats.entries()) {
      if (!c.name.trim()) return `Тема №${ci + 1}: нет названия`;
      if (c.questions.length === 0) return `Тема «${c.name}»: нет вопросов`;
      for (const [qi, q] of c.questions.entries()) {
        const where = `Тема «${c.name}», вопрос №${qi + 1}`;
        if (!q.text.trim() && !q.media) return `${where}: добавь текст или файл`;
        if (!Number.isFinite(q.price) || q.price <= 0) return `${where}: цена должна быть больше 0`;
        if (q.options) {
          if (q.options.length < 2 || q.options.some((o) => !o.trim())) return `${where}: заполни все варианты (минимум 2)`;
        } else if (!q.answer.trim()) return `${where}: впиши ответ`;
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
        questions: c.questions.map((q) => {
          const base: Question = { price: Math.round(q.price), text: q.text.trim(), answer: q.answer.trim() };
          if (q.media) base.media = q.media;
          if (q.options) {
            base.options = q.options.map((o) => o.trim());
            base.correct = q.correct ?? 0;
            base.answer = base.options[base.correct];
          }
          return base;
        }),
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
                    <input type="number" min={1} value={q.price} onChange={(e) => updateQ(ci, qi, { price: Number(e.target.value) })} />
                  </label>
                  <button className="icon" title="Удалить вопрос" onClick={() => updateCat(ci, (x) => ({ ...x, questions: x.questions.filter((_, i) => i !== qi) }))}>✕</button>
                </div>
                <textarea rows={2} placeholder="Текст вопроса" value={q.text} onChange={(e) => updateQ(ci, qi, { text: e.target.value })} />

                <MediaView media={q.media} />
                <div className="upload">
                  <input type="file" accept="image/*,audio/*,video/*" onChange={(e) => { onFile(ci, qi, e.target.files?.[0]); e.target.value = ''; }} />
                  {uploading === `${ci}-${qi}` && <span>Загрузка…</span>}
                  {q.media && <button className="icon" onClick={() => updateQ(ci, qi, { media: undefined })}>убрать файл</button>}
                </div>

                {q.options ? (
                  <div className="opts">
                    <span className="muted">Отметь верный вариант</span>
                    {q.options.map((o, oi) => (
                      <div key={oi} className="opt-row">
                        <input type="radio" name={`correct-${ci}-${qi}`} checked={(q.correct ?? 0) === oi} onChange={() => updateQ(ci, qi, { correct: oi })} />
                        <input type="text" value={o} maxLength={80} placeholder={`Вариант ${oi + 1}`} onChange={(e) => setOption(ci, qi, q, oi, e.target.value)} />
                        {q.options!.length > 2 && <button className="icon" onClick={() => removeOption(ci, qi, q, oi)}>✕</button>}
                      </div>
                    ))}
                    <div className="cat-actions">
                      {q.options.length < 6 && <button className="btn ghost small" onClick={() => updateQ(ci, qi, { options: [...q.options!, ''] })}>+ вариант</button>}
                      <button className="btn ghost small" onClick={() => toggleOptions(ci, qi, q)}>Без вариантов</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input placeholder="Ответ" value={q.answer} onChange={(e) => updateQ(ci, qi, { answer: e.target.value })} />
                    <button className="btn ghost small" onClick={() => toggleOptions(ci, qi, q)}>+ Варианты ответа</button>
                  </>
                )}
              </div>
            ))}
            <div className="cat-actions">
              <button className="btn ghost small" onClick={() => updateCat(ci, (x) => ({ ...x, questions: [...x.questions, newQuestion(x.questions.length)] }))}>+ Вопрос</button>
              <button className="btn ghost small danger" onClick={() => setCats((p) => p.filter((_, i) => i !== ci))}>Удалить тему</button>
            </div>
          </div>
        ))}
        <button className="add-cat" onClick={() => setCats((p) => [...p, newCategory(p[0]?.questions.length ?? 5)])}>
          + Добавить тему
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn big" disabled={saving || !!uploading} onClick={save}>
        {saving ? 'Сохраняю…' : 'Сохранить и играть'}
      </button>
    </main>
  );
}
