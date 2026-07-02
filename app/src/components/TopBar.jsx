export default function TopBar({ activeTab, onTabChange }) {
  return (
    <div className="topbar" data-shape-mask>
      <span className="topbar-title">Dashboard</span>
      <div className="tab-group">
        <button
          className={`tab-btn${activeTab === 'ask' ? ' active' : ''}`}
          onClick={() => onTabChange('ask')}
        >
          💬 Ask
        </button>
        <button
          className={`tab-btn${activeTab === 'wiki' ? ' active' : ''}`}
          onClick={() => onTabChange('wiki')}
        >
          📚 Wiki
        </button>
        <button
          className={`tab-btn${activeTab === 'code' ? ' active' : ''}`}
          onClick={() => onTabChange('code')}
        >
          💻 Code
        </button>
      </div>
    </div>
  );
}
