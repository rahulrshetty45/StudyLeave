import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const modelName = process.env.MODEL_NAME || 'gpt-4o';

if (!openaiApiKey) {
  console.error('Missing OpenAI API key in environment variables');
}

const openai = new OpenAI({
  apiKey: openaiApiKey || '',
});
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const { messages, stream = false } = await request.json();

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

    if (stream && typeof ReadableStream !== 'undefined') {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const completion = await openai.chat.completions.create({
              model: modelName,
              messages,
              temperature: isNotesGeneration ? 0.5 : 0.7,
              max_tokens: isNotesGeneration ? 2500 : 1000,
              stream: true,
            });

            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                await new Promise(resolve => setTimeout(resolve, 5));
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Error in stream processing:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream processing error' })}\n\n`));
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Transfer-Encoding': 'chunked',
          ...corsHeaders(),
        },
              });
    } else {
      const reasonMsg = stream ? 'ReadableStream not available' : 'Streaming not requested';
      console.log(`${reasonMsg}, falling back to non-streaming response`);
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages,
        temperature: isNotesGeneration ? 0.5 : 0.7,
        max_tokens: isNotesGeneration ? 2500 : 1000,
      });

      console.log('OpenAI response received:', {
        responseLength: response.choices[0].message.content?.length || 0,
        model: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens
      });

      return NextResponse.json({
        message: response.choices[0].message.content,
      }, { headers: corsHeaders() });
    }
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });
    
    if (error?.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Authentication error with OpenAI API' },
        { status: 401, headers: corsHeaders() }
      );
    }
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