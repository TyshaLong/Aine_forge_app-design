import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';

const ORBS = [
  { size: 42, background: '#f5c800', opacity: 1 },
  { size: 50, background: '#9b59b6', opacity: 1 },
  { size: 42, background: '#f5c800', opacity: 0.6 },
  { size: 34, background: '#888888', opacity: 0.5 },
];

const CHIPS = [
  { icon: '🔑', label: 'Explain auth flow', prompt: 'Explain the auth flow', bg: '#f5c80020' },
  { icon: '🔍', label: 'Find entry point', prompt: 'Where is the main entry point?', bg: '#9b59b620' },
  { icon: '🔗', label: 'List API endpoints', prompt: 'List all API endpoints', bg: '#22c55e20' },
  { icon: '✅', label: 'Test structure', prompt: 'How are tests structured?', bg: '#3b82f620' },
  { icon: '📋', label: 'Recent changes', prompt: 'Summarize recent changes', bg: '#f5c80020' },
];

export default function Hero({ onPrefill, onNavigateToCode }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleBuildClick() {
    setDialogOpen(true);
  }

  function handleConfirm() {
    setDialogOpen(false);
    if (typeof onNavigateToCode === 'function') onNavigateToCode();
  }

  function handleCancel() {
    setDialogOpen(false);
  }

  return (
    <div className="hero">
      <div className="orbs">
        {ORBS.map((orb, i) => (
          <div
            key={i}
            className="orb"
            style={{ width: orb.size, height: orb.size, background: orb.background, opacity: orb.opacity }}
          />
        ))}
      </div>

      <div className="hero-title">
        Ask anything about your code.<br />
        <span>Get answers in seconds.</span>
      </div>

      <div className="quick-chips">
        {CHIPS.map((chip) => (
          <button key={chip.label} className="chip" onClick={() => onPrefill(chip.prompt)}>
            <span className="chip-icon" style={{ background: chip.bg }}>{chip.icon}</span>
            {chip.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleBuildClick}
        style={{
          marginTop: '8px',
          background: 'var(--color-yellow)',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 24px',
          fontSize: '14px',
          fontWeight: 600,
          color: '#fff',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          transition: 'opacity 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        🛠 Build it in Code
      </button>

      <ConfirmDialog
        open={dialogOpen}
        title="Switch to Code mode?"
        message="You're about to leave Ask mode and open the Code tab. Any unsent input will remain in the chat box."
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
