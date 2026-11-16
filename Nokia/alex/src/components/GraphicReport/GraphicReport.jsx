import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, ResponsiveContainer } from "recharts";
import MultiSelect from "../MultiSelect/MultiSelect";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import Modal from "../Modal/Modal";
import Badge from "../Badge/Badge";
import { statusColor, priorityColor } from "../../constants";
import "./GraphicReport.css";

const EMPTY_STATS = {
  total: 0, open: 0, inProgress: 0, pending: 0, critical: 0,
  avgResolutionHours: null, avgClosureHours: null, slaBreach: 0,
  statusData: [], priorityData: [], companyData: [], teamData: [], ticketsPerMonth: [],
};

function GraphicReport({ darkMode }) {
  const dm = darkMode;
  const cardBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const mutedColor = dm ? "#64748b" : "#94a3b8";
  const gridColor = dm ? "#334155" : "#e2e8f0";

  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterCompany, setFilterCompany] = useState([]);
  const [filterTeam, setFilterTeam] = useState([]);

 
  const [filterOptions, setFilterOptions] = useState({ status: [], priority: [], company: [], team: [] });

  const [stats, setStats] = useState(EMPTY_STATS);

  
  const [drillDown, setDrillDown] = useState(null); 
  const [drillTickets, setDrillTickets] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);

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
        else setStats(data);
      })
      .catch(err => { console.error("Nu s-a putut conecta la /tickete/stats:", err); setStats(EMPTY_STATS); });
  };

  useEffect(() => {
    fetch("http://localhost:5000/tickete/filter-options")
      .then(res => res.json())
      .then(data => { if (data.error) console.error("Eroare /tickete/filter-options:", data.error); setFilterOptions(data); })
      .catch(err => console.error("Nu s-a putut conecta la /tickete/filter-options:", err));
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

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#6b7280", "#8b5cf6", "#ef4444", "#f97316", "#22c55e"];

  const ChartCard = ({ title, children }) => (
    <div className="graphic-card">
      <h3 className="graphic-chart-title" style={{ color: textColor }}>{title}</h3>
      <div className="graphic-chart-body">
        {children}
      </div>
    </div>
  );

  const openDrillDown = (type, value) => {
    setDrillDown({ type, value });
    setDrillLoading(true);
    const fieldToFilter = { status: "status", priority: "priority", company: "company", team: "team" };
    const body = { status: null, priority: null, company: null, team: null };
    body[fieldToFilter[type]] = [value];
    fetch("http://localhost:5000/tickete/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) console.error("Eroare /tickete/search (drill-down):", data.error);
        setDrillTickets(Array.isArray(data) ? data : []);
        setDrillLoading(false);
      })
      .catch(err => { console.error("Could not connect to /tickete/search:", err); setDrillTickets([]); setDrillLoading(false); });
  };

  const exportDrillExcel = () => {
    const data = drillTickets.map(t => ({
      "Ticket": t.TICKET_NUMBER, "Status": t.STATUS, "Priority": t.PRIORITY,
      "Company": t.COMPANY, "Project": t.PROJECT, "Team": t.TEAM,
      "Assigned Person": t.ASSIGNED_PERSON, "Service": t.SERVICE, "Description": t.DESCRIPTION,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `tickets_${drillDown.type}_${drillDown.value}.xlsx`);
  };

  return (
    <div className="graphic-container" style={{ height: "calc(100vh - 8.33vw)", position: "relative" }}>
      {actionLoading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}
      <div className="graphic-header">
        <h2 className="graphic-page-title" style={{ color: textColor }}>Graphic Report</h2>

        <div className="graphic-filters" style={{ backgroundColor: cardBg }}>
          <MultiSelect darkMode={dm} label="Status" value={filterStatus} options={filterOptions.status}
            onChange={v => toggle(filterStatus, setFilterStatus, v, "status")} />
          <MultiSelect darkMode={dm} label="Priority" value={filterPriority} options={filterOptions.priority}
            onChange={v => toggle(filterPriority, setFilterPriority, v, "priority")} />
          <MultiSelect darkMode={dm} label="Company" value={filterCompany} options={filterOptions.company}
            onChange={v => toggle(filterCompany, setFilterCompany, v, "company")} />
          <MultiSelect darkMode={dm} label="Team" value={filterTeam} options={filterOptions.team}
            onChange={v => toggle(filterTeam, setFilterTeam, v, "team")} />
          <button className="graphic-reset-btn" onClick={resetReportFilters}>Reset Filters</button>
        </div>

        <p className="graphic-count" style={{ color: mutedColor }}>{stats.total} tickets</p>

        <div className="graphic-kpi-grid">
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
            <div key={label} className="graphic-kpi-card" style={{ backgroundColor: cardBg, borderTop: `0.21vw solid ${color}` }}>
              <div className="graphic-kpi-value" style={{ color }}>{value}</div>
              <div className="graphic-kpi-label" style={{ color: mutedColor }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="graphic-scroll">
        {stats.total === 0 ? (
          <div className="graphic-card graphic-empty" style={{ backgroundColor: cardBg, color: mutedColor }}>
            No tickets match the selected filters.
          </div>
        ) : (
          <>
            <div className="graphic-charts-grid">
              <ChartCard title="Status Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" outerRadius="72%" dataKey="value" cursor="pointer"
                      onClick={(entry) => openDrillDown("status", entry.name)}>
                      {stats.statusData.map((entry, index) => <Cell key={index} fill={statusColor[entry.name] || COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Priority Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.priorityData} cx="50%" cy="50%" outerRadius="72%" dataKey="value" cursor="pointer"
                      onClick={(entry) => openDrillDown("priority", entry.name)}>
                      {stats.priorityData.map((entry, index) => <Cell key={index} fill={priorityColor[entry.name] || COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <div className="graphic-charts-grid">
              <ChartCard title="Tickets by Company">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.companyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                    <YAxis tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer"
                      onClick={(entry) => openDrillDown("company", entry.name)} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Tickets by Team">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.teamData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                    <YAxis tick={{ fontSize: 11, fill: textColor }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} cursor="pointer"
                      onClick={(entry) => openDrillDown("team", entry.name)} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="Tickets per Month">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.ticketsPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} name="Tickets" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </div>

      {drillDown && (
        <Modal wide title={`${drillDown.type.charAt(0).toUpperCase() + drillDown.type.slice(1)}: ${drillDown.value} (${drillTickets.length})`} onClose={() => setDrillDown(null)} darkMode={dm}>
          <div className="graphic-drill-export-row">
            <button className="graphic-export-btn" onClick={exportDrillExcel} disabled={drillLoading}>Export Excel</button>
          </div>
          <div className="graphic-drill-table-container" style={{ position: "relative" }}>
            {drillLoading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}
            <div className="graphic-drill-table-scroll">
              <table className="graphic-drill-table" style={{ backgroundColor: cardBg }}>
                <thead>
                  <tr style={{ backgroundColor: dm ? "#0f172a" : "#1e293b", color: "white" }}>
                    <th>Ticket</th><th>Status</th><th>Priority</th><th>Company</th><th>Assigned Person</th><th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {drillTickets.length === 0 ? (
                    <tr><td colSpan={6} className="graphic-drill-empty" style={{ color: mutedColor }}>No tickets.</td></tr>
                  ) : drillTickets.map(t => (
                    <tr key={t.ID} style={{ borderBottom: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}` }}>
                      <td style={{ fontWeight: "bold", color: textColor }}>{t.TICKET_NUMBER}</td>
                      <td><Badge text={t.STATUS} colorMap={statusColor} /></td>
                      <td><Badge text={t.PRIORITY} colorMap={priorityColor} /></td>
                      <td style={{ color: textColor }}>{t.COMPANY}</td>
                      <td style={{ color: textColor }}>{t.ASSIGNED_PERSON}</td>
                      <td style={{ color: textColor }}>{t.DESCRIPTION}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default GraphicReport;