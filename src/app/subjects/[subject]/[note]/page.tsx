'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent, MouseEvent, ChangeEvent, DragEvent } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import parse from 'html-react-parser';
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
  Minus,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';
import { generateAIResponse, Message } from '@/lib/openai';
import { FaArrowLeft, FaLink, FaRegTrashAlt, FaSave, FaImage, FaCode, FaParagraph, FaListUl, FaHeading, FaQuoteLeft, FaStar, FaMarkdown, FaClipboard, FaTimes } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { PiSpinnerGap } from 'react-icons/pi';
import { LuExternalLink } from 'react-icons/lu';

// Define block types
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'todo' | 'code' | 'quote' | 'divider';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

// Add tooltipPosition state
interface Position {
  top: number;
  left: number;
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
  const [isGenerating, setIsGenerating] = useState(false);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blockRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Add state to handle text selection
  const [selectedText, setSelectedText] = useState<string>('');
  const [showSelectionTooltip, setShowSelectionTooltip] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const selectionTooltipRef = useRef<HTMLDivElement>(null);
  
  // Add a debug state to track selection status
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Add a processing flag at the component level
  const [isEventDispatched, setIsEventDispatched] = useState<boolean>(false);
  
  // Keep the isExplaining state since it's still needed for button state
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  
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
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };
  
  // Handle title changes - only update localStorage during typing, not React state
  const handleTitleChange = (e: React.FormEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.textContent || '';
    // Only update localStorage, not React state (to avoid cursor position reset)
    localStorage.setItem(titleKey, newTitle);
    // Do NOT update React state during typing - this would reset cursor position
  };

  // Add a title blur handler to update state only after typing is finished
  const handleTitleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.textContent || '';
    // Now update React state after user has finished typing
    setTitle(newTitle);
    setIsTyping(false);
    
    // Update the title in the sidebar
    const savedSubjects = localStorage.getItem('subjects');
    if (savedSubjects) {
      try {
        const parsedSubjects = JSON.parse(savedSubjects);
        const updatedSubjects = parsedSubjects.map((subj: any) => {
          if (subj.id === subject) {
            const updatedSubtopics = (subj.subtopics || []).map((subtopic: any) => {
              // Match the current note by its URL slug
              if (subtopic.href.endsWith(`/${note}`)) {
                return { ...subtopic, name: newTitle };
              }
              return subtopic;
            });
            return { ...subj, subtopics: updatedSubtopics };
          }
          return subj;
        });
        
        // Save the updated subjects back to localStorage
        localStorage.setItem('subjects', JSON.stringify(updatedSubjects));
      } catch (error) {
        console.error('Error updating note title in sidebar:', error);
      }
    }
  };
  
  // Handle block content changes
  const handleBlockChange = (id: string, e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    
    // Only update localStorage directly without triggering re-renders
    // Find the block in the current state
    const currentBlock = blocks.find(block => block.id === id);
    if (!currentBlock) return;
    
    // Update only localStorage
    const localStorageBlocks = JSON.parse(localStorage.getItem(blocksKey) || '[]');
    const updatedLocalStorageBlocks = localStorageBlocks.map((block: Block) => 
      block.id === id ? { ...block, content } : block
    );
    localStorage.setItem(blocksKey, JSON.stringify(updatedLocalStorageBlocks));
    
    // Do NOT update React state during typing - this would reset cursor position
  };
  
  // Only update React state when a block loses focus to keep state eventually consistent
  const handleBlockBlur = (id: string, e: React.FocusEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    
    // Now update React state after user has finished typing
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === id ? { ...block, content } : block
      )
    );
    
    setIsTyping(false);
    setActiveBlock(null);
  };
  
  // Handle focus events
  const handleFocus = (blockId: string) => {
    setIsTyping(true);
    setActiveBlock(blockId);
  };
  
  const handleBlur = (id: string, e: React.FocusEvent<HTMLDivElement>) => {
    handleBlockBlur(id, e);
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
      
      // Get the current block's content
      const currentBlock = blocks.find(block => block.id === id);
      if (!currentBlock) return;
      
      // Get the selection to determine where to split the text
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      const blockElement = e.currentTarget;
      
      // Get text before and after cursor
      let textBefore = '';
      let textAfter = '';
      
      if (range.commonAncestorContainer === blockElement) {
        // If selection is directly in the div
        if (blockElement.childNodes.length > 0) {
          const childNodes = Array.from(blockElement.childNodes);
          let beforeCursor = true;
          
          for (const node of childNodes) {
            if (node === range.startContainer || node.contains(range.startContainer)) {
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.textContent || '';
                textBefore += nodeText.substring(0, range.startOffset);
                textAfter += nodeText.substring(range.startOffset);
                beforeCursor = false;
              } else {
                // Handle other node types
                beforeCursor = false;
                textAfter += node.textContent || '';
              }
            } else if (beforeCursor) {
              textBefore += node.textContent || '';
            } else {
              textAfter += node.textContent || '';
            }
          }
        }
      } else {
        // If selection is in a child node
        const startNode = range.startContainer;
        
        if (startNode.nodeType === Node.TEXT_NODE) {
          // Split text at cursor position
          const text = startNode.textContent || '';
          textBefore = text.substring(0, range.startOffset);
          textAfter = text.substring(range.startOffset);
          
          // Add text from nodes before the current node
          let currentNode = startNode.previousSibling;
          while (currentNode) {
            textBefore = (currentNode.textContent || '') + textBefore;
            currentNode = currentNode.previousSibling;
          }
          
          // Add text from nodes after the current node
          currentNode = startNode.nextSibling;
          while (currentNode) {
            textAfter += currentNode.textContent || '';
            currentNode = currentNode.nextSibling;
          }
        }
      }
      
      // Update current block with text before cursor
      const updatedBlocks = blocks.map(block => 
        block.id === id ? { ...block, content: textBefore.trim() } : block
      );
      
      // Create a new block with text after cursor
      const newBlock = {
        id: generateId(),
        type: currentBlock.type, // Keep the same block type
        content: textAfter.trim(),
        checked: currentBlock.type === 'todo' ? false : undefined // Reset checked state for todos
      };
      
      // Find the index of the current block
      const index = blocks.findIndex(block => block.id === id);
      
      // Insert the new block after the current one
      updatedBlocks.splice(index + 1, 0, newBlock);
      
      // Update blocks state
      setBlocks(updatedBlocks);
      localStorage.setItem(blocksKey, JSON.stringify(updatedBlocks));
      
      // Focus the new block after render
      setTimeout(() => {
        const el = blockRefs.current[newBlock.id];
        if (el) {
          el.focus();
          // Place cursor at beginning of new block
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
    }
    
    // Backspace key handling
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // Check if cursor is at the beginning of the block
      const isAtStart = isCursorAtStart(selection);
      
      // If cursor is at beginning of block (not empty) and there's a previous block, merge with previous
      if (isAtStart && blocks.length > 1) {
        const currentBlockIndex = blocks.findIndex(block => block.id === id);
        
        // Only proceed if this isn't the first block
        if (currentBlockIndex > 0) {
          e.preventDefault();
          
          // Get the previous block
          const previousBlock = blocks[currentBlockIndex - 1];
          const currentBlock = blocks[currentBlockIndex];
          
          // Create new blocks array with merged content
          const updatedBlocks = [...blocks];
          
          // Merge the content - append current block's content to previous block
          updatedBlocks[currentBlockIndex - 1] = {
            ...previousBlock,
            content: previousBlock.content + (previousBlock.content && currentBlock.content ? ' ' : '') + currentBlock.content
          };
          
          // Remove the current block
          updatedBlocks.splice(currentBlockIndex, 1);
          
          // Update state
          setBlocks(updatedBlocks);
          localStorage.setItem(blocksKey, JSON.stringify(updatedBlocks));
          
          // Set cursor at the merge point in previous block
          setTimeout(() => {
            const previousBlockEl = blockRefs.current[previousBlock.id];
            if (previousBlockEl) {
              previousBlockEl.focus();
              
              // Try to set cursor at merge point (end of previous block's original content)
              const selection = window.getSelection();
              if (selection) {
                // Get text nodes within the previous block element
                let textNode: Node | null = null;
                let offset = previousBlock.content.length;
                
                if (previousBlockEl.childNodes.length > 0) {
                  let currentLength = 0;
                  // Find the text node where our merge point falls
                  for (let i = 0; i < previousBlockEl.childNodes.length; i++) {
                    const node = previousBlockEl.childNodes[i];
                    const nodeLength = node.textContent?.length || 0;
                    
                    if (currentLength + nodeLength >= offset) {
                      textNode = node;
                      offset = offset - currentLength;
                      break;
                    }
                    
                    currentLength += nodeLength;
                  }
                  
                  // If we found the right text node, set cursor there
                  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    const range = document.createRange();
                    range.setStart(textNode, offset);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  } else {
                    // Fallback: set cursor at end of element
                    const range = document.createRange();
                    range.selectNodeContents(previousBlockEl);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                } else {
                  // If no child nodes, just set cursor at beginning
                  const range = document.createRange();
                  range.setStart(previousBlockEl, 0);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
          }, 10);
          
          return;
        }
      }
      
      // Original empty block deletion behavior
      if (e.currentTarget.textContent === '' && blocks.length > 1) {
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
  
  // Helper function to check if cursor is at the start of a block
  const isCursorAtStart = (selection: Selection): boolean => {
    if (!selection.rangeCount) return false;
    
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false; // Not a cursor, but a selection
    
    // Check if we're at position 0 of a text node
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
      // Check if there are no previous siblings
      return !range.startContainer.previousSibling;
    }
    
    // Check if we're at the start of an element
    if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startOffset === 0) {
      return true;
    }
    
    return false;
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
              onBlur={(e) => handleBlur(block.id, e)}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
            >
              {block.content || ''}
            </div>
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
              onBlur={(e) => handleBlur(block.id, e)}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
            >
              {block.content || ''}
            </div>
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
              onBlur={(e) => handleBlur(block.id, e)}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              data-placeholder={block.content ? '' : placeholderText}
            >
              {block.content || ''}
            </div>
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
        placeholderText = '';
        break;
    }
    
    // Return the custom block element if we've built one
    if (blockElement) {
      return (
        <div style={{ position: 'relative', marginBottom: '4px' }}>
          {activeBlock === block.id && (
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
        {activeBlock === block.id && (
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
          onBlur={(e) => handleBlur(block.id, e)}
          onKeyDown={(e) => handleKeyDown(block.id, e)}
          data-placeholder={block.content ? '' : placeholderText}
        >
          {block.content || ''}
        </div>
      </div>
    );
  };

  // Add a function to generate content with AI
  const generateAIContent = async () => {
    try {
      setIsGenerating(true);
      
      // Format subject and note names for the prompt
      const formattedSubjectName = subject.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Use the current title from state instead of parsing from URL
      const formattedNoteName = title;
      
      // Create a system message that instructs the AI to generate structured notes
      const systemMessage: Message = {
        role: 'system',
        content: `You are an expert tutor who creates detailed, well-structured study notes. Generate comprehensive, educational content for a study note about "${formattedNoteName}" in the subject "${formattedSubjectName}".
        
Format your response with clear headers using Markdown:
- Start with a # heading for the main topic
- Use ## for major section headings
- Use ### for subsections
- Include relevant lists, definitions, examples, and explanations
- Focus on accurate, educational content that would be useful for students studying this topic
- Be comprehensive but concise
- If relevant, include formulas, key concepts, and important facts
- Format any math or formulas clearly

The notes will be saved in a note-taking application, so make them well-organized and useful for studying.`
      };
      
      // Create a user message
      const userMessage: Message = {
        role: 'user',
        content: `Please generate comprehensive study notes on "${formattedNoteName}" for my ${formattedSubjectName} class. Include all important concepts, definitions, and explanations.`
      };
      
      // Generate the response
      const aiResponse = await generateAIResponse([systemMessage, userMessage]);
      
      if (typeof aiResponse === 'string') {
        // Split the response into paragraphs
        const contentLines = aiResponse.split('\n');
        
        // Create new blocks from the content
        const newBlocks: Block[] = contentLines.map(line => {
          // Determine block type based on content
          let type: BlockType = 'paragraph';
          if (line.startsWith('# ')) {
            type = 'heading1';
            line = line.substring(2);
          } else if (line.startsWith('## ')) {
            type = 'heading2';
            line = line.substring(3);
          } else if (line.startsWith('### ')) {
            type = 'heading3';
            line = line.substring(4);
          } else if (line.startsWith('- ')) {
            type = 'bulletList';
            line = line.substring(2);
          } else if (line.match(/^\d+\.\s/)) {
            type = 'numberedList';
            line = line.replace(/^\d+\.\s/, '');
          } else if (line.startsWith('> ')) {
            type = 'quote';
            line = line.substring(2);
          } else if (line === '---') {
            type = 'divider';
            line = '';
          }
          
          return {
            id: generateId(),
            type,
            content: line.trim()
          };
        }).filter(block => block.content !== ''); // Remove empty blocks
        
        // If there are no blocks, add a default paragraph
        if (newBlocks.length === 0) {
          newBlocks.push({
            id: generateId(),
            type: 'paragraph',
            content: ''
          });
        }
        
        // Set the new blocks
        setBlocks(newBlocks);
        localStorage.setItem(blocksKey, JSON.stringify(newBlocks));
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Improve the explanation handling
  const handleExplainText = async () => {
    // If already explaining or no text selected, don't proceed
    if (isExplaining || !selectedText.trim()) {
      console.log("Skipping explanation request:", isExplaining ? "Already explaining" : "No text selected");
      return;
    }
    
    // Set explaining state immediately to prevent duplicate calls
    setIsExplaining(true);
    
    // Format the subject and note names for context
    const subjectParam = Array.isArray(params.subject) ? params.subject[0] : params.subject;
    const formattedSubject = formatSubjectName(subjectParam);
    const formattedNote = title || "this note";
    
    try {
      // First dispatch the event to the AI Tutor - send to one place only
      // This ensures the explanation only appears in the chat, not in the popup
      const explainEvent = new CustomEvent('explainText', {
        detail: {
          text: selectedText,
          source: `${formattedSubject} (${formattedNote})`,
          id: Date.now()
        }
      });
      
      // Dispatch only once to window
      window.dispatchEvent(explainEvent);
      console.log(`Event dispatched at ${new Date().toISOString()}`);
      
      // Skip the local explanation popup entirely - only use AI Tutor
      // This solves the problem of potentially duplicating API calls
      
      // Save to localStorage as fallback for the AI Tutor
      localStorage.setItem('pendingExplanation', JSON.stringify({
        text: selectedText,
        source: `${formattedSubject} (${formattedNote})`,
        timestamp: Date.now(),
        id: explainEvent.detail.id
      }));
      
      // Clear selection
      window.getSelection()?.removeAllRanges();
      setDebugInfo(`Explanation request sent to AI Tutor`);
    } catch (error) {
      console.error("Error dispatching explanation event:", error);
      if (error instanceof Error) {
        setDebugInfo(`Error: ${error.message}`);
      }
    } finally {
      // Reset explanation state after a delay
      setTimeout(() => {
        setIsExplaining(false);
      }, 1000);
    }
  };

  // Add useEffect for text selection
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // Clear the tooltip if no text is selected
        setShowSelectionTooltip(false);
        setDebugInfo('No text selected');
        return;
      }
      
      // Get selected text
      const selectedTextContent = selection.toString().trim();
      console.log("Text selected:", selectedTextContent);
      setSelectedText(selectedTextContent);
      setDebugInfo(`Selected: "${selectedTextContent.substring(0, 20)}${selectedTextContent.length > 20 ? '...' : ''}"`);
      
      // Position tooltip near selection
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        setTooltipPosition({
          top: rect.bottom + scrollTop + 10,
          left: rect.left + (rect.width / 2)
        });
        
        // Only show tooltip for substantial selections (15+ characters)
        // This prevents the tooltip from appearing for tiny selections
        if (selectedTextContent && selectedTextContent.length > 15) {
          // Check if user has disabled the tooltip in localStorage
          const tooltipsDisabled = localStorage.getItem('disableSelectionTooltips') === 'true';
          if (!tooltipsDisabled) {
            setShowSelectionTooltip(true);
            console.log("SHOWING selection tooltip for:", selectedTextContent);
          }
        }
      }
    };
    
    // Handle clicks outside the tooltip to close it
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        selectionTooltipRef.current && 
        !selectionTooltipRef.current.contains(event.target as Node) &&
        showSelectionTooltip
      ) {
        setShowSelectionTooltip(false);
      }
    };
    
    document.addEventListener('selectionchange', handleTextSelection);
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSelectionTooltip]);

  // Add this helper function near the top of the component
  const formatSubjectName = (subjectId: string): string => {
    return subjectId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
        
        {/* Note Title and Autofill Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <h1
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              fontSize: '40px',
              fontWeight: '800',
              outline: 'none',
              borderBottom: isTyping ? '1px solid var(--border-color)' : '1px solid transparent',
              paddingBottom: '8px',
              transition: 'border-color 0.2s',
              color: 'var(--text-primary)',
              marginBottom: 0,
              flex: 1
            }}
            onInput={handleTitleChange}
            onFocus={() => setIsTyping(true)}
            onBlur={handleTitleBlur}
          >
            {title}
          </h1>
          
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            {/* Manual Explain Button */}
            <button
              onClick={() => {
                const selectedText = window.getSelection()?.toString().trim() || '';
                if (selectedText.length > 0) {
                  console.log("Manual explain button clicked with selection:", selectedText);
                  setSelectedText(selectedText);
                  handleExplainText();
                } else {
                  setDebugInfo("Please select some text first");
                  setTimeout(() => setDebugInfo(''), 3000);
                }
              }}
              disabled={isExplaining}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: isExplaining ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: isExplaining ? 'not-allowed' : 'pointer',
                opacity: isExplaining ? 0.7 : 1,
                transition: 'background-color 0.2s ease'
              }}
            >
              {isExplaining ? (
                <>
                  <PiSpinnerGap className="animate-spin" size={16} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaStar size={14} />
                  <span>Explain Selection</span>
                </>
              )}
            </button>
            
            <button
              onClick={generateAIContent}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--highlight-color)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: isGenerating ? 'default' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
                transition: 'opacity 0.2s ease',
              }}
            >
              {isGenerating ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles size={16} />
                  Autofill with AI
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Editor Blocks */}
        <div className="notion-blocks-container" style={{
          minHeight: '60vh',
          fontSize: '16px',
          lineHeight: 1.6,
          color: 'var(--text-primary)',
        }}>
          {blocks.map(block => {
            // If this block appears to contain HTML content and is not being edited
            const containsHtml = block.content && 
              (block.content.includes('<h') || 
               block.content.includes('<strong>') ||
               block.content.includes('<em>') ||
               block.content.includes('<ul>') ||
               block.content.includes('<ol>') ||
               block.content.includes('<li>') ||
               block.content.includes('<p>'));
            
            const isBeingEdited = activeBlock === block.id;
            
            // If it contains HTML and is not being edited, render parsed content
            if (containsHtml && !isBeingEdited) {
              return (
                <div 
                  key={block.id}
                  className="formatted-content" 
                  style={{ 
                    position: 'relative',
                    marginBottom: '16px'
                  }}
                  onClick={() => {
                    // Make the block editable on click
                    setActiveBlock(block.id);
                    setTimeout(() => {
                      const el = blockRefs.current[block.id];
                      if (el) el.focus();
                    }, 0);
                  }}
                >
                  {activeBlock === block.id && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        showBlockMenuAtBlock(block.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: '-30px',
                        top: '4px',
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
                  <div className="content-viewer">
                    {parse(block.content)}
                  </div>
                </div>
              );
            }
            
            // Otherwise use the regular block renderer
            return (
              <div key={block.id}>
                {renderBlock(block)}
              </div>
            );
          })}
        </div>
        
        {/* Selection tooltip */}
        {showSelectionTooltip && (
          <div 
            ref={selectionTooltipRef}
            className="fixed z-[9999] bg-white dark:bg-slate-800 shadow-xl rounded-lg flex items-center border-2 border-blue-500 dark:border-blue-400"
            style={{ 
              top: `${tooltipPosition.top}px`, 
              left: `${tooltipPosition.left}px`,
              transform: 'translateX(-50%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              animation: 'fadeIn 0.2s ease-in-out',
              padding: '6px 12px'
            }}
          >
            <button
              onClick={handleExplainText}
              disabled={isExplaining}
              className={`text-gray-700 dark:text-gray-300 px-3 py-2 rounded flex items-center space-x-2 text-sm font-medium
                ${isExplaining 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'}`}
              style={{ 
                pointerEvents: isExplaining ? 'none' : 'all'
              }}
            >
              {isExplaining ? (
                <>
                  <PiSpinnerGap className="animate-spin mr-2" size={16} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaStar size={14} className="text-yellow-500 mr-2" />
                  <span>Explain with AI</span>
                </>
              )}
            </button>
            
            {/* Close button */}
            <button
              onClick={() => {
                setShowSelectionTooltip(false);
                // Ask if user wants to disable tooltips permanently
                const disableForever = window.confirm('Would you like to disable the selection popup? You can still use the Explain Selection button at the top.');
                if (disableForever) {
                  localStorage.setItem('disableSelectionTooltips', 'true');
                  setDebugInfo('Selection tooltips disabled');
                }
              }}
              className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
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
        
        {/* Debug info */}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          {debugInfo || 'Waiting for selection...'}
        </div>
      </div>
      
      {/* Global CSS for placeholders and formatted content */}
      <style jsx global>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          cursor: text;
        }
        
        .formatted-content {
          cursor: text;
        }
        
        .formatted-content .content-viewer {
          padding: 4px 0;
        }
        
        .formatted-content .content-viewer h1 {
          font-size: 30px;
          font-weight: 700;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        
        .formatted-content .content-viewer h2 {
          font-size: 24px;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 12px;
        }
        
        .formatted-content .content-viewer h3 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        
        .formatted-content .content-viewer p {
          margin: 8px 0;
        }
        
        .formatted-content .content-viewer ul,
        .formatted-content .content-viewer ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        
        .formatted-content .content-viewer li {
          margin: 4px 0;
        }
        
        .formatted-content .content-viewer blockquote {
          border-left: 3px solid var(--quote-border, #e5e7eb);
          padding-left: 16px;
          font-style: italic;
          color: var(--text-secondary, #6b7280);
          margin: 16px 0;
        }
        
        .formatted-content .content-viewer pre {
          font-family: monospace;
          background-color: var(--code-bg, #f3f4f6);
          padding: 12px 16px;
          border-radius: 6px;
          white-space: pre-wrap;
          margin: 12px 0;
          overflow-x: auto;
        }
        
        .formatted-content .content-viewer code {
          font-family: monospace;
          background-color: var(--code-bg, #f3f4f6);
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
      `}</style>
    </AppLayout>
  );
} 