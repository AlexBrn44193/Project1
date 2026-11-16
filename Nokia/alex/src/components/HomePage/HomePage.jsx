import { useState, useEffect } from "react";
import HomeLoginWidget from "../HomeLoginWidget/HomeLoginWidget";
import "./HomePage.css";

function HomePage({ darkMode, onNavigate, onNewTicket, stats, canEdit, currentUser, onLoginSuccess, onLogout }) {
  const dm = darkMode;
  const textColor = dm ? "white" : "#1e293b";
  const mutedColor = dm ? "#94a3b8" : "#64748b";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const pad2 = (n) => String(n).padStart(2, "0");
  const timeLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

  const cards = [
    {
      id: "tickets", title: "Tickets",
      description: "View, filter, sort and manage all incidents.",
    },
    {
      id: "analytic", title: "Analytic Report",
      description: "Detailed statistics: status, priority, team, SLA.",
    },
    {
      id: "graphic", title: "Graphic Report",
      description: "Visual charts: distributions, monthly trends, KPIs.",
    },
  ];

  return (
    <div className="home-container">
      <div className="home-login-corner">
        <HomeLoginWidget currentUser={currentUser} onLoginSuccess={onLoginSuccess} onLogout={onLogout} />
      </div>

      <span className="home-date" style={{ color: mutedColor }}>{dateLabel} · <span className="home-clock">{timeLabel}</span></span>

      <div className="home-hero">
        <h1 className="home-title" style={{ color: textColor }}>Operations Tracking Dashboard</h1>
        <p className="home-subtitle" style={{ color: mutedColor }}>
          Real-time monitoring and analysis of operational incidents
        </p>
        {canEdit && <button className="home-cta" onClick={onNewTicket}>New Ticket</button>}
      </div>

      <div className="home-cards">
        {cards.map(c => (
          <div
            key={c.id}
            className="home-card"
            onClick={() => onNavigate(c.id)}
            style={{ backgroundColor: dm ? "#1e293b" : "white" }}
          >
            <h3 style={{ color: textColor }}>{c.title}</h3>
            <p style={{ color: mutedColor }}>{c.description}</p>
            <span className="home-card-arrow" style={{ color: textColor }}>Open →</span>
          </div>
        ))}
      </div>

      {stats && (
        <div className="home-stats">
          <div className="home-stat">
            <span className="home-stat-value" style={{ color: "#3b82f6" }}>{stats.total}</span>
            <span className="home-stat-label" style={{ color: mutedColor }}>Total Tickets</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value" style={{ color: "#3b82f6" }}>{stats.open}</span>
            <span className="home-stat-label" style={{ color: mutedColor }}>Open</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value" style={{ color: "#f59e0b" }}>{stats.inProgress}</span>
            <span className="home-stat-label" style={{ color: mutedColor }}>In Progress</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value" style={{ color: "#ef4444" }}>{stats.critical}</span>
            <span className="home-stat-label" style={{ color: mutedColor }}>Critical</span>
          </div>
          <div className="home-stat">
            <span className="home-stat-value" style={{ color: "#dc2626" }}>{stats.slaBreach}</span>
            <span className="home-stat-label" style={{ color: mutedColor }}>SLA Breach</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;