import { NextResponse } from 'next/server';

// Set the hardcoded credentials - in a real application, you would use a database
// and proper password hashing
const VALID_USERNAME = 'w4seem';
const VALID_PASSWORD = 'alien1979';

export async function POST(request: Request) {
  try {
    // Get login credentials from request
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check credentials - in a real app, this would be a database lookup
    // and password comparison using bcrypt or similar
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Success - return a token or user info
      // In a real implementation, you'd generate a JWT or similar secure token
      return NextResponse.json({
        success: true,
        user: {
          username,
          role: 'admin'
        }
      });
    } else {
      // Invalid credentials
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 