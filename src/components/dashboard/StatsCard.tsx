'use client';

import React, { useState } from 'react';
import { BookOpen, Clock, FileText, Star } from 'lucide-react';

// Color styles for different cards
const colorStyles = {
  blue: {
    background: 'var(--highlight-bg)',
    icon: 'var(--highlight-color)',
    text: 'var(--text-primary)'
  },
  green: {
    background: 'var(--highlight-bg)',
    icon: '#10B981',
    text: 'var(--text-primary)'
  },
  purple: {
    background: 'var(--highlight-bg)',
    icon: '#8B5CF6',
    text: 'var(--text-primary)'
  },
  orange: {
    background: 'var(--highlight-bg)',
    icon: '#F97316',
    text: 'var(--text-primary)'
  }
};

type StatType = 'subjects' | 'score' | 'time' | 'notes';

interface StatsCardProps {
  type: StatType;
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

export default function StatsCard({ type, value, label, color }: StatsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colorStyle = colorStyles[color];
  
  // Select the appropriate icon based on the type
  const getIcon = () => {
    switch (type) {
      case 'subjects':
        return <BookOpen size={20} />;
      case 'score':
        return <Star size={20} />;
      case 'time':
        return <Clock size={20} />;
      case 'notes':
        return <FileText size={20} />;
      default:
        return <Star size={20} />;
    }
  };

  return (
    <div 
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: 'var(--box-shadow)',
        border: '1px solid var(--border-color)',
        transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        marginBottom: '16px'
      }}>
        <div style={{
          color: colorStyle.icon
        }}>
          {getIcon()}
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '4px'
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          {label}
        </div>
      </div>
    </div>
  );
} 