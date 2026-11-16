import { useState, useEffect, useRef } from "react";
import "./MultiSelect.css";

function MultiSelect({ label, value, onChange, options, darkMode }) {
  const [open, setOpen] = useState(false);
  const dm = darkMode;
  const wrapperRef = useRef(null);
  const closeTimeout = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);


  const scheduleClose = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 200);
  };
  const cancelClose = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  };

  const removeChip = (e, val) => {
    e.stopPropagation();
    onChange(val);
  };

  return (
    <div className="multiselect-wrapper" ref={wrapperRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <label className="multiselect-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>{label}</label>
      <div
        className="multiselect-trigger"
        onClick={() => setOpen(o => !o)}
        style={{
          backgroundColor: dm ? "#1e293b" : "white",
          color: dm ? "white" : "#1e293b",
          border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
        }}
      >
        <span style={{ color: value.length === 0 ? (dm ? "#64748b" : "#94a3b8") : (dm ? "white" : "#1e293b") }}>
          {value.length === 0 ? "All" : value.length === 1 ? value[0] : `${value.length} selected`}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div
          className="multiselect-dropdown"
          style={{
            backgroundColor: dm ? "#1e293b" : "white",
            border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
          }}
        >
          {/* Selectiile curente apar aici, cu X pentru stergere - dropdown-ul e poziționat absolut, deci nu misca restul paginii */}
          {value.length > 0 && (
            <div className="multiselect-chips">
              {value.map(v => (
                <span key={v} className="multiselect-chip" style={{
                  backgroundColor: dm ? "#334155" : "#e0f2fe",
                  color: dm ? "white" : "#0369a1",
                }}>
                  {v}
                  <span onClick={(e) => removeChip(e, v)} className="multiselect-chip-remove">✕</span>
                </span>
              ))}
            </div>
          )}
          {options.map(o => (
            <div
              key={o}
              className="multiselect-option"
              onClick={() => onChange(o)}
              style={{
                color: dm ? "white" : "#1e293b",
                backgroundColor: value.includes(o) ? (dm ? "#334155" : "#f0f9ff") : (dm ? "#1e293b" : "white"),
                borderBottom: `0.05vw solid ${dm ? "#334155" : "#f1f5f9"}`,
              }}
            >
              {o}
            </div>
          ))}
          {value.length > 0 && (
            <div className="multiselect-reset" onClick={() => { onChange(null); setOpen(false); }}>
              Reset
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
