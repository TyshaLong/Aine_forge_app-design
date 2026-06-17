import { useEffect, useRef, useState } from 'react';

const REPOS = [
  { name: 'TyshaLong/advent-of-code-2025' },
  { name: 'karlhadwen/todoist' },
];

export default function RepoBar({ repo, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div className="repo-bar" data-shape-mask>
      <span className="repo-label">Knowledge Repo:</span>
      <div ref={ref} style={{ position: 'relative' }}>
        <button className="repo-toggle" onClick={() => setOpen((o) => !o)}>
          <span className="dropdown-dot" />
          {repo}
          <svg style={{ width: 14, height: 14, opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="repo-dropdown">
            <button onClick={() => { onSelect('All repos'); setOpen(false); }}>All repos</button>
            {REPOS.map((r) => (
              <button
                key={r.name}
                className={repo === r.name ? 'selected' : ''}
                onClick={() => { onSelect(r.name); setOpen(false); }}
              >
                <span className="dropdown-dot" />
                {r.name}
                <span className="dropdown-meta">indexed</span>
              </button>
            ))}
            <button className="add-repo">+ Add repo...</button>
          </div>
        )}
      </div>
    </div>
  );
}
