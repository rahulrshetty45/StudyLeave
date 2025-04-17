'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { X, GripVertical, Loader2, Save } from 'lucide-react';
import { generateAIResponse } from '@/lib/openai';
import { useRouter, usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface NoteContent {
  title: string;
  content: string;
  subject: string;
  targetSubject?: string;
}

// Add this at the top of the file after imports
// Helper class to manage message state and prevent duplicate messages
class MessageManager {
  private lastExplainedText: string = '';
  private explainTimestamp: number = 0;
  private isCurrentlyExplaining: boolean = false;
  private pendingLoadingId: number | null = null;

  // Check if we're already explaining this text
  isExplaining(text: string): boolean {
    return this.isCurrentlyExplaining || 
           (text === this.lastExplainedText && 
            Date.now() - this.explainTimestamp < 5000);
  }

  // Mark that we're starting to explain this text
  startExplaining(text: string): number {
    this.lastExplainedText = text;
    this.explainTimestamp = Date.now();
    this.isCurrentlyExplaining = true;
    this.pendingLoadingId = Date.now();
    return this.pendingLoadingId;
  }

  // Get the ID of the current loading message
  getLoadingId(): number | null {
    return this.pendingLoadingId;
  }

  // Mark that we've finished explaining
  finishExplaining(): void {
    this.isCurrentlyExplaining = false;
    this.pendingLoadingId = null;
  }
}

export default function AITutor() {
  const router = useRouter();
  const pathname = usePathname(); // Use the pathname hook
  const [expanded, setExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [width, setWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<NoteContent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  // Add a ref to track when the page changes
  const routeChangeRef = useRef<string | null>(null);

  // Replace the old state tracking with the new MessageManager
  const messageManager = useRef<MessageManager>(new MessageManager());

  // Load messages and other settings from localStorage
  useEffect(() => {
    // Load saved width from localStorage if available
    const savedWidth = localStorage.getItem('aiTutorWidth');
    if (savedWidth) {
      setWidth(parseInt(savedWidth));
    }
    
    // Load saved expanded state
    const savedExpanded = localStorage.getItem('aiTutorExpanded');
    if (savedExpanded !== null) {
      setExpanded(savedExpanded === 'true');
    }

    // Load saved messages from localStorage
    const savedMessages = localStorage.getItem('aiTutorMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading saved messages:', error);
        // If there's an error, set default message
        setMessages([{ 
          id: 1, 
          text: "Hello! I'm your AI tutor powered by GPT-4o. How can I help you with your studies today? You can ask me to generate structured notes on any subject.", 
          sender: 'ai' as const
        }]);
      }
    } else {
      // Set default welcome message if no saved messages
      setMessages([{ 
        id: 1, 
        text: "Hello! I'm your AI tutor powered by GPT-4o. How can I help you with your studies today? You can ask me to generate structured notes on any subject.", 
        sender: 'ai' as const
      }]);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aiTutorMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Save width to localStorage when it changes
    localStorage.setItem('aiTutorWidth', width.toString());
  }, [width]);
  
  // Save expanded state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('aiTutorExpanded', expanded.toString());
  }, [expanded]);

  // Scroll to bottom of messages on new message
  useEffect(() => {
    // Don't auto-scroll if this is a route change
    if (routeChangeRef.current === pathname) {
      // Route change just happened, don't scroll
      return;
    }
    
    // Only auto-scroll to bottom for new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pathname]);

  // Add a new useEffect to track route changes
  useEffect(() => {
    if (pathname) {
      routeChangeRef.current = pathname;
      
      // Reset the route change tracker after a short delay
      const timer = setTimeout(() => {
        routeChangeRef.current = null;
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Set up drag event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new width by taking the window width and subtracting the mouse position
        // This works because the AI tutor is positioned on the right side
        const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX));
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Detect if the message is asking for notes generation
  const isNoteGenerationRequest = (message: string): {isRequest: boolean, subject: string, targetSubject?: string} => {
    const lowerMsg = message.toLowerCase();
    let subject = '';
    let targetSubject: string | undefined = undefined;
    
    // Get list of existing subjects from localStorage
    const existingSubjects: string[] = [];
    try {
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      subjects.forEach((subject: any) => {
        existingSubjects.push(subject.name.toLowerCase());
        // Also add the ID form
        existingSubjects.push(subject.id.toLowerCase());
      });
    } catch (error) {
      console.error('Error getting existing subjects:', error);
    }
    
    console.log("Existing subjects:", existingSubjects);
    
    // List of known subject categories
    const knownSubjects = ['math', 'mathematics', 'chemistry', 'physics', 'biology', 
                         'history', 'geography', 'english', 'literature', 
                         'computer science', 'economics', 'science', 'advanced physics', 
                         'advance physics', ...existingSubjects]; 
    
    // First check for specific patterns for adding to subjects
    const addToSubjectPatterns = [
      /(?:add|put|place|save)(?:\s+it)?(?:\s+to|\s+into|\s+in|\s+under)(?:\s+a)?(?:\s+new)?(?:\s+subject)?(?:\s+called)?\s+["']?([^"'.]+)["']?(?:\s+subject)?/i,
      /(?:add|put|place|save)(?:\s+to|\s+into|\s+in|\s+under)(?:\s+a)?(?:\s+new)?(?:\s+subject)?(?:\s+called)?\s+["']?([^"'.]+)["']?(?:\s+subject)?/i,
      /(?:add|put|place|save)(?:\s+in)(?:\s+the)?\s+["']?([^"'.]+)["']?(?:\s+subject)?/i
    ];
    
    for (const pattern of addToSubjectPatterns) {
      const match = lowerMsg.match(pattern);
      if (match && match[1]) {
        targetSubject = match[1].trim();
        
        // Check if the targetSubject is a known existing subject
        // If it is, we should prioritize using it
        const isExistingSubject = existingSubjects.some(s => 
          targetSubject?.toLowerCase() === s.toLowerCase() || 
          targetSubject?.toLowerCase().includes(s.toLowerCase())
        );
        
        if (isExistingSubject) {
          console.log("Detected existing subject as target:", targetSubject);
          // Find the exact case-sensitive name from the existing subjects
          try {
            const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
            const matchedSubject = subjects.find((s: any) => 
              s.name.toLowerCase() === targetSubject?.toLowerCase() ||
              s.id.toLowerCase() === targetSubject?.toLowerCase().replace(/\s+/g, '-')
            );
            
            if (matchedSubject) {
              targetSubject = matchedSubject.name;
            }
          } catch (error) {
            console.error('Error finding exact subject match:', error);
          }
        } else {
          console.log("Detected new subject as target:", targetSubject);
        }
        
        console.log("Detected target subject pattern:", targetSubject);
        
        // Extract content topic from before the target subject mention
        const beforeTarget = lowerMsg.split(match[0])[0];
        
        // Look for "notes about <topic>" or "notes on <topic>" patterns
        const topicPatterns = [
          /(?:notes|study\s+material)(?:\s+(?:on|about|for|regarding))\s+(.+?)(?:\s+and|\s*$)/i,
          /(?:make|create|generate)(?:\s+(?:notes|study\s+material))(?:\s+(?:on|about|for|regarding))\s+(.+?)(?:\s+and|\s*$)/i,
        ];
        
        for (const topicPattern of topicPatterns) {
          const topicMatch = beforeTarget.match(topicPattern);
          if (topicMatch && topicMatch[1]) {
            subject = topicMatch[1].trim();
            console.log("Extracted topic from pattern:", subject);
            return { isRequest: true, subject, targetSubject };
          }
        }
        
        // If no specific topic pattern found, use the content before "and add"
        const simpleSplit = lowerMsg.split(/\s+and\s+(?:add|put|save|place)/i);
        if (simpleSplit.length > 1) {
          // Use the first part as the subject, and clean it up
          let possibleSubject = simpleSplit[0].trim();
          
          // Clean up potential "make notes about" phrases
          possibleSubject = possibleSubject
            .replace(/^(?:make|create|generate|add|write)\s+(?:a|some|)?\s*(?:notes|study material|content)\s+(?:on|about|for|related to)\s+/i, '')
            .replace(/^(?:notes|study material|content)\s+(?:on|about|for|related to)\s+/i, '');
          
          subject = possibleSubject;
          console.log("Using content before 'and add' as subject:", subject);
          return { isRequest: true, subject, targetSubject };
        }
      }
    }
    
    // Clean up the request by extracting just the content topic
    // Extract just the topic part before "and make/add..." if present
    if (lowerMsg.includes("and make") || lowerMsg.includes("and add")) {
      const parts = lowerMsg.split(/\band\s+(make|add)/);
      if (parts.length > 1) {
        // Use just the first part which is likely the actual topic
        subject = parts[0].trim();
        
        // Clean up potential "make notes about" phrases in the subject
        subject = subject
          .replace(/^(?:make|create|generate|add|write)\s+(?:a|some|)?\s*(?:notes|study material|content)\s+(?:on|about|for|related to)\s+/i, '')
          .replace(/^(?:notes|study material|content)\s+(?:on|about|for|related to)\s+/i, '');
        
        // Extract the target subject from "and make/add a new subject called X"
        const targetMatch = lowerMsg.match(/and\s+(make|add).*(?:subject|category|topic)\s+called\s+["']?([^"'.]+)["']?/i);
        if (targetMatch && targetMatch[2]) {
          targetSubject = targetMatch[2].trim();
        } else {
          // Try alternate patterns for "add to X subject" or "add to X"
          const altTargetMatch = lowerMsg.match(/and\s+(?:add|put|place|save)(?:\s+it)?(?:\s+to|\s+into|\s+in|\s+under)(?:\s+a)?(?:\s+new)?(?:\s+subject)?(?:\s+called)?\s+["']?([^"'.]+)["']?/i);
          if (altTargetMatch && altTargetMatch[1]) {
            targetSubject = altTargetMatch[1].trim();
          }
        }
        
        return { isRequest: true, subject, targetSubject };
      }
    }
    
    // Look for explicit requests to create a new subject
    const newSubjectPattern = /(?:create|make|add).*(?:subject|category|topic|section).*(?:called|named)\s+["']?([^"'.]+)["']?/i;
    const newSubjectMatch = lowerMsg.match(newSubjectPattern);
    
    if (newSubjectMatch && newSubjectMatch[1]) {
      targetSubject = newSubjectMatch[1].trim();
      
      // Now try to identify what content they want in this subject
      const contentPattern = /(?:create|make|add|generate).*(?:notes|study material|content).*(?:for|on|about)\s+([^.,]+)/i;
      const contentMatch = lowerMsg.match(contentPattern);
      
      if (contentMatch && contentMatch[1]) {
        const potentialSubject = contentMatch[1].trim();
        // Make sure we're not capturing the same thing twice
        if (potentialSubject.toLowerCase() !== targetSubject.toLowerCase()) {
          subject = potentialSubject;
        } else {
          // If we can't find a separate content topic, use the subject name
          subject = targetSubject;
        }
        return { isRequest: true, subject, targetSubject };
      }
    }
    
    // First check for explicit "add it into [subject]" pattern
    const addIntoPattern = /(add|place|put)(?:\s+it)?\s+(?:in|into|to|under)\s+(?:a\s+)?(?:new\s+)?(?:subject\s+)?(?:called\s+)?["']?(\w+(?:\s+\w+)*)["']?/i;
    const addIntoMatch = lowerMsg.match(addIntoPattern);
    
    if (addIntoMatch && addIntoMatch[2]) {
      // This is a request to add content to a specific subject
      targetSubject = addIntoMatch[2].trim();
      
      // Try to identify the topic - will be everything before "add into"
      const beforeAddInto = lowerMsg.split(addIntoMatch[0])[0];
      
      // Look for patterns like "notes on X" or "Notes about X"
      const topicPattern = /(?:notes|study\s+material)(?:\s+(?:on|about|for))?\s+(.+?)(?:\s+and|\s*$)/i;
      const topicMatch = beforeAddInto.match(topicPattern);
      
      if (topicMatch && topicMatch[1]) {
        subject = topicMatch[1].trim();
        return { isRequest: true, subject, targetSubject };
      } else {
        // If we couldn't parse a specific topic, check for subjects
        for (const knownSubject of knownSubjects) {
          if (beforeAddInto.includes(knownSubject)) {
            subject = knownSubject;
            return { isRequest: true, subject, targetSubject };
          }
        }
        
        // If no specific topic found, extract words before the "add into" phrase
        const words = beforeAddInto.split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
          // Take the last few words as they're likely to be the topic
          subject = words.slice(-2).join(' ');
          return { isRequest: true, subject, targetSubject };
        }
      }
    }
    
    // Handle special case for chemical properties pattern
    if (lowerMsg.includes("chemical properties") && lowerMsg.includes("chemistry")) {
      return { isRequest: true, subject: "chemical properties of metal", targetSubject: "chemistry" };
    }
    
    // Check for cases where user wants a topic added to a specific subject
    // Pattern: "notes on [topic] for [subject]" or "add notes about [topic] to [subject]"
    const specificSubjectPatterns = [
      /notes\s+(?:on|about)\s+(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      /create\s+(?:notes|study\s+material)\s+(?:on|about)\s+(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      /make\s+(?:notes|study\s+material)\s+(?:on|about)\s+(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      /generate\s+(?:notes|study\s+material)\s+(?:on|about)\s+(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      /add\s+(?:notes|study\s+material)\s+(?:on|about)\s+(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      // Adding a pattern for "water purification for chemistry" type requests
      /(\w+(?:\s+\w+)*)\s+(?:notes|study\s+material)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
      /(\w+(?:\s+\w+)*)\s+(?:for|to|in|under)\s+(\w+(?:\s+\w+)*)/i,
    ];
    
    for (const pattern of specificSubjectPatterns) {
      const match = lowerMsg.match(pattern);
      if (match && match[1] && match[2]) {
        // Determine which is the topic and which is the subject
        const firstPart = match[1].toLowerCase();
        const secondPart = match[2].toLowerCase();
        
        const isFirstKnownSubject = knownSubjects.some(s => firstPart.includes(s));
        const isSecondKnownSubject = knownSubjects.some(s => secondPart.includes(s));
        
        if (isSecondKnownSubject || !isFirstKnownSubject) {
          // Normal case: topic for subject
          subject = match[1]; // The topic
          
          // Find the exact known subject in the second part
          for (const knownSubject of knownSubjects) {
            if (secondPart.includes(knownSubject)) {
              targetSubject = knownSubject;
              break;
            }
          }
          
          if (!targetSubject) {
            targetSubject = match[2]; // Fallback
          }
        } else {
          // Reversed case: subject contains topic
          subject = match[2]; // The topic
          
          // Find the exact known subject in the first part
          for (const knownSubject of knownSubjects) {
            if (firstPart.includes(knownSubject)) {
              targetSubject = knownSubject;
              break;
            }
          }
          
          if (!targetSubject) {
            targetSubject = match[1]; // Fallback
          }
        }
        return { isRequest: true, subject, targetSubject };
      }
    }
    
    // Handle the case where they explicitly mention "sea water purification" and "chemistry"
    if (lowerMsg.includes("sea water") && lowerMsg.includes("chemistry")) {
      return { isRequest: true, subject: "sea water purification", targetSubject: "chemistry" };
    }
    
    // Standard patterns for general note requests
    const noteRequestPatterns = [
      /make.*notes.*(for|on)\s+(\w+(?:\s+\w+)*)/i,
      /generate.*notes.*(for|on)\s+(\w+(?:\s+\w+)*)/i,
      /create.*notes.*(for|on)\s+(\w+(?:\s+\w+)*)/i,
      /notes.*(for|on)\s+(\w+(?:\s+\w+)*)/i,
    ];
    
    for (const pattern of noteRequestPatterns) {
      const match = lowerMsg.match(pattern);
      if (match && match[2]) {
        subject = match[2];
        
        // Check if the subject is actually a known subject or contains a known subject
        for (const knownSubject of knownSubjects) {
          if (subject.includes(knownSubject)) {
            // If the subject contains a known subject but is more specific,
            // then the actual topic is the specific part and the targetSubject is the known subject
            if (subject !== knownSubject) {
              targetSubject = knownSubject;
              // Don't change the subject as it's more specific
            }
            break;
          }
        }
        
        return { isRequest: true, subject, targetSubject };
      }
    }
    
    // If no pattern matched exactly, try to identify if they're asking for notes and what subject
    if ((lowerMsg.includes('notes') || lowerMsg.includes('study material')) && 
        (lowerMsg.includes('generate') || lowerMsg.includes('create') || lowerMsg.includes('make'))) {
      
      // Try to extract subject
      for (const subj of knownSubjects) {
        if (lowerMsg.includes(subj)) {
          // Assume subject is the known subject
          targetSubject = subj;
          
          // Try to extract topic from before the subject mention
          const beforeSubject = lowerMsg.split(subj)[0];
          let possibleTopic = '';
          
          // Look for patterns like "notes on X" or "Notes about X"
          const topicPattern = /(?:notes|study\s+material)(?:\s+(?:on|about|for))?\s+(.+?)(?:\s+and|\s*$)/i;
          const topicMatch = beforeSubject.match(topicPattern);
          
          if (topicMatch && topicMatch[1]) {
            possibleTopic = topicMatch[1].trim();
          } else {
            // Try split by common keywords
            const keywords = ['notes', 'study material', 'about', 'on'];
            for (const keyword of keywords) {
              if (beforeSubject.includes(keyword)) {
                const parts = beforeSubject.split(keyword);
                if (parts.length > 1 && parts[1].trim().length > 2) {
                  possibleTopic = parts[1].trim();
                  break;
                }
              }
            }
          }
          
          if (possibleTopic && possibleTopic.length > 1) {
            subject = possibleTopic;
          } else {
            // If we couldn't extract a specific topic, just use the subject
            subject = subj;
            targetSubject = undefined;
          }
          
          return { isRequest: true, subject, targetSubject };
        }
      }
      
      // Extract what comes after "notes for" or "notes on"
      const forMatch = lowerMsg.match(/notes\s+(?:for|on)\s+(\w+(?:\s+\w+)*)/i);
      if (forMatch && forMatch[1]) {
        subject = forMatch[1];
        return { isRequest: true, subject, targetSubject };
      }
      
      // Generic subject if we can't determine
      return { isRequest: true, subject: 'general', targetSubject };
    }
    
    return { isRequest: false, subject: '', targetSubject };
  };

  // Function to save a generated note
  const saveGeneratedNote = (note: NoteContent) => {
    try {
      console.log("Starting note save process with:", note);
      
      // Parse subject and target subject for better handling
      const knownSubjects = ['math', 'mathematics', 'chemistry', 'physics', 'biology', 
                         'history', 'geography', 'english', 'literature', 
                         'computer science', 'economics', 'science', 'advanced physics'];
      
      // Prioritize targetSubject when explicitly mentioned, regardless of whether it's known
      let subjectToUse = note.subject;
      
      if (note.targetSubject) {
        // Always use targetSubject when explicitly specified (even for new subjects)
        subjectToUse = note.targetSubject;
        console.log("Using explicitly requested subject:", subjectToUse);
      }
      
      // Clean up the subject for storage by removing instruction phrases
      let cleanedSubject = subjectToUse
        .replace(/^(make|create|generate|add|write)\s+(a|some|)\s*(notes|study material|content)\s+(on|about|for|related to)\s+/i, '')
        .replace(/^(notes|study material|content)\s+(on|about|for|related to)\s+/i, '')
        .replace(/\s+and\s+(make|add|create|put).*$/, ''); // Remove "and make..." part
        
      // Format the subject for storage - cleaning up any special characters
      const formattedSubject = cleanedSubject.trim()
        .replace(/:/g, ' - ')
        .replace(/[%?&]/g, ' ');
      
      const subjectId = formattedSubject.toLowerCase().replace(/\s+/g, '-');
      
      console.log("Subject processing:", {
        original: subjectToUse,
        cleaned: cleanedSubject,
        formatted: formattedSubject,
        id: subjectId
      });
      
      // Use the title that was already determined and processed, or the cleaned subject
      let titleToUse = note.title || (cleanedSubject.charAt(0).toUpperCase() + cleanedSubject.slice(1));
      
      // Clean up the title to remove any problematic characters
      titleToUse = titleToUse.trim()
        .replace(/:/g, ' - ')
        .replace(/[%?&]/g, ' ');
      
      // Extract first heading from content if available
      const firstHeadingMatch = note.content.match(/# ([^\n]+)/);
      if (firstHeadingMatch && firstHeadingMatch[1]) {
        // Use the first heading as the title - it's usually the most descriptive
        titleToUse = firstHeadingMatch[1].trim()
          .replace(/:/g, ' - ')
          .replace(/[%?&]/g, ' ');
        console.log("Using first heading as title:", titleToUse);
      }
      
      // Make sure the title is appropriate and not too generic
      // If it's just "[Subject] Notes", make it more specific based on content
      if (titleToUse.toLowerCase() === `${note.subject.toLowerCase()} notes` || 
          titleToUse.toLowerCase() === `${cleanedSubject.toLowerCase()} notes`) {
        // Use a simpler title with just the subject
        titleToUse = cleanedSubject.charAt(0).toUpperCase() + cleanedSubject.slice(1);
        console.log("Title was too generic, using simplified version:", titleToUse);
      }
      
      // Ensure title isn't too long
      if (titleToUse.length > 50) {
        const originalTitle = titleToUse;
        titleToUse = titleToUse.substring(0, 47) + '...';
        console.log("Title was too long, truncated:", {
          original: originalTitle,
          truncated: titleToUse
        });
      }
      
      // Format the title ID - ensure it's URL-safe
      const titleId = titleToUse.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''); // Remove any non-alphanumeric characters except hyphens
      
      // Create a unique key for this note in localStorage
      const noteKey = `note-${subjectId}-${titleId}`;
      const titleKey = `title-${subjectId}-${titleId}`;
      const blocksKey = `blocks-${subjectId}-${titleId}`;
      
      console.log("Saving note with keys:", {
        subject: cleanedSubject,
        subjectId,
        title: titleToUse,
        titleId,
        noteKey,
        titleKey,
        blocksKey
      });
      
      // Save the title
      localStorage.setItem(titleKey, titleToUse);
      
      // Parse content into blocks
      const contentLines = note.content.split('\n');
      const blocks = contentLines.map((line, index) => {
        // Determine block type based on content
        let type = 'paragraph';
        if (line.startsWith('# ')) {
          type = 'heading1';
          line = line.substring(2);
        } else if (line.startsWith('## ')) {
          type = 'heading2';
          line = line.substring(3);
        } else if (line.startsWith('- ')) {
          type = 'bulletList';
          line = line.substring(2);
        } else if (line.match(/^\d+\.\s/)) {
          type = 'numberedList';
          line = line.replace(/^\d+\.\s/, '');
        } else if (line.startsWith('> ')) {
          type = 'quote';
          line = line.substring(2);
        } else if (line.startsWith('```')) {
          type = 'code';
          line = line.replace(/```/g, '');
        } else if (line === '---') {
          type = 'divider';
          line = '';
        } else if (line.match(/^\*\*[^*]+\*\*:/)) {
          // Handle lines that start with **Something**: as a subheading
          type = 'heading3';
          line = line.replace(/^\*\*([^*]+)\*\*:/, '$1:');
        } else if (line.match(/^\*\*[^*]+\*\*\*\*/)) {
          // Handle **Term****:
          type = 'heading3';
          line = line.replace(/^\*\*([^*]+)\*\*\*\*/, '$1:');
        } else if (line.match(/^\*\*[^*]+\*\*/)) {
          // Handle lines that just start with **Something** as emphasis
          type = 'heading3';
          line = line.replace(/^\*\*([^*]+)\*\*/, '$1');
        }
        
        // Process inline formatting for the content
        line = line
          // Handle section headers like ### Key Concepts
          .replace(/^### (Key Concepts|Angular Quantities|Equations of Rotational Motion|Moment of Inertia)/g, '<h3 class="section-header">$1</h3>')
          // Handle markdown headers (###) at the beginning of lines
          .replace(/^### (.+)$/g, '<h3>$1</h3>')
          .replace(/^## (.+)$/g, '<h2>$1</h2>')
          .replace(/^# (.+)$/g, '<h1>$1</h1>')
          // Handle key concepts markers with varying number of #
          .replace(/^#{3,6} (.+)$/g, '<h3>$1</h3>')  // Multiple # markers like ###, ####, etc
          // Fix any literal <strong> tags that might appear in the text
          .replace(/<strong>([^<]+)<\/strong>/g, '<strong>$1</strong>')
          // Fix any literal <em> tags that might appear in the text
          .replace(/<em>([^<]+)<\/em>/g, '<em>$1</em>')
          // Bold text from markdown 
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          // Scientific notation - handle numbers with exponents like 10^24
          .replace(/(\d+(?:\.\d+)?)(?:\s*)[×xX](?:\s*)10\^(\d+)/g, '$1 × 10<sup>$2</sup>')
          .replace(/(\d+)\^(\d+)/g, '$1<sup>$2</sup>')
          // Units with superscripts like m/s^2
          .replace(/([a-zA-Z]+\/[a-zA-Z]+)\^(\d+)/g, '$1<sup>$2</sup>')
          // Handle math formulas with \( \) notation 
          .replace(/\\\\?\(([^)]+)\\\\?\)/g, '<span class="math-inline">$1</span>')
          // Handle special math characters
          .replace(/\\omega/g, '<span class="math-symbol">ω</span>')
          .replace(/\\theta/g, '<span class="math-symbol">θ</span>')
          .replace(/\\alpha/g, '<span class="math-symbol">α</span>')
          .replace(/\\beta/g, '<span class="math-symbol">β</span>')
          .replace(/\\gamma/g, '<span class="math-symbol">γ</span>')
          .replace(/\\delta/g, '<span class="math-symbol">δ</span>')
          .replace(/\\lambda/g, '<span class="math-symbol">λ</span>')
          .replace(/\\pi/g, '<span class="math-symbol">π</span>')
          // Times symbol (×) for multiplication
          .replace(/\b(times)\b/g, '<span class="math-symbol times">×</span>')
          // Handle other Greek letters
          .replace(/\\([a-zA-Z]+)/g, '<em>$1</em>')
          // Handle fractions like \frac{...}{...}
          .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="fraction">$1/$2</span>')
          // Handle subscripts with underscore
          .replace(/\_\{([^}]+)\}/g, '<sub>$1</sub>')
          .replace(/\_([a-zA-Z0-9])/g, '<sub>$1</sub>')
          // Handle superscripts with caret - more general pattern
          .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
          .replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          type,
          content: line.trim()
        };
      });
      
      // Filter out empty blocks
      const filteredBlocks = blocks.filter(block => 
        !(block.type === 'paragraph' && block.content === '')
      );
      
      // Ensure there's at least one block
      if (filteredBlocks.length === 0) {
        filteredBlocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'paragraph',
          content: ''
        });
      }
      
      // Save blocks
      localStorage.setItem(blocksKey, JSON.stringify(filteredBlocks));
      
      // Update subjects list if needed
      let subjects = [];
      try {
        const savedSubjects = localStorage.getItem('subjects');
        subjects = savedSubjects ? JSON.parse(savedSubjects) : [];
        console.log("Retrieved existing subjects:", subjects.length);
      } catch (error) {
        console.error("Error parsing subjects from localStorage:", error);
        subjects = [];
      }
      
      // Check if the subject already exists
      let subjectExists = false;
      let subjectIndex = -1;
      
      for (let i = 0; i < subjects.length; i++) {
        if (subjects[i].id === subjectId || 
            subjects[i].name.toLowerCase() === cleanedSubject.toLowerCase()) {
          subjectExists = true;
          subjectIndex = i;
          break;
        }
      }
      
      // Add the note to the subject
      if (subjectExists) {
        console.log("Subject exists, adding note to existing subject:", {
          subjectName: subjects[subjectIndex].name,
          subjectId: subjects[subjectIndex].id
        });
        
        // Initialize subtopics array if it doesn't exist
        if (!subjects[subjectIndex].subtopics) {
          subjects[subjectIndex].subtopics = [];
        }
        
        // Check if the note already exists
        const noteExists = subjects[subjectIndex].subtopics.some(
          (note: any) => note.id === titleId
        );
        
        if (!noteExists) {
          // Add the new note
          subjects[subjectIndex].subtopics.push({
            id: titleId,
            name: titleToUse,
            href: `/subjects/${subjects[subjectIndex].id}/${titleId}`
          });
          
          console.log("Added new note to existing subject:", {
            noteTitle: titleToUse,
            noteId: titleId
          });
        } else {
          console.log("Note already exists in subject, not adding duplicate");
        }
      } else {
        // Create a new subject with this note
        console.log("Subject doesn't exist, creating new subject:", {
          subjectName: cleanedSubject,
          subjectId
        });
        
        const newSubject = {
          id: subjectId,
          name: formattedSubject.charAt(0).toUpperCase() + formattedSubject.slice(1),
          href: `/subjects/${subjectId}`,
          subtopics: [{
            id: titleId,
            name: titleToUse,
            href: `/subjects/${subjectId}/${titleId}`
          }]
        };
        
        subjects.push(newSubject);
        console.log("Created new subject with note:", newSubject);
      }
      
      // Save updated subjects back to localStorage
      localStorage.setItem('subjects', JSON.stringify(subjects));
      console.log("Saved updated subjects to localStorage");
      
      // Return the path to the saved note
      return `/subjects/${subjectId}/${titleId}`;
    } catch (error) {
      console.error("Error saving generated note:", error);
      return ''; // Return empty string to indicate failure
    }
  };

  // Get existing subjects and notes for AI context
  const getExistingSubjectsContext = (): string => {
    try {
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      
      if (subjects.length === 0) {
        return "You don't have any subjects or notes saved yet.";
      }
      
      let context = "Here are the user's existing subjects and notes:\n\n";
      
      subjects.forEach((subject: any) => {
        context += `Subject: ${subject.name}\n`;
        
        if (subject.subtopics && subject.subtopics.length > 0) {
          context += "Notes:\n";
          subject.subtopics.forEach((note: any) => {
            context += `- ${note.name}\n`;
          });
        } else {
          context += "No notes yet.\n";
        }
        
        context += "\n";
      });
      
      context += "When generating notes, prefer adding to existing subjects if appropriate rather than creating new ones unless specified otherwise.";
      return context;
    } catch (error) {
      console.error('Error getting existing subjects context:', error);
      return '';
    }
  };

  // Get content of notes that might be relevant to the user's request
  const getRelevantNotesContent = (subject: string): string => {
    try {
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      let relevantContent = '';
      
      // Find matches for the subject or related subjects
      const lowerSubject = subject.toLowerCase();
      
      // Try to find direct matches first
      const matchingSubjects = subjects.filter((s: any) => 
        s.name.toLowerCase().includes(lowerSubject) || 
        lowerSubject.includes(s.name.toLowerCase())
      );
      
      // If we have matching subjects, look at their notes
      if (matchingSubjects.length > 0) {
        relevantContent += "Here's content from relevant existing notes that might be helpful:\n\n";
        
        for (const matchedSubject of matchingSubjects) {
          if (matchedSubject.subtopics && matchedSubject.subtopics.length > 0) {
            // Look through each note in the matching subject
            for (const note of matchedSubject.subtopics) {
              const titleKey = `title-${matchedSubject.id}-${note.id}`;
              const blocksKey = `blocks-${matchedSubject.id}-${note.id}`;
              
              const title = localStorage.getItem(titleKey);
              const blocksStr = localStorage.getItem(blocksKey);
              
              if (title && blocksStr) {
                try {
                  const blocks = JSON.parse(blocksStr);
                  
                  // Only include notes that seem relevant to the current request
                  if (
                    title.toLowerCase().includes(lowerSubject) || 
                    lowerSubject.includes(title.toLowerCase())
                  ) {
                    relevantContent += `Note: ${title} (in ${matchedSubject.name})\n`;
                    relevantContent += "Content summary:\n";
                    
                    // Extract headings and first few paragraphs to keep it concise
                    const headings = blocks
                      .filter((b: any) => ['heading1', 'heading2', 'heading3'].includes(b.type))
                      .map((b: any) => `- ${b.content}`)
                      .slice(0, 5)
                      .join('\n');
                    
                    if (headings) {
                      relevantContent += headings + '\n';
                    }
                    
                    relevantContent += "\n";
                  }
                } catch (error) {
                  console.error('Error parsing blocks for note:', error);
                }
              }
            }
          }
        }
      }
      
      if (relevantContent) {
        relevantContent += "Please avoid duplicating this content and instead complement or extend it in any new notes.\n\n";
      }
      
      return relevantContent;
    } catch (error) {
      console.error('Error getting relevant notes content:', error);
      return '';
    }
  };

  // Check if user is asking about existing subjects or notes
  const isAskingAboutExistingContent = (message: string): { isAsking: boolean, subject?: string, note?: string } => {
    const lowerMsg = message.toLowerCase();
    
    // Get existing subjects and notes
    const existingSubjects: any[] = [];
    const existingNotes: {subject: string, title: string}[] = [];
    
    try {
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      
      subjects.forEach((subject: any) => {
        existingSubjects.push(subject);
        
        if (subject.subtopics && subject.subtopics.length > 0) {
          subject.subtopics.forEach((note: any) => {
            existingNotes.push({
              subject: subject.name,
              title: note.name
            });
          });
        }
      });
    } catch (error) {
      console.error('Error getting existing subjects and notes:', error);
      return { isAsking: false };
    }
    
    // Patterns for asking about subjects or notes
    const askingPatterns = [
      /what.*(?:notes|content).*(?:have|contain|in).*(?:on|about|for)\s+(\w+(?:\s+\w+)*)/i,
      /(?:tell|show|list).*(?:notes|content).*(?:on|about|for)\s+(\w+(?:\s+\w+)*)/i,
      /what.*(?:notes|content).*(?:do I have|have I saved).*(?:on|about|for)?\s+(\w+(?:\s+\w+)*)/i,
      /what.*(?:subjects|topics).*(?:do I have|have I saved)/i,
      /(?:list|show|tell).*(?:subjects|topics)/i,
      /what.*(?:inside|in).*(?:subject|topic)\s+(\w+(?:\s+\w+)*)/i,
      /(?:contents|what|notes).*(?:of|in)\s+(\w+(?:\s+\w+)*)/i
    ];
    
    // Check if asking about subjects in general
    if (
      /what.*subjects/i.test(lowerMsg) || 
      /list.*subjects/i.test(lowerMsg) ||
      /show.*subjects/i.test(lowerMsg)
    ) {
      return { isAsking: true };
    }
    
    // Check specific patterns for subject or note queries
    for (const pattern of askingPatterns) {
      const match = lowerMsg.match(pattern);
      if (match && match[1]) {
        const query = match[1].trim();
        
        // Check if query matches any subject
        const matchedSubject = existingSubjects.find(s => 
          s.name.toLowerCase().includes(query) || 
          query.includes(s.name.toLowerCase())
        );
        
        if (matchedSubject) {
          return { isAsking: true, subject: matchedSubject.name };
        }
        
        // Check if query matches any note
        const matchedNote = existingNotes.find(n => 
          n.title.toLowerCase().includes(query) || 
          query.includes(n.title.toLowerCase())
        );
        
        if (matchedNote) {
          return { isAsking: true, subject: matchedNote.subject, note: matchedNote.title };
        }
      }
    }
    
    return { isAsking: false };
  };

  // Get detailed note content if a specific note is referenced
  const getNoteContent = (subject: string, noteTitle?: string): string => {
    try {
      const subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      
      // Find the subject
      const matchedSubject = subjects.find((s: any) => s.name.toLowerCase() === subject.toLowerCase());
      
      if (!matchedSubject) {
        return `I couldn't find a subject called "${subject}" in your study materials.`;
      }
      
      // If no specific note is requested, summarize all notes in the subject
      if (!noteTitle) {
        let content = `Here's what I found about "${subject}":\n\n`;
        
        if (!matchedSubject.subtopics || matchedSubject.subtopics.length === 0) {
          return `The subject "${subject}" exists in your study materials, but it doesn't have any notes yet.`;
        }
        
        content += `Subject "${subject}" contains the following notes:\n`;
        matchedSubject.subtopics.forEach((note: any) => {
          content += `- ${note.name}\n`;
        });
        
        return content;
      }
      
      // Find the specific note
      const matchedNote = matchedSubject.subtopics?.find((n: any) => 
        n.name.toLowerCase() === noteTitle.toLowerCase() ||
        n.name.toLowerCase().includes(noteTitle.toLowerCase()) ||
        noteTitle.toLowerCase().includes(n.name.toLowerCase())
      );
      
      if (!matchedNote) {
        return `I couldn't find a note called "${noteTitle}" in the subject "${subject}".`;
      }
      
      // Get the note content
      const titleKey = `title-${matchedSubject.id}-${matchedNote.id}`;
      const blocksKey = `blocks-${matchedSubject.id}-${matchedNote.id}`;
      
      const title = localStorage.getItem(titleKey);
      const blocksStr = localStorage.getItem(blocksKey);
      
      if (!blocksStr) {
        return `I found the note "${title}" in "${subject}", but couldn't retrieve its content.`;
      }
      
      const blocks = JSON.parse(blocksStr);
      
      let content = `Here's the content of "${title}" from the subject "${subject}":\n\n`;
      
      // Convert blocks to a readable format
      blocks.forEach((block: any) => {
        switch (block.type) {
          case 'heading1':
            content += `# ${block.content}\n\n`;
            break;
          case 'heading2':
            content += `## ${block.content}\n\n`;
            break;
          case 'heading3':
            content += `### ${block.content}\n\n`;
            break;
          case 'bulletList':
            content += `- ${block.content}\n`;
            break;
          case 'numberedList':
            content += `1. ${block.content}\n`;
            break;
          case 'paragraph':
            content += `${block.content}\n\n`;
            break;
          default:
            content += `${block.content}\n`;
        }
      });
      
      return content;
    } catch (error) {
      console.error('Error getting note content:', error);
      return 'I encountered an error trying to retrieve the note content.';
    }
  };

  // Create a new empty subject
  const createNewSubject = (subjectName: string): string => {
    try {
      console.log("Creating new subject with name:", subjectName);
      
      if (!subjectName || subjectName.trim() === '') {
        console.error("Cannot create a subject with an empty name");
        return "I couldn't create the subject because the name was empty.";
      }
      
      // Format the subject name
      const formattedSubject = subjectName.trim()
        .replace(/:/g, ' - ')
        .replace(/[%?&]/g, ' ');
      
      // Create ID for the subject - make it clean for URL
      const subjectId = formattedSubject.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      console.log("Formatted subject name:", formattedSubject);
      console.log("Subject ID for URL:", subjectId);
      
      // Get existing subjects
      let subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
      
      // Check if subject already exists
      const subjectExists = subjects.some((s: any) => 
        s.id === subjectId || 
        s.name.toLowerCase() === formattedSubject.toLowerCase()
      );
      
      if (subjectExists) {
        console.log("Subject already exists:", formattedSubject);
        return `The subject "${formattedSubject}" already exists in your study materials.`;
      }
      
      // Create proper capitalized name
      const properName = formattedSubject
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
        
      // Add the new subject
      const newSubject = {
        id: subjectId,
        name: properName,
        href: `/subjects/${subjectId}`,
        subtopics: []
      };
      
      subjects.push(newSubject);
      
      // Save updated subjects
      localStorage.setItem('subjects', JSON.stringify(subjects));
      
      console.log("Successfully created subject:", newSubject);
      
      return `Successfully created a new subject called "${properName}".`;
    } catch (error) {
      console.error('Error creating new subject:', error);
      return 'Sorry, there was an error creating the new subject.';
    }
  };

  // Check if user is asking to create a new subject
  const isSubjectCreationRequest = (message: string): { isCreationRequest: boolean, subjectName: string } => {
    const lowerMsg = message.toLowerCase();
    
    // Patterns for creating a new subject - more specific patterns first
    const creationPatterns = [
      // Direct patterns with clear subject identification
      /(?:create|make|add)(?:\s+a)?(?:\s+new)?(?:\s+subject|category|topic)(?:\s+called)?\s+["']?([^"'.?]+)["']?/i,
      /(?:new|create|make|add)(?:\s+a)?(?:\s+subject|category|topic)(?:\s+called)?\s+["']?([^"'.?]+)["']?/i,
      
      // Handle "can you" type questions
      /can\s+you\s+(?:create|make|add)(?:\s+a)?(?:\s+new)?(?:\s+subject|category|topic)(?:\s+called)?\s+["']?([^"'.?]+)["']?/i,
      /can\s+you\s+(?:make|create)(?:\s+a)?(?:\s+new)?(?:\s+subject|category|topic)(?:\s+named)?\s+["']?([^"'.?]+)["']?/i,
      
      // Fallback patterns (less specific)
      /(?:subject|category|topic)(?:\s+called)?\s+["']?([^"'.?]+)["']?/i
    ];
    
    for (const pattern of creationPatterns) {
      const match = lowerMsg.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted subject name
        let subjectName = match[1].trim();
        
        // Remove any trailing "subject" or related words that might have been captured
        subjectName = subjectName.replace(/\s+(subject|category|topic)$/i, '');
        
        console.log("Extracted subject name:", subjectName);
        
        return { 
          isCreationRequest: true, 
          subjectName: subjectName
        };
      }
    }
    
    return { isCreationRequest: false, subjectName: '' };
  };

  // Add a function to handle messages from the notes page
  useEffect(() => {
    const handleMessageFromNotes = (event: CustomEvent<{ message: string, context: string, timestamp: number }>) => {
      console.log("Received message from notes page:", event.detail);
      const { message, context } = event.detail;
      
      if (!message || message.trim() === '') {
        return;
      }
      
      // Force expand the AI Tutor
      setExpanded(true);
      
      // Add the message with context to the chat
      const formattedMessage = `${message}\n\nContext: ${context}`;
      
      // Add the user message to the chat
      handleSendMessageWithText(formattedMessage);
    };
    
    // Add handler for explanation requests
    const handleExplainText = (event: CustomEvent<{ text: string, source: string, id: number }>) => {
      console.log("Received explanation request:", event.detail);
      const { text, source, id } = event.detail;
      
      if (!text || text.trim() === '') {
        console.log("Empty text to explain, ignoring request");
        return;
      }
      
      // Check if we're already explaining this text
      if (messageManager.current.isExplaining(text)) {
        console.log("Already explaining this text, ignoring duplicate request");
        return;
      }
      
      // Force expand the AI Tutor
      setExpanded(true);
      
      // Create a system message that explains what to do
      const systemMessage = {
        role: 'system',
        content: `You are an expert tutor explaining the following text from ${source}. Explain the concept clearly, provide additional context, and break down complex ideas. Be educational and comprehensive but concise.`
      };
      
      // Create the text to explain
      const userMessage: Message = {
        id: Date.now(),
        text: `Please explain this text: "${text}"`,
        sender: 'user'
      };
      
      // Set loading state and add user message
      setIsLoading(true);
      setMessages(prev => {
        const updatedMessages = [...prev, userMessage];
        localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
      
      // Mark that we're explaining this text
      messageManager.current.startExplaining(text);
      
      // Generate AI response
      setTimeout(async () => {
        try {
          // Add a loading message
          const loadingId = Date.now();
          setMessages(prevMsgs => {
            const withoutLoadingMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
            const updatedMessages = [...withoutLoadingMsgs, { 
              id: loadingId, 
              text: "Thinking...", 
              sender: 'ai' as const
            }];
            localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
            return updatedMessages;
          });
          
          // Prepare messages for API call
          const formattedMessages = [
            systemMessage,
            { role: 'user', content: `Please explain this text: "${text}"` }
          ];
          
          // Generate explanation
          const explanation = await generateAIResponse(formattedMessages);
          
          // Remove loading message and add explanation
          setMessages(prevMsgs => {
            const filteredMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
            const updatedMessages = [...filteredMsgs, { 
              id: Date.now(), 
              text: explanation || "I'm sorry, I couldn't generate an explanation.", 
              sender: 'ai' as const
            }];
            localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
            return updatedMessages;
          });
        } catch (error) {
          console.error('Error generating explanation:', error);
          setMessages(prevMsgs => {
            const filteredMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
            const updatedMessages = [...filteredMsgs, { 
              id: Date.now(), 
              text: "I'm sorry, I encountered an error while trying to generate an explanation.", 
              sender: 'ai' as const
            }];
            localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
            return updatedMessages;
          });
        } finally {
          setIsLoading(false);
          messageManager.current.finishExplaining();
        }
      }, 100);
    };
    
    // Register the event listeners
    window.addEventListener('sendMessage', handleMessageFromNotes as EventListener);
    window.addEventListener('explainText', handleExplainText as EventListener);
    
    // Check localStorage for pending questions
    const checkPendingQuestions = () => {
      const pendingQuestionJson = localStorage.getItem('pendingQuestion');
      if (pendingQuestionJson) {
        try {
          const pendingQuestion = JSON.parse(pendingQuestionJson);
          
          // Only process recent questions (within the last 2 minutes)
          if (Date.now() - pendingQuestion.timestamp < 120000) {
            console.log("Found pending question in localStorage");
            
            // Format the message with context
            const formattedMessage = `${pendingQuestion.message}\n\nContext: ${pendingQuestion.context}`;
            
            // Force expand the AI Tutor
            setExpanded(true);
            
            // Add the message to the chat
            handleSendMessageWithText(formattedMessage);
          }
          
          // Clear the pending question
          localStorage.removeItem('pendingQuestion');
        } catch (error) {
          console.error("Error processing pending question:", error);
          localStorage.removeItem('pendingQuestion');
        }
      }
      
      // Check for pending explanations
      const pendingExplanationJson = localStorage.getItem('pendingExplanation');
      if (pendingExplanationJson) {
        try {
          const pendingExplanation = JSON.parse(pendingExplanationJson);
          
          // Only process recent explanations (within the last 2 minutes)
          if (Date.now() - pendingExplanation.timestamp < 120000) {
            console.log("Found pending explanation in localStorage");
            
            // Create a synthetic event to handle with the same logic
            const syntheticEvent = new CustomEvent('explainText', {
              detail: {
                text: pendingExplanation.text,
                source: pendingExplanation.source,
                id: pendingExplanation.id || Date.now()
              }
            });
            
            // Process the explanation
            handleExplainText(syntheticEvent);
          }
          
          // Clear the pending explanation
          localStorage.removeItem('pendingExplanation');
        } catch (error) {
          console.error("Error processing pending explanation:", error);
          localStorage.removeItem('pendingExplanation');
        }
      }
    };
    
    // Check for pending questions once on mount
    checkPendingQuestions();
    
    return () => {
      window.removeEventListener('sendMessage', handleMessageFromNotes as EventListener);
      window.removeEventListener('explainText', handleExplainText as EventListener);
    };
  }, []);

  // Add a helper function to send a message programmatically
  const handleSendMessageWithText = (text: string) => {
    if (!text.trim() || isLoading) return;
    
    // Add the user message
    const userMessage: Message = {
      id: Date.now(),
      text: text,
      sender: 'user'
    };
    
    // Set loading state and add user message
    setIsLoading(true);
    setMessages(prev => {
      const updatedMessages = [...prev, userMessage];
      localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    
    // Process the message to detect note generation requests
    const { isRequest, subject, targetSubject } = isNoteGenerationRequest(text);
    
    // Generate AI response
    setTimeout(async () => {
      try {
        // Format messages for OpenAI API
        const formattedMessages = [...messages, userMessage].map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));
        
        // Add system message for context
        formattedMessages.unshift({
          role: 'system',
          content: `You are a helpful AI tutor assisting a student with their studies. Be concise but thorough in your explanations. Format your responses with markdown for better readability.`
        });
        
        // Show temporary loading message
        const loadingId = Date.now();
        setMessages(prevMsgs => {
          // First, remove any existing "Thinking..." messages to prevent duplicates
          const withoutLoadingMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
          
          // Add exactly one loading message
          const updatedMessages = [...withoutLoadingMsgs, { 
            id: loadingId, 
            text: "Thinking...", 
            sender: 'ai' as const
          }];
          
          localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        
        // Generate response
        const aiResponse = await generateAIResponse(formattedMessages);
        
        // Remove all loading messages and add the real response
        setMessages(prevMsgs => {
          // Remove ALL thinking messages, not just the one with the specific loadingId
          const filteredMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
          const updatedMessages = [...filteredMsgs, { 
            id: Date.now(), 
            text: aiResponse || "I'm sorry, I couldn't generate a response.", 
            sender: 'ai' as const
          }];
          localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
          return updatedMessages;
        });
        
        // If this was a note generation request, set the generated note
        if (isRequest) {
          setGeneratedNote({
            title: subject.charAt(0).toUpperCase() + subject.slice(1),
            content: aiResponse,
            subject: subject,
            targetSubject: targetSubject
          });
        }
      } catch (error) {
        console.error('Error generating response:', error);
        setMessages(prevMsgs => {
          // Remove ALL thinking messages
          const filteredMsgs = prevMsgs.filter(m => m.sender !== 'ai' || m.text !== "Thinking...");
          const updatedMessages = [...filteredMsgs, { 
            id: Date.now(), 
            text: "I'm sorry, I encountered an error while trying to generate a response.", 
            sender: 'ai' as const
          }];
          localStorage.setItem('aiTutorMessages', JSON.stringify(updatedMessages));
          return updatedMessages;
        });
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  // Modify the existing handleSendMessage function to use the new helper
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use the helper function with the input text
    handleSendMessageWithText(input);
    
    // Clear the input field
    setInput('');
  };

  const handleSaveNote = () => {
    if (generatedNote) {
      // Create a copy of the note data and immediately clear state to prevent double-saving
      const noteToSave = {...generatedNote};
      setGeneratedNote(null);
      
      // Set the justSaved flag to prevent fallback from immediately re-triggering
      setJustSaved(true);
      
      // Reset the flag after 2 seconds
      setTimeout(() => {
        setJustSaved(false);
      }, 2000);
      
      const notePath = saveGeneratedNote(noteToSave);
      if (notePath) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: `I've saved the notes to your study materials. You can access them any time from the sidebar.`, 
          sender: 'ai' 
        }]);
        
        // Navigate to the saved note
        router.push(notePath);
      } else {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "I'm sorry, I encountered an error saving the notes.", 
          sender: 'ai' 
        }]);
      }
    }
  };

  // Reset the chat history
  const resetChat = () => {
    const defaultMessage: Message = { 
      id: Date.now(), 
      text: "Hello! I'm your AI tutor powered by GPT-4o. How can I help you with your studies today? You can ask me to generate structured notes on any subject.", 
      sender: 'ai' as const
    };
    
    setMessages([defaultMessage]);
    localStorage.setItem('aiTutorMessages', JSON.stringify([defaultMessage]));
    setGeneratedNote(null);
  };

  if (!expanded) {
    return (
      <button
        id="ai-tutor-component" // Add ID to button view too
        onClick={toggleExpanded}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--highlight-color)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 100
        }}
      >
        <div style={{ fontSize: '24px' }}>AI</div>
      </button>
    );
  }

  return expanded ? (
    <div
      id="ai-tutor-component" // Add ID to expanded view
      className={`ai-tutor ${expanded ? 'expanded' : 'collapsed'}`}
      style={{
        width: expanded ? `${width}px` : '0',
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transition: isDragging ? 'none' : 'width 0.3s ease',
        overflow: 'hidden'
      }}
    >
      {/* Drag handle */}
      <div
        ref={dragHandleRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '5px',
          cursor: 'col-resize',
          zIndex: 2
        }}
      />
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>AI Tutor</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={resetChat}
            title="Reset conversation"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              marginRight: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={toggleExpanded}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map(message => (
          <div
            key={message.id}
            style={{
              backgroundColor: message.sender === 'ai' ? 'var(--bg-tertiary)' : 'var(--highlight-bg)',
              color: 'var(--text-primary)',
              alignSelf: message.sender === 'ai' ? 'flex-start' : 'flex-end',
              padding: message.sender === 'ai' ? '0' : '12px 16px',
              borderRadius: '12px',
              maxWidth: message.sender === 'ai' ? '95%' : '80%',
              wordBreak: 'break-word',
              boxShadow: message.sender === 'ai' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {message.sender === 'ai' ? (
              <div className="notion-style-response">
                <div className="response-header">
                  <span className="response-title">AI Response</span>
                  <button 
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(message.text);
                      // You could add a toast notification here
                    }}
                    title="Copy to clipboard"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 13V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                <div className="response-content">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    components={{
                      h1: ({children}) => <h1 style={{fontSize: '1.5em', fontWeight: 'bold', margin: '16px 0 8px 0'}}>{children}</h1>,
                      h2: ({children}) => <h2 style={{fontSize: '1.3em', fontWeight: 'bold', margin: '14px 0 8px 0'}}>{children}</h2>,
                      h3: ({children}) => <h3 style={{fontSize: '1.1em', fontWeight: 'bold', margin: '12px 0 8px 0'}}>{children}</h3>,
                      h4: ({children}) => <h4 style={{fontSize: '1em', fontWeight: 'bold', margin: '10px 0 8px 0'}}>{children}</h4>,
                      p: ({children}) => <p style={{margin: '8px 0'}}>{children}</p>,
                      ul: ({children}) => <ul style={{paddingLeft: '20px', margin: '8px 0'}}>{children}</ul>,
                      ol: ({children}) => <ol style={{paddingLeft: '20px', margin: '8px 0'}}>{children}</ol>,
                      li: ({children}) => <li style={{margin: '4px 0'}}>{children}</li>,
                      blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid var(--border-color)', paddingLeft: '16px', margin: '16px 0'}}>{children}</blockquote>,
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !className;
                        return isInline 
                          ? <code style={{backgroundColor: 'var(--code-bg)', padding: '2px 4px', borderRadius: '4px'}} {...props}>{children}</code>
                          : (
                            <div className="code-block-container">
                              <div className="code-block-header">
                                <span className="language-label">{match ? match[1] : 'code'}</span>
                                <button 
                                  className="copy-code-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const codeText = Array.isArray(children) 
                                      ? children.join('') 
                                      : String(children);
                                    navigator.clipboard.writeText(codeText);
                                  }}
                                  title="Copy code"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 13V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              </div>
                              <pre className="code-block-content"><code {...props}>{children}</code></pre>
                            </div>
                          )
                      }
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              message.text
            )}
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              alignSelf: 'flex-start',
              padding: '12px 16px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Loader2 size={16} className="animate-spin" />
            Thinking...
          </div>
        )}
        
        {/* Message indicator that appears below the last message when a note is detected but button might not be showing */}
        {messages.length > 0 && 
          messages[messages.length - 1].sender === 'ai' && 
          messages[messages.length - 1].text.includes("notes") &&
          (messages[messages.length - 1].text.includes("study materials") || 
           messages[messages.length - 1].text.includes("add these notes")) &&
          !generatedNote && 
          !justSaved && // Don't show fallback if we just saved
          !messages[messages.length - 1].text.includes("I've saved the notes to your study materials") && (
          <div
            style={{
              alignSelf: 'center',
              width: '100%',
              padding: '12px',
              backgroundColor: 'rgba(0, 112, 243, 0.1)',
              borderRadius: '8px',
              margin: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '1px dashed var(--highlight-color)',
            }}
          >
            <div style={{ fontSize: '14px', marginBottom: '8px', textAlign: 'center' }}>
              It looks like I've generated notes you might want to save.
            </div>
            <button
              onClick={() => {
                // Create a note from the last AI message
                const lastMessage = messages[messages.length - 1];
                const content = lastMessage.text;
                
                // Try to determine subject from content or recent messages
                let subject = '';
                for (let i = messages.length - 2; i >= 0; i--) {
                  if (messages[i].sender === 'user') {
                    subject = messages[i].text;
                    break;
                  }
                }
                
                // Clean subject
                subject = subject.replace(/^(?:can|could) you (?:make|create|write|generate) (?:me )?(?:some |a )?(notes|summary) (?:about|on|for|regarding) /i, '');
                
                if (!subject || subject.length < 3) {
                  subject = 'Notes';
                }
                
                // Create note object
                const noteData = {
                  title: subject.charAt(0).toUpperCase() + subject.slice(1),
                  content: content,
                  subject: subject,
                  targetSubject: undefined
                };
                
                // Set generated note
                setGeneratedNote(noteData);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--highlight-color)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Save size={16} />
              Save These Notes
            </button>
          </div>
        )}
        
        {/* Save Note Button */}
        {generatedNote && (
          <div
            style={{
              alignSelf: 'center',
              marginTop: '16px',
              marginBottom: '16px',
              padding: '0 8px',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              zIndex: 20
            }}
          >
            <button
              onClick={handleSaveNote}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--highlight-color)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                animation: 'pulse 2s infinite',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
            >
              <Save size={18} />
              Save Notes to Study Materials
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSendMessage}
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your AI tutor..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: 'var(--highlight-color)',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </form>
      
      {/* Status indicator */}
      <div style={{
        padding: '8px 16px',
        fontSize: '12px',
        textAlign: 'center',
        color: 'var(--text-tertiary)'
      }}>
        Powered by GPT-4o
      </div>

      {/* Add styles for notion-like UI */}
      <style jsx global>{`
        .notion-style-response {
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
        }
        
        .response-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        
        .response-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .copy-button, .copy-code-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--text-tertiary);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .copy-button:hover, .copy-code-button:hover {
          background-color: var(--hover-bg);
          color: var(--text-primary);
        }
        
        .response-content {
          padding: 12px 16px;
          max-height: 400px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.2) transparent;
        }
        
        .response-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .response-content::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        
        .code-block-container {
          margin: 12px 0;
          border-radius: 8px;
          overflow: hidden;
          background-color: var(--code-bg);
          border: 1px solid var(--border-color);
        }
        
        .code-block-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: rgba(0,0,0,0.1);
          border-bottom: 1px solid var(--border-color);
        }
        
        .language-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }
        
        .code-block-content {
          margin: 0;
          padding: 12px;
          max-height: 300px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  ) : null;
} 