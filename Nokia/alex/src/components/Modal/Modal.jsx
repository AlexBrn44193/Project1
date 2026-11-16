import "./Modal.css";

function Modal({ title, onClose, children, darkMode, wide }) {
  const dm = darkMode;
  return (
    <div className="modal-overlay">
      <div
        className={wide ? "modal-content modal-content-wide" : "modal-content"}
        style={{ backgroundColor: dm ? "#1e293b" : "white", color: dm ? "white" : "#1e293b" }}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: dm ? "white" : "#1e293b" }}>{title}</h2>
          <button className="modal-close" onClick={onClose} style={{ color: dm ? "white" : "#1e293b" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
