import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { GameRow, GroupCode } from '../types';
import { MediaView } from './Editor';

interface Team {
  name: string;
  score: number;
}

export default function Play({ group, id }: { group: GroupCode; id: string }) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [newName, setNewName] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [turn, setTurn] = useState(0);
  const [open, setOpen] = useState<{ ci: number; qi: number } | null>(null);
  const [answering, setAnswering] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('group_code', group)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError('Игра не найдена в архиве этой группы');
        else setGame(data as GameRow);
      });
  }, [id, group]);

  const total = useMemo(() => game?.board.categories.reduce((s, c) => s + c.questions.length, 0) ?? 0, [game]);
  const maxRows = useMemo(() => Math.max(0, ...(game?.board.categories.map((c) => c.questions.length) ?? [0])), [game]);

  if (error) return <main className="container"><p className="error">{error}</p><a href={`#/g/${group}`} className="btn">В архив</a></main>;
  if (!game) return <main className="container"><p>Загрузка…</p></main>;

  const addTeam = () => {
    const name = newName.trim();
    if (!name || teams.length >= 8) return;
    setTeams([...teams, { name, score: 0 }]);
    setNewName('');
  };

  const openQuestion = (ci: number, qi: number) => {
    setOpen({ ci, qi });
    setAnswering(turn);
    setTried([]);
    setResult(null);
  };

  const addScore = (ti: number, delta: number) =>
    setTeams((prev) => prev.map((t, i) => (i === ti ? { ...t, score: t.score + delta } : t)));

  const correct = (price: number) => {
    addScore(answering, price);
    setResult('ok');
  };

  const wrong = (price: number) => {
    addScore(answering, -price);
    const nowTried = [...tried, answering];
    setTried(nowTried);
    let next = -1;
    for (let step = 1; step <= teams.length; step++) {
      const cand = (answering + step) % teams.length;
      if (!nowTried.includes(cand)) { next = cand; break; }
    }
    if (next === -1) setResult('fail');
    else setAnswering(next);
  };

  const closeQuestion = () => {
    if (!open) return;
    const next = new Set(done);
    next.add(`${open.ci}-${open.qi}`);
    setDone(next);
    setOpen(null);
    setTurn((turn + 1) % teams.length);
    if (next.size >= total) setFinished(true);
  };

  if (!started) {
    return (
      <main className="container">
        <h2>{game.title}</h2>
        <p className="muted">Автор: {game.author || 'аноним'} · тем: {game.board.categories.length} · вопросов: {total}</p>
        <div className="card">
          <h3>Какие команды играют? (минимум 2)</h3>
          <div className="form-inline">
            <input value={newName} maxLength={20} placeholder="Название команды" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTeam()} />
            <button className="btn" onClick={addTeam}>Добавить</button>
          </div>
          <ul className="players">
            {teams.map((t, i) => (
              <li key={i}>{t.name} <button className="icon" onClick={() => setTeams(teams.filter((_, j) => j !== i))}>✕</button></li>
            ))}
          </ul>
          <button className="btn big" disabled={teams.length < 2} onClick={() => setStarted(true)}>Начать игру</button>
        </div>
      </main>
    );
  }

  if (finished) {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    return (
      <main className="container">
        <h2>Игра окончена 🏆</h2>
        <div className="card">
          <ol className="results">
            {sorted.map((t, i) => (
              <li key={i} className={i === 0 ? 'winner' : ''}><span>{t.name}</span><strong>{t.score}</strong></li>
            ))}
          </ol>
          <a href={`#/g/${group}`} className="btn">В архив</a>
        </div>
      </main>
    );
  }

  const q = open ? game.board.categories[open.ci].questions[open.qi] : null;

  return (
    <main className="container wide">
      <h2>{game.title}</h2>
      <p className="turn-note">Выбирает вопрос: {teams[turn].name}</p>
      <div className="board" style={{ gridTemplateColumns: `repeat(${game.board.categories.length}, minmax(110px, 1fr))` }}>
        {game.board.categories.map((c, ci) => (
          <div key={`h${ci}`} className="board-head">{c.name}</div>
        ))}
        {Array.from({ length: maxRows }).flatMap((_, qi) =>
          game.board.categories.map((c, ci) => {
            const qq = c.questions[qi];
            if (!qq) return <div key={`${ci}-${qi}`} className="cell empty" />;
            const isDone = done.has(`${ci}-${qi}`);
            return (
              <button key={`${ci}-${qi}`} className={`cell ${isDone ? 'done' : ''}`} disabled={isDone} onClick={() => openQuestion(ci, qi)}>
                {isDone ? '' : qq.price}
              </button>
            );
          })
        )}
      </div>

      <div className="scoreboard">
        {teams.map((t, i) => (
          <div key={i} className={`score ${i === turn ? 'turn' : ''}`}><span>{t.name}</span><strong>{t.score}</strong></div>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setFinished(true)}>Завершить игру</button>

      {open && q && (
        <div className="modal">
          <div className="modal-box">
            <div className="modal-meta">{game.board.categories[open.ci].name} · {q.price}</div>
            {q.text && <p className="modal-q">{q.text}</p>}
            <MediaView media={q.media} />
            {q.options && (
              <div className="opt-list">
                {q.options.map((o, i) => (
                  <div key={i} className={`opt-item ${result && i === q.correct ? 'correct' : ''}`}>{String.fromCharCode(65 + i)}. {o}</div>
                ))}
              </div>
            )}

            {result === null ? (
              <>
                <p className="answering">Отвечает: {teams[answering].name}</p>
                <div className="row-btns">
                  <button className="btn ok" onClick={() => correct(q.price)}>Верно +{q.price}</button>
                  <button className="btn bad" onClick={() => wrong(q.price)}>Неверно −{q.price}</button>
                  <button className="btn ghost" onClick={() => setResult('fail')}>Никто не знает</button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-a">{result === 'ok' ? `✅ ${teams[answering].name}: верно!` : '❌ Никто не ответил'}</p>
                <p className="modal-a">Ответ: {q.answer}</p>
                <button className="btn big" onClick={closeQuestion}>Дальше → ход команды «{teams[(turn + 1) % teams.length].name}»</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
