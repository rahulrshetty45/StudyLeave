'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface SubjectCardProps {
  subject: string;
  progress: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
  estimatedCompletion: string;
}

// Define color variants
const colorVariants = {
  blue: {
    light: 'var(--highlight-bg)',
    dark: 'var(--highlight-color)',
    textDark: 'var(--text-primary)',
    progress: 'var(--highlight-color)'
  },
  green: {
    light: 'var(--highlight-bg)',
    dark: '#10B981',
    textDark: 'var(--text-primary)',
    progress: '#10B981'
  },
  purple: {
    light: 'var(--highlight-bg)',
    dark: '#8B5CF6',
    textDark: 'var(--text-primary)',
    progress: '#8B5CF6'
  },
  orange: {
    light: 'var(--highlight-bg)',
    dark: '#F97316',
    textDark: 'var(--text-primary)',
    progress: '#F97316'
  }
};

export default function SubjectCard({ subject, progress, color, estimatedCompletion }: SubjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colorScheme = colorVariants[color];
  
  // Calculate the stroke dash offset for circular progress
  const calculateStrokeDashoffset = (percent: number) => {
    const circumference = 2 * Math.PI * 38; // radius of 38
    return circumference - (circumference * percent) / 100;
  };

  return (
    <div 
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '12px',
        padding: '20px',
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: colorScheme.light,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colorScheme.textDark,
            fontWeight: '600'
          }}>
            {subject.charAt(0)}
          </div>
          
          <div style={{
            fontWeight: '600',
            fontSize: '16px',
            color: 'var(--text-primary)'
          }}>
            {subject}
          </div>
        </div>
        
        <div style={{
          position: 'relative',
          width: '70px',
          height: '70px'
        }}>
          <svg width="70" height="70" viewBox="0 0 90 90">
            <circle 
              cx="45" 
              cy="45" 
              r="38" 
              fill="none" 
              stroke="var(--border-color)" 
              strokeWidth="4" 
            />
            <circle 
              cx="45" 
              cy="45" 
              r="38" 
              fill="none" 
              stroke={colorScheme.progress} 
              strokeWidth="4" 
              strokeDasharray={2 * Math.PI * 38} 
              strokeDashoffset={calculateStrokeDashoffset(progress)}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>
            {progress}%
          </div>
        </div>
      </div>
      
      <div style={{
        marginBottom: '16px'
      }}>
        <div style={{
          height: '4px',
          backgroundColor: 'var(--hover-bg)',
          borderRadius: '2px',
          marginBottom: '4px',
          overflow: 'hidden'
        }}>
          <div 
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: colorScheme.progress,
              borderRadius: '2px'
            }}
          />
        </div>
        
        <div style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
      </div>
      
      <div style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginBottom: '16px'
      }}>
        Est. completion: {estimatedCompletion} weeks
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--highlight-color)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          padding: '0'
        }}>
          View details
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
} 