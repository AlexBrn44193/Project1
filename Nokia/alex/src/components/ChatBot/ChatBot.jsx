import { useState, useRef, useEffect } from "react";
import "./ChatBot.css";

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.35vw" height="1.35vw" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.15vw" height="1.15vw" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChatBot({ darkMode }) {
  const dm = darkMode;
  const panelBg = dm ? "#1e293b" : "white";
  const textColor = dm ? "white" : "#1e293b";
  const botBubbleBg = dm ? "#334155" : "#f1f5f9";
  const mutedColor = dm ? "#64748b" : "#94a3b8";
  const borderColor = dm ? "#334155" : "#e2e8f0";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || loading) return;


    
    const history = messages
      .filter(m => m.role === "user" || m.role === "bot")
      .slice(-8)
      .map(m => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    fetch("http://localhost:5000/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.error) {
          setMessages(m => [...m, { role: "error", text: data.error }]);
        } else {
          setMessages(m => [...m, { role: "bot", text: data.answer, downloadUrl: data.download_url }]);
        }
      })
      .catch(() => {
        setLoading(false);
        setMessages(m => [...m, { role: "error", text: "Could not connect to server!" }]);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        className="chatbot-launcher"
        onClick={() => setOpen(o => !o)}
        title="Ask the assistant"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div className="chatbot-panel" style={{ backgroundColor: panelBg }}>
          <div className="chatbot-header">
            <span className="chatbot-header-title">Ticket Assistant</span>
            <button className="chatbot-close" onClick={() => setOpen(false)}><CloseIcon /></button>
          </div>

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="chatbot-empty-hint" style={{ color: mutedColor }}>
                Ask me things like "how many critical tickets are open?" or "export overdue tickets for Team X".
              </p>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "chatbot-message chatbot-message-user" :
                  m.role === "error" ? "chatbot-message chatbot-message-error" :
                  "chatbot-message chatbot-message-bot"
                }
                style={m.role === "bot" ? { backgroundColor: botBubbleBg, color: textColor } : undefined}
              >
                {m.text}
                {m.downloadUrl && (
                  <div>
                    <a
                      className="chatbot-download-btn"
                      href={m.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download Excel
                    </a>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chatbot-typing" style={{ color: mutedColor }}>
                Thinking...
              </div>
            )}
          </div>

          <div className="chatbot-input-row" style={{ borderTop: `0.05vw solid ${borderColor}` }}>
            <input
              className="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question..."
              style={{
                backgroundColor: dm ? "#0f172a" : "white",
                color: textColor,
                border: `0.05vw solid ${borderColor}`,
              }}
              disabled={loading}
            />
            <button className="chatbot-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;