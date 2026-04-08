import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue, push, set, update, get } from 'firebase/database';
import GoalsComponent from './GoalsComponent';

function StudentDashboard({ user, setUser }) {
  const [coins, setCoins] = useState(user.coins || 0);
  const [rewards, setRewards] = useState([]);
  const [time, setTime] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const timeRef = useRef(time);
  const isRunningRef = useRef(isRunning);

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

    // Fetch personal logs
    const logsRef = ref(db, 'logs');
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let lList = Object.keys(data).map(k => ({ id: k, ...data[k] }))
                                   .filter(l => l.user_id === user.id)
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

  // Handle Stopwatch
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prev => {
          const newTime = prev + 1;
          if (newTime % 300 === 0 && newTime !== 0) {
            logTime(5);
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
      if (event.data && event.data.type === 'PAUSE_TIMER') {
        setIsRunning(false);
        alert(`Distraction Detected: ${event.data.url} is blocked! Timer Paused.`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Window unload leftover logging
  useEffect(() => {
    const handleUnload = () => {
      if (isRunningRef.current || timeRef.current > 0) {
        const remainingMinutes = Math.floor((timeRef.current % 300) / 60);
        if (remainingMinutes > 0) {
          // Fire-and-forget sync to Firebase
          const newLogRef = push(ref(db, 'logs'));
          set(newLogRef, {
            user_id: user.id,
            duration_minutes: remainingMinutes,
            earned_coins: 0,
            created_at: Date.now()
          });
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

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleResume = () => setIsRunning(true);
  const handleFlag = () => {
    alert("Timer flagged for review!");
    setIsRunning(false);
  };
  
  const handleStop = async () => {
    setIsRunning(false);
    const remainingMinutes = Math.floor((time % 300) / 60);
    if (remainingMinutes > 0) {
      await logTime(remainingMinutes);
    }
    setTime(0);
  };

  const logTime = async (minutes) => {
    try {
      const intervals = Math.floor(minutes / 5);
      const earned_coins = intervals * 5;

      const newLogRef = push(ref(db, 'logs'));
      await set(newLogRef, {
        user_id: user.id,
        duration_minutes: minutes,
        earned_coins: earned_coins,
        created_at: Date.now()
      });

      if (earned_coins > 0) {
        const userRef = ref(db, `users/${user.id}`);
        // Fetch current coins accurately
        const snap = await get(userRef);
        const currentCoins = snap.exists() ? (snap.val().coins || 0) : 0;
        await update(userRef, { coins: currentCoins + earned_coins });
        new Notification("Coins Earned!", { body: `You got ${earned_coins} Sh coins for ${minutes} mins focus!` });
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

  return (
    <div>
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
              <strong>{new Date(log.created_at || Date.now()).toLocaleString()}</strong>
              <span>+{log.earned_coins} Sh coins</span>
            </div>
            <div>Focused for {log.duration_minutes} minutes</div>
          </div>
        ))}
      </div>
      
      <GoalsComponent />
    </div>
  );
}

export default StudentDashboard;
