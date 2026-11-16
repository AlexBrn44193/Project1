import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import MultiSelect from "../MultiSelect/MultiSelect";
import CustomDatePicker from "../CustomDatePicker/CustomDatePicker";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import Badge from "../Badge/Badge";
import { statusColor, priorityColor, priorityOrder, statusOrder } from "../../constants";
import "./TicketsPage.css";

function TicketsPage({ tickete, allTickete, darkMode, canEdit, canDelete, canImport, onNewTicket, onEditTicket, onDeleteTicket, onImport, fetchTickets, quickFilter }) {
  const dm = darkMode;
  const cardBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const borderColor = dm ? "#334155" : "#e2e8f0";
  const mutedColor = dm ? "#64748b" : "#94a3b8";

  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterTeam, setFilterTeam] = useState([]);
  const [filterPerson, setFilterPerson] = useState([]);
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterSlaBreach, setFilterSlaBreach] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const searchTimeout = useRef(null);
  useEffect(() => {
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, []);


  const [sortRules, setSortRules] = useState([]);

  const [actionLoading, setActionLoading] = useState(false);
  const simulateLoading = () => {
    setActionLoading(true);
    const ms = 1200 + Math.random() * 1800;
    setTimeout(() => setActionLoading(false), ms);
  };

  const unique = (field) => [...new Set(allTickete.map(t => t[field]).filter(Boolean))].sort();

  const currentFilters = () => ({
    status: filterStatus, priority: filterPriority, team: filterTeam, person: filterPerson,
    date_start: filterDateStart, date_end: filterDateEnd, search: searchText, sla_breach: filterSlaBreach,
  });

  useEffect(() => {
    if (!quickFilter) return;
    if (quickFilter.type === "status") {
      setFilterStatus([quickFilter.value]);
      simulateLoading();
      fetchTickets({ status: [quickFilter.value] });
    } else if (quickFilter.type === "team") {
      setFilterTeam([quickFilter.value]);
      simulateLoading();
      fetchTickets({ team: [quickFilter.value] });
    }
    setPage(1);

  }, [quickFilter]);


  const handleSearchChange = (value) => {
    setSearchText(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      simulateLoading();
      fetchTickets({ ...currentFilters(), search: value });
    }, 1000);
  };


  const handleSort = (field) => {
    simulateLoading();
    setSortRules(prev => {
      const idx = prev.findIndex(r => r.field === field);
      if (idx === -1) return [...prev, { field, direction: "asc" }];
      if (prev[idx].direction === "asc") {
        const copy = [...prev];
        copy[idx] = { field, direction: "desc" };
        return copy;
      }
      return prev.filter(r => r.field !== field);
    });
  };

  const resetSort = () => {
    simulateLoading();
    setSortRules([]);
  };

  const compareByField = (a, b, field) => {
    let valA = a[field];
    let valB = b[field];
    if (field === "PRIORITY") {
      valA = priorityOrder[valA] ?? 99;
      valB = priorityOrder[valB] ?? 99;
    } else if (field === "STATUS") {
      valA = statusOrder[valA] ?? 99;
      valB = statusOrder[valB] ?? 99;
    } else if (field === "SUBMIT_DATETIME" || field === "ESTIMATED_RESOLUTION_DATETIME") {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else {
      valA = (valA ?? "").toString().toLowerCase();
      valB = (valB ?? "").toString().toLowerCase();
    }
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  };

  const sortedTickete = [...tickete].sort((a, b) => {
    for (const rule of sortRules) {
      const cmp = compareByField(a, b, rule.field);
      if (cmp !== 0) return rule.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const totalPages = Math.ceil(tickete.length / perPage);
  const ticketsPage = sortedTickete.slice((page - 1) * perPage, page * perPage);

  const resetFilters = () => {
    simulateLoading();
    setFilterStatus([]); setFilterPriority([]); setFilterTeam([]);
    setFilterPerson([]); setFilterDateStart(""); setFilterDateEnd("");
    setSearchText(""); setFilterSlaBreach(false); setPage(1); fetchTickets({});
  };

  const exportExcel = () => {
    const data = tickete.map(t => ({
      "Ticket": t.TICKET_NUMBER, "Status": t.STATUS, "Priority": t.PRIORITY,
      "Company": t.COMPANY, "Project": t.PROJECT, "Team": t.TEAM,
      "Assigned Person": t.ASSIGNED_PERSON, "Service": t.SERVICE, "Description": t.DESCRIPTION,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), "tickets.xlsx");
  };

const columns = [
  { label: "Ticket", field: "TICKET_NUMBER" },
  { label: "Status", field: "STATUS" },
  { label: "Priority", field: "PRIORITY" },
  { label: "Deadline", field: "ESTIMATED_RESOLUTION_DATETIME" },
  { label: "Company", field: null },
  { label: "Project", field: null },
  { label: "Team", field: null },
  { label: "Assigned Person", field: null },
  { label: "Service", field: null },
  { label: "Description", field: null },
  { label: "Actions", field: null },
];

  const isOverdue = (t) =>
    t.ESTIMATED_RESOLUTION_DATETIME && !t.RESOLVED_DATETIME && new Date() > new Date(t.ESTIMATED_RESOLUTION_DATETIME);

  return (
    <>
      <div className="tickets-page-header">
        <h2 className="tickets-page-title" style={{ color: textColor }}>Tickets</h2>
        <div className="tickets-header-buttons">
          {canEdit && <button className="tickets-btn tickets-btn-dark" onClick={onNewTicket}>New Ticket</button>}
          {canImport && <button className="tickets-btn tickets-btn-purple" onClick={() => setShowImport(prev => !prev)}>Import Excel</button>}
          <button className="tickets-btn tickets-btn-green" onClick={exportExcel}>Export Excel</button>
        </div>
      </div>
      <p className="tickets-count" style={{ color: mutedColor }}>{tickete.length} of {allTickete.length} tickets</p>

      {showImport && (
        <div
          className="tickets-import-zone"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onImport(file, currentFilters());
          }}
          style={{
            borderColor: dragOver ? "#7c3aed" : borderColor,
            backgroundColor: dragOver ? "#f5f3ff" : cardBg,
          }}
        >
          <p className="tickets-import-text" style={{ color: dragOver ? "#7c3aed" : mutedColor }}>
            {dragOver ? "Drop the file!" : "Drag Excel file here or"}
          </p>
          <input type="file" accept=".xlsx" style={{ display: "none" }} id="fileInput"
            onChange={e => { if (e.target.files[0]) onImport(e.target.files[0], currentFilters()); }} />
          <label htmlFor="fileInput" className="tickets-btn tickets-btn-purple tickets-import-select-btn">
            Select file
          </label>
        </div>
      )}

      <div className="tickets-filters" style={{ backgroundColor: cardBg }}>
        <MultiSelect darkMode={dm} label="Status" value={filterStatus} options={unique("STATUS")} onChange={v => {
          const nou = v === null ? [] : filterStatus.includes(v) ? filterStatus.filter(x => x !== v) : [...filterStatus, v];
          simulateLoading();
          setFilterStatus(nou); setPage(1);
          fetchTickets({ ...currentFilters(), status: nou });
        }} />
        <MultiSelect darkMode={dm} label="Priority" value={filterPriority} options={unique("PRIORITY")} onChange={v => {
          const nou = v === null ? [] : filterPriority.includes(v) ? filterPriority.filter(x => x !== v) : [...filterPriority, v];
          simulateLoading();
          setFilterPriority(nou); setPage(1);
          fetchTickets({ ...currentFilters(), priority: nou });
        }} />
        <MultiSelect darkMode={dm} label="Team" value={filterTeam} options={unique("TEAM")} onChange={v => {
          const nou = v === null ? [] : filterTeam.includes(v) ? filterTeam.filter(x => x !== v) : [...filterTeam, v];
          simulateLoading();
          setFilterTeam(nou); setPage(1);
          fetchTickets({ ...currentFilters(), team: nou });
        }} />
        <MultiSelect darkMode={dm} label="Assigned Person" value={filterPerson} options={unique("ASSIGNED_PERSON")} onChange={v => {
          const nou = v === null ? [] : filterPerson.includes(v) ? filterPerson.filter(x => x !== v) : [...filterPerson, v];
          simulateLoading();
          setFilterPerson(nou); setPage(1);
          fetchTickets({ ...currentFilters(), person: nou });
        }} />
        <CustomDatePicker darkMode={dm} label="Start Date" value={filterDateStart} onChange={val => {
          simulateLoading();
          setFilterDateStart(val); setPage(1);
          fetchTickets({ ...currentFilters(), date_start: val });
        }} />
        <CustomDatePicker darkMode={dm} label="End Date" value={filterDateEnd} onChange={val => {
          simulateLoading();
          setFilterDateEnd(val); setPage(1);
          fetchTickets({ ...currentFilters(), date_end: val });
        }} />
        <div className="tickets-filter-field">
          <label className="tickets-filter-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Search</label>
          <input
            type="text"
            placeholder="Ticket # or description..."
            value={searchText}
            onChange={e => handleSearchChange(e.target.value)}
            className="tickets-search-input"
            style={{ backgroundColor: cardBg, color: textColor, border: `0.05vw solid ${borderColor}` }}
          />
        </div>
        <div className="tickets-filter-field">
          <label className="tickets-filter-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>SLA</label>
          <button
            className="tickets-sla-btn"
            onClick={() => {
              const nou = !filterSlaBreach;
              simulateLoading();
              setFilterSlaBreach(nou); setPage(1);
              fetchTickets({ ...currentFilters(), sla_breach: nou });
            }}
            style={{
              backgroundColor: filterSlaBreach ? "#dc2626" : cardBg,
              color: filterSlaBreach ? "white" : textColor,
              border: `0.05vw solid ${filterSlaBreach ? "#dc2626" : borderColor}`,
            }}
          >
            {filterSlaBreach ? "SLA Breach only" : "SLA Breach"}
          </button>
        </div>
        <button className="tickets-btn tickets-btn-red" onClick={resetFilters}>Reset Filters</button>
      </div>

      <div className="tickets-table-container" style={{ position: "relative" }}>
        {actionLoading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}
        {sortRules.length > 0 && (
          <div className="tickets-reset-sort-row">
            <button className="tickets-btn tickets-btn-red tickets-reset-sort-btn" onClick={resetSort}>
              Reset Sort
            </button>
          </div>
        )}
        <div className="tickets-table-scroll">
          <table className="tickets-table" style={{ backgroundColor: cardBg }}>
            <thead>
              <tr style={{ backgroundColor: dm ? "#0f172a" : "#1e293b", color: "white" }}>
                {columns.map(col => {
                  const ruleIndex = col.field ? sortRules.findIndex(r => r.field === col.field) : -1;
                  const rule = ruleIndex !== -1 ? sortRules[ruleIndex] : null;
                  return (
                    <th
                      key={col.label}
                      className={col.field ? "tickets-th-sortable" : ""}
                      onClick={() => col.field && handleSort(col.field)}
                      style={{ backgroundColor: dm ? "#0f172a" : "#1e293b" }}
                    >
                      {col.label}
                      {rule && (
                        <span className="tickets-sort-arrow">
                          {rule.direction === "asc" ? "▲" : "▼"}
                          {sortRules.length > 1 && <span className="tickets-sort-badge">{ruleIndex + 1}</span>}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ticketsPage.length === 0 ? (
                <tr><td colSpan={11} className="tickets-empty-cell" style={{ color: mutedColor }}>No tickets found.</td></tr>
              ) : (
                ticketsPage.map((t, i) => (
                  <tr key={t.ID} style={{ backgroundColor: i % 2 === 0 ? cardBg : (dm ? "#162032" : "#f8fafc"), borderBottom: `0.05vw solid ${borderColor}` }}>
                    <td style={{ fontWeight: "bold", color: textColor }}>{t.TICKET_NUMBER}</td>
                    <td><Badge text={t.STATUS} colorMap={statusColor} /></td>
                    <td><Badge text={t.PRIORITY} colorMap={priorityColor} /></td>
                    <td style={{
                      color: isOverdue(t) ? "#ef4444" : textColor,
                      fontWeight: isOverdue(t) ? 700 : 400,
                    }}>
                      {t.ESTIMATED_RESOLUTION_DATETIME
                        ? new Date(t.ESTIMATED_RESOLUTION_DATETIME).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
                        : "—"}
                    </td>
                    <td style={{ color: textColor }}>{t.COMPANY}</td>
                    <td style={{ color: textColor }}>{t.PROJECT}</td>
                    <td style={{ color: textColor }}>{t.TEAM}</td>
                    <td style={{ color: textColor }}>{t.ASSIGNED_PERSON}</td>
                    <td style={{ color: textColor }}>{t.SERVICE}</td>
                    <td style={{ color: textColor }}>{t.DESCRIPTION}</td>
                    <td>
                      <div className="tickets-actions-cell">
                        {canEdit && <button className="tickets-btn tickets-btn-blue tickets-action-btn" onClick={() => onEditTicket(t)}>Edit</button>}
                        {canDelete && <button className="tickets-btn tickets-btn-red tickets-action-btn" onClick={() => onDeleteTicket(t.ID)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="tickets-pagination" style={{ backgroundColor: cardBg, borderColor }}>
          <div className="tickets-pagination-left">
            <span className="tickets-pagination-count" style={{ color: mutedColor }}>
              {tickete.length === 0 ? "0" : (page - 1) * perPage + 1}–{Math.min(page * perPage, tickete.length)} of {tickete.length}
            </span>
            <div className="tickets-per-page-group">
              <span className="tickets-per-page-label" style={{ color: mutedColor }}>Rows per page:</span>
              {[10, 25, 50, 100].map(n => (
                <button key={n} className="tickets-per-page-btn"
                  onClick={() => { setPerPage(n); setPage(1); }}
                  style={{
                    backgroundColor: perPage === n ? "#3b82f6" : cardBg,
                    color: perPage === n ? "white" : textColor,
                    borderColor,
                  }}>{n}</button>
              ))}
            </div>
          </div>
          <div className="tickets-pagination-right">
            <button className="tickets-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                backgroundColor: page === 1 ? (dm ? "#0f172a" : "#f8fafc") : cardBg,
                color: page === 1 ? mutedColor : textColor,
                borderColor,
                cursor: page === 1 ? "not-allowed" : "pointer",
              }}>‹</button>
            <span style={{ fontSize: "0.68vw", color: textColor }}>Page {page} of {totalPages || 1}</span>
            <button className="tickets-pagination-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              style={{
                backgroundColor: page === totalPages ? (dm ? "#0f172a" : "#f8fafc") : cardBg,
                color: page === totalPages ? mutedColor : textColor,
                borderColor,
                cursor: page === totalPages ? "not-allowed" : "pointer",
              }}>›</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default TicketsPage;