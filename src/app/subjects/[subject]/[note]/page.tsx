'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent, MouseEvent, ChangeEvent, DragEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Check,
  Send,
  Underline,
  Loader2,
  Trash2,
  Copy,
  ChevronUp,
  ChevronRight,
  Edit,
  User
} from 'lucide-react';
import { FaArrowLeft, FaLink, FaRegTrashAlt, FaSave, FaImage, FaCode, FaParagraph, FaListUl, FaHeading, FaQuoteLeft, FaStar, FaMarkdown, FaClipboard, FaTimes } from 'react-icons/fa';
import { RiListOrdered } from 'react-icons/ri';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { PiSpinnerGap } from 'react-icons/pi';
import { LuExternalLink } from 'react-icons/lu';
import { generateAIResponse, Message, generateStreamingAIResponse } from '@/lib/openai';
import { createPortal } from 'react-dom';

// Define animations for dialog
const animations = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.notes-dialog-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-in-out;
  box-sizing: border-box;
}

.notes-dialog {
  background-color: #ffffff;
  color: #333333;
  border-radius: 8px;
  padding: 20px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  animation: scaleIn 0.2s ease-in-out;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notes-dialog * {
  box-sizing: border-box;
  max-width: 100%;
}

/* Dark mode styles */
.dark .notes-dialog {
  background-color: #1e1e1e;
  color: #f5f5f5;
  border-color: #2a2a2a;
}

.notes-dialog-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.dark .notes-dialog-title {
  color: #f5f5f5;
}

.notes-dialog-text {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #555555;
}

.dark .notes-dialog-text {
  color: #cccccc;
}

.notes-dialog-textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  color: #333333;
  font-size: 14px;
  resize: none;
  outline: none;
  margin-bottom: 16px;
  font-family: inherit;
  box-sizing: border-box;
}

.dark .notes-dialog-textarea {
  background-color: #2a2a2a;
  border-color: #3a3a3a;
  color: #f5f5f5;
}

.notes-dialog-button-container {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  flex-wrap: wrap;
}

.notes-dialog-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notes-dialog-button-cancel {
  background-color: transparent;
  color: #666666;
  border: 1px solid #e0e0e0;
}

.dark .notes-dialog-button-cancel {
  color: #cccccc;
  border-color: #3a3a3a;
}

.notes-dialog-button-auto {
  background-color: #e6f7ff;
  color: #0066cc;
  border: none;
}

.dark .notes-dialog-button-auto {
  background-color: #193c5a;
  color: #4da9ff;
}

.notes-dialog-button-generate {
  background-color: #0066cc;
  color: white;
  border: none;
}

.notes-dialog-button-generate:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
}

.dark .notes-dialog-button-generate:disabled {
  background-color: #3a3a3a;
  color: #888888;
}
`;

// Define block types
type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'numberedList' | 'todo' | 'code' | 'quote' | 'divider' | 'aiResponse';

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
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesPrompt, setNotesPrompt] = useState('');
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blockRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Add state to handle text selection
  const [selectedText, setSelectedText] = useState<string>('');
  const [showSelectionTooltip, setShowSelectionTooltip] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const selectionTooltipRef = useRef<HTMLDivElement>(null);
  
  // Add state for context menu
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Add a debug state to track selection status
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Add a processing flag at the component level
  const [isEventDispatched, setIsEventDispatched] = useState<boolean>(false);
  
  // Keep the isExplaining state since it's still needed for button state
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  
  // Add state for in-page chat messages
  const [inPageMessages, setInPageMessages] = useState<{id: number, text: string, sender: 'user' | 'ai'}[]>([]);
  const [isInPageLoading, setIsInPageLoading] = useState<boolean>(false);
  const inPageChatRef = useRef<HTMLDivElement>(null);
  
  // At the top of the component, add a state for the input
  const [aiQuestionInput, setAiQuestionInput] = useState('');
  
  // Add this new state for tracking last cursor position
  const [lastCursorBlockId, setLastCursorBlockId] = useState<string | null>(null);
  
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
    setLastCursorBlockId(blockId); // Store the block ID when focus happens
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
    // Set this block as active
    setActiveBlock(id);
    // Also update the last cursor position
    setLastCursorBlockId(id);
    
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
  
  // Define the block options
  const blockOptions = [
    { label: 'Text', type: 'paragraph', icon: <FaParagraph size={14} /> },
    { label: 'Heading 1', type: 'heading1', icon: <FaHeading size={14} /> },
    { label: 'Heading 2', type: 'heading2', icon: <FaHeading size={14} style={{ transform: 'scale(0.85)' }} /> },
    { label: 'Heading 3', type: 'heading3', icon: <FaHeading size={14} style={{ transform: 'scale(0.7)' }} /> },
    { label: 'Bullet List', type: 'bulletList', icon: <FaListUl size={14} /> },
    { label: 'Numbered List', type: 'numberedList', icon: <RiListOrdered size={14} /> },
    { label: 'To-do', type: 'todo', icon: <CheckSquare size={14} /> },
    { label: 'Code', type: 'code', icon: <FaCode size={14} /> },
    { label: 'Quote', type: 'quote', icon: <FaQuoteLeft size={14} /> },
    { label: 'Divider', type: 'divider', icon: <Minus size={14} /> },
    { label: 'AI Response', type: 'aiResponse', icon: <Sparkles size={14} /> },
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
    
    // Check if block content contains HTML and should be rendered with parse
    const containsHtml = block.content && (
      block.content.includes('<') && 
      block.content.includes('>') && 
      (block.content.includes('div') || 
       block.content.includes('span') || 
       block.content.includes('p') || 
       block.content.includes('strong') || 
       block.content.includes('em'))
    );

    // If this block is not being edited and contains HTML, create a parsed content viewer
    if (containsHtml && activeBlock !== block.id) {
      return (
        <div 
          key={block.id}
          className="formatted-content" 
          style={{ 
            position: 'relative',
            marginBottom: '12px',
            cursor: 'text'
          }}
          // Make HTML blocks clickable so we can add content after them
          onClick={(e) => {
            // Instead of preventing propagation, let's allow creating a new block after this one
            createNewBlock(block.id);
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
          {/* Add a small button at the bottom to clearly show you can add content */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              createNewBlock(block.id);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              marginTop: '4px',
              cursor: 'pointer',
              opacity: 0.5,
              transition: 'opacity 0.2s',
              borderRadius: '4px',
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
            <Plus size={12} />
          </div>
        </div>
      );
    }
    
    // For blocks without HTML or that are being edited, use the normal type-based rendering
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
        
      case 'aiResponse':
        blockStyle = {
          ...blockStyle,
          fontStyle: 'italic',
          fontSize: '0.85em',
          color: 'var(--text-tertiary, #6b7280)',
          borderLeft: '3px solid var(--highlight-color)',
          paddingLeft: '16px',
          marginTop: '8px',
          marginBottom: '16px',
          position: 'relative',
          paddingTop: '8px',
          paddingBottom: '8px',
          lineHeight: '1.6',
          backgroundColor: 'transparent'
        };
        placeholderText = 'AI Response';
        // Special handling for aiResponse blocks to allow adding content after
        blockElement = (
          <div style={{ position: 'relative' }}>
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
            {/* Add a small button at the bottom to clearly show you can add content */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                createNewBlock(block.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                marginTop: '4px',
                cursor: 'pointer',
                opacity: 0.5,
                transition: 'opacity 0.2s',
                borderRadius: '4px',
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
              <Plus size={12} />
            </div>
          </div>
        );
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
  const generateAIContent = async (customPrompt?: string) => {
    // Create a typing indicator block ID at the outermost scope
    const typingBlockId = generateId();
    
    try {
      setIsGenerating(true);
      setShowNotesDialog(false);
      
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
      
      // Create a user message, using any custom prompt if provided
      const userMessage: Message = {
        role: 'user',
        content: customPrompt || `Please generate comprehensive study notes on "${formattedNoteName}" for my ${formattedSubjectName} class. Include all important concepts, definitions, and explanations.`
      };
      
      // Create a divider and a typing indicator block
      const dividerBlock: Block = {
        id: generateId(),
        type: 'divider',
        content: ''
      };
      
      // Create a typing indicator block (using ID declared at the top)
      const typingBlock: Block = {
        id: typingBlockId,
        type: 'paragraph',
        content: ''
      };
      
      // Add the divider and typing indicator to existing blocks
      setBlocks(prevBlocks => {
        const combinedBlocks = [...prevBlocks, dividerBlock, typingBlock];
        localStorage.setItem(blocksKey, JSON.stringify(combinedBlocks));
        return combinedBlocks;
      });
      
      // Collect all content chunks to process at the end
      let fullResponse = '';
      let currentLine = '';
      let lineBuffer: string[] = [];
      
      // Process each incoming chunk
      const processChunk = (chunk: string) => {
        // Add chunk to the full response
        fullResponse += chunk;
        
        // Process the chunk by characters to create a more natural typing effect
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];
          
          // If it's a newline, add the current line to the buffer and reset
          if (char === '\n') {
            if (currentLine.trim() !== '') {
              lineBuffer.push(currentLine);
            }
            currentLine = '';
          } else {
            // Add character to current line
            currentLine += char;
          }
          
          // Update the typing block with current progress
          setBlocks(prevBlocks => {
            const updatedBlocks = [...prevBlocks];
            const typingIndex = updatedBlocks.findIndex(block => block.id === typingBlockId);
            
            if (typingIndex !== -1) {
              // Determine proper block type based on current line (for proper formatting during typing)
              let blockType: BlockType = 'paragraph';
              let displayContent = [...lineBuffer, currentLine];
              
              // Apply formatting to each line
              const formattedDisplayContent = displayContent.map(line => {
                let formattedLine = line;
                let lineType: BlockType = 'paragraph';
                
                // Determine line type based on its content
                if (line.startsWith('# ')) {
                  lineType = 'heading1';
                  formattedLine = line.substring(2);
                } else if (line.startsWith('## ')) {
                  lineType = 'heading2';
                  formattedLine = line.substring(3);
                } else if (line.startsWith('### ')) {
                  lineType = 'heading3';
                  formattedLine = line.substring(4);
                } else if (line.startsWith('- ')) {
                  lineType = 'bulletList';
                  formattedLine = line.substring(2);
                } else if (line.match(/^\d+\.\s/)) {
                  lineType = 'numberedList';
                  formattedLine = line.replace(/^\d+\.\s/, '');
                } else if (line.startsWith('> ')) {
                  lineType = 'quote';
                  formattedLine = line.substring(2);
                } else if (line === '---') {
                  lineType = 'divider';
                  formattedLine = '';
                }
                
                // Update the first line type to be the block type
                if (line === displayContent[0]) {
                  blockType = lineType;
                }
                
                return {
                  type: lineType,
                  content: formattedLine
                };
              });
              
              // If last line is current one being typed, get its type
              if (lineBuffer.length === 0 && currentLine) {
                if (currentLine.startsWith('# ')) {
                  blockType = 'heading1';
                } else if (currentLine.startsWith('## ')) {
                  blockType = 'heading2';
                } else if (currentLine.startsWith('### ')) {
                  blockType = 'heading3';
                } else if (currentLine.startsWith('- ')) {
                  blockType = 'bulletList';
                } else if (currentLine.match(/^\d+\.\s/)) {
                  blockType = 'numberedList';
                } else if (currentLine.startsWith('> ')) {
                  blockType = 'quote';
                } else if (currentLine === '---') {
                  blockType = 'divider';
                }
              }
              
              // Create HTML content that respects the line formats
              const htmlContent = formattedDisplayContent.map(line => {
                // Skip empty lines
                if (!line.content.trim()) return '';
                
                // Format based on line type
                switch(line.type) {
                  case 'heading1':
                    return `<h1 style="font-size: 1.8em; font-weight: 700; margin: 24px 0 12px 0;">${line.content}</h1>`;
                  case 'heading2':
                    return `<h2 style="font-size: 1.5em; font-weight: 600; margin: 20px 0 10px 0;">${line.content}</h2>`;
                  case 'heading3':
                    return `<h3 style="font-size: 1.3em; font-weight: 600; margin: 16px 0 8px 0;">${line.content}</h3>`;
                  case 'bulletList':
                    return `<div style="display: flex; margin: 4px 0;"><span style="margin-right: 8px;">•</span><span>${line.content}</span></div>`;
                  case 'numberedList':
                    // Simple handling for numbered lists during typing
                    return `<div style="display: flex; margin: 4px 0;"><span style="margin-right: 8px;">-</span><span>${line.content}</span></div>`;
                  case 'quote':
                    return `<blockquote style="border-left: 3px solid #ccc; padding-left: 12px; margin: 8px 0; font-style: italic;">${line.content}</blockquote>`;
                  case 'divider':
                    return `<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />`;
                  default:
                    return `<p style="margin: 8px 0;">${line.content}</p>`;
                }
              }).join('');
              
              // Update the block with the formatted content
              updatedBlocks[typingIndex] = {
                ...updatedBlocks[typingIndex],
                type: blockType,
                content: htmlContent
              };
            }
            
            return updatedBlocks;
          });
        }
      };
      
      // Handle completion of the response
      const handleComplete = (fullText: string) => {
        // Split the response into paragraphs
        const contentLines = fullText.split('\n');
        
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
        
        // If there are no new blocks, add a default paragraph
        if (newBlocks.length === 0) {
          newBlocks.push({
            id: generateId(),
            type: 'paragraph',
            content: ''
          });
        }
        
        // Replace the typing block with properly formatted blocks
        setBlocks(prevBlocks => {
          // Find and remove the typing indicator block
          const withoutTyping = prevBlocks.filter(block => block.id !== typingBlockId);
          
          // Combine existing blocks with new blocks (typing block is already removed)
          const combinedBlocks = [...withoutTyping, ...newBlocks];
          localStorage.setItem(blocksKey, JSON.stringify(combinedBlocks));
          return combinedBlocks;
        });
        
        // Finish generating
        setIsGenerating(false);
      };
      
      // Use the streaming API
      await generateStreamingAIResponse(
        [systemMessage, userMessage],
        processChunk,
        handleComplete
      );
      
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Remove the typing indicator block on error
      setBlocks(prevBlocks => {
        const withoutTyping = prevBlocks.filter(block => block.id !== typingBlockId);
        return withoutTyping;
      });
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
    
    // Declare loadingBlock at function scope so it's accessible in the catch block
    let loadingBlock: Block | null = null;
    
    try {
      // Get current selection to find the block containing the selection
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        console.log("No selection found");
        return;
      }
      
      // Find the block containing the selection
      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      let blockElement: Element | null = null;
      let currentNode: Node | null = node;
      
      // Traverse up the DOM to find the block element with data-block-id attribute
      while (currentNode && !blockElement) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const element = currentNode as Element;
          if (element.hasAttribute('data-block-id')) {
            blockElement = element;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }
      
      if (!blockElement) {
        console.log("Could not find block containing the selection");
        setDebugInfo("Could not find block containing the selection");
        setIsExplaining(false);
        return;
      }
      
      // Get the block ID
      const blockId = blockElement.getAttribute('data-block-id');
      if (!blockId) {
        console.log("Block element doesn't have a block ID");
        setIsExplaining(false);
        return;
      }
      
      // Create a temporary loading block to show while generating the explanation
      loadingBlock = {
        id: generateId(),
        type: 'aiResponse',
        content: `<div style="color: var(--text-tertiary, #6b7280); line-height: 1.6; display: flex; align-items: center; padding-left: 16px; border-left: 3px solid var(--text-tertiary, #6b7280);">
          <div class="loading-dots">Generating explanation<span>.</span><span>.</span><span>.</span></div>
        </div>
        <style>
          .loading-dots span {
            animation: loadingDots 1.4s infinite;
            opacity: 0;
          }
          .loading-dots span:nth-child(1) {
            animation-delay: 0s;
          }
          .loading-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }
          .loading-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }
          @keyframes loadingDots {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }
        </style>`
      };
      
      // Insert the loading block after the block containing the selection
      setBlocks(prevBlocks => {
        const blockIndex = prevBlocks.findIndex(block => block.id === blockId);
        if (blockIndex === -1) return prevBlocks;
        
        const newBlocks = [...prevBlocks];
        // Check if loadingBlock is not null before adding it
        if (loadingBlock) {
          newBlocks.splice(blockIndex + 1, 0, loadingBlock);
          
          // Scroll to the loading block
          setTimeout(() => {
            const loadingElement = document.querySelector(`[data-block-id="${loadingBlock?.id}"]`);
            if (loadingElement) {
              loadingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
        
        return newBlocks;
      });
      
      // Create a system message that explains what to do
      const systemMessage: Message = {
        role: 'system',
        content: `You are an expert tutor explaining the following text from ${formattedSubject} (${formattedNote}). 
        
