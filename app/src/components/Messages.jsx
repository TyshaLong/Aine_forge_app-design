import { repoUrl } from '../lib/repos.js';

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
            <div className="bubble-label">{m.model || 'Llama 3.3 70B'}</div>
            <div className="bubble-assistant" style={m.error ? { borderColor: '#7a2a2a', color: '#f0b4b4' } : undefined}>
              {m.loading ? (
                <span className="thinking-dots">Searching {m.repo}<span>.</span><span>.</span><span>.</span></span>
              ) : (
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.text}</p>
              )}
              {!m.loading && !m.error && m.files && m.files.length > 0 && (
                <div className="files-read">
                  <span className="files-read-label">Read {m.files.length} file{m.files.length > 1 ? 's' : ''}</span>
                  <div className="files-read-list">
                    {m.files.map((f) => (
                      <a key={f} className="file-chip" href={`${repoUrl(m.repo)}/blob/HEAD/${f}`} target="_blank" rel="noreferrer">{f}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </>
  );
}
