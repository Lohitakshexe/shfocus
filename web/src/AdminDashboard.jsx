import React, { useState, useEffect } from 'react';
import GoalsComponent from './GoalsComponent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function AdminDashboard({ user, token }) {
  const [bannedSites, setBannedSites] = useState([]);
  const [newSite, setNewSite] = useState('');
  const [logs, setLogs] = useState([]);
  const [redeemed, setRedeemed] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [newReward, setNewReward] = useState({ name: '', cost: '', img: '/generic.png' });
  const [pointsToGive, setPointsToGive] = useState('');

  const fetchRewards = async () => {
    const res = await fetch(`${API_URL}/rewards`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setRewards(await res.json());
  };

  const fetchBannedSites = async () => {
    const res = await fetch(`${API_URL}/banned-sites`);
    const data = await res.json();
    setBannedSites(data);
  };

  const fetchLogs = async () => {
    const res = await fetch(`${API_URL}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setLogs(await res.json());
  };

  const fetchRedeemed = async () => {
    const res = await fetch(`${API_URL}/rewards/redeemed`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setRedeemed(await res.json());
  };

  useEffect(() => {
    const fetchAll = () => {
      fetchBannedSites();
      fetchLogs();
      fetchRedeemed();
      fetchRewards();
    };
    
    fetchAll(); // Initial fetch
    // Real-time polling every 3 seconds
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const addSite = async (e) => {
    e.preventDefault();
    if (!newSite.trim()) return;
    const res = await fetch(`${API_URL}/banned-sites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url: newSite })
    });
    if (res.ok) {
      setNewSite('');
      fetchBannedSites();
    }
  };

  const removeSite = async (id) => {
    const res = await fetch(`${API_URL}/banned-sites/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchBannedSites();
    }
  };

  return (
    <div>
      <h2 className="title" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Admin Control Panel</h2>
      
      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Grant Coins Control */}
          <div className="glass-card">
            <h3>Grant Free Points</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Give extra 'Sh' coins to Shreeya.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!pointsToGive || isNaN(pointsToGive)) return;
              const res = await fetch(`${API_URL}/admin/grant-coins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: parseInt(pointsToGive) })
              });
              if (res.ok) {
                alert(`Successfully granted ${pointsToGive} coins to Shreeya!`);
                setPointsToGive('');
              }
            }} style={{ display: 'flex', gap: '1rem' }}>
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
            <form onSubmit={async (e) => {
              e.preventDefault();
              if(!newReward.name || !newReward.cost) return;
              const res = await fetch(`${API_URL}/rewards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newReward.name, cost: parseInt(newReward.cost), img: newReward.img })
              });
              if(res.ok) {
                setNewReward({ name: '', cost: '', img: '/generic.png' });
                fetchRewards();
              }
            }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Name" value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} style={{ marginBottom: 0, padding: '0.5rem' }} />
              <input type="number" placeholder="Cost" value={newReward.cost} onChange={e => setNewReward({...newReward, cost: e.target.value})} style={{ marginBottom: 0, padding: '0.5rem', width: '80px' }} />
              <button className="btn" type="submit" style={{ padding: '0.5rem 1rem' }}>Add</button>
            </form>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {rewards.map(r => (
                <div key={r.id} className="list-item" style={{ alignItems: 'center' }}>
                  <span style={{flex: 1}}>{r.name} ({r.cost} coins)</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={async () => {
                    if(!window.confirm(`Delete ${r.name}?`)) return;
                    await fetch(`${API_URL}/rewards/${r.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
                    fetchRewards();
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Banned Sites Control */}
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
                    <strong>{log.username}</strong>
                    <span>{new Date(log.created_at + 'Z').toLocaleString()}</span>
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
              <span><strong>{r.username}</strong> redeemed <em>{r.reward_name}</em> for {r.cost} coins.</span>
              <span style={{ opacity: 0.6 }}>{new Date(r.timestamp + 'Z').toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Goals Module */}
      <GoalsComponent token={token} />
    </div>
  );
}

export default AdminDashboard;
