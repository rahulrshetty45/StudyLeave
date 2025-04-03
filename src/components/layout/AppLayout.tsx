'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AITutor from './AITutor';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Moon, Sun } from 'lucide-react';
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
  
  // Listen for changes to the AI tutor width in localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem('aiTutorWidth');
    if (savedWidth) {
      setAiTutorWidth(parseInt(savedWidth, 10));
    }
    
    // Create a storage event listener to update width when it changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'aiTutorWidth' && e.newValue) {
        setAiTutorWidth(parseInt(e.newValue, 10));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check localStorage periodically for changes
    const interval = setInterval(() => {
      const currentWidth = localStorage.getItem('aiTutorWidth');
      if (currentWidth && parseInt(currentWidth, 10) !== aiTutorWidth) {
        setAiTutorWidth(parseInt(currentWidth, 10));
      }
      
      // Also check if AI tutor is expanded
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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Add custom scrollbar styles */}
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
      
      {/* Right Sidebar - AI Tutor */}
      <AITutor />
    </div>
  );
} 