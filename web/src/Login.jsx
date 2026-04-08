import React, { useState } from 'react';
import { db } from './firebase';
import { ref, get, child } from 'firebase/database';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${username.toLowerCase()}`));
      if (snapshot.exists()) {
        const user = snapshot.val();
        if (user.password === password) {
            onLogin({ 
               id: username.toLowerCase(), 
               username: user.username || username, 
               role: user.role, 
               coins: user.coins || 0 
            });
        } else {
            setError('Invalid password');
        }
      } else {
        // Auto-create for ease of setup if it doesn't exist? Or just fail.
        setError('User not found. Check database.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10vh' }}>
      <div className="glass-card" style={{ width: '400px' }}>
        <h2 className="title" style={{ textAlign: 'center', fontSize: '2rem' }}>Welcome Back</h2>
        {error && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button type="submit" className="btn" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
