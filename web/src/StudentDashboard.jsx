import React, { useState, useEffect, useRef } from 'react';
import GoalsComponent from './GoalsComponent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function StudentDashboard({ user, setUser, token }) {
  const [coins, setCoins] = useState(user.coins);
  const [rewards, setRewards] = useState([]);
  const [time, setTime] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  
  // Ref to hold the current time so the extension content script can access it if needed
  const timeRef = useRef(time);
  const isRunningRef = useRef(isRunning);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const fetchLogs = () => {
    fetch(`${API_URL}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setLogs(data));
  };

  useEffect(() => {
    const fetchAll = () => {
      // Fetch latest coins
      fetch(`${API_URL}/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setCoins(data.coins);
        setUser(prev => ({ ...prev, coins: data.coins }));
      });

      // Fetch dynamic rewards
      fetch(`${API_URL}/rewards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setRewards(data));

      // Fetch personal logs
      fetchLogs();
    };

    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [token, setUser]);

  // Handle Stopwatch
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => {
          const newTime = prev + 1;
          // Every 5 minutes (300 seconds), log time to get coins live
          if (newTime % 300 === 0 && newTime !== 0) {
            logTime(5); // Log 5 mins block
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Listen for extension messages
  useEffect(() => {
    const handleMessage = (event) => {
      // The extension content script will send 'PAUSE_TIMER'
      if (event.data && event.data.type === 'PAUSE_TIMER') {
        setIsRunning(false);
        alert(`Distraction Detected: ${event.data.url} is blocked! Timer Paused.`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Listen for tab close to stop timer
  useEffect(() => {
    const handleUnload = () => {
      // If running and there is leftover time to log
      if (isRunningRef.current || timeRef.current > 0) {
        const remainingMinutes = Math.floor((timeRef.current % 300) / 60);
        if (remainingMinutes > 0) {
          fetch(`${API_URL}/logs`, {
            method: 'POST',
            keepalive: true, // ensures the request fires even when tab closes
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ duration_minutes: remainingMinutes })
          });
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [token]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleResume = () => setIsRunning(true);
  const handleFlag = () => {
    alert("Timer flagged for review!");
    setIsRunning(false); // maybe just pause it
  };
  
  const handleStop = async () => {
    setIsRunning(false);
    const remainingMinutes = Math.floor((time % 300) / 60);
    if (remainingMinutes > 0) {
      await logTime(remainingMinutes);
    }
    setTime(0);
    fetchLogs(); // refresh logs visually
  };

  const logTime = async (minutes) => {
    try {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ duration_minutes: minutes })
      });
      const data = await res.json();
      if (data.success && data.earned_coins > 0) {
        setCoins(prev => prev + data.earned_coins);
        // show a nice notification
        new Notification("Coins Earned!", { body: `You got ${data.earned_coins} Sh coins for ${minutes} mins focus!` });
      }
    } catch (e) {
      console.error("Failed to log time", e);
    }
  };

  const redeemReward = async (reward) => {
    if (coins < reward.cost) {
      alert("Not enough 'Sh' coins!");
      return;
    }
    if (!window.confirm(`Redeem ${reward.name} for ${reward.cost} coins?`)) return;

    try {
      const res = await fetch(`${API_URL}/rewards/redeem`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reward_name: reward.name, cost: reward.cost })
      });
      const data = await res.json();
      if (data.success) {
        setCoins(data.remaining_coins);
        alert(`Successfully redeemed ${reward.name}! Lohitaksh has been notified.`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Request Notification Permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div>
      {/* Flower & Greeting */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
        <img 
          src="/shflower.jpeg" 
          alt="Flower" 
          className="spin-slow" 
          style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} 
        />
        <h2 className="title" style={{ marginTop: '1rem', fontSize: '1.8rem', textAlign: 'center' }}>
          Heloo Beautiful!! Study time eh?!
        </h2>
      </div>

      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.2rem', margin: '0' }}>Current balance: <span className="sh-coin" style={{ fontSize: '1.5rem' }}>{coins} Sh Coins</span></p>

        <div className="stopwatch-display">
          {formatTime(time)}
        </div>
        
        <div className="controls">
          {!isRunning && time === 0 && <button className="btn" onClick={handleStart}>Start</button>}
          {!isRunning && time > 0 && <button className="btn" onClick={handleResume}>Resume</button>}
          {isRunning && <button className="btn btn-secondary" onClick={handlePause}>Pause</button>}
          {time > 0 && <button className="btn" style={{background: '#ef4444'}} onClick={handleStop}>Stop</button>}
          {time > 0 && <button className="btn btn-secondary" onClick={handleFlag}>Flag</button>}
        </div>
      </div>

      <h3 className="title" style={{ fontSize: '1.8rem', marginTop: '2rem' }}>Rewards Store</h3>
      <div className="rewards-grid">
        {rewards.map(r => (
          <div className="glass-card reward-card" key={r.id}>
            <img src={r.img || '/generic.png'} alt={r.name} />
            <h4>{r.name}</h4>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'stretch' }}>
              <span className="sh-coin">{r.cost} Sh coins</span>
              <button className="btn" onClick={() => redeemReward(r)} disabled={coins < r.cost}>
                Redeem
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="title" style={{ fontSize: '1.8rem', marginTop: '3rem' }}>My Focus Logs</h3>
      <div className="glass-card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {logs.length === 0 ? <p>No logs yet. Start focusing!</p> : logs.map(log => (
          <div key={log.id} className="list-item" style={{ flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{new Date(log.created_at + 'Z').toLocaleString()}</strong>
              <span>+{log.earned_coins} Sh coins</span>
            </div>
            <div>Focused for {log.duration_minutes} minutes</div>
          </div>
        ))}
      </div>
      
      {/* Shared Goals Module */}
      <GoalsComponent token={token} />
    </div>
  );
}

export default StudentDashboard;
