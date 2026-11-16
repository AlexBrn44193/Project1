import { useState } from "react";
import Modal from "../Modal/Modal";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import "./HomeLoginWidget.css";

function HomeLoginWidget({ currentUser, onLoginSuccess, onLogout }) {
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        setLoading(false);
        if (ok && data.success) {
      
          onLoginSuccess({ username: data.username, role: data.role }, data.token);
          setUsername(""); setPassword(""); setShowModal(false);
        } else {
          setError(data.error || "Invalid username or password");
        }
      })
      .catch(() => { setLoading(false); setError("Could not connect to server!"); });
  };

  if (currentUser) {
    return (
      <div className="loginwidget-logged">
        <span className="loginwidget-user">{currentUser.username} · {currentUser.role}</span>
        <button className="loginwidget-logout-btn" onClick={onLogout}>Logout</button>
      </div>
    );
  }

  return (
    <>
      <button className="loginwidget-big-btn" onClick={() => setShowModal(true)}>
        Login
      </button>

      {showModal && (
        <Modal title="Sign In" onClose={() => setShowModal(false)} darkMode={true}>
          <div className="loginwidget-modal-inner">
            {loading && <LoadingOverlay cardBg="#1e293b" textColor="white" />}
            <form className="loginwidget-form" onSubmit={handleSubmit}>
              <div className="loginwidget-field">
                <label className="loginwidget-label">Username</label>
                <input className="loginwidget-input"
                  value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoFocus />
              </div>
              <div className="loginwidget-field">
                <label className="loginwidget-label">Password</label>
                <input className="loginwidget-input"
                  type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
              </div>
              {error && <p className="loginwidget-error">{error}</p>}
              <button className="loginwidget-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}

export default HomeLoginWidget;