import "./Sidebar.css";

function Sidebar({ sidebarOpen, setSidebarOpen, sidebarBg, currentUser, currentPage, setCurrentPage, darkMode, setDarkMode, onLogout, navItems }) {
  const dm = darkMode;

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`} style={{ backgroundColor: sidebarBg }}>
        <div className="sidebar-header">
          <span className="sidebar-title">Ticketing</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <div className="sidebar-user">
          <span className="sidebar-user-name">{currentUser ? currentUser.username : "Guest"}</span>
          <span className="sidebar-user-role">{currentUser ? currentUser.role : "Viewer"}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`sidebar-nav-item ${currentPage === item.id ? "sidebar-nav-item-active" : ""}`}
              onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-darkmode-btn" onClick={() => setDarkMode(d => !d)} style={{
            backgroundColor: dm ? "#f1f5f9" : "rgba(255,255,255,0.15)",
            color: dm ? "#1e293b" : "white",
          }}>
            {dm ? "Light Mode" : "Dark Mode"}
          </button>
          {currentUser && (
            <button className="sidebar-logout-btn" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;