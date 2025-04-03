'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Image, 
  CheckSquare, 
  ListOrdered, 
  Bold, 
  Italic, 
  Code, 
  Link as LinkIcon,
  Plus,
  X,
  AlignLeft,
  List,
  Type,
  Heading1,
  Heading2,
  CheckCircle,
  Calendar,
  FileText,
  Minus
} from 'lucide-react';

// Define block types
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'todo' | 'code' | 'quote' | 'divider';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

export default function NotePage() {
  const params = useParams();
  const subject = params.subject as string;
  const note = params.note as string;
  
  // Create a unique key for this note in localStorage
  const noteKey = `note-${subject}-${note}`;
  const titleKey = `title-${subject}-${note}`;
  const blocksKey = `blocks-${subject}-${note}`;
  
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blockRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Initialize title and blocks from localStorage or defaults
  useEffect(() => {
    // Try to load saved title
    const savedTitle = localStorage.getItem(titleKey);
    if (savedTitle) {
      setTitle(savedTitle);
    } else {
      // Default title from URL parameter
      const defaultTitle = note.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      setTitle(defaultTitle);
      localStorage.setItem(titleKey, defaultTitle);
    }
    
    // Try to load saved blocks
    const savedBlocks = localStorage.getItem(blocksKey);
    if (savedBlocks) {
      setBlocks(JSON.parse(savedBlocks));
    } else {
      // Create default first block
      const defaultBlocks = [
        {
          id: generateId(),
          type: 'paragraph' as BlockType,
          content: ''
        }
      ];
      setBlocks(defaultBlocks);
      localStorage.setItem(blocksKey, JSON.stringify(defaultBlocks));
    }
  }, [noteKey, titleKey, blocksKey, note]);
  
  // Save blocks to localStorage whenever they change
  useEffect(() => {
    if (blocks.length > 0) {
      localStorage.setItem(blocksKey, JSON.stringify(blocks));
    }
  }, [blocks, blocksKey]);
  
  // Format the subject name for display
  const formattedSubject = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Generate a unique ID for blocks
  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };
  
  // Handle title changes
  const handleTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.textContent || '';
    setTitle(newTitle);
    localStorage.setItem(titleKey, newTitle);
  };
  
  // Handle block content changes
  const handleBlockChange = (id: string, e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    
    // Just update localStorage without triggering any re-renders
    // This is crucial - we don't want to update React state on every keystroke
    const currentBlocks = JSON.parse(localStorage.getItem(blocksKey) || '[]');
    const updatedBlocks = currentBlocks.map((block: Block) => 
      block.id === id ? { ...block, content } : block
    );
    localStorage.setItem(blocksKey, JSON.stringify(updatedBlocks));
  };
  
  // Handle focus events
  const handleFocus = (blockId: string) => {
    setIsTyping(true);
    setActiveBlock(blockId);
  };
  
  const handleBlur = () => {
    setIsTyping(false);
    setActiveBlock(null);
  };
  
  // Create a new block after the current one
  const createNewBlock = (afterId: string) => {
    const newBlock = {
      id: generateId(),
      type: 'paragraph' as BlockType,
      content: ''
    };
    
    // Find the index of the current block
    const index = blocks.findIndex(block => block.id === afterId);
    
    // Create a new array with the new block inserted
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    
    // Update state with the new blocks
    setBlocks(newBlocks);
    
    // Also update localStorage
    localStorage.setItem(blocksKey, JSON.stringify(newBlocks));
    
    // Focus on the new block after render
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (el) {
        el.focus();
        // Set cursor at the beginning of the new block
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(el, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 10);
  };
  
  // Handle key down in blocks for special actions
  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enter key - create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createNewBlock(id);
    }
    
    // Backspace on empty block - delete it (unless it's the only block)
    if (e.key === 'Backspace' && blocks.length > 1) {
      const currentBlock = blocks.find(block => block.id === id);
      if (currentBlock && currentBlock.content === '') {
        e.preventDefault();
        deleteBlock(id);
      }
    }
    
    // '/' key at the start of an empty block - show block menu
    if (e.key === '/' && e.currentTarget.textContent === '') {
      e.preventDefault();
      showBlockMenuAtBlock(id);
    }
  };
  
  // Delete a block
  const deleteBlock = (id: string) => {
    setBlocks(prevBlocks => {
      const index = prevBlocks.findIndex(block => block.id === id);
      const newBlocks = [...prevBlocks].filter(block => block.id !== id);
      
      // Focus the previous block if available
      setTimeout(() => {
        if (index > 0 && blockRefs.current[prevBlocks[index - 1].id]) {
          blockRefs.current[prevBlocks[index - 1].id]?.focus();
        }
      }, 0);
      
      return newBlocks;
    });
  };
  
  // Show block menu at a specific block
  const showBlockMenuAtBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    if (blockRefs.current[blockId]) {
      const rect = blockRefs.current[blockId]?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.top + window.scrollY + 30,
          left: rect.left + 20
        });
        setShowBlockMenu(true);
      }
    }
  };
  
  // Handle adding different block types
  const changeBlockType = (blockId: string, newType: BlockType) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === blockId ? { ...block, type: newType } : block
      )
    );
    setShowBlockMenu(false);
  };
  
  // Toggle todo item checked state
  const toggleTodoChecked = (id: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === id ? { ...block, checked: !block.checked } : block
      )
    );
  };
  
  // Block menu options
  const blockOptions = [
    { type: 'paragraph', label: 'Text', icon: <AlignLeft size={16} /> },
    { type: 'heading1', label: 'Heading 1', icon: <Heading1 size={16} /> },
    { type: 'heading2', label: 'Heading 2', icon: <Heading2 size={16} /> },
    { type: 'bulletList', label: 'Bullet List', icon: <List size={16} /> },
    { type: 'numberedList', label: 'Numbered List', icon: <ListOrdered size={16} /> },
    { type: 'todo', label: 'To-do List', icon: <CheckSquare size={16} /> },
    { type: 'code', label: 'Code', icon: <Code size={16} /> },
    { type: 'quote', label: 'Quote', icon: <FileText size={16} /> },
    { type: 'divider', label: 'Divider', icon: <Minus size={16} /> }
  ];
  
  // Render block based on its type
  const renderBlock = (block: Block) => {
    const isActive = activeBlock === block.id;
    
    let blockStyle: React.CSSProperties = {
      padding: '4px 0',
      outline: 'none',
      position: 'relative'
    };
    
    let placeholderText = 'Type something...';
    let blockElement;
    
    switch (block.type) {
      case 'heading1':
        blockStyle = {
          ...blockStyle,
          fontSize: '30px',
          fontWeight: '700',
          marginTop: '24px',
          marginBottom: '16px'
        };
        placeholderText = 'Heading 1';
        break;
        
      case 'heading2':
        blockStyle = {
          ...blockStyle,
          fontSize: '24px',
          fontWeight: '600',
          marginTop: '20px',
          marginBottom: '12px'
        };
        placeholderText = 'Heading 2';
        break;
        
      case 'heading3':
        blockStyle = {
          ...blockStyle,
          fontSize: '20px',
          fontWeight: '600',
          marginTop: '16px',
          marginBottom: '8px'
        };
        placeholderText = 'Heading 3';
        break;
        
      case 'bulletList':
        blockStyle = {
          ...blockStyle,
          paddingLeft: '24px',
          position: 'relative'
        };
        placeholderText = 'List item';
        blockElement = (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <div style={{ marginTop: '8px' }}>•</div>
            <div
              ref={el => {
                blockRefs.current[block.id] = el;
                return undefined;
              }}
              data-block-id={block.id}
              contentEditable
              suppressContentEditableWarning
              style={{ 
                ...blockStyle,
                flex: 1,
                paddingLeft: 0
              }}
              onInput={(e) => handleBlockChange(block.id, e)}
              onFocus={() => handleFocus(block.id)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );
        break;
        
      case 'numberedList':
        blockStyle = {
          ...blockStyle,
          paddingLeft: '24px',
          position: 'relative'
        };
        placeholderText = 'List item';
        blockElement = (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <div style={{ marginTop: '8px', fontWeight: '500', minWidth: '15px' }}>•</div>
            <div
              ref={el => {
                blockRefs.current[block.id] = el;
                return undefined;
              }}
              data-block-id={block.id}
              contentEditable
              suppressContentEditableWarning
              style={{ 
                ...blockStyle,
                flex: 1,
                paddingLeft: 0
              }}
              onInput={(e) => handleBlockChange(block.id, e)}
              onFocus={() => handleFocus(block.id)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );
        break;
        
      case 'todo':
        blockStyle = {
          ...blockStyle,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        };
        placeholderText = 'To-do item';
        blockElement = (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <div
              onClick={() => toggleTodoChecked(block.id)}
              style={{ 
                cursor: 'pointer',
                marginTop: '3px'
              }}
            >
              {block.checked ? 
                <CheckCircle size={18} style={{ color: 'var(--todo-checked)' }} /> : 
                <CheckSquare size={18} style={{ color: 'var(--todo-unchecked)' }} />
              }
            </div>
            <div
              ref={el => {
                blockRefs.current[block.id] = el;
                return undefined;
              }}
              data-block-id={block.id}
              contentEditable
              suppressContentEditableWarning
              style={{ 
                ...blockStyle,
                flex: 1,
                textDecoration: block.checked ? 'line-through' : 'none',
                color: block.checked ? '#9CA3AF' : 'inherit'
              }}
              onInput={(e) => handleBlockChange(block.id, e)}
              onFocus={() => handleFocus(block.id)}
              onBlur={handleBlur}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          </div>
        );
        break;
        
      case 'code':
        blockStyle = {
          ...blockStyle,
          fontFamily: 'monospace',
          backgroundColor: 'var(--code-bg)',
          padding: '12px 16px',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap'
        };
        placeholderText = 'Code block';
        break;
        
      case 'quote':
        blockStyle = {
          ...blockStyle,
          borderLeft: '3px solid var(--quote-border)',
          paddingLeft: '16px',
          fontStyle: 'italic',
          color: 'var(--text-secondary)'
        };
        placeholderText = 'Quote';
        break;
        
      case 'divider':
        blockElement = (
          <div 
            style={{ 
              height: '1px', 
              backgroundColor: 'var(--divider-color)', 
              margin: '24px 0',
              width: '100%'
            }}
          />
        );
        break;
        
      default: // paragraph
        placeholderText = 'Type "/" for commands';
        break;
    }
    
    // Return the custom block element if we've built one
    if (blockElement) {
      return (
        <div style={{ position: 'relative', marginBottom: '4px' }}>
          {isActive && (
            <div
              onClick={() => showBlockMenuAtBlock(block.id)}
              style={{
                position: 'absolute',
                left: '-30px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: 0.5,
                transition: 'opacity 0.1s',
                borderRadius: '3px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.5';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={16} />
            </div>
          )}
          {blockElement}
        </div>
      );
    }
    
    // Default block rendering
    return (
      <div style={{ position: 'relative', marginBottom: '4px' }}>
        {isActive && (
          <div
            onClick={() => showBlockMenuAtBlock(block.id)}
            style={{
              position: 'absolute',
              left: '-30px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity 0.1s',
              borderRadius: '3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus size={16} />
          </div>
        )}
        <div
          ref={el => {
            blockRefs.current[block.id] = el;
            return undefined;
          }}
          data-block-id={block.id}
          contentEditable
          suppressContentEditableWarning
          style={blockStyle}
          onInput={(e) => handleBlockChange(block.id, e)}
          onFocus={() => handleFocus(block.id)}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyDown(block.id, e)}
          data-placeholder={block.content ? '' : placeholderText}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      </div>
    );
  };

  return (
    <AppLayout>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '32px 64px'
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '14px',
          color: 'var(--text-tertiary)',
          marginBottom: '16px'
        }}>
          <span>{formattedSubject}</span>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>{title}</span>
        </div>
        
        {/* Note Title */}
        <h1
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: '40px',
            fontWeight: '800',
            marginBottom: '24px',
            outline: 'none',
            borderBottom: isTyping ? '1px solid var(--border-color)' : '1px solid transparent',
            paddingBottom: '8px',
            transition: 'border-color 0.2s',
            color: 'var(--text-primary)'
          }}
          onInput={handleTitleChange}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
        >
          {title}
        </h1>
        
        {/* Editor Blocks */}
        <div className="notion-blocks-container" style={{
          minHeight: '60vh',
          fontSize: '16px',
          lineHeight: 1.6,
          color: 'var(--text-primary)',
        }}>
          {blocks.map(block => (
            <div key={block.id}>
              {renderBlock(block)}
            </div>
          ))}
        </div>
        
        {/* Block Menu */}
        {showBlockMenu && selectedBlockId && (
          <div style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '4px',
            boxShadow: 'var(--box-shadow)',
            padding: '8px 0',
            width: '220px',
            zIndex: 10
          }}>
            <div style={{
              padding: '8px 12px',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              fontWeight: '500'
            }}>
              BASIC BLOCKS
            </div>
            {blockOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => changeBlockType(selectedBlockId, option.type as BlockType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  gap: '12px',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '4px'
                }}>
                  {option.icon}
                </div>
                <span style={{
                  color: 'var(--text-primary)'
                }}>{option.label}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Last edited info */}
        <div style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          marginTop: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          Last edited now
        </div>
      </div>
      
      {/* Global CSS for placeholders */}
      <style jsx global>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          cursor: text;
        }
      `}</style>
    </AppLayout>
  );
} 