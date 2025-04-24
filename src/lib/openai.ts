// Client-side API service for OpenAI calls
// Instead of directly calling the OpenAI API from the client, we make a request to our API route

// Import needed for timestamp tracking
import { setTimeout } from 'timers';

// Add a request tracker to prevent duplicate API calls
const recentRequests = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 2000; // 2 seconds window to prevent duplicates
const THROTTLE_WINDOW_MS = 5000; // 5 seconds global throttle window

// Add a global throttle for ALL requests
let globalLastRequestTime = 0;

export interface Message {
  role: string;
  content: string;
}

export async function generateAIResponse(messages: Message[]): Promise<string> {
  try {
    // IMPLEMENT GLOBAL THROTTLE - no more than one request every 1 second
    const now = Date.now();
    const timeSinceLastRequest = now - globalLastRequestTime;
    
    if (timeSinceLastRequest < 1000) {
      console.log(`🛑 Global throttle: Blocking request, only ${timeSinceLastRequest}ms since last request`);
      return "I'm processing your request. Please wait a moment before asking again.";
    }
    
    // Update last request time
    globalLastRequestTime = now;
    
    // Create a simple hash of the messages to track duplicates
    const requestKey = JSON.stringify(messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0, 100) : '' // First 100 chars is enough for comparison
    })));
    
    // Check if this is a duplicate request
    const previousRequestTime = recentRequests.get(requestKey);
    
    if (previousRequestTime && (now - previousRequestTime < DUPLICATE_WINDOW_MS)) {
      console.log("🛑 Blocking duplicate request within 2 second window");
      return "I'm already processing a similar request. Please wait a moment.";
    }
    
    // Record this request
    recentRequests.set(requestKey, now);
    
    // Clean up old requests after a while
    setTimeout(() => {
      recentRequests.delete(requestKey);
    }, DUPLICATE_WINDOW_MS * 2);
    
    // Continue with normal API call
    console.log('Sending request to /api/ai with', {
      messageCount: messages.length,
      isNotesGeneration: messages.some(m => 
        m.role === 'system' && 
        typeof m.content === 'string' && 
        m.content.includes('Generate comprehensive study notes')
      ),
      model: process.env.OPENAI_MODEL_NAME || 'gpt-4o'
    });
    
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    // Log response status
    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to generate response';
      let errorDetails = {};
      
      try {
        // Try to parse the error as JSON
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData;
        
        console.error('API error details:', errorDetails);
      } catch (parseError) {
        // If parsing fails, use the raw text
        console.error('API error (raw):', errorText);
      }
      
      throw new Error(`Error ${response.status}: ${errorMessage}`);
    }

    const responseText = await response.text();
    console.log('Response received, length:', responseText.length);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing response JSON:', parseError);
      console.error('Raw response:', responseText.substring(0, 200) + '...');
      throw new Error('Invalid response format from server');
    }

    return data.message;
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Extract and log network error details
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Return a more specific error message if possible
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return "Connection error: Unable to reach the AI service. Please check your internet connection and try again.";
    }
    
    return "I'm sorry, I encountered an error processing your request. Technical details: " + (error instanceof Error ? error.message : String(error));
  }
} 

// New function for streaming responses
export async function generateStreamingAIResponse(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onComplete: (fullText: string) => void
): Promise<void> {
  try {
    // IMPLEMENT GLOBAL THROTTLE - no more than one request every 1 second
    const now = Date.now();
    const timeSinceLastRequest = now - globalLastRequestTime;
    
    if (timeSinceLastRequest < 1000) {
      console.log(`🛑 Global throttle: Blocking request, only ${timeSinceLastRequest}ms since last request`);
      onChunk("I'm processing your request. Please wait a moment before asking again.");
      onComplete("I'm processing your request. Please wait a moment before asking again.");
      return;
    }
    
    // Update last request time
    globalLastRequestTime = now;
    
    // Create a simple hash of the messages to track duplicates
    const requestKey = JSON.stringify(messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0, 100) : '' // First 100 chars is enough for comparison
    })));
    
    // Check if this is a duplicate request
    const previousRequestTime = recentRequests.get(requestKey);
    
    if (previousRequestTime && (now - previousRequestTime < DUPLICATE_WINDOW_MS)) {
      console.log("🛑 Blocking duplicate request within 2 second window");
      onChunk("I'm already processing a similar request. Please wait a moment.");
      onComplete("I'm already processing a similar request. Please wait a moment.");
      return;
    }
    
    // Record this request
    recentRequests.set(requestKey, now);
    
    // Clean up old requests after a while
    setTimeout(() => {
      recentRequests.delete(requestKey);
    }, DUPLICATE_WINDOW_MS * 2);
    
    // Continue with streaming API call
    console.log('Sending streaming request to /api/ai with', {
      messageCount: messages.length,
      isNotesGeneration: messages.some(m => 
        m.role === 'system' && 
        typeof m.content === 'string' && 
        m.content.includes('Generate comprehensive study notes')
      ),
      model: process.env.OPENAI_MODEL_NAME || 'gpt-4o'
    });
    
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, stream: true }),
    });
    
    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to generate response';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
        console.error('API error details:', errorData);
      } catch (parseError) {
        console.error('API error (raw):', errorText);
      }
      
      throw new Error(`Error ${response.status}: ${errorMessage}`);
    }
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    // Handle the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and process it
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // Check if the stream is done
            if (data === '[DONE]') {
              onComplete(fullText);
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                fullText += parsedData.content;
                onChunk(parsedData.content);
              }
            } catch (e) {
              console.error('Error parsing JSON from stream:', e);
              console.error('Raw data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Error generating streaming response:', error);
    
    const errorMessage = "I'm sorry, I encountered an error processing your request. Technical details: " + 
      (error instanceof Error ? error.message : String(error));
    
    onChunk(errorMessage);
    onComplete(errorMessage);
  }
} 