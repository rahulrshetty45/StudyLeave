'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';

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

export default function SubjectPage() {
  const params = useParams();
  const subjectId = params.subject as string;
  
  const [subject, setSubject] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load subjects from localStorage
    const loadSubject = () => {
      setLoading(true);
      const savedSubjects = localStorage.getItem('subjects');
      
      if (savedSubjects) {
        const subjects = JSON.parse(savedSubjects) as Topic[];
        const foundSubject = subjects.find(s => s.id === subjectId);
        
        if (foundSubject) {
          setSubject(foundSubject);
        }
      }
      
      setLoading(false);
    };
    
    loadSubject();
  }, [subjectId]);
  
  return (
    <AppLayout>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-500">Loading...</div>
          </div>
        ) : subject ? (
          <div>
            <h1 className="text-3xl font-bold mb-6">{subject.name}</h1>
            
            {subject.subtopics && subject.subtopics.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subject.subtopics.map(subtopic => (
                    <div 
                      key={subtopic.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <a 
                        href={subtopic.href} 
                        className="text-blue-600 dark:text-blue-400 hover:underline text-lg font-medium"
                      >
                        {subtopic.name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">
                  No topics found for this subject. Create your first topic to get started.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-300">
              Subject not found. Please select a valid subject from the sidebar.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 