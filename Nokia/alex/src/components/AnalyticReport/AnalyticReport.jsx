import { useState, useEffect } from "react";
import MultiSelect from "../MultiSelect/MultiSelect";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import { statusColor, priorityColor } from "../../constants";
import "./AnalyticReport.css";

const EMPTY_STATS = {
  total: 0, open: 0, inProgress: 0, pending: 0, critical: 0,
  avgResolutionHours: null, avgClosureHours: null, slaBreach: 0,
  statusData: [], priorityData: [], companyData: [], teamData: [], serviceData: [], projectData: [],
};

function AnalyticReport({ darkMode }) {
  const dm = darkMode;
  const cardBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const mutedColor = dm ? "#64748b" : "#94a3b8";
  const borderColor = dm ? "#334155" : "#e2e8f0";

  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterCompany, setFilterCompany] = useState([]);
  const [filterTeam, setFilterTeam] = useState([]);

  const [filterOptions, setFilterOptions] = useState({ status: [], priority: [], company: [], team: [] });
  const [stats, setStats] = useState(EMPTY_STATS);

  const [actionLoading, setActionLoading] = useState(false);
  const simulateLoading = () => {
    setActionLoading(true);
    const ms = 1200 + Math.random() * 1800;
    setTimeout(() => setActionLoading(false), ms);
  };

  const currentFilters = () => ({
    status: filterStatus.length > 0 ? filterStatus : null,
    priority: filterPriority.length > 0 ? filterPriority : null,
    company: filterCompany.length > 0 ? filterCompany : null,
    team: filterTeam.length > 0 ? filterTeam : null,
  });

  const fetchStats = (filters) => {
    fetch("http://localhost:5000/tickete/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) { console.error("Eroare /tickete/stats:", data.error); setStats(EMPTY_STATS); }
        else setStats({ ...EMPTY_STATS, ...data });
      })
      .catch(err => { console.error("Could not connect to /tickete/stats:", err); setStats(EMPTY_STATS); });
  };

  useEffect(() => {
    fetch("http://localhost:5000/tickete/filter-options")
      .then(res => res.json())
      .then(data => { if (data.error) console.error("Eroare /tickete/filter-options:", data.error); setFilterOptions(data); })
      .catch(err => console.error("Could not connect to /tickete/filter-options:", err));
    fetchStats(currentFilters());
  }, []);

  const toggle = (current, setCurrent, value, field) => {
    let nou;
    if (value === null) { nou = []; } else {
      nou = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
    }
    setCurrent(nou);
    simulateLoading();
    const filters = currentFilters();
    filters[field] = nou.length > 0 ? nou : null;
    fetchStats(filters);
  };

  const resetReportFilters = () => {
    simulateLoading();
    setFilterStatus([]); setFilterPriority([]); setFilterCompany([]); setFilterTeam([]);
    fetchStats({ status: null, priority: null, company: null, team: null });
  };

  const formatDuration = (hours) => {
    if (hours === null || hours === undefined || Number.isNaN(hours)) return "N/A";
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}z`;
  };

  const StatCard = ({ title, items, colorMap }) => (
    <div className="analytic-card" style={{ backgroundColor: cardBg }}>
      <h3 className="analytic-card-title" style={{ color: textColor }}>{title}</h3>
      {items.length === 0 ? (
        <p className="analytic-no-data" style={{ color: mutedColor }}>No data.</p>
      ) : items.map(({ name, value }) => (
        <div key={name} className="analytic-stat-row">
          <div className="analytic-stat-row-top">
            <span className="analytic-stat-label" style={{ color: textColor }}>{name}</span>
            <span className="analytic-stat-value" style={{ color: colorMap?.[name] || textColor }}>{value}</span>
          </div>
          <div className="analytic-bar-track" style={{ backgroundColor: borderColor }}>
            <div className="analytic-bar-fill" style={{ backgroundColor: colorMap?.[name] || "#3b82f6", width: `${(value / stats.total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="analytic-container" style={{ height: "calc(100vh - 8.33vw)", position: "relative" }}>
      {actionLoading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}
      <div className="analytic-header">
        <h2 className="analytic-page-title" style={{ color: textColor }}>Analytic Report</h2>

        <div className="analytic-filters" style={{ backgroundColor: cardBg }}>
          <MultiSelect darkMode={dm} label="Status" value={filterStatus} options={filterOptions.status}
            onChange={v => toggle(filterStatus, setFilterStatus, v, "status")} />
          <MultiSelect darkMode={dm} label="Priority" value={filterPriority} options={filterOptions.priority}
            onChange={v => toggle(filterPriority, setFilterPriority, v, "priority")} />
          <MultiSelect darkMode={dm} label="Company" value={filterCompany} options={filterOptions.company}
            onChange={v => toggle(filterCompany, setFilterCompany, v, "company")} />
          <MultiSelect darkMode={dm} label="Team" value={filterTeam} options={filterOptions.team}
            onChange={v => toggle(filterTeam, setFilterTeam, v, "team")} />
          <button className="analytic-reset-btn" onClick={resetReportFilters}>Reset Filters</button>
        </div>

        <p className="analytic-count" style={{ color: mutedColor }}>{stats.total} tickets</p>

        <div className="analytic-kpi-grid">
          {[
            { label: "Total Tickets", value: stats.total, color: "#3b82f6" },
            { label: "Open", value: stats.open, color: "#3b82f6" },
            { label: "In Progress", value: stats.inProgress, color: "#f59e0b" },
            { label: "Pending", value: stats.pending, color: "#8b5cf6" },
            { label: "Critical", value: stats.critical, color: "#ef4444" },
            { label: "Avg Resolution Time", value: formatDuration(stats.avgResolutionHours), color: "#06b6d4" },
            { label: "Avg Closure Time", value: formatDuration(stats.avgClosureHours), color: "#0ea5e9" },
            { label: "SLA Breach", value: stats.slaBreach, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} className="analytic-kpi-card" style={{ backgroundColor: cardBg, borderTop: `0.21vw solid ${color}` }}>
              <div className="analytic-kpi-value" style={{ color }}>{value}</div>
              <div className="analytic-kpi-label" style={{ color: mutedColor }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="analytic-scroll">
        {stats.total === 0 ? (
          <div className="analytic-card analytic-empty" style={{ backgroundColor: cardBg, color: mutedColor }}>
            No tickets match the selected filters.
          </div>
        ) : (
          <>
            <div className="analytic-stat-grid">
              <StatCard title="Tickets by Status" items={stats.statusData} colorMap={statusColor} />
              <StatCard title="Tickets by Priority" items={stats.priorityData} colorMap={priorityColor} />
            </div>
            <div className="analytic-stat-grid">
              <StatCard title="Tickets by Company" items={stats.companyData} />
              <StatCard title="Tickets by Team" items={stats.teamData} />
            </div>
            <div className="analytic-stat-grid">
              <StatCard title="Tickets by Service" items={stats.serviceData} />
              <StatCard title="Tickets by Project" items={stats.projectData} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalyticReport;