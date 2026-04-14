import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';

function GoalsComponent({ user }) {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState({ text: '', type: 'daily' });
  const [draggedGoal, setDraggedGoal] = useState(null);
  const [activeTab, setActiveTab] = useState(user?.id || 'lohitaksh');
  
  const isReadOnly = activeTab !== user?.id;

  useEffect(() => {
    const goalsRef = ref(db, 'goals');
    const unsubscribe = onValue(goalsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const goalsList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).sort((a, b) => {
          const aVal = a.order !== undefined ? a.order : a.created_at;
          const bVal = b.order !== undefined ? b.order : b.created_at;
          return aVal - bVal;
        });
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
      // Give the new goal an order value at the end of its respective list
      const typeList = goals.filter(g => g.type === newGoal.type && g.user_id === user.id);
      const newOrder = typeList.length > 0 ? (typeList[typeList.length - 1].order || typeList.length) + 1 : 0;
      
      await set(newGoalRef, {
          text: newGoal.text,
          type: newGoal.type,
          completed: false,
          created_at: Date.now(),
          order: newOrder,
          user_id: user.id
      });
      setNewGoal({ text: '', type: newGoal.type });
    } catch(e) {
      console.error(e);
    }
  };

  const toggleGoal = async (id, currentCompleted) => {
    if (isReadOnly) return;
    try {
      const goalRef = ref(db, `goals/${id}`);
      await update(goalRef, { completed: !currentCompleted });
    } catch(e) {
      console.error(e);
    }
  };

  const clearAllGoals = async () => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to permanently clear ALL your goals?")) return;
    try {
      const myGoals = goals.filter(g => g.user_id === user.id);
      const updates = {};
      myGoals.forEach(g => {
        updates[`goals/${g.id}`] = null;
      });
      await update(ref(db), updates);
    } catch(e) {
      console.error(e);
    }
  };

  const handleDragStart = (e, goal) => {
    if (isReadOnly) return e.preventDefault();
    setDraggedGoal(goal);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedGoal(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetGoal, type) => {
    e.preventDefault();
    if (isReadOnly || !draggedGoal || draggedGoal.id === targetGoal.id || draggedGoal.type !== type) return;

    let list = [...goals].filter(g => g.type === type && g.user_id === user.id);
    const draggedIdx = list.findIndex(g => g.id === draggedGoal.id);
    const targetIdx = list.findIndex(g => g.id === targetGoal.id);
    
    list.splice(draggedIdx, 1);
    list.splice(targetIdx, 0, draggedGoal);

    try {
      const updates = {};
      list.forEach((g, index) => {
        updates[`goals/${g.id}/order`] = index;
      });
      await update(ref(db), updates);
    } catch(err) {
      console.error("Failed to reorder", err);
    }
  };

  const displayGoals = goals.filter(g => g.user_id === activeTab);
  const dailyGoals = displayGoals.filter(g => g.type === 'daily');
  const weeklyGoals = displayGoals.filter(g => g.type === 'weekly');

  const otherUser = user?.id === 'lohitaksh' ? 'shreeya' : 'lohitaksh';
  const otherUserName = user?.id === 'lohitaksh' ? "Shreeya's" : "Lohitaksh's";

  return (
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn" 
            style={{ padding: '0.5rem 1.5rem', background: activeTab === user?.id ? 'var(--accent-color)' : 'transparent', color: activeTab === user?.id ? '#fff' : 'var(--text-color)', border: activeTab === user?.id ? 'none' : '1px solid var(--glass-border)', borderRadius: '12px' }}
            onClick={() => setActiveTab(user?.id)}
          >
            My Goals
          </button>
          <button 
            className="btn" 
            style={{ padding: '0.5rem 1.5rem', background: activeTab === otherUser ? 'var(--accent-color)' : 'transparent', color: activeTab === otherUser ? '#fff' : 'var(--text-color)', border: activeTab === otherUser ? 'none' : '1px solid var(--glass-border)', borderRadius: '12px' }}
            onClick={() => setActiveTab(otherUser)}
          >
            {otherUserName} Goals 🔒
          </button>
        </div>
        
        {!isReadOnly && (
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={clearAllGoals}>
            Clear My Goals
          </button>
        )}
      </div>

      {!isReadOnly && (
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
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div onDragOver={handleDragOver}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--accent-color)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Daily Tasks</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {dailyGoals.length === 0 ? <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>No daily goals yet.</p> : dailyGoals.map(g => (
              <div 
                key={g.id} 
                draggable={!isReadOnly}
                onDragStart={(e) => handleDragStart(e, g)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, g, g.type)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  cursor: isReadOnly ? 'default' : 'grab',
                  transition: 'opacity 0.2s',
                  opacity: g.completed ? 0.6 : 1
                }}
              >
                {!isReadOnly && <div style={{ cursor: 'grab', color: 'var(--accent-color)', opacity: 0.5, fontSize: '1.2rem', userSelect: 'none' }}>⋮⋮</div>}
                <input 
                  type="checkbox" 
                  checked={g.completed ? true : false} 
                  onChange={() => toggleGoal(g.id, g.completed)} 
                  disabled={isReadOnly}
                  style={{ width: 'auto', marginBottom: 0, transform: 'scale(1.4)', cursor: isReadOnly ? 'default' : 'pointer' }}
                />
                <span style={{ textDecoration: g.completed ? 'line-through' : 'none', flex: 1 }}>{g.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div onDragOver={handleDragOver}>
           <h4 style={{ marginBottom: '1rem', color: 'var(--accent-color)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Weekly Tasks</h4>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {weeklyGoals.length === 0 ? <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>No weekly goals yet.</p> : weeklyGoals.map(g => (
              <div 
                key={g.id} 
                draggable={!isReadOnly}
                onDragStart={(e) => handleDragStart(e, g)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, g, g.type)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)', 
                  padding: '1rem', 
                  borderRadius: '12px',
                  cursor: isReadOnly ? 'default' : 'grab',
                  transition: 'opacity 0.2s',
                  opacity: g.completed ? 0.6 : 1
                }}
              >
                {!isReadOnly && <div style={{ cursor: 'grab', color: 'var(--accent-color)', opacity: 0.5, fontSize: '1.2rem', userSelect: 'none' }}>⋮⋮</div>}
                <input 
                  type="checkbox" 
                  checked={g.completed ? true : false} 
                  onChange={() => toggleGoal(g.id, g.completed)} 
                  disabled={isReadOnly}
                  style={{ width: 'auto', marginBottom: 0, transform: 'scale(1.4)', cursor: isReadOnly ? 'default' : 'pointer' }}
                />
                <span style={{ textDecoration: g.completed ? 'line-through' : 'none', flex: 1 }}>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GoalsComponent;
