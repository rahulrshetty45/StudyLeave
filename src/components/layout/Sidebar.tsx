'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  PenTool, 
  BookOpen, 
  Network, 
  Zap, 
  Settings, 
  HelpCircle, 
  ChevronRight,
  ChevronDown,
  Plus,
  File,
  MoreHorizontal,
  X,
  Trash2,
  Edit
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

interface SidebarProps {
  activePage?: string;
}

// Define types for the nested navigation structure
interface SubTopic {
  id: string;
  name: string;
  href: string;
}

interface Topic {
  id: string;
  name: string;
  href: string;
  icon?: LucideIcon;
  subtopics?: SubTopic[];
}

// Modal types
interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Modal component
const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--modal-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: 'var(--box-shadow)',
        padding: '16px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)'
          }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function Sidebar({ activePage = 'dashboard' }: SidebarProps) {
  // State to track expanded subjects and sections
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'workspace': true,
    'subjects': true
  });
  
  // Modal states for adding
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  // Modal states for renaming and deleting
  const [isRenameSubjectModalOpen, setIsRenameSubjectModalOpen] = useState(false);
  const [isRenameNoteModalOpen, setIsRenameNoteModalOpen] = useState(false);
  const [isDeleteSubjectModalOpen, setIsDeleteSubjectModalOpen] = useState(false);
  const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);
  const [selectedSubjectForRename, setSelectedSubjectForRename] = useState('');
  const [selectedNoteForRename, setSelectedNoteForRename] = useState('');
  const [selectedSubjectForDelete, setSelectedSubjectForDelete] = useState('');
  const [selectedNoteForDelete, setSelectedNoteForDelete] = useState('');
  const [parentSubjectForNote, setParentSubjectForNote] = useState('');
  
  // Load subjects from localStorage on initial render
  const [subjects, setSubjects] = useState<Topic[]>([]);
  
  useEffect(() => {
    // Load saved subjects from localStorage
    const savedSubjects = localStorage.getItem('subjects');
    if (savedSubjects) {
      try {
        const parsedSubjects = JSON.parse(savedSubjects);
        setSubjects(parsedSubjects);
        
        // Auto-expand active subject
        if (activePage === 'subjects' && window.location.pathname.includes('/subjects/')) {
          const pathParts = window.location.pathname.split('/');
          if (pathParts.length > 2) {
            const subjectId = pathParts[2];
            setExpandedSubjects(prev => ({
              ...prev,
              [subjectId]: true
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing subjects from localStorage:', error);
      }
    }
  }, [activePage]);
  
  // Save subjects to localStorage whenever they change
  useEffect(() => {
    if (subjects.length > 0) {
      localStorage.setItem('subjects', JSON.stringify(subjects));
    }
  }, [subjects]);

  // Navigation items
  const mainNavItems: Topic[] = [
    { id: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { id: 'tests', name: 'Tests & Quizzes', href: '/tests', icon: BookOpen },
    { id: 'mind-maps', name: 'Mind Maps', href: '/mind-maps', icon: Network },
    { id: 'flashcards', name: 'Flashcards', href: '/flashcards', icon: Zap }
  ];

  // Default subjects data
  const defaultSubjects: Topic[] = [
    { 
      id: 'mathematics', 
      name: 'Mathematics', 
      href: '/subjects/mathematics',
      subtopics: [
        { id: 'math-algebra', name: 'Algebra', href: '/subjects/mathematics/algebra' },
        { id: 'math-calculus', name: 'Calculus', href: '/subjects/mathematics/calculus' },
        { id: 'math-geometry', name: 'Geometry', href: '/subjects/mathematics/geometry' }
      ]
    },
    { 
      id: 'chemistry', 
      name: 'Chemistry', 
      href: '/subjects/chemistry',
      subtopics: [
        { id: 'chem-organic', name: 'Organic Chemistry', href: '/subjects/chemistry/organic' },
        { id: 'chem-inorganic', name: 'Inorganic Chemistry', href: '/subjects/chemistry/inorganic' }
      ]
    },
    { 
      id: 'english', 
      name: 'English', 
      href: '/subjects/english',
      subtopics: [
        { id: 'eng-literature', name: 'Literature', href: '/subjects/english/literature' },
        { id: 'eng-grammar', name: 'Grammar', href: '/subjects/english/grammar' }
      ]
    }
  ];

  // Toggle expanded state for a subject
  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle expanded state for a section
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Add new subject
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    
    const newSubjectId = newSubjectName.toLowerCase().replace(/\s+/g, '-');
    const newSubject: Topic = {
      id: newSubjectId,
      name: newSubjectName,
      href: `/subjects/${newSubjectId}`,
      subtopics: []
    };
    
    setSubjects(prev => [...prev, newSubject]);
    setExpandedSubjects(prev => ({
      ...prev,
      [newSubjectId]: true
    }));
    setNewSubjectName('');
    setIsAddSubjectModalOpen(false);
  };
  
  // Add new note to a subject
  const handleAddNote = () => {
    if (!newNoteName.trim() || !selectedSubject) return;
    
    const newNoteId = `${selectedSubject}-${newNoteName.toLowerCase().replace(/\s+/g, '-')}`;
    const newNote: SubTopic = {
      id: newNoteId,
      name: newNoteName,
      href: `/subjects/${selectedSubject}/${newNoteName.toLowerCase().replace(/\s+/g, '-')}`
    };
    
    setSubjects(prev => prev.map(subject => {
      if (subject.id === selectedSubject) {
        return {
          ...subject,
          subtopics: [...(subject.subtopics || []), newNote]
        };
      }
      return subject;
    }));
    
    setNewNoteName('');
    setSelectedSubject(null);
    setIsAddNoteModalOpen(false);
  };
  
  // Open note modal with the selected subject
  const openAddNoteModal = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setIsAddNoteModalOpen(true);
  };

  // Opens modal to rename a subject
  const openRenameSubjectModal = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setSelectedSubjectForRename(subjectId);
      setNewSubjectName(subject.name);
      setIsRenameSubjectModalOpen(true);
    }
  };

  // Opens modal to rename a note
  const openRenameNoteModal = (subjectId: string, noteId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      const note = subject.subtopics?.find(n => n.id === noteId);
      if (note) {
        setParentSubjectForNote(subjectId);
        setSelectedNoteForRename(noteId);
        setNewNoteName(note.name);
        setIsRenameNoteModalOpen(true);
      }
    }
  };

  // Opens modal to delete a subject
  const openDeleteSubjectModal = (subjectId: string) => {
    setSelectedSubjectForDelete(subjectId);
    setIsDeleteSubjectModalOpen(true);
  };

  // Opens modal to delete a note
  const openDeleteNoteModal = (subjectId: string, noteId: string) => {
    setParentSubjectForNote(subjectId);
    setSelectedNoteForDelete(noteId);
    setIsDeleteNoteModalOpen(true);
  };

  // Handles renaming a subject
  const handleRenameSubject = () => {
    if (!newSubjectName.trim()) return;
    
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === selectedSubjectForRename) {
        return { ...subject, name: newSubjectName.trim() };
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    setIsRenameSubjectModalOpen(false);
  };

  // Handles renaming a note
  const handleRenameNote = () => {
    if (!newNoteName.trim()) return;
    
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === parentSubjectForNote) {
        const subtopics = subject.subtopics?.map(note => {
          if (note.id === selectedNoteForRename) {
            // Generate slug from new name
            const slug = newNoteName.trim().toLowerCase().replace(/\s+/g, '-');
            const href = `/subjects/${subject.id.toLowerCase()}/${slug}`;
            return { 
              ...note, 
              name: newNoteName.trim(),
              id: slug,
              href 
            };
          }
          return note;
        });
        return { ...subject, subtopics };
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    setIsRenameNoteModalOpen(false);
  };

  // Handles deleting a subject
  const handleDeleteSubject = () => {
    const updatedSubjects = subjects.filter(
      subject => subject.id !== selectedSubjectForDelete
    );
    
    setSubjects(updatedSubjects);
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    setIsDeleteSubjectModalOpen(false);
  };

  // Handles deleting a note
  const handleDeleteNote = () => {
    const updatedSubjects = subjects.map(subject => {
      if (subject.id === parentSubjectForNote) {
        const subtopics = subject.subtopics?.filter(
          note => note.id !== selectedNoteForDelete
        );
        return { ...subject, subtopics };
      }
      return subject;
    });
    
    setSubjects(updatedSubjects);
    localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
    setIsDeleteNoteModalOpen(false);
  };

  // Navigation item styles based on active state
  const getNavItemStyle = (id: string, level: number = 0) => {
    const isActive = activePage === id;
    
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      paddingLeft: level > 0 ? `${12 + level * 16}px` : '12px',
      borderRadius: '4px',
      color: isActive ? 'var(--highlight-color)' : 'var(--text-secondary)',
      backgroundColor: isActive ? 'var(--highlight-bg)' : 'transparent',
      fontWeight: isActive ? '500' : 'normal',
      marginBottom: '1px',
      textDecoration: 'none',
      fontSize: '14px',
      transition: 'background-color 0.1s ease',
      cursor: 'pointer'
    };
  };

  // Render an icon with standard styling
  const renderIcon = (Icon: LucideIcon, color?: string) => {
    return <Icon size={16} style={{ 
      marginRight: '8px', 
      color: color || 'var(--text-secondary)',
      flexShrink: 0 
    }} />;
  };

  return (
    <div style={{
      width: '240px',
      height: '100vh',
      borderRight: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-tertiary)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--highlight-color)'
        }}>
          StudyLeave
        </div>
      </div>

      {/* Main Navigation */}
      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        {/* Workspace Section */}
        <div style={{ marginBottom: '16px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              padding: '0 4px'
            }}
            onClick={() => toggleSection('workspace')}
          >
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}>
              {expandedSections.workspace ? 
                renderIcon(ChevronDown, 'var(--text-tertiary)') : 
                renderIcon(ChevronRight, 'var(--text-tertiary)')
              }
              WORKSPACE
            </div>
          </div>
          
          {expandedSections.workspace && (
            <nav>
              {mainNavItems.map((item) => (
                <Link 
                  href={item.href} 
                  key={item.id}
                  style={getNavItemStyle(item.id)}
                >
                  {item.icon && renderIcon(item.icon)}
                  {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Subjects Section */}
        <div style={{ marginBottom: '16px' }}>
          <div 
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
              padding: '0 4px'
            }}
          >
            <div 
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => toggleSection('subjects')}
            >
              {expandedSections.subjects ? 
                renderIcon(ChevronDown, 'var(--text-tertiary)') : 
                renderIcon(ChevronRight, 'var(--text-tertiary)')
              }
              SUBJECTS
            </div>
            <button 
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                width: '20px',
                height: '20px',
                borderRadius: '4px'
              }}
              onClick={() => setIsAddSubjectModalOpen(true)}
            >
              <Plus size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.7 }} />
            </button>
          </div>
          
          {expandedSections.subjects && (
            <nav>
              {subjects.map((item) => (
                <div key={item.id}>
                  <div
                    style={{
                      ...getNavItemStyle(item.id),
                      justifyContent: 'space-between'
                    }}
                  >
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleSubject(item.id)}
                    >
                      {expandedSubjects[item.id] ? 
                        renderIcon(ChevronDown, 'var(--text-tertiary)') : 
                        renderIcon(ChevronRight, 'var(--text-tertiary)')
                      }
                      <span>{item.name}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          marginRight: '4px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddNoteModal(item.id);
                        }}
                        title="Add note"
                      >
                        <Plus size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.7 }} />
                      </button>
                      
                      <div className="subject-menu" style={{ position: 'relative' }}>
                        <button
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle dropdown menu
                            const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                            if (dropdown) {
                              dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                            }
                          }}
                          title="More options"
                        >
                          <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.7 }} />
                        </button>
                        
                        <div 
                          style={{
                            display: 'none',
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            boxShadow: 'var(--box-shadow)',
                            zIndex: 10,
                            width: '120px'
                          }}
                        >
                          <div 
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement!.style.display = 'none';
                              openRenameSubjectModal(item.id);
                            }}
                          >
                            Rename
                          </div>
                          <div 
                            style={{
                              padding: '8px 12px',
                              fontSize: '14px',
                              cursor: 'pointer',
                              color: '#e53e3e'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement!.style.display = 'none';
                              openDeleteSubjectModal(item.id);
                            }}
                          >
                            Delete
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {expandedSubjects[item.id] && item.subtopics && item.subtopics.length > 0 && (
                    <div>
                      {item.subtopics.map((subtopic) => (
                        <div 
                          key={subtopic.id}
                          style={{
                            ...getNavItemStyle(subtopic.id, 1),
                            justifyContent: 'space-between'
                          }}
                        >
                          <Link 
                            href={subtopic.href}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flex: 1,
                              color: 'inherit',
                              textDecoration: 'none'
                            }}
                          >
                            {renderIcon(File, 'var(--text-tertiary)')}
                            <span>{subtopic.name}</span>
                          </Link>
                          
                          <div className="note-menu" style={{ position: 'relative' }}>
                            <button
                              className="note-menu-button"
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-tertiary)',
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                opacity: 0,
                                transition: 'opacity 0.2s'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Toggle dropdown menu
                                const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                                if (dropdown) {
                                  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                                }
                              }}
                              title="More options"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <MoreHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            
                            <div 
                              style={{
                                display: 'none',
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                backgroundColor: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                boxShadow: 'var(--box-shadow)',
                                zIndex: 10,
                                width: '120px'
                              }}
                            >
                              <div 
                                style={{
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  color: 'var(--text-primary)',
                                  borderBottom: '1px solid var(--border-color)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.parentElement!.style.display = 'none';
                                  openRenameNoteModal(item.id, subtopic.id);
                                }}
                              >
                                Rename
                              </div>
                              <div 
                                style={{
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  color: '#e53e3e'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.parentElement!.style.display = 'none';
                                  openDeleteNoteModal(item.id, subtopic.id);
                                }}
                              >
                                Delete
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {expandedSubjects[item.id] && (
                    <div
                      onClick={() => openAddNoteModal(item.id)}
                      style={{
                        ...getNavItemStyle('add-note', 1),
                        color: 'var(--text-tertiary)',
                        opacity: 0.7,
                        cursor: 'pointer'
                      }}
                    >
                      {renderIcon(Plus, 'var(--text-tertiary)')}
                      <span style={{ fontSize: '13px' }}>Add note</span>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ 
        padding: '12px',
        borderTop: '1px solid var(--border-color)'
      }}>
        <Link 
          href="/settings" 
          style={getNavItemStyle('settings')}
        >
          {renderIcon(Settings)}
          Settings
        </Link>
        <Link 
          href="/help" 
          style={getNavItemStyle('help')}
        >
          {renderIcon(HelpCircle)}
          Help
        </Link>
      </div>
      
      {/* Add Subject Modal */}
      <Modal
        isOpen={isAddSubjectModalOpen}
        title="Add New Subject"
        onClose={() => setIsAddSubjectModalOpen(false)}
      >
        <div>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="Enter subject name"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              marginBottom: '16px',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}>
            <button
              onClick={() => setIsAddSubjectModalOpen(false)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubject}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '6px',
                background: 'var(--highlight-color)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Add Subject
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Add Note Modal */}
      <Modal
        isOpen={isAddNoteModalOpen}
        title="Add New Note"
        onClose={() => setIsAddNoteModalOpen(false)}
      >
        <div>
          <input
            type="text"
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            placeholder="Enter note name"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              marginBottom: '16px',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}>
            <button
              onClick={() => setIsAddNoteModalOpen(false)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: 'none',
                borderRadius: '6px',
                background: 'var(--highlight-color)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Add Note
            </button>
          </div>
        </div>
      </Modal>

      {/* Rename Subject Modal */}
      {isRenameSubjectModalOpen && (
        <div className="modal-overlay" style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--modal-overlay)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: 'var(--box-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Rename Subject</h2>
              <button
                onClick={() => setIsRenameSubjectModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Enter subject name"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsRenameSubjectModalOpen(false)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubject}
                style={{
                  backgroundColor: '#37352f',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Note Modal */}
      {isRenameNoteModalOpen && (
        <div className="modal-overlay" style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--modal-overlay)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: 'var(--box-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Rename Note</h2>
              <button
                onClick={() => setIsRenameNoteModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <input
              type="text"
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              placeholder="Enter note name"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsRenameNoteModalOpen(false)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameNote}
                style={{
                  backgroundColor: '#37352f',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Modal */}
      {isDeleteSubjectModalOpen && (
        <div className="modal-overlay" style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--modal-overlay)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: 'var(--box-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Delete Subject</h2>
              <button
                onClick={() => setIsDeleteSubjectModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              Are you sure you want to delete this subject? This will also delete all notes within it. This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsDeleteSubjectModalOpen(false)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubject}
                style={{
                  backgroundColor: '#e53e3e',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Modal */}
      {isDeleteNoteModalOpen && (
        <div className="modal-overlay" style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--modal-overlay)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: 'var(--box-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Delete Note</h2>
              <button
                onClick={() => setIsDeleteNoteModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsDeleteNoteModalOpen(false)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNote}
                style={{
                  backgroundColor: '#e53e3e',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 