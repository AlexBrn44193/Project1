import { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import { roleOptions } from "../../constants";
import { authFetch } from "../../api";
import "./UsersPage.css";

const roleColor = {
  "Super Admin": "#dc2626",
  "Admin": "#ef4444",
  "Team Lead": "#f59e0b",
  "Agent": "#3b82f6",
  "Viewer": "#6b7280",
};

function UsersPage({ darkMode, currentUser }) {
  const dm = darkMode;
  const cardBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const borderColor = dm ? "#334155" : "#e2e8f0";
  const mutedColor = dm ? "#64748b" : "#94a3b8";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({ FIRST_NAME: "", PASSWORD: "", ROLE: "Viewer" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  
  const fetchUsers = () => {
    setLoading(true);
    authFetch("/users")
      .then(res => res.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => {
    setForm({ FIRST_NAME: "", PASSWORD: "", ROLE: "Viewer" });
    setFormError("");
    setShowAdd(true);
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCreate = () => {
    if (!form.FIRST_NAME.trim() || !form.PASSWORD) {
      setFormError("Username and password are required");
      return;
    }
    setFormError("");
    setSaving(true);
    authFetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        setSaving(false);
        if (ok && !data.error) {
          setShowAdd(false);
          fetchUsers();
        } else {
          setFormError(data.error || "Error creating user");
        }
      })
      .catch(() => { setSaving(false); setFormError("Could not connect to server!"); });
  };

  const handleDelete = (user) => {
    if (currentUser && user.FIRST_NAME.toLowerCase() === currentUser.username.toLowerCase()) {
      alert("You cannot delete your own account while logged in.");
      return;
    }
    if (!window.confirm(`Delete the account "${user.FIRST_NAME}"?`)) return;
    authFetch(`/users/${user.ID}`, { method: "DELETE" })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) fetchUsers();
        else alert(data.error || "Error deleting user!");
      })
      .catch(() => alert("Error deleting user!"));
  };

  const inputStyle = {
    border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
    backgroundColor: dm ? "#0f172a" : "white",
    color: dm ? "white" : "#1e293b",
  };

  return (
    <div className="users-container" style={{ height: "calc(100vh - 8.33vw)", position: "relative" }}>
      <div className="users-header">
        <h2 className="users-page-title" style={{ color: textColor }}>User Accounts</h2>
        <button className="users-btn users-btn-dark" onClick={openAdd}>New Account</button>
      </div>
      <p className="users-count" style={{ color: mutedColor }}>{users.length} accounts</p>

      <div className="users-table-container" style={{ backgroundColor: cardBg }}>
        {loading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}
        <div className="users-table-scroll">
          <table className="users-table" style={{ backgroundColor: cardBg }}>
            <thead>
              <tr style={{ backgroundColor: dm ? "#0f172a" : "#1e293b", color: "white" }}>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="users-empty-cell" style={{ color: mutedColor }}>No accounts found.</td></tr>
              ) : (
                users.map((u, i) => {
                  const isSelf = currentUser && u.FIRST_NAME.toLowerCase() === currentUser.username.toLowerCase();
                  return (
                    <tr key={u.ID} style={{ backgroundColor: i % 2 === 0 ? cardBg : (dm ? "#162032" : "#f8fafc"), borderBottom: `0.05vw solid ${borderColor}` }}>
                      <td style={{ fontWeight: "bold", color: textColor }}>
                        {u.FIRST_NAME}
                        {isSelf && <span className="users-self-tag" style={{ color: mutedColor }}>(you)</span>}
                      </td>
                      <td>
                        <span className="users-role-badge" style={{
                          backgroundColor: (roleColor[u.ROLE] || "#6b7280") + "22",
                          color: roleColor[u.ROLE] || "#6b7280",
                        }}>{u.ROLE}</span>
                      </td>
                      <td>
                        <button
                          className="users-btn users-btn-red users-action-btn"
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="New Account" onClose={() => setShowAdd(false)} darkMode={dm}>
          <div className="usersform-container">
            <div className="usersform-field">
              <label className="usersform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Username</label>
              <input className="usersform-input" value={form.FIRST_NAME}
                onChange={e => set("FIRST_NAME", e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div className="usersform-field">
              <label className="usersform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Password</label>
              <input className="usersform-input" type="password" value={form.PASSWORD}
                onChange={e => set("PASSWORD", e.target.value)} style={inputStyle} />
            </div>
            <div className="usersform-field">
              <label className="usersform-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>Role</label>
              <select className="usersform-input" value={form.ROLE}
                onChange={e => set("ROLE", e.target.value)} style={inputStyle}>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {formError && <p className="usersform-error">{formError}</p>}
            <div className="usersform-buttons">
              <button className="users-btn" onClick={() => setShowAdd(false)}
                style={{ border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`, backgroundColor: dm ? "#1e293b" : "white", color: dm ? "white" : "#1e293b" }}>
                Cancel
              </button>
              <button className="users-btn users-btn-blue" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default UsersPage;