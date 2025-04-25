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
    // Log environment info for debugging purposes
    console.log('Streaming environment check:', {
      isProduction: process.env.NODE_ENV === 'production',
      hasReadableStream: typeof ReadableStream !== 'undefined',
      hasTextEncoder: typeof TextEncoder !== 'undefined',
      hasTextDecoder: typeof TextDecoder !== 'undefined',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
    });
    
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
      model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
      streamingSupported: typeof ReadableStream !== 'undefined'
    });
    
    // Make the request with stream: true parameter
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, stream: true }),
    });
    
    // Log response details
    console.log('Streaming response headers:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      hasBody: !!response.body,
      isReadableStream: response.body instanceof ReadableStream
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
    
    // Different handling based on response type
    // If Content-Type is text/event-stream, use streaming, otherwise use regular JSON
    const contentType = response.headers.get('Content-Type') || '';
    
    if (contentType.includes('text/event-stream') && response.body) {
      // Handle the streaming response
      console.log('Processing streaming response with event-stream content type');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let chunkCount = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`Streaming completed after ${chunkCount} chunks`);
            break;
          }
          
          // Decode the chunk and process it
          const chunk = decoder.decode(value);
          chunkCount++;
          console.log(`Received chunk #${chunkCount}, size: ${chunk.length} bytes`);
          
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              // Check if the stream is done
              if (data === '[DONE]') {
                console.log('Received [DONE] marker in stream');
                onComplete(fullText);
                break;
              }
              
              try {
                const parsedData = JSON.parse(data);
                if (parsedData.content) {
                  fullText += parsedData.content;
                  onChunk(parsedData.content);
                  console.log(`Processed content chunk: "${parsedData.content.substring(0, 20)}${parsedData.content.length > 20 ? '...' : ''}"`);
                } else if (parsedData.error) {
                  console.error('Error in stream data:', parsedData.error);
                  throw new Error(parsedData.error);
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
    } else {
      // Fallback - server returned regular JSON instead of a stream
      console.log('Server did not return a stream. Using fallback JSON response handling with content type:', contentType);
      const responseText = await response.text();
      console.log(`Received non-streaming response, length: ${responseText.length} bytes`);
      
      try {
        const data = JSON.parse(responseText);
        if (data.message) {
          console.log('Successfully parsed JSON response with message property');
          // Simulate streaming with the complete message
          // Break it into smaller chunks for a typing effect
          const fullResponse = data.message;
          
          // Helper function to add artificial delay
          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
          
          // Split response into words
          const words = fullResponse.split(' ');
          let currentText = '';
          console.log(`Simulating streaming with ${words.length} words`);
          
          // Process each word with a small delay
          for (let i = 0; i < words.length; i++) {
            // Add the next word
            currentText += (i === 0 ? '' : ' ') + words[i];
            
            // If at word boundary or reached end, send chunk
            if (i % 3 === 2 || i === words.length - 1) {
              const chunk = i === 0 ? words[0] : ' ' + words.slice(Math.max(0, i-2), i+1).join(' ');
              onChunk(chunk);
              
              // Short delay between chunks
              await delay(50);
            }
          }
          
          // Complete the response
          console.log('Completed simulated streaming');
          onComplete(fullResponse);
        } else {
          console.error('Response missing message property:', data);
          throw new Error('Response did not contain a message');
        }
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        console.error('Raw response:', responseText.substring(0, 200) + '...');
        throw new Error('Invalid response format from server');
      }
    }
  } catch (error) {
    console.error('Error generating streaming response:', error);
    
    const errorMessage = "I'm sorry, I encountered an error processing your request. Technical details: " + 
      (error instanceof Error ? error.message : String(error));
    
    onChunk(errorMessage);
    onComplete(errorMessage);
  }
} 