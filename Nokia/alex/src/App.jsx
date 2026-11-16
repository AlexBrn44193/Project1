import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";

import Sidebar from "./components/Sidebar/Sidebar";
import HomePage from "./components/HomePage/HomePage";
import TicketsPage from "./components/TicketsPage/TicketsPage";
import AnalyticReport from "./components/AnalyticReport/AnalyticReport";
import GraphicReport from "./components/GraphicReport/GraphicReport";
import Modal from "./components/Modal/Modal";
import TicketForm from "./components/TicketForm/TicketForm";
import ChatBot from "./components/ChatBot/ChatBot";
import ChatHistoryPage from "./components/ChatHistoryPage/ChatHistoryPage";
import UsersPage from "./components/UsersPage/UsersPage";
import { roleRank } from "./constants";
import { authFetch } from "./api";

const navItems = [
  { id: "home", label: "Home" },
  { id: "tickets", label: "Tickets" },
  { id: "analytic", label: "Analytic Report" },
  { id: "graphic", label: "Graphic Report" },
];

function App() {
  const [tickete, setTickete] = useState([]);
  const [allTickete, setAllTickete] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentPage, setCurrentPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dm = darkMode;
  const bg = dm ? "#0f172a" : "#f1f5f9";
  const sidebarBg = dm ? "#0f172a" : "#1e293b";


  const myRank = roleRank[currentUser ? currentUser.role : "Viewer"];
  const canEdit = myRank >= roleRank["Agent"];
  const canDelete = myRank >= roleRank["Team Lead"];
  const canImport = myRank >= roleRank["Admin"];

 
  const visibleNavItems = canImport
    ? [...navItems, { id: "chatlog", label: "Chat History" }, { id: "users", label: "Users" }]
    : navItems;

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    if (token) sessionStorage.setItem("authToken", token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("authToken");
  };

  const fetchAllTickets = () => {
    fetch("http://localhost:5000/tickete")
      .then(res => res.json())
      .then(data => setAllTickete(Array.isArray(data) ? data : []));
  };

  const fetchTickets = (filters = {}) => {
    fetch("http://localhost:5000/tickete/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: filters.status && filters.status.length > 0 ? filters.status : null,
        priority: filters.priority && filters.priority.length > 0 ? filters.priority : null,
        team: filters.team && filters.team.length > 0 ? filters.team : null,
        search: filters.search || null,
        person: filters.person && filters.person.length > 0 ? filters.person : null,
        date_start: filters.date_start || null,
        date_end: filters.date_end || null,
        sla_breach: filters.sla_breach || null,
      })
    })
      .then(res => res.json())
      .then(data => { setTickete(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError("Could not connect to server!"); setLoading(false); });
  };

  useEffect(() => { fetchTickets(); fetchAllTickets(); }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);


  const handleAdd = (form) => {
    authFetch("/tickete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) { setShowAdd(false); fetchTickets(); fetchAllTickets(); }
        else alert(data.error || "Error adding ticket!");
      })
      .catch(() => alert("Error adding ticket!"));
  };

  const handleEdit = (form) => {
    authFetch(`/tickete/${editTicket.ID}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) { setEditTicket(null); fetchTickets(); fetchAllTickets(); }
        else alert(data.error || "Error updating ticket!");
      })
      .catch(() => alert("Error updating ticket!"));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    authFetch(`/tickete/${id}`, { method: "DELETE" })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) { fetchTickets(); fetchAllTickets(); }
        else alert(data.error || "Error deleting ticket!");
      })
      .catch(() => alert("Error deleting ticket!"));
  };

  const handleImport = (file, filtersToRestore) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);

      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);


      const formatDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
        }
        return val;
      };

      const ticketsImport = rows.map(r => ({
        TICKET_NUMBER: r["TICKET_NUMBER"] || r["Ticket"] || "",
        STATUS: r["STATUS"] || r["Status"] || "Open",
        PRIORITY: r["PRIORITY"] || r["Priority"] || "Medium",
        COMPANY: r["COMPANY"] || r["Company"] || "",
        PROJECT: r["PROJECT"] || r["Project"] || "",
        TEAM: r["TEAM"] || r["Team"] || "",
        ASSIGNED_PERSON: r["ASSIGNED_PERSON"] || r["Assigned Person"] || "",
        SERVICE: r["SERVICE"] || r["Service"] || "",
        DESCRIPTION: r["DESCRIPTION"] || r["Description"] || "",
        SUBMIT_DATETIME: formatDate(r["SUBMIT_DATETIME"]),
        RESOLVED_DATETIME: formatDate(r["RESOLVED_DATETIME"]),
        CLOSED_DATETIME: formatDate(r["CLOSED_DATETIME"]),
        ESTIMATED_RESOLUTION_DATETIME: formatDate(r["ESTIMATED_RESOLUTION_DATETIME"]),
      }));
      authFetch("/tickete/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tickete: ticketsImport }) })
        .then(res => res.json())
        .then(data => { alert(data.mesaj || data.error); fetchTickets(filtersToRestore); fetchAllTickets(); })
        .catch(() => alert("Error importing tickets!"));
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading) return <div className="app-status-message">Loading...</div>;
  if (error) return <div className="app-status-message app-status-error">{error}</div>;

  return (
    <div className="app-container" style={{ backgroundColor: bg }}>

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarBg={sidebarBg}
        currentUser={currentUser}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        darkMode={dm}
        setDarkMode={setDarkMode}
        onLogout={handleLogout}
        navItems={visibleNavItems}
      />

      {/* Main Content */}
      <div className="main-content">

        {/* Navbar */}
        <div className="navbar" style={{ backgroundColor: sidebarBg }}>
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <div className="hamburger-line" />
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </button>
          <span className="navbar-title">
            {visibleNavItems.find(n => n.id === currentPage)?.label}
          </span>
        </div>

        {/* Page Content */}
        <div className="page-content">

          {currentPage === "home" && (
            <HomePage
              darkMode={dm}
              onNavigate={(id) => setCurrentPage(id)}
              onNewTicket={() => setShowAdd(true)}
              canEdit={canEdit}
              currentUser={currentUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              stats={{
                total: allTickete.length,
                open: allTickete.filter(t => t.STATUS === "Open").length,
                inProgress: allTickete.filter(t => t.STATUS === "In Progress").length,
                critical: allTickete.filter(t => t.PRIORITY === "Critical").length,
                slaBreach: allTickete.filter(t => {
                  if (!t.ESTIMATED_RESOLUTION_DATETIME) return false;
                  const estimate = new Date(t.ESTIMATED_RESOLUTION_DATETIME);
                  if (t.RESOLVED_DATETIME) return new Date(t.RESOLVED_DATETIME) > estimate;
                  return new Date() > estimate;
                }).length,
              }}
            />
          )}

          {currentPage === "tickets" && (
            <TicketsPage
              tickete={tickete}
              allTickete={allTickete}
              darkMode={dm}
              canEdit={canEdit}
              canDelete={canDelete}
              canImport={canImport}
              onNewTicket={() => setShowAdd(true)}
              onEditTicket={setEditTicket}
              onDeleteTicket={handleDelete}
              onImport={handleImport}
              fetchTickets={fetchTickets}
            />
          )}

          {currentPage === "analytic" && <AnalyticReport darkMode={dm} />}
          {currentPage === "graphic" && <GraphicReport darkMode={dm} />}
          {currentPage === "chatlog" && <ChatHistoryPage darkMode={dm} />}
          {currentPage === "users" && canImport && <UsersPage darkMode={dm} currentUser={currentUser} />}
        </div>
      </div>

      {showAdd && <Modal title="New Ticket" onClose={() => setShowAdd(false)} darkMode={dm}><TicketForm onSave={handleAdd} onClose={() => setShowAdd(false)} darkMode={dm} /></Modal>}
      {editTicket && <Modal title="Edit Ticket" onClose={() => setEditTicket(null)} darkMode={dm}><TicketForm initial={editTicket} onSave={handleEdit} onClose={() => setEditTicket(null)} darkMode={dm} /></Modal>}
      <ChatBot darkMode={dm} />
    </div>
  );
}

export default App;