import { useState, useEffect } from "react";
import LoadingOverlay from "../LoadingOverlay/LoadingOverlay";
import { authFetch } from "../../api";
import "./ChatHistoryPage.css";

const intentColor = {
  list: "#3b82f6",
  stats: "#8b5cf6",
  export: "#16a34a",
};

function ChatHistoryPage({ darkMode }) {
  const dm = darkMode;
  const cardBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const mutedColor = dm ? "#64748b" : "#94a3b8";

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    setLoading(true);
    authFetch("/chatbot/history")
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, []);

  const deleteOne = (id) => {
    authFetch(`/chatbot/history/${id}`, { method: "DELETE" })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) fetchHistory();
        else alert(data.error || "Error deleting conversation!");
      })
      .catch(() => alert("Error deleting conversation!"));
  };

  const clearAll = () => {
    if (!window.confirm("Delete the entire chat history?")) return;
    authFetch("/chatbot/history", { method: "DELETE" })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok) fetchHistory();
        else alert(data.error || "Error clearing history!");
      })
      .catch(() => alert("Error clearing history!"));
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "2-digit", day: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  return (
    <div className="chathistory-container" style={{ height: "calc(100vh - 8.33vw)", position: "relative" }}>
      {loading && <LoadingOverlay cardBg={cardBg} textColor={textColor} />}

      <div className="chathistory-header">
        <h2 className="chathistory-page-title" style={{ color: textColor }}>Chat History</h2>
        <button
          className="chathistory-clear-btn"
          onClick={clearAll}
          disabled={history.length === 0}
        >
          Clear All
        </button>
      </div>

      <p className="chathistory-count" style={{ color: mutedColor }}>{history.length} conversations</p>

      <div className="chathistory-scroll">
        {history.length === 0 ? (
          <div className="chathistory-empty" style={{ backgroundColor: cardBg, color: mutedColor }}>
            No chatbot conversations yet.
          </div>
        ) : (
          history.map(entry => (
            <div key={entry.ID} className="chathistory-card" style={{ backgroundColor: cardBg }}>
              <div className="chathistory-card-top">
                <div className="chathistory-meta">
                  {entry.INTENT && (
                    <span
                      className="chathistory-intent-badge"
                      style={{
                        backgroundColor: (intentColor[entry.INTENT] || "#6b7280") + "22",
                        color: intentColor[entry.INTENT] || "#6b7280",
                      }}
                    >
                      {entry.INTENT}
                    </span>
                  )}
                  <span className="chathistory-date" style={{ color: mutedColor }}>{formatDate(entry.CREATED_AT)}</span>
                  {entry.RESULT_COUNT !== null && entry.RESULT_COUNT !== undefined && (
                    <span className="chathistory-result-count" style={{ color: mutedColor }}>
                      {entry.RESULT_COUNT} result{entry.RESULT_COUNT === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <button className="chathistory-delete-btn" onClick={() => deleteOne(entry.ID)}>Delete</button>
              </div>
              <p className="chathistory-question" style={{ color: textColor }}>{entry.QUESTION}</p>
              <p className="chathistory-answer" style={{ color: mutedColor }}>{entry.ANSWER}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatHistoryPage;