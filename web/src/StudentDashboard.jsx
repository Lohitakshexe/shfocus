import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, push, set, update, get } from 'firebase/database';
import GoalsComponent from './GoalsComponent';
import WeeklyGraph from './WeeklyGraph';
import MonthCalendar from './MonthCalendar';
import MotivationalBot from './MotivationalBot';
import Clock from './Clock';

function StudentDashboard({ user, setUser }) {
  const [coins, setCoins] = useState(user.coins || 0);
  const [rewards, setRewards] = useState([]);
  const [time, setTime] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);
  const [statusLabel, setStatusLabel] = useState('Offline');
  const [statusStartedAt, setStatusStartedAt] = useState(() => Date.now());
  const [, setTick] = useState(0); // Force re-render for time display

  
  const timeRef = useRef(time);
  const startTimeRef = useRef(null);
  const isRunningRef = useRef(isRunning);

  async function awardCoins(amount) {
    try {
      const userRef = ref(db, `users/${user.id}`);
      const snap = await get(userRef);
      const currentCoins = snap.exists() ? (snap.val().coins || 0) : 0;
      await update(userRef, { coins: currentCoins + amount });
      
      const msg = `You got ${amount} Sh coins for 5 mins focus!`;
      setToast(msg);
      setTimeout(() => setToast(null), 5000);

      if (window.Notification && Notification.permission === 'granted') {
        new Notification("Coins Earned!", { body: msg });
      }
    } catch (e) {
      console.error("Failed to award coins", e);
    }
  }

  async function recordLog(minutes) {
    try {
      const earned_coins = Math.floor(minutes / 5) * 5;

      const newLogRef = push(ref(db, 'logs'));
      await set(newLogRef, {
        user_id: user.id,
        username: user.username,
        duration_minutes: minutes,
        earned_coins: earned_coins,
        created_at: Date.now()
      });
    } catch (e) {
      console.error("Failed to record log", e);
    }
  }

  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    // Fetch user coins dynamically
    const userRef = ref(db, `users/${user.id}`);
    const unsubUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.coins !== undefined) {
        setCoins(data.coins);
        setUser(prev => ({ ...prev, coins: data.coins }));
      }
    });

    // Fetch dynamic rewards
    const rewardsRef = ref(db, 'rewards');
    const unsubRewards = onValue(rewardsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rList = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        setRewards(rList);
      } else setRewards([]);
    });

    // Fetch all logs
    const logsRef = ref(db, 'logs');
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let lList = Object.keys(data).map(k => ({ id: k, ...data[k] }))
                                   .sort((a,b) => b.created_at - a.created_at);
        setLogs(lList);
      } else {
        setLogs([]);
      }
    });

    return () => {
      unsubUser();
      unsubRewards();
      unsubLogs();
    };
  }, [user.id, setUser]);

  const syncStatus = (state, seconds) => {
    const now = Date.now();
    
    if (state !== statusLabel) {
      setStatusLabel(state);
      setStatusStartedAt(now);
    }
    
    try {
      update(ref(db, `users/${user.id}/status`), {
        state,
        time_minutes: Math.floor(seconds / 60),
        started_at: state !== statusLabel ? now : statusStartedAt,
        last_heartbeat: now
      });
    } catch (e) {
      console.error("Failed to sync status", e);
    }
  };

  // Handle Stopwatch
  useEffect(() => {
    let interval;
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - (timeRef.current * 1000);
      }
      interval = setInterval(() => {
        setTime(prev => {
          const actualElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          
          if (actualElapsed > prev) {
            // Award coins for EVERY 5 min boundary crossed
            const prev5MinBlocks = Math.floor(prev / 300);
            const new5MinBlocks = Math.floor(actualElapsed / 300);
            if (new5MinBlocks > prev5MinBlocks) {
              const blocksCrossed = new5MinBlocks - prev5MinBlocks;
              awardCoins(5 * blocksCrossed);
            }
            
            // Sync status for EVERY 1 min boundary crossed
            const prev1MinBlocks = Math.floor(prev / 60);
            const new1MinBlocks = Math.floor(actualElapsed / 60);
            if (new1MinBlocks > prev1MinBlocks) {
              syncStatus('Studying', actualElapsed);
            }

            // Hydration reminder EVERY 15 min boundary (900 seconds)
            const prev15MinBlocks = Math.floor(prev / 900);
            const new15MinBlocks = Math.floor(actualElapsed / 900);
            if (new15MinBlocks > prev15MinBlocks) {
              if (window.Notification && Notification.permission === 'granted') {
                new Notification("Hydration Reminder 💧", {
                  body: "It's been 15 minutes! Please take a quick sip of water to stay fresh and focused.",
                });
              }
            }

            // Pomodoro Break reminder EVERY 24 min boundary (1440 seconds)
            const prev24MinBlocks = Math.floor(prev / 1440);
            const new24MinBlocks = Math.floor(actualElapsed / 1440);
            if (new24MinBlocks > prev24MinBlocks) {
              if (window.Notification && Notification.permission === 'granted') {
                new Notification("Pomodoro Break! 🛎️", {
                  body: "You've been focusing for roughly 25 minutes. Take a 5-minute break to rest your eyes and stretch!",
                });
              }
            }
          }
          return actualElapsed;
        });
      }, 1000);
    } else {
      startTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [isRunning, user.id]);


  // Listen for extension messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'PAUSE_TIMER') {
        setIsRunning(false);
        syncStatus('Paused', timeRef.current);
        alert(`Distraction Detected: ${event.data.url} is blocked! Timer Paused.`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);


  // Window unload leftover logging
  useEffect(() => {
    const handleUnload = () => {
      syncStatus('Offline', 0);
      if (isRunningRef.current || timeRef.current > 0) {
        const totalMinutes = Math.floor(timeRef.current / 60);
        if (totalMinutes > 0) {
            recordLog(totalMinutes);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user.id]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(true);
    syncStatus('Studying', time);
  };
  const handlePause = () => {
    setIsRunning(false);
    syncStatus('Paused', time);
  };
  const handleResume = () => {
    setIsRunning(true);
    syncStatus('Studying', time);
  };
  const handleFlag = () => {
    alert("Timer flagged for review!");
    setIsRunning(false);
    syncStatus('Paused', time);
  };

  const handleBreak = () => {
    setIsRunning(false);
    syncStatus('On Break', time);
  };
  
  const handleStop = async () => {
    setIsRunning(false);
    const totalMinutes = Math.floor(time / 60);
    if (totalMinutes > 0) {
      await recordLog(totalMinutes);
    }
    syncStatus('Offline', 0);
    setTime(0);
  };


  const redeemReward = async (reward) => {
    if (coins < reward.cost) {
      alert("Not enough 'Sh' coins!");
      return;
    }
    if (!window.confirm(`Redeem ${reward.name} for ${reward.cost} coins?`)) return;

    try {
      const userRef = ref(db, `users/${user.id}`);
      const snap = await get(userRef);
      const currentCoins = snap.exists() ? (snap.val().coins || 0) : 0;

      if (currentCoins < reward.cost) {
          alert("Not enough coins! Balance changed.");
          return;
      }

      await update(userRef, { coins: currentCoins - reward.cost });
      
      const redeemedRef = push(ref(db, 'redeemed'));
      await set(redeemedRef, {
        user_id: user.id,
        username: user.username,
        reward_name: reward.name,
        cost: reward.cost,
        created_at: Date.now()
      });

      alert(`Successfully redeemed ${reward.name}! Lohitaksh has been notified.`);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const otherUser = user?.id === 'lohitaksh' ? 'shreeya' : 'lohitaksh';
  const otherUserName = user?.id === 'lohitaksh' ? "Shreeya" : "Lohitaksh";

  const myLogs = logs.filter(l => l.user_id === user?.id);
  const otherLogs = logs.filter(l => l.user_id === otherUser);

  return (
    <div>
      {toast && (
        <div className="glass-card" style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 1000, 
          background: 'rgba(34, 197, 94, 0.9)', 
          color: 'white',
          padding: '1rem 2rem',
          fontWeight: 'bold',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', marginTop: '1rem' }}>
        <h2 className="title" style={{ marginTop: '1rem', fontSize: '1.8rem', textAlign: 'center' }}>
          {user.id === 'lohitaksh' ? 'hello lohitaksh' : 'Heloo Beautiful!! Study time eh?!'}
        </h2>
      </div>

      <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ fontSize: '1.2rem', margin: '0' }}>Current balance: <span className="sh-coin" style={{ fontSize: '1.5rem' }}>{coins} Sh Coins</span></p>

        <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 'bold', color: statusLabel === 'Studying' ? '#22c55e' : statusLabel === 'On Break' ? '#3b82f6' : statusLabel === 'Paused' ? '#eab308' : '#ef4444' }}>
          Status: {statusLabel} {statusLabel !== 'Offline' && (
            <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 'normal', fontStyle: 'italic' }}>
              (Since {Math.floor((Date.now() - statusStartedAt) / 60000)} mins ago)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', margin: '2.5rem 0' }}>
          <Clock size={160} />
          <div className="stopwatch-display" style={{ margin: 0 }}>
            {formatTime(time)}
          </div>
        </div>
        
        <div className="controls">
          {!isRunning && time === 0 && <button className="btn" onClick={handleStart}>Start</button>}
          {!isRunning && time > 0 && <button className="btn" onClick={handleResume}>Resume</button>}
          {isRunning && <button className="btn btn-secondary" onClick={handlePause}>Pause</button>}
          {!isRunning && time > 0 && statusLabel !== 'On Break' && <button className="btn" style={{background: '#3b82f6'}} onClick={handleBreak}>Take Break</button>}
          {time > 0 && <button className="btn" style={{background: '#ef4444'}} onClick={handleStop}>Stop</button>}
          {time > 0 && <button className="btn btn-secondary" onClick={handleFlag}>Flag</button>}
        </div>
      </div>

      <h3 className="title" style={{ fontSize: '1.8rem', marginTop: '2rem' }}>Rewards Store</h3>
      <div className="rewards-grid">
        {rewards.map(r => (
          <div className="glass-card reward-card" key={r.id}>
            <img src={r.img ? (import.meta.env.BASE_URL + r.img) : (import.meta.env.BASE_URL + 'generic.png')} alt={r.name} />
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

      <div style={{ marginTop: '3rem' }}>
        <h3 className="title" style={{ fontSize: '1.8rem', textAlign: 'center' }}>Transparency Board: Focus Stats</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
          {/* My Stats Section */}
          <div className="glass-card" style={{ border: '2px solid var(--accent-color)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--accent-color)', textAlign: 'center', fontSize: '1.4rem' }}>My Progress</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <WeeklyGraph logs={myLogs} title="Weekly Hours" />
              <MonthCalendar logs={myLogs} title="Daily Heatmap" />
              <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                <h5 style={{ marginBottom: '0.5rem' }}>Direct Logs</h5>
                {myLogs.length === 0 ? <p>No logs yet.</p> : myLogs.map(log => (
                  <div key={log.id} className="list-item" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>
                    <span>{new Date(log.created_at || 0).toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}</span>
                    <span>{log.duration_minutes}m (+{log.earned_coins} Sh)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Other Student Stats Section */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '1rem', opacity: 0.8, textAlign: 'center', fontSize: '1.4rem' }}>{otherUserName}'s Progress</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <WeeklyGraph logs={otherLogs} title={`${otherUserName}'s Weekly Hours`} />
              <MonthCalendar logs={otherLogs} title={`${otherUserName}'s Heatmap`} />
              <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                <h5 style={{ marginBottom: '0.5rem' }}>{otherUserName}'s Logs</h5>
                {otherLogs.length === 0 ? <p>No logs yet.</p> : otherLogs.map(log => (
                  <div key={log.id} className="list-item" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>
                    <span>{new Date(log.created_at || 0).toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}</span>
                    <span>{log.duration_minutes}m (+{log.earned_coins} Sh)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      
      <GoalsComponent user={user} />
      
      {/* Motivational Grok Bot */}
      <MotivationalBot logs={logs} user={user} />
    </div>
  );
}

export default StudentDashboard;
