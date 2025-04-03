'use client';

import React, { useState } from 'react';

interface Test {
  id: string;
  title: string;
  subject: string;
  details: string;
  date: string;
}

interface UpcomingTestsProps {
  tests: Test[];
}

export default function UpcomingTests({ tests }: UpcomingTestsProps) {
  const TestCard = ({ test }: { test: Test }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        key={test.id}
        style={{
          padding: '16px 20px',
          borderBottom: test.id !== tests[tests.length - 1].id ? '1px solid var(--border-color)' : 'none',
          transition: 'all 0.2s ease-in-out',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          backgroundColor: isHovered ? 'var(--hover-bg)' : 'transparent',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            {test.title}
          </h3>
          <span style={{
            fontSize: '12px',
            backgroundColor: test.date === 'Tomorrow' ? 'rgba(247, 183, 49, 0.2)' : 'var(--highlight-bg)',
            color: test.date === 'Tomorrow' ? '#F7B731' : 'var(--highlight-color)',
            borderRadius: '9999px',
            padding: '2px 10px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {test.date}
          </span>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: 'var(--text-tertiary)'
        }}>
          {test.subject} • {test.details}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '12px',
      boxShadow: 'var(--box-shadow)',
      border: '1px solid var(--border-color)'
    }}>
      {tests.map((test) => (
        <TestCard key={test.id} test={test} />
      ))}
    </div>
  );
} 