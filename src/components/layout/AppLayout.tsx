'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AITutor from './AITutor';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Moon, Sun, Send } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import '@/styles/darkMode.css';

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

export default function AppLayout({ children, activePage = 'dashboard' }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [aiTutorWidth, setAiTutorWidth] = useState(320);
  const [aiTutorExpanded, setAiTutorExpanded] = useState(true);
  const [chatInput, setChatInput] = useState('');
  
  useEffect(() => {
    const savedWidth = localStorage.getItem('aiTutorWidth');
    if (savedWidth) {
      setAiTutorWidth(parseInt(savedWidth, 10));
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aiTutorWidth' && e.newValue) {
        setAiTutorWidth(parseInt(e.newValue, 10));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      const currentWidth = localStorage.getItem('aiTutorWidth');
      if (currentWidth && parseInt(currentWidth, 10) !== aiTutorWidth) {
        setAiTutorWidth(parseInt(currentWidth, 10));
      }
      
      const expanded = localStorage.getItem('aiTutorExpanded');
      if (expanded !== null) {
        setAiTutorExpanded(expanded === 'true');
      }
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
    }, [aiTutorWidth]);

  const sendMessageToAITutor = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim()) {
      return;
    }
    
    const pathname = window.location.pathname;
    let context = pathname;
    
    const pathParts = pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'subjects') {
      const subject = pathParts[2] || '';
      const note = pathParts.length >= 4 ? pathParts[3] : '';
      
      context = subject 
        ? (note ? `${subject} - ${note.replace(/-/g, ' ')}` : subject.replace(/-/g, ' '))
        : 'general';
    }
    
    const messageData = {
      message: chatInput,
      context: context,
      timestamp: Date.now()
    };
    
    const isNotePage = pathParts.length >= 4 && pathParts[1] === 'subjects' && pathParts[3];
    
    if (isNotePage) {
      try {
        const event = new CustomEvent('inPageMessage', { detail: messageData });
        window.dispatchEvent(event);
        console.log("Sent message to in-page chat:", messageData);
      } catch (error) {
        console.error("Failed to send message to in-page chat:", error);
      }
    } else {
      try {
        localStorage.setItem('aiTutorExpanded', 'true');
        setAiTutorExpanded(true);
        
        const event = new CustomEvent('sendMessage', { detail: messageData });
        window.dispatchEvent(event);
        console.log("Sent message to AI Tutor via event:", messageData);
      } catch (error) {
        console.error("Failed to send message via event:", error);
        
        localStorage.setItem('pendingQuestion', JSON.stringify(messageData));
        console.log("Stored message in localStorage for AI Tutor to pick up");
      }
    }
    
    setChatInput('');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style jsx global>{`
        .main-content {
          scrollbar-width: thin;
        }
        
        .main-content::-webkit-scrollbar {
          width: 8px;
        }
        
        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .main-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 4px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        
        .floating-chat-input {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
      
      {/* Left Sidebar - Fixed */}
      <Sidebar activePage={activePage} />
      
      {/* Main Content - With margins that respect both sidebar and AI Tutor */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: '240px',
        right: aiTutorExpanded ? `${aiTutorWidth}px` : 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)', 
        overflowX: 'hidden',
        overflowY: 'hidden',
        transition: 'right 0.3s ease'
      }}>
        {/* Top Search Bar */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            position: 'relative',
            width: '320px'
          }}>
            <MagnifyingGlassIcon style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              height: '20px',
              width: '20px',
              color: 'var(--text-tertiary)'
            }} />
            
            <input
              type="text"
              placeholder="Search..."
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                border: 'none',
                paddingLeft: '40px',
                paddingRight: '12px',
                fontSize: '14px',
                outline: 'none',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--input-bg)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--highlight-color)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              JS
            </div>
          </div>
        </div>
        
        {/* Main Content Area */}
        <main className="main-content" style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          height: 'calc(100vh - 64px)', // Subtract header height
          boxSizing: 'border-box', // Ensure padding is included in dimensions
          WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        }}>
          {children}
        </main>
      </div>
      
      {/* Floating Chat Input with background container */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '240px',
        right: aiTutorExpanded ? `${aiTutorWidth}px` : 0,
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        zIndex: 40,
        transition: 'right 0.3s ease',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="floating-chat-input" style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <form 
            onSubmit={sendMessageToAITutor}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '12px',
              padding: '10px 16px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color)',
              width: '100%'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => {
                // Dispatch an event to remember the current cursor position
                try {
                  const event = new CustomEvent('rememberCursorPosition', {});
                  window.dispatchEvent(event);
                } catch (error) {
                  console.error("Failed to dispatch rememberCursorPosition event:", error);
                }
              }}
              placeholder="Ask your AI tutor..."
              style={{
                flex: 1,
                border: 'none',
                backgroundColor: 'transparent',
                padding: '10px 12px',
                borderRadius: '8px',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--highlight-color)',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
      
      {/* Right Sidebar - AI Tutor */}
      <AITutor />
    </div>
  );
} 