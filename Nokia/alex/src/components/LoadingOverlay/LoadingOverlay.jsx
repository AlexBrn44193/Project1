import "./LoadingOverlay.css";

function LoadingOverlay({ cardBg, textColor }) {
  return (
    <div className="loading-overlay">
      <div className="loading-card" style={{ backgroundColor: cardBg }}>
        <div className="loading-ring">
          <svg viewBox="0 0 200 70" width="100%" height="100%">
            <g fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="14" width="36" height="26" rx="3" />
              <line x1="26" y1="40" x2="26" y2="49" />
              <line x1="16" y1="49" x2="36" y2="49" />
            </g>
            <g fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="176" cy="16" rx="17" ry="6" />
              <path d="M159 16 V50 A17 6 0 0 0 193 50 V16" />
              <path d="M159 28 A17 6 0 0 0 193 28" />
              <path d="M159 39 A17 6 0 0 0 193 39" />
            </g>
            {/* data packet traveling between them */}
            <circle className="loading-packet" cx="30" cy="27" r="7" fill="#3b82f6" />
          </svg>
        </div>
        <span className="loading-text" style={{ color: textColor }}>Loading...</span>
      </div>
    </div>
  );
}

export default LoadingOverlay;
