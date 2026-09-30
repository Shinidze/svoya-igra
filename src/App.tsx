import { useEffect, useState } from 'react';
import { GROUPS, groupName, GroupCode } from './types';
import Editor from './pages/Editor';
import Archive from './pages/Archive';
import Play from './pages/Play';

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function Home() {
  return (
    <main className="container">
      <h1 className="hero">Своя игра</h1>
      <p className="lead">Собери свою игру с темами, вопросами и ценами. Выбери свою группу, чтобы игры не путались.</p>
      <div className="group-grid">
        {GROUPS.map((g) => (
          <a key={g.code} href={`#/g/${g.code}`} className="group-card">
            <span className="group-emoji">{g.emoji}</span>
            <span className="group-name">{g.name}</span>
            <span className="group-text">{g.text}</span>
          </a>
        ))}
      </div>
    </main>
  );
}

export default function App() {
  const hash = useHash();
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);

  let page = <Home />;
  let group: GroupCode | null = null;

  if (parts[0] === 'g' && GROUPS.some((g) => g.code === parts[1])) {
    group = parts[1] as GroupCode;
    if (parts[2] === 'new') page = <Editor group={group} />;
    else if (parts[2] === 'play' && parts[3]) page = <Play group={group} id={parts[3]} />;
    else page = <Archive group={group} />;
  }

  return (
    <>
      <div className="leaves" aria-hidden="true">
        {['🍁', '🍂', '🍁', '🍂', '🍁', '🍂', '🍁'].map((l, i) => (
          <span key={i} style={{ left: `${8 + i * 14}%`, animationDelay: `${i * 2.3}s`, animationDuration: `${14 + (i % 3) * 4}s` }}>{l}</span>
        ))}
      </div>
      <header className="topbar">
        <a href="#/" className="logo">🍁 Своя игра</a>
        {group && (
          <nav>
            <span className="badge">{groupName(group)}</span>
            <a href={`#/g/${group}`}>Архив</a>
            <a href={`#/g/${group}/new`} className="btn small">Создать игру</a>
          </nav>
        )}
      </header>
      {page}
    </>
  );
}
