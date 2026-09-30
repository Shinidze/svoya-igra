import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { GameRow, GroupCode } from '../types';

interface Player {
  name: string;
  score: number;
}

export default function Play({ group, id }: { group: GroupCode; id: string }) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ ci: number; qi: number } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
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

  const addPlayer = () => {
    const name = newName.trim();
    if (!name || players.length >= 8) return;
    setPlayers([...players, { name, score: 0 }]);
    setNewName('');
  };

  const closeQuestion = (pi?: number, delta?: number) => {
    if (!open) return;
    if (pi !== undefined && delta !== undefined) {
      setPlayers((prev) => prev.map((p, i) => (i === pi ? { ...p, score: p.score + delta } : p)));
    }
  };

  const finishQuestion = () => {
    if (!open) return;
    const next = new Set(done);
    next.add(`${open.ci}-${open.qi}`);
    setDone(next);
    setOpen(null);
    setShowAnswer(false);
    if (next.size >= total) setFinished(true);
  };

  if (!started) {
    return (
      <main className="container">
        <h2>{game.title}</h2>
        <p className="muted">Автор: {game.author || 'аноним'} · тем: {game.board.categories.length} · вопросов: {total}</p>
        <div className="card">
          <h3>Кто играет?</h3>
          <div className="form-inline">
            <input value={newName} maxLength={20} placeholder="Имя игрока" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} />
            <button className="btn" onClick={addPlayer}>Добавить</button>
          </div>
          <ul className="players">
            {players.map((p, i) => (
              <li key={i}>{p.name} <button className="icon" onClick={() => setPlayers(players.filter((_, j) => j !== i))}>✕</button></li>
            ))}
          </ul>
          <button className="btn big" disabled={players.length === 0} onClick={() => setStarted(true)}>Начать игру</button>
        </div>
      </main>
    );
  }

  if (finished) {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    return (
      <main className="container">
        <h2>Игра окончена 🏆</h2>
        <div className="card">
          <ol className="results">
            {sorted.map((p, i) => (
              <li key={i} className={i === 0 ? 'winner' : ''}><span>{p.name}</span><strong>{p.score}</strong></li>
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
              <button key={`${ci}-${qi}`} className={`cell ${isDone ? 'done' : ''}`} disabled={isDone} onClick={() => setOpen({ ci, qi })}>
                {isDone ? '' : qq.price}
              </button>
            );
          })
        )}
      </div>

      <div className="scoreboard">
        {players.map((p, i) => (
          <div key={i} className="score"><span>{p.name}</span><strong>{p.score}</strong></div>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setFinished(true)}>Завершить игру</button>

      {open && q && (
        <div className="modal">
          <div className="modal-box">
            <div className="modal-meta">{game.board.categories[open.ci].name} · {q.price}</div>
            <p className="modal-q">{q.text}</p>
            {showAnswer ? <p className="modal-a">Ответ: {q.answer}</p> : <button className="btn" onClick={() => setShowAnswer(true)}>Показать ответ</button>}
            <div className="judge">
              {players.map((p, i) => (
                <div key={i} className="judge-row">
                  <span>{p.name}</span>
                  <button className="btn small ok" onClick={() => closeQuestion(i, q.price)}>+{q.price}</button>
                  <button className="btn small bad" onClick={() => closeQuestion(i, -q.price)}>−{q.price}</button>
                </div>
              ))}
            </div>
            <button className="btn big" onClick={finishQuestion}>Закрыть вопрос</button>
          </div>
        </div>
      )}
    </main>
  );
}
