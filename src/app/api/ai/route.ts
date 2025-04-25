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
    // Extended environment debugging
    console.log('API route environment:', {
      runtime: typeof process !== 'undefined' ? process.env.NEXT_RUNTIME || 'unknown' : 'unknown',
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV || 'not-vercel',
      next_version: process.env.NEXT_VERSION || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
    });
    
    // Get messages from request body
    const { messages, stream = false } = await request.json();

    // Log environment variables (excluding sensitive values)
    console.log('Environment check:', { 
      modelNameExists: !!modelName,
      apiKeyExists: !!openaiApiKey,
      nodeEnv: process.env.NODE_ENV,
      hasReadableStream: typeof ReadableStream !== 'undefined',
      hasTextEncoder: typeof TextEncoder !== 'undefined',
      attemptStreaming: stream
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
    if (stream && typeof ReadableStream !== 'undefined' && typeof TextEncoder !== 'undefined') {
      try {
        console.log('Attempting to create streaming response');
        const encoder = new TextEncoder();
        
        // Create a stream
        const stream = new ReadableStream({
          async start(controller) {
            try {
              console.log('Stream controller started, creating OpenAI completion');
              // Create OpenAI streaming completion
              const completion = await openai.chat.completions.create({
                model: modelName,
                messages,
                temperature: isNotesGeneration ? 0.5 : 0.7,
                max_tokens: isNotesGeneration ? 2500 : 1000,
                stream: true,
              });

              console.log('OpenAI streaming completion created successfully');
              let chunkCount = 0;
              
              // Handle each chunk from the API
              for await (const chunk of completion) {
                chunkCount++;
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                  const encoded = encoder.encode(`data: ${JSON.stringify({ content })}\n\n`);
                  controller.enqueue(encoded);
                  if (chunkCount % 10 === 0) {
                    console.log(`Streamed ${chunkCount} chunks so far`);
                  }
                }
              }

              // End the stream
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              console.log(`Streaming completed, sent ${chunkCount} total chunks`);
              controller.close();
            } catch (error) {
              console.error('Error in stream processing:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`));
              controller.close();
            }
          },
        });

        console.log('Returning streaming response with proper headers');
        
        // Return the stream response with explicit content type
        const responseHeaders = {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',  // Disable Nginx buffering
          ...corsHeaders(),
        };
        
        console.log('Response headers:', responseHeaders);
        
        return new Response(stream, {
          headers: responseHeaders
        });
      } catch (streamError) {
        console.error('Critical streaming error:', streamError);
        // If streaming fails at any point, fall back to regular response
        console.log('Falling back to regular response due to streaming error');
      }
    } else {
      // For non-streaming responses or when ReadableStream is not available
      const reasonMsg = !stream 
        ? 'Client requested non-streaming response'
        : !typeof ReadableStream !== 'undefined'
          ? 'ReadableStream not available'
          : 'TextEncoder not available';
      
      console.log(`Using non-streaming response: ${reasonMsg}`);
    }
    
    // If we got here, use non-streaming response (either by choice or fallback)
    console.log('Generating non-streaming response from OpenAI');
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

    // Return response with CORS headers and explicit content type
    return NextResponse.json({
      message: response.choices[0].message.content,
    }, { 
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders() 
      }
    });
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