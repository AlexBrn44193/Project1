import { useState } from "react";
import { statusOptions, priorityOptions } from "../../constants";
import "./TicketForm.css";

function TicketForm({ initial, onSave, onClose, darkMode }) {
  const dm = darkMode;
  const [form, setForm] = useState(initial || {
    TICKET_NUMBER: "", STATUS: "Open", PRIORITY: "Medium",
    COMPANY: "", PROJECT: "", TEAM: "", ASSIGNED_PERSON: "", SERVICE: "", DESCRIPTION: ""
  });
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const inputStyle = {
    border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
    backgroundColor: dm ? "#0f172a" : "white",
    color: dm ? "white" : "#1e293b",
  };

  return (
    <div className="ticketform-container">
      {[
        ["Ticket Number", "TICKET_NUMBER"],
        ["Company", "COMPANY"],
        ["Project", "PROJECT"],
        ["Team", "TEAM"],
        ["Assigned Person", "ASSIGNED_PERSON"],
        ["Service", "SERVICE"],
      ].map(([label, field]) => (
        <div key={field} className="ticketform-field">
          <label className="ticketform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>{label}</label>
          <input className="ticketform-input" value={form[field]} onChange={e => set(field, e.target.value)} style={inputStyle} />
        </div>
      ))}
      <div className="ticketform-field">
        <label className="ticketform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Status</label>
        <select className="ticketform-input" value={form.STATUS} onChange={e => set("STATUS", e.target.value)} style={inputStyle}>
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="ticketform-field">
        <label className="ticketform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Priority</label>
        <select className="ticketform-input" value={form.PRIORITY} onChange={e => set("PRIORITY", e.target.value)} style={inputStyle}>
          {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="ticketform-field">
        <label className="ticketform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Description</label>
        <textarea className="ticketform-input ticketform-textarea" value={form.DESCRIPTION} onChange={e => set("DESCRIPTION", e.target.value)}
          style={inputStyle} />
      </div>
      <div className="ticketform-buttons">
        <button className="ticketform-btn ticketform-btn-cancel" onClick={onClose}
          style={{ border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`, backgroundColor: dm ? "#1e293b" : "white", color: dm ? "white" : "#1e293b" }}>
          Cancel
        </button>
        <button className="ticketform-btn ticketform-btn-save" onClick={() => onSave(form)}>Save</button>
      </div>
    </div>
  );
}

export default TicketForm;
