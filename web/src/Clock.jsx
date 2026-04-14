import React, { useState, useEffect } from 'react';

const Clock = ({ size = 100 }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  // Rotations
  const secDeg = seconds * 6;
  const minDeg = (minutes * 6) + (seconds * 0.1);
  const hourDeg = (hours * 30) + (minutes * 0.5);

  const radius = size / 2;
  const numberRadius = radius - 18; // Margin from the border

  return (
    <div style={{ 
      width: size, 
      height: size, 
      position: 'relative', 
      background: 'rgba(255,255,255,0.05)', 
      borderRadius: '50%', 
      border: '2px solid var(--glass-border)',
      boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Numbers */}
      {[...Array(12)].map((_, i) => {
        const n = i + 1;
        const angle = (n * 30 - 90) * (Math.PI / 180);
        const x = radius + numberRadius * Math.cos(angle);
        const y = radius + numberRadius * Math.sin(angle);
        
        return (
          <div 
            key={n}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              color: 'var(--text-color)',
              fontSize: size > 100 ? '1.1rem' : '0.8rem',
              fontWeight: '800',
              opacity: 0.8,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {n}
          </div>
        );
      })}

      {/* Hour Hand */}
      <div style={{
        position: 'absolute',
        width: '5px',
        height: '25%',
        background: 'var(--text-color)',
        borderRadius: '4px',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${hourDeg}deg)`,
        opacity: 0.95,
        zIndex: 3,
        transition: 'transform 0.5s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />
      
      {/* Minute Hand */}
      <div style={{
        position: 'absolute',
        width: '3.5px',
        height: '35%',
        background: 'var(--text-color)',
        borderRadius: '4px',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${minDeg}deg)`,
        opacity: 0.8,
        zIndex: 2,
        transition: 'transform 0.5s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />

      {/* Second Hand */}
      <div style={{
        position: 'absolute',
        width: '2px',
        height: '42%',
        background: 'var(--accent-color)',
        borderRadius: '2px',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${secDeg}deg)`,
        opacity: 0.9,
        zIndex: 1,
        transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />

      {/* Center Dot */}
      <div style={{
        width: '8px',
        height: '8px',
        background: 'var(--accent-color)',
        borderRadius: '50%',
        zIndex: 5,
        boxShadow: '0 0 8px rgba(0,0,0,0.6)'
      }} />
    </div>
  );
};

export default Clock;
