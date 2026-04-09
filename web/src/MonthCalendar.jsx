import React from 'react';

const MonthCalendar = ({ logs, title = "This Month" }) => {
  const now = new Date(Date.now() - 7200000);
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const startDay = startOfMonth.getDay(); 
  // In a standard S-M-T-W-T-F-S calendar, startDay (0=Sun, 1=Mon) is exactly the number of empty prepended cells needed relative to Sunday!
  const emptyCellsBefore = startDay; 
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dailyTotals = {};
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      if (!log.created_at || !log.duration_minutes) return;
      
      const logDate = new Date(log.created_at - 7200000);
      if (logDate.getFullYear() === year && logDate.getMonth() === month) {
        const d = logDate.getDate();
        dailyTotals[d] = (dailyTotals[d] || 0) + log.duration_minutes;
      }
    });
  }

  const cells = [];
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // 1. Column Headers
  daysOfWeek.forEach((day, ix) => {
    cells.push(
      <div key={`header-${ix}`} style={{ 
        width: '28px', height: '28px', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: '0.85rem', opacity: 0.8, fontWeight: 'bold',
        paddingBottom: '4px'
      }}>
        {day}
      </div>
    );
  });

  // 2. Empty Paddings
  for (let i = 0; i < emptyCellsBefore; i++) {
    cells.push(<div key={`empty-${i}`} style={{ width: '28px', height: '28px' }} />);
  }

  // 3. The Date Cells
  for (let d = 1; d <= daysInMonth; d++) {
    const mins = dailyTotals[d] || 0;
    
    let bg = 'rgba(255, 255, 255, 0.05)';
    if (mins > 0 && mins <= 30) bg = 'rgba(34, 197, 94, 0.3)';
    else if (mins > 30 && mins <= 60) bg = 'rgba(34, 197, 94, 0.5)';
    else if (mins > 60 && mins <= 120) bg = 'rgba(34, 197, 94, 0.8)';
    else if (mins > 120) bg = 'rgba(34, 197, 94, 1)';

    const formatHours = (m) => {
        const h = Math.floor(m / 60);
        const rm = m % 60;
        if (h === 0) return `${rm}m`;
        return `${h}h ${rm > 0 ? rm + 'm' : ''}`;
    };

    const isToday = d === now.getDate();

    cells.push(
      <div 
        key={`day-${d}`} 
        title={`${d} ${startOfMonth.toLocaleString('default', { month: 'short' })}: ${mins > 0 ? formatHours(mins) : '0m'}`}
        style={{ 
          width: '28px', 
          height: '28px', 
          background: bg,
          borderRadius: '6px',
          cursor: 'pointer',
          border: mins > 0 ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isToday ? '#3b82f6' : 'rgba(255,255,255,0.9)',
          fontSize: '0.8rem',
          fontWeight: mins > 0 || isToday ? 'bold' : 'normal',
          textShadow: mins > 0 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          transition: 'all 0.2s ease',
        }} 
      >
        {d}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-color)', alignSelf: 'flex-start' }}>{title}</h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 28px)', 
        gap: '6px',
        justifyContent: 'center'
      }}>
        {cells}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', opacity: 0.6, marginTop: '1.5rem', gap: '5px' }}>
        <span>Less</span>
        <div style={{ width: '12px', height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px' }} />
        <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '3px' }} />
        <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.5)', borderRadius: '3px' }} />
        <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.8)', borderRadius: '3px' }} />
        <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 1)', borderRadius: '3px' }} />
        <span>More</span>
      </div>
    </div>
  );
};

export default MonthCalendar;
