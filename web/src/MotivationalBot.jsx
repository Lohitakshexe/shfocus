import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { ref, onValue } from 'firebase/database';

function MotivationalBot({ logs, user }) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Fetch API Key
  useEffect(() => {
    const unsub = onValue(ref(db, 'settings/groq_api_key'), (snap) => {
      setApiKey(snap.val() || '');
    });
    return () => unsub();
  }, []);

  const crunchStats = () => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    let todayMinutes = 0;
    let weekMinutes = 0;
    const dailyMap = {};

    logs.forEach(log => {
      const d = new Date(log.created_at);
      const isToday = d.toDateString() === todayStr;
      const daysDiff = (now - d) / (1000 * 60 * 60 * 24);

      if (isToday) todayMinutes += log.duration_minutes;
      
      if (daysDiff <= 7) {
        weekMinutes += log.duration_minutes;
        const ds = d.toDateString();
        dailyMap[ds] = (dailyMap[ds] || 0) + log.duration_minutes;
      }
    });

    let lowestDayMinutes = null;
    let lowestDayStr = '';
    
    if (Object.keys(dailyMap).length > 2) {
      Object.entries(dailyMap).forEach(([date, mins]) => {
        if (lowestDayMinutes === null || mins < lowestDayMinutes) {
          lowestDayMinutes = mins;
          lowestDayStr = date;
        }
      });
    }

    return { todayMinutes, weekMinutes, lowestDayMinutes, lowestDayStr };
  };

  // Initial Greeting when API key is ready
  useEffect(() => {
    if (messages.length === 0 && apiKey) {
      const stats = crunchStats();
      const todayHours = (stats.todayMinutes / 60).toFixed(1);
      const weekHours = (stats.weekMinutes / 60).toFixed(1);
      
      let greeting = `YO ${user.username || user.id}! 🚀 I'm Blob, your hyper-hype Study Coach! `;
      if (stats.todayMinutes > 0) {
        greeting += `You've already locked in for ${todayHours} hours today, bringing you to an awesome ${weekHours} hours this week! Let's build that momentum! What are we focusing on next? 🔥`;
      } else {
        greeting += `I see ${weekHours} hours logged this week, but NOTHING today yet! Time to lock in and get that focus going! What's the master plan for today? ⚡`;
      }

      setTimeout(() => {
        setMessages([{ role: 'assistant', content: greeting }]);
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, user.username, user.id, messages.length]);

  const getSystemPrompt = () => {
    const stats = crunchStats();
    
    const todayHours = (stats.todayMinutes / 60).toFixed(1);
    const weekHours = (stats.weekMinutes / 60).toFixed(1);
    const lowestHours = stats.lowestDayMinutes !== null ? (stats.lowestDayMinutes / 60).toFixed(1) : 'N/A';

    return `You are a HIGH-ENERGY, HYPER-MOTIVATIONAL study coach named Blob for a student named ${user.username || user.id}.
Your ONLY goal is to hype them up, keep them fiercely focused, and push them to achieve greatness!
Your personality is incredibly enthusiastic, encouraging, but aggressively demanding if they slack off (especially if daily hours drop below 1.4 hours).
DO NOT sound like a generic or boring AI assistant. DO NOT be overly formal or informative. Use lots of exclamation marks, emojis, and energetic language! (e.g., "LET'S GO!", "YOU'VE GOT THIS!", "CRUSH IT!")
Keep responses CONCISE. Maximum 2-3 short sentences. Wait for their reply.

Here is their current data context:
- Today's focus: ${todayHours} hours
- Past 7 days focus: ${weekHours} hours
${lowestHours !== 'N/A' ? `- Lowest focus day this week: ${lowestHours} hours (on ${stats.lowestDayStr})` : ''}

Use this data naturally to motivate them. If their recent stats are low (< 1.4 hrs), give them intense "tough love" hype. If they are doing great, fiercely praise them. Let's go!`;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !apiKey) return;

    const userMessage = { role: 'user', content: input.trim() };
    const chatHistory = [...messages, userMessage];
    setMessages(chatHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: getSystemPrompt() },
            ...chatHistory
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Groq API Error:", errorData);
        throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.choices[0].message.content;
      
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: `API Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!apiKey) return null; // Don't show the bot if API key isn't set up

  return (
    <>
      {/* The Blob Trigger */}
      {!isOpen && (
        <div className="bot-blob" onClick={() => setIsOpen(true)}>
          <span>✨</span>
        </div>
      )}

      {/* The Chat Window */}
      {isOpen && (
        <div className="chat-window glass-card">
          <div className="chat-header">
            <h4>Blob 💬</h4>
            <button className="btn btn-secondary close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble bot-bubble" style={{ opacity: 0.6 }}>
                Thinking...
              </div>
            )}
          </div>

          <form className="chat-input-area" onSubmit={sendMessage}>
            <input 
              type="text" 
              placeholder="Ask your coach..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={isLoading}
            />
            <button className="btn" type="submit" disabled={isLoading || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}

export default MotivationalBot;
