export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        style={{
          background: '#1e1e1e',
          border: '1px solid #2a2a2a',
          borderRadius: '14px',
          padding: '28px 32px',
          maxWidth: '400px',
          width: '90%',
        }}
      >
        <h2
          className="font-display"
          style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}
        >
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '7px 18px',
              fontSize: '13px',
              color: '#ccc',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: 'var(--color-yellow)',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
