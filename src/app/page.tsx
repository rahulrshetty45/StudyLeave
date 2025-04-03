'use client';

import React, { useState, useEffect } from 'react';
import StatsCard from '../components/dashboard/StatsCard';
import SubjectCard from '../components/subjects/SubjectCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import UpcomingTests from '../components/dashboard/UpcomingTests';
import { RefreshCw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

// Define the types needed for the components
type StatType = 'subjects' | 'score' | 'time' | 'notes';
type ColorType = 'blue' | 'green' | 'purple' | 'orange';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  date: string;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  details: string;
  date: string;
}

interface SubjectProgress {
  subject: string;
  progress: number;
  color: ColorType;
  estimatedCompletion: string;
}

// Define the subject and subtopic structures (matching Sidebar.tsx)
interface SubTopic {
  id: string;
  name: string;
  href: string;
}

interface Topic {
  id: string;
  name: string;
  href: string;
  subtopics?: SubTopic[];
}

export default function Dashboard() {
  // State for subjects from localStorage
  const [subjects, setSubjects] = useState<Topic[]>([]);
  const [subjectProgressData, setSubjectProgressData] = useState<SubjectProgress[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  
  // Load subjects from localStorage on component mount
  useEffect(() => {
    const savedSubjects = localStorage.getItem('subjects');
    if (savedSubjects) {
      const parsedSubjects = JSON.parse(savedSubjects) as Topic[];
      setSubjects(parsedSubjects);
      
      // Generate progress data for each subject
      // Assign a random progress value and color to each subject
      const colors: ColorType[] = ['blue', 'green', 'purple', 'orange'];
      const progressData = parsedSubjects.map((subject, index) => ({
        subject: subject.name,
        progress: Math.floor(Math.random() * 60) + 20, // Random progress between 20-80%
        color: colors[index % colors.length],
        estimatedCompletion: `${Math.floor(Math.random() * 10) + 1} weeks`
      }));
      
      // Sort progress data by progress percentage (descending)
      progressData.sort((a, b) => b.progress - a.progress);
      
      setSubjectProgressData(progressData);
    }
  }, []);

  // Toggle between showing all subjects or just the top 3
  const toggleShowAllSubjects = () => {
    setShowAllSubjects(!showAllSubjects);
  };

  // Get the subjects to display based on current state
  const displayedSubjects = showAllSubjects
    ? subjectProgressData
    : subjectProgressData.slice(0, 3);

  // Stats data - update subject count based on localStorage data
  const statsData = [
    { type: 'subjects' as StatType, value: subjects.length.toString(), label: 'Active Subjects', color: 'blue' as ColorType },
    { type: 'score' as StatType, value: '85%', label: 'Average Score', color: 'green' as ColorType },
    { type: 'time' as StatType, value: '12h', label: 'Study Time', color: 'purple' as ColorType },
    { type: 'notes' as StatType, value: '24', label: 'Notes Created', color: 'orange' as ColorType }
  ];

  // Recent activity data
  const recentActivityData: ActivityItem[] = [
    {
      id: '1',
      title: 'Completed Quiz: Algebra Fundamentals',
      description: 'Score: 90% · Mathematics',
      icon: 'quiz',
      date: '2 hours ago'
    },
    {
      id: '2',
      title: 'Created Note: Chemical Bonding',
      description: 'Chemistry',
      icon: 'note',
      date: 'Yesterday'
    },
    {
      id: '3',
      title: 'Updated Mind Map: English Literature',
      description: 'English',
      icon: 'mindmap',
      date: '2 days ago'
    }
  ];

  // Upcoming tests data
  const upcomingTestsData: Test[] = [
    {
      id: '1',
      title: 'Calculus Midterm',
      subject: 'Mathematics',
      details: '25 questions',
      date: 'Tomorrow'
    },
    {
      id: '2',
      title: 'Organic Chemistry Quiz',
      subject: 'Chemistry',
      details: '15 questions',
      date: 'In 3 days'
    }
  ];

  const dashboardContent = (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        paddingLeft: '4px',
        paddingRight: '4px'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          margin: 0
        }}>
          Dashboard
        </h1>
        
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'var(--highlight-color)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer'
        }}>
          <RefreshCw size={16} />
          Refresh
        </button>
        </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
        marginBottom: '60px'
      }}>
        {statsData.map((stat, index) => (
          <StatsCard
            key={index}
            type={stat.type}
            value={stat.value}
            label={stat.label}
            color={stat.color}
          />
        ))}
      </div>

      {/* Subject Progress Header */}
      <div style={{ 
        marginBottom: '20px', 
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '4px',
        paddingRight: '4px'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          margin: 0,
          padding: 0
        }}>
          Subject Progress
        </h2>
        <button 
          onClick={toggleShowAllSubjects}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--highlight-color)',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 8px',
            margin: 0
          }}
        >
          {showAllSubjects ? 'Show Top 3' : 'View All'}
        </button>
      </div>
      
      {/* Subject Progress Cards */}
      <div style={{ 
        marginBottom: '60px',
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '16px' 
      }}>
        {displayedSubjects.map((subject, index) => (
          <SubjectCard
            key={index}
            subject={subject.subject}
            progress={subject.progress}
            color={subject.color}
            estimatedCompletion={subject.estimatedCompletion}
          />
        ))}
      </div>

      {/* Recent Activity and Upcoming Tests */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px'
      }}>
        <div>
          {/* Recent Activity Header */}
          <div style={{ 
            marginBottom: '20px',
            paddingLeft: '4px',
            paddingRight: '4px'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              margin: 0,
              padding: 0
            }}>
              Recent Activity
            </h2>
          </div>
          <RecentActivity activities={recentActivityData} />
        </div>
        
        <div>
          {/* Upcoming Tests Header */}
          <div style={{ 
            marginBottom: '20px',
            paddingLeft: '4px',
            paddingRight: '4px'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--text-primary)',
              margin: 0,
              padding: 0
            }}>
              Upcoming Tests
            </h2>
          </div>
          <UpcomingTests tests={upcomingTestsData} />
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      {dashboardContent}
    </AppLayout>
  );
}
