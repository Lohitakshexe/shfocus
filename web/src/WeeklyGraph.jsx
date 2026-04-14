import React from 'react';
import { getWeekStart } from './utils';

const WeeklyGraph = ({ logs, title = "Weekly Study Hours" }) => {
  // Array to map indices to day labels
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totals = [0, 0, 0, 0, 0, 0, 0]; // representing minutes per day

  const weekStart = getWeekStart();
  const dayOfWeek = (new Date().getDay() || 7) - 1; // 0=Mon, 6=Sun for current day indicator
  const startOfCurrentWeek = weekStart;

  if (logs && logs.length > 0) {
    logs.forEach(log => {
      if (!log.created_at || !log.duration_minutes) return;

      const logDate = new Date(log.created_at - 7200000);
      logDate.setHours(0, 0, 0, 0);

      const diffTime = logDate.getTime() - startOfCurrentWeek.getTime();
      const diffDays = Math.round(diffTime / 86400000);

      // Only add to the total if it belongs to the current week (Mon-Sun index 0-6)
      if (diffDays >= 0 && diffDays < 7) {
        totals[diffDays] += log.duration_minutes;
      }
    });
  }

  const maxMins = Math.max(60, ...totals); // Scale relative to the highest bar, defaulting to 1 hour (60 min) min scale

  const formatHours = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  };

  return (
    <div style={{ flex: 1, minWidth: '300px' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-color)' }}>{title}</h3>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        height: '200px',
        padding: '0 1rem',
        borderBottom: '1px solid var(--glass-border)'
       }}>
        {days.map((day, ix) => {
          const heightPercent = (totals[ix] / maxMins) * 100;
          const isActive = dayOfWeek === ix; 
          return (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%', height: '100%', justifyContent: 'flex-end' }}>
              <div 
                title={formatHours(totals[ix])}
                style={{ 
                  height: `${heightPercent}%`, 
                  width: '100%', 
                  background: isActive ? 'var(--accent-color, #22c55e)' : 'rgba(255, 255, 255, 0.4)',
                  borderRadius: '6px 6px 0 0',
                  minHeight: totals[ix] > 0 ? '4px' : '0',
                  transition: 'height 0.4s ease',
                  cursor: 'pointer'
                }} 
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', padding: '0 1rem' }}>
         {days.map((day, ix) => (
              <div key={'label-'+day} style={{ width: '10%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: dayOfWeek === ix ? 'bold' : 'normal', opacity: dayOfWeek === ix ? 1 : 0.7 }}>{day}</span>
                 <span style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '2px' }}>{totals[ix] > 0 ? formatHours(totals[ix]) : ''}</span>
             </div>
         ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, marginTop: '1.5rem' }}>
        Current Tracking Week (Resets Monday) • Sessions before 2 AM wrap to previous day
      </p>
    </div>
  );
};

export default WeeklyGraph;
