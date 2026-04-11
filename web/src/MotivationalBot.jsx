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
        greeting += `You've locked in for ${todayHours} hours today, bringing you to ${weekHours} hours this week. Let's keep working. What are we focusing on next? 🔥`;
      } else {
        greeting += `I see ${weekHours} hours logged this week, but zero hours today. Time to stop slacking and lock in. What's the plan for today? ⚡`;
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

    return `You are a motivational study coach named Blob for a student named ${user.username || user.id}.
Your goal is to keep them focused and push them to achieve greatness.
Your personality is supportive but STRICT. You are not a hyper cheerleader; you are here to hold them accountable. If they are doing well, offer solid encouragement. If their focus drops (especially if daily hours are below 1.4 hours) or if they make excuses, be firm, direct, and push them to get back to work without babying them.
DO NOT sound like a generic AI assistant. Be conversational, direct, assertive, and use occasional emojis.
Keep responses CONCISE. Maximum 2-3 short sentences. Wait for their reply.

Here is their current data context:
- Today's focus: ${todayHours} hours
- Past 7 days focus: ${weekHours} hours
${lowestHours !== 'N/A' ? `- Lowest focus day this week: ${lowestHours} hours (on ${stats.lowestDayStr})` : ''}

Use this data naturally to guide them. If their stats are low (< 1.4 hrs), give them strict "tough love". If they are doing great, offer firm praise. Get them to study.`;
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
