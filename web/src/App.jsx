import React, { useState, useEffect } from 'react';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import Aurora from './Aurora';
import Login from './Login';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      id: data.id,
      username: data.username,
      role: data.role,
      coins: data.coins
    }));
    setToken(data.token);
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <Aurora 
        colorStops={["#2db36b", "#0f172a", "#3B00B9"]}
        blend={0.6}
        amplitude={0.3}
        speed={2.5}
      />
      <nav className="navbar glass-card" style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>Goals & Rewards</h1>
        <div className="navbar-right">
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          {user && (
            <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
          )}
        </div>
      </nav>

      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        user?.role === 'student' ? (
          <StudentDashboard user={user} setUser={setUser} token={token} />
        ) : (
          <AdminDashboard user={user} token={token} />
        )
      )}
    </div>
  );
}

export default App;
