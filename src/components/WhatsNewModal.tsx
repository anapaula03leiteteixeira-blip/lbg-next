'use client';
import { useEffect, useState } from 'react';
import whatsNew from '@/data/whats-new.json';

const STORAGE_KEY = `lbg-whats-new-seen-${whatsNew.version}`;

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable (SSR guard)
    }
  }, []);

  function handleClose() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h2
              id="whats-new-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600 }}
            >
              Novidades v{whatsNew.version}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              {new Date(whatsNew.releaseDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem' }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {whatsNew.features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0, lineHeight: 1.3 }}>{f.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{f.title}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.55 }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
