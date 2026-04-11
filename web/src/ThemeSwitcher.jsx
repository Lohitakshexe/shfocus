import React from 'react';

const themes = [
  { id: 'vibe', name: '✨ Glass (Vibe)' },
  { id: 'neo-saas', name: '🏢 Neo-SaaS' },
  { id: 'soft-depth', name: '☁️ Soft Depth' },
  { id: 'minimalist', name: '🧊 Minimalist' },
  { id: 'luxury', name: '💍 Luxury Noir' },
];

function ThemeSwitcher({ currentStyle, onStyleChange }) {
  return (
    <div className="theme-switcher">
      <select 
        value={currentStyle} 
        onChange={(e) => onStyleChange(e.target.value)}
        className="btn btn-secondary theme-select"
        style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', outline: 'none', fontSize: '0.9rem' }}
      >
        {themes.map(t => (
          <option key={t.id} value={t.id} style={{ background: '#1a1a1a', color: '#fff' }}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ThemeSwitcher;
