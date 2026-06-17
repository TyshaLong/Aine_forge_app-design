import { useRef, useState } from 'react';
import ShapeGridBackground from './components/ShapeGridBackground.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import RepoBar from './components/RepoBar.jsx';
import Hero from './components/Hero.jsx';
import Messages from './components/Messages.jsx';
import ChatInput from './components/ChatInput.jsx';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [repo, setRepo] = useState('TyshaLong/advent-of-code-2025');
  const inputRef = useRef(null);

  function prefill(text) {
    setInput(text);
    inputRef.current?.focus();
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { role: 'user', text },
      // NOTE: static mock response. Replace this with a real backend call —
      // e.g. POST the question + selected repo to your API and stream the answer.
      { role: 'assistant', model: 'Claude Sonnet', text: `Searching ${repo}…` },
    ]);
    setInput('');
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
        />
      </main>
    </>
  );
}
