import { useRef, useState } from 'react';
import ShapeGridBackground from './components/ShapeGridBackground.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import RepoBar from './components/RepoBar.jsx';
import Hero from './components/Hero.jsx';
import Messages from './components/Messages.jsx';
import ChatInput from './components/ChatInput.jsx';
import { askQuestion } from './lib/api.js';
import { REPOS } from './lib/repos.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [repo, setRepo] = useState('TyshaLong/advent-of-code-2025');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  function prefill(text) {
    setInput(text);
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;

    // "All repos" isn't a single GitHub repo — fall back to the first indexed one.
    const targetRepo = repo === 'All repos' ? (REPOS[0]?.full || repo) : repo;

    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'assistant', model: 'Llama 3.3 70B', loading: true, repo: targetRepo },
    ]);
    setInput('');
    setBusy(true);

    try {
      const { answer, files } = await askQuestion(targetRepo, text);
      setMessages((prev) => replaceLastAssistant(prev, { text: answer, files: files || [], loading: false }));
    } catch (e) {
      setMessages((prev) => replaceLastAssistant(prev, { text: e.message, error: true, loading: false }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ShapeGridBackground />
      <Sidebar />
      <main className="main-area">
        <TopBar />
        <RepoBar repo={repo} onSelect={setRepo} />

        <div className="messages-area">
          {messages.length === 0 ? (
            <Hero onPrefill={prefill} />
          ) : (
            <Messages messages={messages} />
          )}
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          inputRef={inputRef}
          disabled={busy}
        />
      </main>
    </>
  );
}

function replaceLastAssistant(messages, patch) {
  const next = messages.slice();
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].role === 'assistant') {
      next[i] = { ...next[i], ...patch };
      break;
    }
  }
  return next;
}
