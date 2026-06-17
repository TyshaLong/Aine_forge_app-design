const PlusIcon = (props) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const REPOS = [
  { name: 'advent-of-code-2025', active: true },
  { name: 'karlhadwen/todoist', active: false },
];

const NAV = [
  {
    label: 'Ask', href: '/ask', active: true,
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    label: 'Wiki', href: '/wiki', active: false,
    icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  },
  {
    label: 'Usage', href: '/usage', active: false,
    icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar" data-shape-mask>
      <div className="sidebar-logo">
        <a href="/" className="font-display">
          <span style={{ color: '#ffffff' }}>Forge</span>
          <span style={{ color: 'var(--color-yellow)' }}>.</span>
        </a>
      </div>

      <button className="new-chat-btn">
        <PlusIcon />
        New Chat
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Repos</div>
        {REPOS.map((repo) => (
          <a key={repo.name} href="#" className={`sidebar-item${repo.active ? ' active' : ''}`}>
            <span className="dot" />
            <span className="label">{repo.name}</span>
            <span className="badge">indexed</span>
          </a>
        ))}
        <a href="#" className="sidebar-item" style={{ color: 'var(--color-yellow)', gap: 8 }}>
          <PlusIcon width="14" height="14" />
          Add repo...
        </a>
      </div>

      <div className="sidebar-section" style={{ marginTop: 8 }}>
        <div className="sidebar-section-label">Navigation</div>
        {NAV.map((item) => (
          <a key={item.label} href={item.href} className={`sidebar-item${item.active ? ' active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            {item.label}
          </a>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="upgrade-card">
          <div className="title">Forge Pro Access</div>
          <p>Unlimited queries and private repo support.</p>
          <button className="upgrade-btn">Upgrade Now</button>
        </div>
      </div>
    </aside>
  );
}
