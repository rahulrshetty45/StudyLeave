import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with better error handling for missing API key
const openaiApiKey = process.env.OPENAI_API_KEY;
const modelName = process.env.MODEL_NAME || 'gpt-4o';

// Create a safety check for the API key
if (!openaiApiKey) {
  console.error('Missing OpenAI API key in environment variables');
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey || '',  // Provide empty string as fallback to prevent undefined error
});

// Helper function to add CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    // Get messages from request body
    const { messages, stream = false } = await request.json();

    // Log environment variables (excluding sensitive values)
    console.log('Environment check:', { 
      modelNameExists: !!modelName,
      apiKeyExists: !!openaiApiKey,
      nodeEnv: process.env.NODE_ENV,
      hasReadableStream: typeof ReadableStream !== 'undefined'
    });

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500, headers: corsHeaders() }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request body. Messages array is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Check if this might be a notes generation request by examining the system message
    const isNotesGeneration = messages.some(msg => 
      msg.role === 'system' && 
      msg.content.includes('generate structured notes')
    );

    console.log('Processing request:', {
      messageCount: messages.length,
      isNotesGeneration,
      model: modelName,
      streaming: stream
    });

    // For streaming responses - check if ReadableStream is available
    if (stream && typeof ReadableStream !== 'undefined') {
      const encoder = new TextEncoder();
      
      // Create a stream
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Create OpenAI streaming completion
            const completion = await openai.chat.completions.create({
              model: modelName,
              messages,
              temperature: isNotesGeneration ? 0.5 : 0.7,
              max_tokens: isNotesGeneration ? 2500 : 1000,
              stream: true,
            });

            // Handle each chunk from the API
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }

            // End the stream
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in stream processing:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`));
            controller.close();
          }
        },
      });

      // Return the stream response
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders(),
        },
      });
    } else {
      // For non-streaming responses or when ReadableStream is not available
      console.log(stream ? 'ReadableStream not available, falling back to non-streaming response' : 'Using non-streaming response');
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages,
        temperature: isNotesGeneration ? 0.5 : 0.7, // Lower temperature for more structured output on notes
        max_tokens: isNotesGeneration ? 2500 : 1000, // Allow more tokens for detailed notes
      });

      console.log('OpenAI response received:', {
        responseLength: response.choices[0].message.content?.length || 0,
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens
      });

      // Return response with CORS headers
      return NextResponse.json({
        message: response.choices[0].message.content,
      }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    
    // Detailed error logging for debugging
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });
    
    // Check for specific OpenAI errors
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Authentication error with OpenAI API' },
        { status: 401, headers: corsHeaders() }
      );
    }
    
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Error generating AI response', 
        message: error?.message || 'Unknown error',
        type: error?.type || 'Unknown type',
        status: error?.status || 500,
      },
      { status: 500, headers: corsHeaders() }
    );
  }
} 