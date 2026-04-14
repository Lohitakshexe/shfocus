import React, { useState, useEffect } from 'react';

const Clock = ({ size = 44 }) => {
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

  return (
    <div style={{ 
      width: size, 
      height: size, 
      position: 'relative', 
      background: 'rgba(255,255,255,0.05)', 
      borderRadius: '50%', 
      border: '1.5px solid var(--glass-border)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Hour Hand */}
      <div style={{
        position: 'absolute',
        width: '2px',
        height: '25%',
        background: 'var(--text-color)',
        borderRadius: '2px',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${hourDeg}deg)`,
        opacity: 0.9,
        transition: 'transform 0.5s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />
      
      {/* Minute Hand */}
      <div style={{
        position: 'absolute',
        width: '1.5px',
        height: '35%',
        background: 'var(--text-color)',
        borderRadius: '2px',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${minDeg}deg)`,
        opacity: 0.7,
        transition: 'transform 0.5s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />

      {/* Second Hand */}
      <div style={{
        position: 'absolute',
        width: '1px',
        height: '40%',
        background: 'var(--accent-color)',
        transformOrigin: 'bottom center',
        transform: `translateY(-50%) rotate(${secDeg}deg)`,
        opacity: 0.8,
        transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
      }} />

      {/* Center Dot */}
      <div style={{
        width: '4px',
        height: '4px',
        background: 'var(--accent-color)',
        borderRadius: '50%',
        zIndex: 2,
        boxShadow: '0 0 5px rgba(0,0,0,0.5)'
      }} />
    </div>
  );
};

export default Clock;
