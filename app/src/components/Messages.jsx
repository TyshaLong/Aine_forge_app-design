export default function Messages({ messages }) {
  return (
    <>
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <div key={i} className="msg-row user">
            <div className="bubble-user">{m.text}</div>
          </div>
        ) : (
          <div key={i} className="msg-row">
            <div className="bubble-label">{m.model || 'Claude Sonnet'}</div>
            <div className="bubble-assistant">{m.text}</div>
          </div>
        )
      )}
    </>
  );
}
