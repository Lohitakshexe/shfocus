import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';
import GoalsComponent from './GoalsComponent';

function AdminDashboard() {
  const [bannedSites, setBannedSites] = useState([]);
  const [newSite, setNewSite] = useState('');
  const [logs, setLogs] = useState([]);
  const [redeemed, setRedeemed] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [newReward, setNewReward] = useState({ name: '', cost: '', img: 'generic.png' });
  const [pointsToGive, setPointsToGive] = useState('');
  const [studentsStatus, setStudentsStatus] = useState([]);

  useEffect(() => {
    // Real-time listeners — no polling needed!
    const unsubBanned = onValue(ref(db, 'banned-sites'), (snap) => {
      const data = snap.val();
      if (data) {
        setBannedSites(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } else setBannedSites([]);
    });

    const unsubLogs = onValue(ref(db, 'logs'), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
                                      .sort((a, b) => b.created_at - a.created_at)
                                      .slice(0, 50);
        setLogs(list);
      } else setLogs([]);
    });

    const unsubRedeemed = onValue(ref(db, 'redeemed'), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }))
                                      .sort((a, b) => b.created_at - a.created_at);
        setRedeemed(list);
      } else setRedeemed([]);
    });

    const unsubRewards = onValue(ref(db, 'rewards'), (snap) => {
      const data = snap.val();
      if (data) {
        setRewards(Object.keys(data).map(k => ({ id: k, ...data[k] })));
      } else setRewards([]);
    });

    const unsubUsers = onValue(ref(db, 'users'), (snap) => {
      const data = snap.val();
      if (data) {
        const studentList = Object.keys(data)
          .filter(k => data[k].role === 'student')
          .map(k => ({ id: k, ...data[k] }));
        setStudentsStatus(studentList);
      } else setStudentsStatus([]);
    });

    return () => {
      unsubBanned();
      unsubLogs();
      unsubRedeemed();
      unsubRewards();
      unsubUsers();
    };
  }, []);

  const addSite = async (e) => {
    e.preventDefault();
    if (!newSite.trim()) return;
    const newRef = push(ref(db, 'banned-sites'));
    await set(newRef, { url: newSite.trim().toLowerCase() });
    setNewSite('');
  };

  const removeSite = async (id) => {
    await remove(ref(db, `banned-sites/${id}`));
  };

  const grantCoins = async (e) => {
    e.preventDefault();
    const amount = parseInt(pointsToGive);
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    // Get all student users and update their coins
    const usersSnap = await get(ref(db, 'users'));
    if (usersSnap.exists()) {
      const users = usersSnap.val();
      const updates = {};
      Object.keys(users).forEach(uid => {
        if (users[uid].role === 'student') {
          updates[`users/${uid}/coins`] = (users[uid].coins || 0) + amount;
        }
      });
      await update(ref(db), updates);
    }
    alert(`Successfully granted ${amount} Sh coins to all students!`);
    setPointsToGive('');
  };

  const addReward = async (e) => {
    e.preventDefault();
    if (!newReward.name || !newReward.cost) return;
    const newRef = push(ref(db, 'rewards'));
    await set(newRef, { 
      name: newReward.name, 
      cost: parseInt(newReward.cost), 
      img: newReward.img || 'generic.png' 
    });
    setNewReward({ name: '', cost: '', img: 'generic.png' });
  };

  const deleteReward = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    await remove(ref(db, `rewards/${id}`));
  };

  return (
    <div>
      <h2 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Admin Control Panel</h2>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Live Student Status */}
          <div className="glass-card">
            <h3>Live Student Tracker</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Real-time focus status of students.
            </p>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {studentsStatus.length === 0 ? <p>No students found.</p> : studentsStatus.map(student => {
                const s = student.status || { state: 'Offline', time_minutes: 0 };
                let color = s.state === 'Studying' ? '#22c55e' : s.state === 'On Break' ? '#3b82f6' : s.state === 'Paused' ? '#eab308' : '#ef4444';
                return (
                  <div key={student.id} className="list-item" style={{ flexDirection: 'column', gap: '0.3rem', borderLeft: `4px solid ${color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.2rem' }}>{student.username || student.id}</strong>
                      <span style={{ 
                        background: color, 
                        color: '#fff', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>{s.state}</span>
                    </div>
                    {s.state !== 'Offline' && (
                      <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.3rem' }}>
                        Studying for: <strong style={{ color: 'var(--accent-color)' }}>{s.time_minutes} mins</strong>
                        {s.updated_at && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', opacity: 0.5 }}>(Last synced: {new Date(s.updated_at).toLocaleTimeString()})</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grant Coins */}
          <div className="glass-card">
            <h3>Grant Free Points</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Give extra 'Sh' coins to Shreeya.
            </p>
            <form onSubmit={grantCoins} style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="number" 
                placeholder="Amount to grant" 
                value={pointsToGive} 
                onChange={e => setPointsToGive(e.target.value)} 
                style={{ marginBottom: 0 }}
              />
              <button className="btn" type="submit">Give Points</button>
            </form>
          </div>

          {/* Rewards Control */}
          <div className="glass-card">
            <h3>Manage Rewards Store</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Add new rewards or delete existing ones.
            </p>
            <form onSubmit={addReward} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Name" value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} style={{ marginBottom: 0, padding: '0.5rem' }} />
              <input type="number" placeholder="Cost" value={newReward.cost} onChange={e => setNewReward({...newReward, cost: e.target.value})} style={{ marginBottom: 0, padding: '0.5rem', width: '80px' }} />
              <button className="btn" type="submit" style={{ padding: '0.5rem 1rem' }}>Add</button>
            </form>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {rewards.map(r => (
                <div key={r.id} className="list-item" style={{ alignItems: 'center' }}>
                  <span style={{flex: 1}}>{r.name} ({r.cost} Sh coins)</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => deleteReward(r.id, r.name)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Banned Sites */}
          <div className="glass-card">
            <h3>Banned Sites</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              These sites will pause the timer via the extension. Provide domain names (e.g., youtube.com).
            </p>
            <form onSubmit={addSite} style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="e.g. netflix.com" 
                value={newSite} 
                onChange={e => setNewSite(e.target.value)} 
                style={{ marginBottom: 0 }}
              />
              <button className="btn" type="submit">Add</button>
            </form>
            
            <div style={{ marginTop: '1rem' }}>
              {bannedSites.map(site => (
                <div key={site.id} className="list-item">
                  <span>{site.url}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => removeSite(site.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          {/* Time Logs */}
          <div className="glass-card" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <h3>Recent Focus Logs</h3>
            <div style={{ marginTop: '1rem' }}>
              {logs.length === 0 ? <p>No logs yet.</p> : logs.map(log => (
                <div key={log.id} className="list-item" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{log.username || log.user_id}</strong>
                    <span>{new Date(log.created_at || 0).toLocaleString()}</span>
                  </div>
                  <div>Duration: {log.duration_minutes} mins | Earned: +{log.earned_coins} Sh coins</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Redeemed Rewards */}
      <div className="glass-card" style={{ marginTop: '2rem' }}>
        <h3>Redeemed Rewards History</h3>
        <div style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
          {redeemed.length === 0 ? <p>No rewards redeemed yet.</p> : redeemed.map(r => (
            <div key={r.id} className="list-item">
              <span><strong>{r.username}</strong> redeemed <em>{r.reward_name}</em> for {r.cost} Sh coins.</span>
              <span style={{ opacity: 0.6 }}>{new Date(r.created_at || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <GoalsComponent />
    </div>
  );
}

export default AdminDashboard;
