// Client-side API service for OpenAI calls
// Instead of directly calling the OpenAI API from the client, we make a request to our API route

export interface Message {
  role: string;
  content: string;
}

export async function generateAIResponse(messages: Message[]) {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate response');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm sorry, I encountered an error processing your request.";
  }
} 