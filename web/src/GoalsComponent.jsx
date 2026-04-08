import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';

function GoalsComponent({ token }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ text: '', type: 'daily' });

  useEffect(() => {
    const goalsRef = ref(db, 'goals');
    const unsubscribe = onValue(goalsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const goalsList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).sort((a, b) => a.created_at - b.created_at);
        setGoals(goalsList);
      } else {
        setGoals([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const addGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.text.trim()) return;
    try {
      const goalsRef = ref(db, 'goals');
      const newGoalRef = push(goalsRef);
      await set(newGoalRef, {
          text: newGoal.text,
          type: newGoal.type,
          completed: false,
          created_at: Date.now()
      });
      setNewGoal({ text: '', type: newGoal.type });
    } catch(e) {
      console.error(e);
    }
  };

  const toggleGoal = async (id, currentCompleted) => {
    try {
      const goalRef = ref(db, `goals/${id}`);
      await update(goalRef, { completed: !currentCompleted });
    } catch(e) {
      console.error(e);
    }
  };

  const clearAllGoals = async () => {
    if (!window.confirm("Are you sure you want to permanently clear ALL goals?")) return;
    try {
      const goalsRef = ref(db, 'goals');
      await remove(goalsRef);
    } catch(e) {
      console.error(e);
    }
  };

  const dailyGoals = goals.filter(g => g.type === 'daily');
  const weeklyGoals = goals.filter(g => g.type === 'weekly');

  return (
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Goals</h3>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={clearAllGoals}>
          Clear All Goals
        </button>
      </div>

      <form onSubmit={addGoal} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="New Goal..." 
          value={newGoal.text} 
          onChange={e => setNewGoal({...newGoal, text: e.target.value})} 
          style={{ marginBottom: 0 }}
        />
        <select 
          value={newGoal.type} 
          onChange={e => setNewGoal({...newGoal, type: e.target.value})}
          style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-color)' }}
        >
          <option value="daily" style={{ color: '#000' }}>Daily</option>
          <option value="weekly" style={{ color: '#000' }}>Weekly</option>
        </select>
        <button type="submit" className="btn">Add</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Daily Tasks</h4>
          {dailyGoals.length === 0 ? <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>No daily goals yet.</p> : dailyGoals.map(g => (
            <div key={g.id} className="list-item" style={{ alignItems: 'center', gap: '1rem' }}>
              <input 
                type="checkbox" 
                checked={g.completed ? true : false} 
                onChange={() => toggleGoal(g.id, g.completed)} 
                style={{ width: 'auto', marginBottom: 0, transform: 'scale(1.5)' }}
              />
              <span style={{ textDecoration: g.completed ? 'line-through' : 'none', opacity: g.completed ? 0.5 : 1 }}>{g.text}</span>
            </div>
          ))}
        </div>

        <div>
           <h4 style={{ marginBottom: '1rem', color: 'var(--accent-color)' }}>Weekly Tasks</h4>
          {weeklyGoals.length === 0 ? <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>No weekly goals yet.</p> : weeklyGoals.map(g => (
            <div key={g.id} className="list-item" style={{ alignItems: 'center', gap: '1rem' }}>
              <input 
                type="checkbox" 
                checked={g.completed ? true : false} 
                onChange={() => toggleGoal(g.id, g.completed)} 
                style={{ width: 'auto', marginBottom: 0, transform: 'scale(1.5)' }}
              />
              <span style={{ textDecoration: g.completed ? 'line-through' : 'none', opacity: g.completed ? 0.5 : 1 }}>{g.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GoalsComponent;
