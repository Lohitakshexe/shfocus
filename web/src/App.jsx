import React, { useState, useEffect } from 'react';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import Aurora from './Aurora';
import Login from './Login';
import ThemeSwitcher from './ThemeSwitcher';
import './index.css';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [uiStyle, setUiStyle] = useState(localStorage.getItem('uiStyle') || 'vibe');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-ui-style', uiStyle);
  }, [theme, uiStyle]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleStyleChange = (style) => {
    setUiStyle(style);
    localStorage.setItem('uiStyle', style);
  };

  const handleLogin = (data) => {
    const userData = {
      id: data.id,
      username: data.username,
      role: data.role,
      coins: data.coins || 0
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className={`app-container style-${uiStyle}`} style={{ position: 'relative', minHeight: '100vh', transition: 'background-color 0.5s ease' }}>
      {uiStyle === 'vibe' && (
        <Aurora 
          colorStops={["#2db36b", "#0f172a", "#3B00B9"]}
          blend={0.6}
          amplitude={0.3}
          speed={2.5}
        />
      )}
      
      <nav className="navbar glass-card" style={{ marginBottom: '2rem' }}>
        <h1 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>Goals & Rewards</h1>
        <div className="navbar-right">
          <ThemeSwitcher currentStyle={uiStyle} onStyleChange={handleStyleChange} />
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          {user && (
            <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
          )}
        </div>
      </nav>

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        user?.role === 'student' ? (
          <StudentDashboard user={user} setUser={setUser} />
        ) : (
          <AdminDashboard user={user} />
        )
      )}
    </div>
  );
}

export default App;
