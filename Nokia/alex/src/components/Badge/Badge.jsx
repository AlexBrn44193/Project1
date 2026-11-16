import "./Badge.css";

function Badge({ text, colorMap }) {
  if (!text || !colorMap[text]) return <span>{text}</span>;
  return (
    <span className="badge" style={{
      backgroundColor: colorMap[text] + "22",
      color: colorMap[text],
      border: `0.05vw solid ${colorMap[text]}`,
    }}>{text}</span>
  );
}

export default Badge;