Your explanation MUST follow this structured format:
1. Start with a "Summary" section that briefly explains the concept in 2-3 sentences
2. Include a "Key Points" section with bullet points highlighting the most important aspects
3. Add a "Detailed Explanation" section that breaks down the concept step by step
4. If relevant, include a "Formula/Equations" section for mathematical concepts
5. End with a "Why It Matters" section to explain the significance of the concept

Use bold headings for each section (e.g., **Summary:**) and bullet points (•) for lists.
Keep your explanation educational, clear, and well-organized.
Your explanation will be inserted directly into the user's notes.`
      };
      
      // Create the message with the text to explain
      const userMessage: Message = {
        role: 'user',
        content: `Please explain this text: "${selectedText}"`
      };
      
      // Use streaming response for the typing effect
      let currentExplanation = '';
      
      // Process each incoming chunk as it arrives
      const processChunk = (chunk: string) => {
        currentExplanation += chunk;
        
        // Format the explanation with the processor
        const formattedResponse = processMarkdown(currentExplanation);
        
        // Update the loading block with the current explanation
        setBlocks(prevBlocks => {
          const blockIndex = prevBlocks.findIndex(block => block.id === loadingBlock?.id);
          if (blockIndex === -1) return prevBlocks;
          
          const newBlocks = [...prevBlocks];
          newBlocks[blockIndex] = {
            ...newBlocks[blockIndex],
            content: `<div style="color: var(--text-tertiary, #6b7280); line-height: 1.6; padding-left: 16px; border-left: 3px solid var(--text-tertiary, #6b7280);">${formattedResponse}</div>`
          };
          
          return newBlocks;
        });
      };
      
      // Process completion of the explanation
      const handleComplete = (fullExplanation: string) => {
        // Format the explanation with the processor
        const formattedResponse = processMarkdown(fullExplanation);
        
        // Update the block with the final formatted explanation
        setBlocks(prevBlocks => {
          const blockIndex = prevBlocks.findIndex(block => block.id === loadingBlock?.id);
          if (blockIndex === -1) return prevBlocks;
          
          const newBlocks = [...prevBlocks];
          newBlocks[blockIndex] = {
            ...newBlocks[blockIndex],
            type: 'aiResponse',
            content: `<div style="color: var(--text-tertiary, #6b7280); line-height: 1.6; padding-left: 16px; border-left: 3px solid var(--text-tertiary, #6b7280);">${formattedResponse}</div>`
          };
          
          return newBlocks;
        });
        
        // Reset the explaining state after a delay
        setTimeout(() => {
          setIsExplaining(false);
        }, 1000);
      };
      
      // Generate explanation using streaming API
      await generateStreamingAIResponse(
        [systemMessage, userMessage],
        processChunk,
        handleComplete
      );
      
    } catch (error) {
      console.error("Error generating explanation:", error);
      if (error instanceof Error) {
        setDebugInfo(`Error: ${error.message}`);
      }
      
      // Remove the loading block if there was an error
      if (loadingBlock) {
        setBlocks(prevBlocks => {
          const loadingIndex = prevBlocks.findIndex(block => block.id === loadingBlock?.id);
          if (loadingIndex === -1) return prevBlocks;
          
          const newBlocks = [...prevBlocks];
          newBlocks.splice(loadingIndex, 1);
          return newBlocks;
        });
      }
      
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
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate initial position
        let top = rect.bottom + scrollTop + 10;
        let left = rect.left + (rect.width / 2);
        
        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Ensure the tooltip stays within viewport
        // If would appear too low, position it above the selection
        if (rect.bottom + 150 > viewportHeight) {
          top = rect.top + scrollTop - 50; // Position above selection
        }
        
        // If would appear too far right, adjust left position
        if (left + 150 > viewportWidth + scrollLeft) {
          left = viewportWidth + scrollLeft - 170;
        }
        
        // If would appear too far left, adjust left position
        if (left - 100 < scrollLeft) {
          left = scrollLeft + 120;
        }
        
        setTooltipPosition({
          top,
          left
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
    
    // Handle right-click for context menu
    const handleContextMenu = (event: globalThis.MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // If no text is selected, hide context menu
        setShowContextMenu(false);
        return;
      }
      
      // Only show context menu if we're in an editable block
      const target = event.target as HTMLElement;
      const isEditableBlock = target.hasAttribute('contenteditable') || 
                              target.closest('[contenteditable="true"]');
      
      if (!isEditableBlock) {
        return;
      }
      
      // Prevent default context menu
      event.preventDefault();
      
      // Calculate initial position
      let top = event.pageY;
      let left = event.pageX;
      
      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // Ensure the context menu stays within viewport
      // If would appear too low, position it higher
      if (event.clientY + 300 > viewportHeight) {
        top = Math.max(scrollTop + 10, event.pageY - 300);
      }
      
      // If would appear too far right, position it more to the left
      if (event.clientX + 250 > viewportWidth) {
        left = event.pageX - 250;
      }
      
      // Show our custom context menu with adjusted position
      setContextMenuPosition({
        top,
        left
      });
      
      setShowContextMenu(true);
    };
    
    // Handle clicks outside the tooltip to close it
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (selectionTooltipRef.current && 
          !selectionTooltipRef.current.contains(event.target as Node) &&
          showSelectionTooltip) {
        setShowSelectionTooltip(false);
      }
      
      if (contextMenuRef.current && 
          !contextMenuRef.current.contains(event.target as Node) &&
          showContextMenu) {
        setShowContextMenu(false);
      }
    };
    
    document.addEventListener('selectionchange', handleTextSelection);
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [showSelectionTooltip, showContextMenu]);

  // Format selected text with the specified formatting
  const formatSelectedText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'clear' | 
    'text-red' | 'text-blue' | 'text-green' | 'text-purple' | 
    'highlight-yellow' | 'highlight-green' | 'highlight-blue' | 'highlight-pink' |
    'highlight-purple' | 'highlight-orange' | 'highlight-teal' | 'highlight-gray' |
    'font-size-small' | 'font-size-medium' | 'font-size-large' | 'font-size-xlarge' | 'font-size-xxlarge' | 
    'font-size-custom' |
    'font-serif' | 'font-mono' | 'font-cursive' | 'font-sans' | 'font-arial' | 'font-times' | 'font-verdana' | 'font-comic' |
    'font-handwritten' | 'font-fantasy' | 'font-system') => {
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Get the range and its contents
    const range = selection.getRangeAt(0);
    
    // Determine what markup to apply
    let prefix = '';
    let suffix = '';
    
    switch (format) {
      case 'bold':
        prefix = '<strong>';
        suffix = '</strong>';
        break;
      case 'italic':
        prefix = '<em>';
        suffix = '</em>';
        break;
      case 'underline':
        prefix = '<u>';
        suffix = '</u>';
        break;
      case 'strikethrough':
        prefix = ' ';
        suffix = ' ';
        break;
      case 'code':
        prefix = '<code>';
        suffix = '</code>';
        break;
      case 'text-red':
        prefix = '<span style="color: #e53e3e;">';
        suffix = '</span>';
        break;
      case 'text-blue':
        prefix = '<span style="color: #3182ce;">';
        suffix = '</span>';
        break;
      case 'text-green':
        prefix = '<span style="color: #38a169;">';
        suffix = '</span>';
        break;
      case 'text-purple':
        prefix = '<span style="color: #805ad5;">';
        suffix = '</span>';
        break;
      case 'highlight-yellow':
        prefix = '<span style="background-color: #fefcbf;">';
        suffix = '</span>';
        break;
      case 'highlight-green':
        prefix = '<span style="background-color: #c6f6d5;">';
        suffix = '</span>';
        break;
      case 'highlight-blue':
        prefix = '<span style="background-color: #bee3f8;">';
        suffix = '</span>';
        break;
      case 'highlight-pink':
        prefix = '<span style="background-color: #fed7e2;">';
        suffix = '</span>';
        break;
      case 'highlight-purple':
        prefix = '<span style="background-color: #e9d8fd;">';
        suffix = '</span>';
        break;
      case 'highlight-orange':
        prefix = '<span style="background-color: #feebc8;">';
        suffix = '</span>';
        break;
      case 'highlight-teal':
        prefix = '<span style="background-color: #b2f5ea;">';
        suffix = '</span>';
        break;
      case 'highlight-gray':
        prefix = '<span style="background-color: #e2e8f0;">';
        suffix = '</span>';
        break;
      case 'font-size-small':
        prefix = '<span style="font-size: 0.85em;">';
        suffix = '</span>';
        break;
      case 'font-size-medium':
        prefix = '<span style="font-size: 1em;">';
        suffix = '</span>';
        break;
      case 'font-size-large':
        prefix = '<span style="font-size: 1.25em;">';
        suffix = '</span>';
        break;
      case 'font-size-xlarge':
        prefix = '<span style="font-size: 1.5em;">';
        suffix = '</span>';
        break;
      case 'font-size-xxlarge':
        prefix = '<span style="font-size: 2em;">';
        suffix = '</span>';
        break;
      case 'font-size-custom':
        // Get custom font size
        const size = prompt('Enter font size (in pixels):', '16');
        if (!size) return; // User cancelled
        prefix = `<span style="font-size: ${size}px;">`;
        suffix = '</span>';
        break;
      case 'font-serif':
        prefix = '<span style="font-family: Georgia, Times, serif;">';
        suffix = '</span>';
        break;
      case 'font-mono':
        prefix = '<span style="font-family: monospace, Courier, \'Courier New\';">';
        suffix = '</span>';
        break;
      case 'font-cursive':
        prefix = '<span style="font-family: cursive, \'Brush Script MT\';">';
        suffix = '</span>';
        break;
      case 'font-sans':
        prefix = '<span style="font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;">';
        suffix = '</span>';
        break;
      case 'font-arial':
        prefix = '<span style="font-family: Arial, sans-serif;">';
        suffix = '</span>';
        break;
      case 'font-times':
        prefix = '<span style="font-family: \'Times New Roman\', Times, serif;">';
        suffix = '</span>';
        break;
      case 'font-verdana':
        prefix = '<span style="font-family: Verdana, Geneva, sans-serif;">';
        suffix = '</span>';
        break;
      case 'font-comic':
        prefix = '<span style="font-family: \'Comic Sans MS\', cursive, sans-serif;">';
        suffix = '</span>';
        break;
      case 'font-handwritten':
        prefix = '<span style="font-family: \'Segoe Script\', \'Bradley Hand\', Chilanka, cursive;">';
        suffix = '</span>';
        break;
      case 'font-fantasy':
        prefix = '<span style="font-family: Papyrus, Fantasy;">';
        suffix = '</span>';
        break;
      case 'font-system':
        prefix = '<span style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', system-ui, sans-serif;">';
        suffix = '</span>';
        break;
      case 'clear':
        // For clear formatting, we extract just the text content
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(range.cloneContents());
        const plainText = tempDiv.textContent || "";
        
        // Delete the current selection
        range.deleteContents();
        
        // Insert the plain text
        range.insertNode(document.createTextNode(plainText));
        
        // Update the block content
        if (activeBlock) {
          const activeElement = blockRefs.current[activeBlock];
          if (activeElement) {
            // Trigger the input handler to save the changes
            const inputEvent = new Event('input', { bubbles: true });
            activeElement.dispatchEvent(inputEvent);
          }
        }
        
        // Hide the context menu
        setShowContextMenu(false);
        return;
    }
    
    // Extract the content
    const fragment = range.cloneContents();
    
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);
    
    // Get the content to format
    const content = tempDiv.innerHTML;
    
    // Create the new formatted content
    const formattedContent = `${prefix}${content}${suffix}`;
    
    // Delete the current selection
    range.deleteContents();
    
    // Create a temporary element to hold the HTML
    const temp = document.createElement('div');
    temp.innerHTML = formattedContent;
    
    // Insert each child node
    const fragment2 = document.createDocumentFragment();
    while (temp.firstChild) {
      fragment2.appendChild(temp.firstChild);
    }
    
    // Insert the formatted content
    range.insertNode(fragment2);
    
    // Update the block content
    if (activeBlock) {
      const activeElement = blockRefs.current[activeBlock];
      if (activeElement) {
        // Trigger the input handler to save the changes
        const inputEvent = new Event('input', { bubbles: true });
        activeElement.dispatchEvent(inputEvent);
      }
    }
    
    // Hide the context menu
    setShowContextMenu(false);
  };

  // Add this helper function near the top of the component
  const formatSubjectName = (subjectId: string): string => {
    return subjectId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Add a handler for the in-page AI chat messages
  useEffect(() => {
    // Define a handler for messages coming from the global chat input
    const handleInPageMessage = (event: CustomEvent<{ message: string, context: string, timestamp: number }>) => {
      console.log("Received in-page message:", event.detail);
      const { message } = event.detail;
      
      // Add the user message to chat
      const userMessage = {
        id: Date.now(),
        text: message,
        sender: 'user' as const
      };
      
      setInPageMessages(prev => [...prev, userMessage]);
      
      // Generate AI response
      generateInPageResponse(message);
    };
    
    // Handler for remembering cursor position when clicking on the bottom input
    const handleRememberCursorPosition = () => {
      // Get the current selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        
        // Find the closest parent block element with data-block-id
        let currentNode: Node | null = node;
        while (currentNode) {
          if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const element = currentNode as Element;
            const blockId = element.getAttribute('data-block-id');
            if (blockId) {
              console.log("Stored cursor position at block:", blockId);
              setLastCursorBlockId(blockId);
              break;
            }
          }
          currentNode = currentNode.parentNode;
        }
      } else if (activeBlock) {
        // If no selection but we have an active block, use that
        console.log("No selection found, using active block:", activeBlock);
        setLastCursorBlockId(activeBlock);
      }
    };
    
    // Listen for the custom events
    window.addEventListener('inPageMessage', handleInPageMessage as EventListener);
    window.addEventListener('rememberCursorPosition', handleRememberCursorPosition as EventListener);
    
    // Scroll to bottom when messages change
    if (inPageChatRef.current) {
      inPageChatRef.current.scrollTop = inPageChatRef.current.scrollHeight;
    }
    
    return () => {
      window.removeEventListener('inPageMessage', handleInPageMessage as EventListener);
      window.removeEventListener('rememberCursorPosition', handleRememberCursorPosition as EventListener);
    };
  }, [inPageMessages, activeBlock]); // Keep minimal dependencies to avoid circular references
  
  // Function to generate AI response for in-page chat
  const generateInPageResponse = async (userMessage: string) => {
    // Create a variable outside the try/catch so it's accessible in both blocks
    let insertedLoadingBlockId: string | null = null;
    
    try {
      setIsInPageLoading(true);
      
      // Format context for better responses
      const formattedSubjectName = formatSubjectName(subject);
      const noteContext = `Note: "${title}" in subject "${formattedSubjectName}"`;
      
      // First add the user's question as a block with HTML - using a green color instead of blue
      const questionBlock: Block = {
        id: generateId(),
        type: 'paragraph',
        content: `<div style="display: inline-block; padding: 8px 16px; background-color: #f0fff5; border: 2px solid #4CAF50; border-radius: 20px; color: var(--text-primary); font-weight: 500; margin: 10px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-style: normal;">${userMessage}</div>`
      };
      
      // Create a typing block to show the response as it comes in
      const typingBlockId = generateId();
      const typingBlock: Block = {
        id: typingBlockId,
        type: 'aiResponse',
        content: `<div style="color: var(--text-tertiary, #6b7280); line-height: 1.6; font-style: italic;">&nbsp;</div>`
      };
      
      // Store the typing block ID for error handling
      insertedLoadingBlockId = typingBlockId;
      
      let insertedAtIndex = -1;
      
      // Insert question and typing block immediately
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks];
        
        // First check if we have a stored cursor position block
        if (lastCursorBlockId) {
          const cursorIndex = newBlocks.findIndex(block => block.id === lastCursorBlockId);
          if (cursorIndex !== -1) {
            // Insert question followed by typing block after the cursor block
            insertedAtIndex = cursorIndex + 1;
            newBlocks.splice(insertedAtIndex, 0, questionBlock, typingBlock);
            
            // Schedule scrolling to the typing block
            setTimeout(() => {
              const typingElement = document.querySelector(`[data-block-id="${typingBlockId}"]`);
              if (typingElement) {
                typingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            
            return newBlocks;
          }
        }
        
        // Fall back to active block if cursor block not found
        if (activeBlock) {
          const activeIndex = newBlocks.findIndex(block => block.id === activeBlock);
          if (activeIndex !== -1) {
            insertedAtIndex = activeIndex + 1;
            newBlocks.splice(insertedAtIndex, 0, questionBlock, typingBlock);
            
            // Schedule scrolling
            setTimeout(() => {
              const typingElement = document.querySelector(`[data-block-id="${typingBlockId}"]`);
              if (typingElement) {
                typingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
            
            return newBlocks;
          }
        }
        
        // If no cursor position or active block found, append to the end
        insertedAtIndex = newBlocks.length;
        newBlocks.push(questionBlock, typingBlock);
        
        // Schedule scrolling
        setTimeout(() => {
          const typingElement = document.querySelector(`[data-block-id="${typingBlockId}"]`);
          if (typingElement) {
            typingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        return newBlocks;
      });
      
      // Create a system message that gives context about the note
      const systemMessage: Message = {
        role: 'system',
        content: `You are a helpful AI assistant answering questions about ${noteContext}. 
        Format your answers clearly and thoroughly with these guidelines:
        
        - Use headings for main sections (use ** for bold headings)
        - Create clear, concise paragraphs
        - Use bulleted lists (with - symbol) for enumerations
        - Use numbered lists (1., 2., etc.) for sequential items
        - Bold important terms and concepts
        - Provide examples when helpful
        
        Keep your response well-structured and informative.`
      };
      
      // Create the user message
      const apiUserMessage = {
        role: 'user',
        content: userMessage
      };
      
      // Variables to hold the response as it comes in
      let fullResponse = '';
      
      // Function to process each chunk of the response
      const processChunk = (chunk: string) => {
        // Add chunk to full response
        fullResponse += chunk;
        
        // Format the partial response
        let formattedPartialResponse = formatInPageResponse(fullResponse);
        
        // Update the typing block with current content
        setBlocks(prevBlocks => {
          const updatedBlocks = [...prevBlocks];
          const typingIndex = updatedBlocks.findIndex(block => block.id === typingBlockId);
          
          if (typingIndex !== -1) {
            updatedBlocks[typingIndex] = {
              ...updatedBlocks[typingIndex],
              content: formattedPartialResponse
            };
          }
          
          return updatedBlocks;
        });
        
        // Add the partial response to the chat as well (for a smooth typing effect in the chat)
        const aiPartialMessage = {
          id: Date.now(),
          text: fullResponse,
          sender: 'ai' as const,
          isPartial: true
        };
        
        setInPageMessages(prev => {
          // Remove any previous partial messages
          const filteredMessages = prev.filter(msg => !('isPartial' in msg));
          return [...filteredMessages, aiPartialMessage];
        });
        
        // Scroll chat to bottom
        requestAnimationFrame(() => {
          if (inPageChatRef.current) {
            inPageChatRef.current.scrollTop = inPageChatRef.current.scrollHeight;
          }
        });
      };
      
      // Function to handle completion of the response
      const handleComplete = (finalText: string) => {
        // Format the final response
        const formattedFinalResponse = formatInPageResponse(finalText);
        
        // Update the typing block with final content
        setBlocks(prevBlocks => {
          const updatedBlocks = [...prevBlocks];
          const typingIndex = updatedBlocks.findIndex(block => block.id === typingBlockId);
          
          if (typingIndex !== -1) {
            updatedBlocks[typingIndex] = {
              ...updatedBlocks[typingIndex],
              content: formattedFinalResponse
            };
          }
          
          return updatedBlocks;
        });
        
        // Add the final message to the chat, replacing any partial messages
        const aiFinalMessage = {
          id: Date.now(),
          text: finalText,
          sender: 'ai' as const
        };
        
        setInPageMessages(prev => {
          // Remove any partial messages
          const filteredMessages = prev.filter(msg => !('isPartial' in msg));
          return [...filteredMessages, aiFinalMessage];
        });
        
        // Save the updated blocks to localStorage
        setTimeout(() => {
          localStorage.setItem(blocksKey, JSON.stringify(blocks));
        }, 100);
        
        setIsInPageLoading(false);
        
        // Scroll chat to bottom
        requestAnimationFrame(() => {
          if (inPageChatRef.current) {
            inPageChatRef.current.scrollTop = inPageChatRef.current.scrollHeight;
          }
        });
      };
      
      // Use the streaming API
      await generateStreamingAIResponse(
        [systemMessage, apiUserMessage],
        processChunk,
        handleComplete
      );
      
    } catch (error) {
      console.error('Error generating in-page response:', error);
      
      // If there was a typing block, replace it with an error message
      if (insertedLoadingBlockId) {
        setBlocks(prevBlocks => {
          const newBlocks = [...prevBlocks];
          const loadingIndex = newBlocks.findIndex(block => block.id === insertedLoadingBlockId);
          
          if (loadingIndex !== -1) {
            // Replace with error message
            newBlocks[loadingIndex] = {
              id: generateId(),
              type: 'aiResponse',
              content: "<div style='color: var(--text-tertiary, #6b7280); line-height: 1.6; font-style: italic;'>I'm sorry, I encountered an error while generating a response.</div>"
            };
          }
          
          return newBlocks;
        });
      }
      
      // Add error message to chat
      setInPageMessages(prev => [
        ...prev.filter(msg => !('isPartial' in msg)), // Remove any partial messages
        {
          id: Date.now(),
          text: "I'm sorry, I encountered an error while generating a response.",
          sender: 'ai' as const
        }
      ]);
      
      setIsInPageLoading(false);
    }
  };

  // Helper function to format in-page chat responses
  const formatInPageResponse = (text: string): string => {
      // Process the response to convert markdown-like formatting to HTML
    let formattedResponse = text || "I'm sorry, I couldn't generate a response.";
      
      // Add line breaks to ensure proper regex matching (but keep paragraphs intact)
      formattedResponse = formattedResponse.replace(/\n\n+/g, '\n\n');
      
      // Process lists first (before other replacements)
      // Find all bullet lists and wrap them in proper HTML
      formattedResponse = formattedResponse.replace(/(?:^|\n)- (.+)(?:\n- (.+))+/g, function(match) {
        // Extract each list item
        const items = match.split('\n- ').filter(item => item.trim() !== '');
        // Build HTML list
        return `<ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 12px; font-style: italic;">${
          items.map(item => `<li style="margin-bottom: 6px; font-style: italic;">${item.trim()}</li>`).join('')
        }</ul>`;
      });
      
      // Find all single bullet items
      formattedResponse = formattedResponse.replace(/(?:^|\n)- (.+)(?!\n- )/g, function(match, item) {
        return `<ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 12px; font-style: italic;"><li style="margin-bottom: 6px; font-style: italic;">${item.trim()}</li></ul>`;
      });
      
      // Find all numbered lists and wrap them in proper HTML
      formattedResponse = formattedResponse.replace(/(?:^|\n)\d+\. (.+)(?:\n\d+\. (.+))+/g, function(match) {
        // Extract each list item, ignoring the number
        const items = match.split(/\n\d+\. /).filter(item => item.trim() !== '');
        // Build HTML list
        return `<ol style="list-style-type: decimal; margin-left: 20px; margin-bottom: 12px; font-style: italic;">${
          items.map(item => `<li style="margin-bottom: 6px; font-style: italic;">${item.trim()}</li>`).join('')
        }</ol>`;
      });
      
      // Find all single numbered items
      formattedResponse = formattedResponse.replace(/(?:^|\n)\d+\. (.+)(?!\n\d+\. )/g, function(match, item) {
        return `<ol style="list-style-type: decimal; margin-left: 20px; margin-bottom: 12px; font-style: italic;"><li style="margin-bottom: 6px; font-style: italic;">${item.trim()}</li></ol>`;
      });
      
      // Replace headers
      formattedResponse = formattedResponse.replace(/(?:^|\n)### (.+)(?:\n|$)/g, '<h4 style="margin-top: 16px; margin-bottom: 8px; font-weight: 600; font-size: 1.05em; font-style: italic; color: #6b7280;">$1</h4>');
      formattedResponse = formattedResponse.replace(/(?:^|\n)## (.+)(?:\n|$)/g, '<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: 600; font-size: 1.15em; font-style: italic; color: #6b7280;">$1</h3>');
      formattedResponse = formattedResponse.replace(/(?:^|\n)# (.+)(?:\n|$)/g, '<h2 style="margin-top: 24px; margin-bottom: 12px; font-weight: 700; font-size: 1.25em; font-style: italic; color: #6b7280;">$1</h2>');
      
      // Replace bold and italic text
      formattedResponse = formattedResponse.replace(/\*\*(.+?)\*\*/g, '<strong style="font-style: italic;">$1</strong>');
      formattedResponse = formattedResponse.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      // Wrap remaining paragraphs (text between two newlines)
      // Split by double newline and wrap each paragraph
      formattedResponse = formattedResponse.split('\n\n').map(para => {
        // Skip already wrapped HTML elements
        if (para.trim().match(/^<(h[2-4]|ul|ol|p)/)) {
          return para;
        }
        // Skip empty paragraphs
        if (!para.trim()) {
          return '';
        }
        return `<p style="margin-bottom: 12px; font-style: italic;">${para.trim()}</p>`;
      }).join('');
      
      // Fix any remaining single paragraphs
    formattedResponse = formattedResponse.replace(/(?:^|\n)([^<\n][^\n]+)(?:\n|$)/g, function(match, para) {
      // Skip if it already looks like HTML
      if (para.trim().startsWith('<')) {
        return match;
      }
      return `<p style="margin-bottom: 12px; font-style: italic;">${para.trim()}</p>`;
      });
      
      // Clean up any duplicated or nested paragraphs
      formattedResponse = formattedResponse.replace(/<p style="margin-bottom: 12px; font-style: italic;"><p style="margin-bottom: 12px; font-style: italic;">/g, '<p style="margin-bottom: 12px; font-style: italic;">');
      formattedResponse = formattedResponse.replace(/<\/p><\/p>/g, '</p>');
      
      // Clean up any empty paragraphs
      formattedResponse = formattedResponse.replace(/<p style="margin-bottom: 12px; font-style: italic;"><\/p>/g, '');
      
      // Wrap in a container div for consistent styling
      formattedResponse = `<div style="color: var(--text-tertiary, #6b7280); line-height: 1.6; font-style: italic;">${formattedResponse}</div>`;
      
    return formattedResponse;
  };

  // Add focus management for dialog
  useEffect(() => {
    if (showNotesDialog && promptInputRef.current) {
      promptInputRef.current.focus();
    }
  }, [showNotesDialog]);

  // Handle Escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNotesDialog) {
        setShowNotesDialog(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [showNotesDialog]);

  // Helper function to process markdown to HTML for better display
  const processMarkdown = (text: string): string => {
    // Replace markdown headings
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace bullet points
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^• (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^([•*]) (.*?)$/gm, '<li>$2</li>');
    
    // Wrap lists - using a different approach without 's' flag
    const listItemRegex = /<li>.*?<\/li>/g;
    const listItems = html.match(listItemRegex);
    
    if (listItems) {
      // Replace all list items with a temporary marker
      let tempHtml = html;
      listItems.forEach((item, index) => {
        tempHtml = tempHtml.replace(item, `LIST_ITEM_${index}`);
      });
      
      // Find groups of list items
      const listGroups: string[][] = [];
      let currentGroup: string[] = [];
      
      for (let i = 0; i < listItems.length; i++) {
        const marker = `LIST_ITEM_${i}`;
        const nextMarker = `LIST_ITEM_${i+1}`;
        
        currentGroup.push(listItems[i]);
        
        // Check if this is the last item or if the next item is not adjacent
        const isLastItem = i === listItems.length - 1;
        const notAdjacent = isLastItem || 
          tempHtml.indexOf(nextMarker) - (tempHtml.indexOf(marker) + marker.length) > 10;
        
        if (notAdjacent) {
          listGroups.push([...currentGroup]);
          currentGroup = [];
        }
      }
      
      // Replace each group with a <ul> wrapped list
      for (let group of listGroups) {
        const groupHtml = group.join('\n');
        const wrappedGroupHtml = `<ul>\n${groupHtml}\n</ul>`;
        
        // Replace the first item's marker with the whole wrapped group
        const firstItemIndex = group[0] === listItems[0] ? 0 : listItems.indexOf(group[0]);
        const firstMarker = `LIST_ITEM_${firstItemIndex}`;
        
        // Remove other items' markers
        for (let i = 1; i < group.length; i++) {
          const itemIndex = listItems.indexOf(group[i]);
          const itemMarker = `LIST_ITEM_${itemIndex}`;
          tempHtml = tempHtml.replace(itemMarker, '');
        }
        
        // Replace the first marker with the wrapped group
        tempHtml = tempHtml.replace(firstMarker, wrappedGroupHtml);
      }
      
      html = tempHtml;
    }
    
    // Process section headers (e.g., "**Summary:**")
    html = html.replace(/<strong>(.*?):<\/strong>/g, '<h3>$1</h3>');
    
    // Apply colors to specific headings (Summary, Key Points, etc.)
    html = html.replace(/<h3>Summary<\/h3>/g, '<h3 class="explanation-heading">Summary</h3>');
    html = html.replace(/<h3>Key Points<\/h3>/g, '<h3 class="explanation-heading">Key Points</h3>');
    html = html.replace(/<h3>Detailed Explanation<\/h3>/g, '<h3 class="explanation-heading">Detailed Explanation</h3>');
    html = html.replace(/<h3>Formula\/Equations<\/h3>/g, '<h3 class="explanation-heading">Formula/Equations</h3>');
    html = html.replace(/<h3>Why It Matters<\/h3>/g, '<h3 class="explanation-heading">Why It Matters</h3>');
    
    // Process paragraphs - simpler approach
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
      // Skip lines that already have HTML tags
      if (line.trim().startsWith('<') && !line.trim().startsWith('</')) {
        return line;
      }
      // Skip empty lines
      if (!line.trim()) {
        return line;
      }
      return `<p>${line}</p>`;
    });
    
    html = processedLines.join('\n');
    
    // Fix any empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    // Fix any consecutive paragraph tags
    html = html.replace(/<\/p>\s*<p>/g, '</p><p>');
    
    // Add special styles for formatting
    html = `${html}
    <style>
      .structured-explanation h3 {
        font-weight: 600;
        margin-top: 16px;
        margin-bottom: 8px;
        color: var(--text-primary);
      }
      .structured-explanation .explanation-heading {
        font-weight: 700;
        font-size: 1.1em;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 4px;
        display: inline-block;
      }
      .structured-explanation ul {
        margin-left: 20px;
        list-style-type: disc;
        margin-bottom: 12px;
      }
      .structured-explanation li {
        margin-bottom: 4px;
      }
      .structured-explanation p {
        margin-bottom: 8px;
      }
    </style>`;
    
    return html;
  };

  return (
    <AppLayout>
      {/* Add animations to the head */}
      <style dangerouslySetInnerHTML={{ __html: animations }} />
      
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
            {/* Manual Explain Button - Removed */}
            <button
              onClick={() => setShowNotesDialog(true)}
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
                  Generate Full Notes with AI
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Editor Blocks */}
        <div style={{ marginBottom: '24px' }}>
          {blocks.map(block => {
            // Check if block content contains HTML and should be rendered with parse
            const containsHtml = block.content && (
              block.content.includes('<') && 
              block.content.includes('>') && 
              (block.content.includes('div') || 
               block.content.includes('span') || 
               block.content.includes('p') || 
               block.content.includes('strong') || 
               block.content.includes('em'))
            );

            // If this block is not being edited and contains HTML, create a parsed content viewer
            if (containsHtml && activeBlock !== block.id) {
              return (
                <div 
                  key={block.id}
                  className="formatted-content" 
                  style={{ 
                    position: 'relative',
                    marginBottom: '12px',
                    cursor: 'text'
                  }}
                  // Make HTML blocks clickable so we can add content after them
                  onClick={(e) => {
                    // Instead of preventing propagation, let's allow creating a new block after this one
                    createNewBlock(block.id);
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
                  {/* Add a small button at the bottom to clearly show you can add content */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewBlock(block.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      marginTop: '4px',
                      cursor: 'pointer',
                      opacity: 0.5,
                      transition: 'opacity 0.2s',
                      borderRadius: '4px',
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
                    <Plus size={12} />
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
        
        {/* AI Notes Dialog */}
        {showNotesDialog && typeof document !== 'undefined' && createPortal(
          <div
            className="notes-dialog-container"
            onClick={() => setShowNotesDialog(false)}
            role="dialog"
            aria-labelledby="notes-dialog-title"
            aria-modal="true"
          >
            <div
              ref={dialogRef}
              className="notes-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '16px', width: '100%' }}>
                <h3 
                  id="notes-dialog-title"
                  className="notes-dialog-title"
                >
                  Generate Notes
                </h3>
                <p className="notes-dialog-text">
                  What kind of notes would you like to generate?
                </p>
                <textarea
                  ref={promptInputRef}
                  value={notesPrompt}
                  onChange={(e) => setNotesPrompt(e.target.value)}
                  placeholder="E.g., 'Key concepts with examples', 'Comprehensive notes with diagrams', 'Simple summary with bullet points'..."
                  className="notes-dialog-textarea"
                />
              </div>
              <div className="notes-dialog-button-container">
                <button
                  onClick={() => setShowNotesDialog(false)}
                  className="notes-dialog-button notes-dialog-button-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateAIContent()}
                  className="notes-dialog-button notes-dialog-button-auto"
                >
                  <Sparkles size={16} style={{ marginRight: '6px' }} />
                  Autogenerate
                </button>
                <button
                  onClick={() => generateAIContent(notesPrompt)}
                  disabled={!notesPrompt.trim()}
                  className="notes-dialog-button notes-dialog-button-generate"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
        
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
        
        {/* Text Formatting Context Menu */}
        {showContextMenu && (
          <div 
            ref={contextMenuRef}
            style={{
              position: 'fixed',
              top: `${contextMenuPosition.top}px`, 
              left: `${contextMenuPosition.left}px`,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              padding: '8px',
              zIndex: 9999,
              minWidth: '220px',
              maxHeight: '80vh',
              overflowY: 'auto',
              maxWidth: '300px'
            }}
          >
            <div style={{
              padding: '4px 8px',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              fontWeight: '500',
              marginBottom: '4px'
            }}>
              FORMAT TEXT
            </div>
            
            {/* AI Explanation Button */}
            <button
              onClick={() => {
                handleExplainText();
                setShowContextMenu(false);
              }}
              disabled={isExplaining}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                margin: '0 8px 8px 8px',
                borderRadius: '4px',
                cursor: isExplaining ? 'not-allowed' : 'pointer',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                textAlign: 'left',
                fontSize: '13px',
                width: 'calc(100% - 16px)',
                opacity: isExplaining ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isExplaining) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
            >
              {isExplaining ? (
                <>
                  <PiSpinnerGap className="animate-spin" size={16} /> 
                  Processing...
                </>
              ) : (
                <>
                  <FaStar size={14} style={{ color: 'var(--primary-color)' }} /> 
                  Explain with AI
                </>
              )}
            </button>
            
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0 8px 8px 8px' }} />
            
            {/* Primary Formatting Options */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              margin: '0 8px 8px'
            }}>
              <button
                onClick={() => formatSelectedText('bold')}
                title="Bold"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Bold size={14} />
              </button>
              
              <button
                onClick={() => formatSelectedText('italic')}
                title="Italic"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Italic size={14} />
              </button>
              
              <button
                onClick={() => formatSelectedText('underline')}
                title="Underline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Underline size={14} />
              </button>
              
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    const dropdown = document.getElementById('highlight-color-dropdown');
                    if (dropdown) {
                      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                  title="Highlight"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ 
                    backgroundColor: '#fefcbf', 
                    width: '16px', 
                    height: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '2px',
                    border: '1px solid #e2c35d'
                  }}>
                    <span style={{ fontSize: '10px', color: '#000' }}>A</span>
                  </span>
                </button>
                
                <div 
                  id="highlight-color-dropdown"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px',
                    marginTop: '4px',
                    zIndex: 10001,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    width: '140px'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>HIGHLIGHT COLORS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button
                      onClick={() => formatSelectedText('highlight-yellow')}
                      title="Yellow"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#fefcbf',
                        border: '1px solid #e2c35d',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-green')}
                      title="Green"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#c6f6d5',
                        border: '1px solid #9ae6b4',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-blue')}
                      title="Blue"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#bee3f8',
                        border: '1px solid #90cdf4',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-pink')}
                      title="Pink"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#fed7e2',
                        border: '1px solid #fbb6ce',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-purple')}
                      title="Purple"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#e9d8fd',
                        border: '1px solid #d6bcfa',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-orange')}
                      title="Orange"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#feebc8',
                        border: '1px solid #fbd38d',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-teal')}
                      title="Teal"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#b2f5ea',
                        border: '1px solid #81e6d9',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      onClick={() => formatSelectedText('highlight-gray')}
                      title="Gray"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        backgroundColor: '#e2e8f0',
                        border: '1px solid #cbd5e0',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => formatSelectedText('code')}
                title="Code"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Code size={14} />
              </button>
            </div>
            
            {/* Color Palette */}
            <div style={{ 
              padding: '4px 8px',
              display: 'flex',
              gap: '6px',
              margin: '0 0 8px'
            }}>
              <button
                onClick={() => formatSelectedText('text-red')}
                title="Red Text"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#e53e3e',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              />
              <button
                onClick={() => formatSelectedText('text-blue')}
                title="Blue Text"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#3182ce',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              />
              <button
                onClick={() => formatSelectedText('text-green')}
                title="Green Text"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#38a169',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              />
              <button
                onClick={() => formatSelectedText('highlight-yellow')}
                title="Yellow Highlight"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fefcbf',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              />
            </div>
            
            {/* Advanced Formatting Section - Implemented as dropdown */}
            <div style={{ 
              position: 'relative',
              margin: '0 8px'
            }}>
              <button
                onClick={() => {
                  const dropdown = document.getElementById('advanced-format-dropdown');
                  if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <span>Advanced Formatting</span>
                <ChevronDown size={14} />
              </button>
              
              <div 
                id="advanced-format-dropdown"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px',
                  marginTop: '4px',
                  zIndex: 10000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {/* Font Size Section */}
                <div style={{
                  padding: '4px 0',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  FONT SIZE
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  <button
                    onClick={() => formatSelectedText('font-size-small')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '11px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Small (0.85em)"
                  >
                    Small
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-size-medium')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Medium (1em)"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-size-large')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Large (1.25em)"
                  >
                    Large
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-size-xlarge')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Extra Large (1.5em)"
                  >
                    XL
                  </button>
                </div>
                
                {/* Font Style Section */}
                <div style={{
                  padding: '4px 0',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  FONT STYLE
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  <button
                    onClick={() => formatSelectedText('font-sans')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Sans Serif Font"
                  >
                    Sans
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-serif')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Serif Font"
                  >
                    Serif
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-mono')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Monospace Font"
                  >
                    Mono
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-cursive')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'cursive',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Cursive Font"
                  >
                    Cursive
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-handwritten')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'Segoe Script, Bradley Hand, Chilanka, cursive',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Handwritten Style"
                  >
                    Script
                  </button>
                  <button
                    onClick={() => formatSelectedText('font-fantasy')}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontFamily: 'Papyrus, Fantasy',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                    title="Fantasy Font"
                  >
                    Fantasy
                  </button>
                </div>
                
                {/* More Colors */}
                <div style={{
                  padding: '4px 0',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>
                  MORE COLORS
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  <button
                    onClick={() => formatSelectedText('text-purple')}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#805ad5',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Purple Text"
                  />
                  <button
                    onClick={() => formatSelectedText('highlight-green')}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#c6f6d5',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Green Highlight"
                  />
                  <button
                    onClick={() => formatSelectedText('highlight-blue')}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#bee3f8',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Blue Highlight"
                  />
                  <button
                    onClick={() => formatSelectedText('highlight-pink')}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fed7e2',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Pink Highlight"
                  />
                </div>
              </div>
            </div>
            
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }} />
            
            <button
              onClick={() => formatSelectedText('clear')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                textAlign: 'left',
                fontSize: '13px',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={14} /> Clear Formatting
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
        
        .fixed.bottom-8 {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </AppLayout>
  );
} 