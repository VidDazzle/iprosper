import { NextRequest, NextResponse } from 'next/server';

// Types for request validation
interface NewsletterSignupData {
  name: string;
  email: string;
  phone: string;
}

interface ValidationError {
  field: string;
  message: string;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format with optional + and allowing spaces, dashes, parentheses)
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

// Validation functions
function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function validatePhone(phone: string): boolean {
  // Remove all spaces, dashes, and parentheses for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return PHONE_REGEX.test(cleanPhone) && cleanPhone.length >= 7 && cleanPhone.length <= 16;
}

function validateName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

// Sanitization function
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>\"'&]/g, '');
}

// Main validation function
function validateSignupData(data: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  // Check if required fields exist
  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required and must be a string' });
  } else if (!validateName(data.name)) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required and must be a string' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!data.phone || typeof data.phone !== 'string') {
    errors.push({ field: 'phone', message: 'Phone number is required and must be a string' });
  } else if (!validatePhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Please provide a valid phone number (7-16 digits)' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Rate limiting (simple in-memory store - use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(ip);

  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientData.count++;
  rateLimitStore.set(ip, clientData);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    // Rate limiting
    const xff = request.headers.get('x-forwarded-for');
    const clientIP = (xff ? xff.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Parse JSON body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate input data
    const validation = validateSignupData(requestData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Please check the provided information',
          details: validation.errors
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sanitize the data
    const sanitizedData: NewsletterSignupData = {
      name: sanitizeInput(requestData.name),
      email: sanitizeInput(requestData.email.toLowerCase()),
      phone: sanitizeInput(requestData.phone)
    };

    // Log the signup data (replace with actual database storage in production)
    console.log('Newsletter Signup:', {
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: request.headers.get('user-agent'),
      data: sanitizedData
    });

    // Simulate processing time (remove in production)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to newsletter',
        data: {
          email: sanitizedData.email,
          subscribed_at: new Date().toISOString()
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    // Log server errors
    console.error('Newsletter signup error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      },
      { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      }
    }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      }
    }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      }
    }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      }
    }
  );
}