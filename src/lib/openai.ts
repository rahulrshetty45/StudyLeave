import { setTimeout } from 'timers';

const recentRequests = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 2000;
const THROTTLE_WINDOW_MS = 5000;

let globalLastRequestTime = 0;

export interface Message {
  role: string;
  content: string;
}

export async function generateAIResponse(messages: Message[]): Promise<string> {
  try {
    const now = Date.now();
    const timeSinceLastRequest = now - globalLastRequestTime;
    
    if (timeSinceLastRequest < 1000) {
      console.log(`🛑 Global throttle: Blocking request, only ${timeSinceLastRequest}ms since last request`);
      return "I'm processing your request. Please wait a moment before asking again.";
    }
    
    globalLastRequestTime = now;
    
    const requestKey = JSON.stringify(messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0, 100) : ''
    })));
    
    const previousRequestTime = recentRequests.get(requestKey);
    
    if (previousRequestTime && (now - previousRequestTime < DUPLICATE_WINDOW_MS)) {
      console.log("🛑 Blocking duplicate request within 2 second window");
      return "I'm already processing a similar request. Please wait a moment.";
    }
    
    recentRequests.set(requestKey, now);
    
    setTimeout(() => {
      recentRequests.delete(requestKey);
    }, DUPLICATE_WINDOW_MS * 2);
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

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to generate response';
      let errorDetails = {};
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData;
        
        console.error('API error details:', errorDetails);
      } catch (parseError) {
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
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return "Connection error: Unable to reach the AI service. Please check your internet connection and try again.";
    }
    
    return "I'm sorry, I encountered an error processing your request. Technical details: " + (error instanceof Error ? error.message : String(error));
  }
}
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
      model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
      streamingSupported: typeof ReadableStream !== 'undefined',
      isAWSAmplify: typeof window !== 'undefined' && window.location.hostname.includes('amplifyapp.com')
    });
    
    // Make the request with stream: true parameter
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
    
    // Different handling based on response type
    // If Content-Type is text/event-stream, use streaming, otherwise use regular JSON
    const contentType = response.headers.get('Content-Type') || '';
    console.log('Response content type:', contentType);
    console.log('Has body?', !!response.body);
    
    if (contentType.includes('text/event-stream') && response.body) {
      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';
      
      try {
        // Define the function to process event stream chunks
        const processEventStreamChunk = (chunk: string) => {
          const lines = chunk.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              // Check if the stream is done
              if (data === '[DONE]') {
                onComplete(fullText);
                return;
              }
              
              try {
                const parsedData = JSON.parse(data);
                if (parsedData.content) {
                  fullText += parsedData.content;
                  onChunk(parsedData.content);
                } else if (parsedData.error) {
                  console.error('Error in stream data:', parsedData.error);
                  throw new Error(parsedData.error);
                }
              } catch (e) {
                console.error('Error parsing JSON from stream:', e, 'Data:', data);
              }
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining data in the buffer
            if (buffer.trim()) {
              processEventStreamChunk(buffer);
            }
            break;
          }
          
          // Decode the chunk and add to buffer
          const text = decoder.decode(value, { stream: true });
          buffer += text;
          
          // Find complete events (separated by double newlines)
          let eventEnd = buffer.indexOf('\n\n');
          while (eventEnd !== -1) {
            const eventData = buffer.substring(0, eventEnd);
            processEventStreamChunk(eventData);
            buffer = buffer.substring(eventEnd + 2);
            eventEnd = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        console.error('Error reading stream:', error);
        
        // If we already have some text, use it for graceful fallback
        if (fullText) {
          console.log('Stream read error, but using partial results');
          onComplete(fullText);
        } else {
          throw error;
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Fallback - server returned regular JSON instead of a stream
      console.log('Server did not return a stream. Using fallback JSON response handling.');
      console.log('Content-Type received:', contentType);
      console.log('Response headers:', [...response.headers.entries()].map(([key, value]) => `${key}: ${value}`).join(', '));
      const responseText = await response.text();
      
      try {
        // First try to parse as JSON
        let fullResponse = '';
        try {
          const data = JSON.parse(responseText);
          if (data.message) {
            fullResponse = data.message;
          } else {
            console.warn('JSON response missing message field:', data);
            fullResponse = responseText; // Fallback to raw text
          }
        } catch (parseError) {
          // If not valid JSON, use the raw text as the response
          console.log('Response is not JSON, using as plain text');
          fullResponse = responseText;
        }
        
        // Simulate streaming with the complete message
        // Break it into smaller chunks for a typing effect
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // Split response into words
        const words = fullResponse.split(' ');
        let currentText = '';
        
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
        onComplete(fullResponse);
      } catch (error) {
        console.error('Error processing response:', error);
        console.error('Raw response:', responseText.substring(0, 200) + '...');
        throw new Error('Failed to process server response');
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