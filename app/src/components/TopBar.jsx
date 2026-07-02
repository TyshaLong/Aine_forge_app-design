export default function TopBar() {
  return (
    <div className="topbar" data-shape-mask>
      <span className="topbar-title">Dashboard</span>
      <div className="tab-group">
        <a href="/ask" className="tab-btn active">💬 Ask</a>
        <a href="/wiki" className="tab-btn">📚 Wiki</a>
      </div>
    </div>
  );
}
