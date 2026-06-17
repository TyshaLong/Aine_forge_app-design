import { useEffect, useRef, useState } from 'react';
import { REPOS, repoUrl } from '../lib/repos.js';

const ExternalIcon = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

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
                key={r.full}
                className={repo === r.full ? 'selected' : ''}
                onClick={() => { onSelect(r.full); setOpen(false); }}
              >
                <span className="dropdown-dot" />
                {r.full}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="dropdown-meta"
                  title={`Open ${r.full} on GitHub`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  indexed <ExternalIcon style={{ opacity: 0.7 }} />
                </a>
              </button>
            ))}
            <button className="add-repo">+ Add repo...</button>
          </div>
        )}
      </div>

      {repo !== 'All repos' && (
        <a
          href={repoUrl(repo)}
          target="_blank"
          rel="noreferrer"
          className="repo-label"
          title={`Open ${repo} on GitHub`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
        >
          <ExternalIcon style={{ opacity: 0.6 }} /> GitHub
        </a>
      )}
    </div>
  );
}
