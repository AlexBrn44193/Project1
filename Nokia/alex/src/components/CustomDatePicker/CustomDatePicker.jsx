import { useState, useEffect, useRef } from "react";
import "./CustomDatePicker.css";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function CustomDatePicker({ label, value, onChange, darkMode }) {
  const dm = darkMode;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const closeTimeout = useRef(null);

  const parsedValue = value ? new Date(value + "T00:00:00") : null;
  const [viewYear, setViewYear] = useState(parsedValue ? parsedValue.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedValue ? parsedValue.getMonth() : new Date().getMonth());

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

  const scheduleClose = () => { closeTimeout.current = setTimeout(() => setOpen(false), 200); };
  const cancelClose = () => { if (closeTimeout.current) clearTimeout(closeTimeout.current); };

  const formatDisplay = (isoStr) => {
    if (!isoStr) return "mm/dd/yyyy";
    const [y, m, d] = isoStr.split("-");
    return `${m}/${d}/${y}`;
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstWeekday = (year, month) => new Date(year, month, 1).getDay();

  const goPrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else { setViewMonth(m => m - 1); }
  };
  const goNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else { setViewMonth(m => m + 1); }
  };

  const selectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstWeekday(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const isSelected = (day) =>
    !!parsedValue && parsedValue.getFullYear() === viewYear && parsedValue.getMonth() === viewMonth && parsedValue.getDate() === day;

  return (
    <div className="datepicker-wrapper" ref={wrapperRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
      <label className="datepicker-label" style={{ color: dm ? "#94a3b8" : "#475569" }}>{label}</label>
      <div
        className="datepicker-trigger"
        onClick={() => setOpen(o => !o)}
        style={{
          backgroundColor: dm ? "#1e293b" : "white",
          color: dm ? "white" : "#1e293b",
          border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
        }}
      >
        <span style={{ color: value ? (dm ? "white" : "#1e293b") : (dm ? "#64748b" : "#94a3b8") }}>
          {formatDisplay(value)}
        </span>
        <span className="datepicker-trigger-icons">
          {value && <span onClick={clearDate} className="datepicker-clear">×</span>}
        </span>
      </div>
      {open && (
        <div
          className="datepicker-dropdown"
          style={{
            backgroundColor: dm ? "#1e293b" : "white",
            border: `0.05vw solid ${dm ? "#334155" : "#e2e8f0"}`,
          }}
        >
          <div className="datepicker-nav">
            <span onClick={goPrevMonth} className="datepicker-nav-arrow" style={{ color: dm ? "white" : "#1e293b" }}>‹</span>
            <span className="datepicker-month-label" style={{ color: dm ? "white" : "#1e293b" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <span onClick={goNextMonth} className="datepicker-nav-arrow" style={{ color: dm ? "white" : "#1e293b" }}>›</span>
          </div>
          <div className="datepicker-grid">
            {WEEKDAY_LABELS.map((d, i) => (
              <span key={i} className="datepicker-weekday" style={{ color: dm ? "#64748b" : "#94a3b8" }}>{d}</span>
            ))}
            {cells.map((day, i) => (
              <span
                key={i}
                onClick={() => day && selectDay(day)}
                className="datepicker-day"
                style={{
                  cursor: day ? "pointer" : "default",
                  color: day ? (isSelected(day) ? "white" : (dm ? "white" : "#1e293b")) : "transparent",
                  backgroundColor: isSelected(day) ? "#3b82f6" : "transparent",
                }}
              >
                {day || ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomDatePicker;