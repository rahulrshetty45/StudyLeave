import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Get messages from request body
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request body. Messages array is required.' },
        { status: 400 }
      );
    }

    // Check if this might be a notes generation request by examining the system message
    const isNotesGeneration = messages.some(msg => 
      msg.role === 'system' && 
      msg.content.includes('generate structured notes')
    );

    // Generate AI response with appropriate parameters
    const response = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || 'gpt-4o',
      messages,
      temperature: isNotesGeneration ? 0.5 : 0.7, // Lower temperature for more structured output on notes
      max_tokens: isNotesGeneration ? 2500 : 1000, // Allow more tokens for detailed notes
    });

    // Return response
    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    return NextResponse.json(
      { error: 'Error generating AI response' },
      { status: 500 }
    );
  }
} 