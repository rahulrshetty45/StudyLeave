// Client-side API service for OpenAI calls
// Instead of directly calling the OpenAI API from the client, we make a request to our API route

export interface Message {
  role: string;
  content: string;
}

export async function generateAIResponse(messages: Message[]) {
  try {
    console.log('Sending request to /api/ai with', {
      messageCount: messages.length,
      firstUserMessage: messages.find(m => m.role === 'user')?.content.substring(0, 50) + '...',
      systemMessageLength: messages.find(m => m.role === 'system')?.content.length
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