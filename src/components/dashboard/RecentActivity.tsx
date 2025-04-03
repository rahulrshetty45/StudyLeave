'use client';

import React, { useState } from 'react';
import { FileText, List, Network } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  date: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'quiz':
        return <List size={16} style={{ color: 'var(--highlight-color)' }} />;
      case 'note':
        return <FileText size={16} style={{ color: '#10B981' }} />;
      case 'mindmap':
        return <Network size={16} style={{ color: '#F97316' }} />;
      default:
        return <FileText size={16} style={{ color: 'var(--highlight-color)' }} />;
    }
  };

  const ActivityCard = ({ activity }: { activity: ActivityItem }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        key={activity.id}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '16px 20px',
          borderBottom: activity.id !== activities[activities.length - 1].id ? '1px solid var(--border-color)' : 'none',
          transition: 'all 0.2s ease-in-out',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          backgroundColor: isHovered ? 'var(--hover-bg)' : 'transparent',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'var(--input-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '16px',
          flexShrink: 0
        }}>
          {getIcon(activity.icon)}
        </div>
        
        <div style={{ flex: '1' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}>
              {activity.title}
            </h3>
            <span style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
              marginLeft: '16px'
            }}>
              {activity.date}
            </span>
          </div>
          
          <p style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            margin: 0
          }}>
            {activity.description}
          </p>
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
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  );
} 