import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { GameRow, GroupCode, groupName } from '../types';

type Item = Pick<GameRow, 'id' | 'title' | 'author' | 'created_at'>;

export default function Archive({ group }: { group: GroupCode }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(null);
    supabase
      .from('games')
      .select('id,title,author,created_at')
      .eq('group_code', group)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setItems(data as Item[]);
      });
  }, [group]);

  return (
    <main className="container">
      <h2>Архив группы {groupName(group)}</h2>
      {error && <p className="error">Не удалось загрузить: {error}</p>}
      {!items && !error && <p>Загрузка…</p>}
      {items && items.length === 0 && (
        <div className="card empty">
          <p>Здесь пока пусто. Создай первую игру для группы {groupName(group)}!</p>
          <a href={`#/g/${group}/new`} className="btn">Создать игру</a>
        </div>
      )}
      <div className="archive-list">
        {items?.map((g) => (
          <a key={g.id} href={`#/g/${group}/play/${g.id}`} className="card archive-item">
            <strong>{g.title}</strong>
            <span>Автор: {g.author || 'аноним'}</span>
            <span className="muted">{new Date(g.created_at).toLocaleString('ru-RU')}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
