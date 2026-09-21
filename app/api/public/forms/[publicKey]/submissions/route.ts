import { NextResponse } from 'next/server';
import { db } from '@/lib/db/prisma';
import { processFormSubmissionActions } from '@/lib/forms/actions';

// Simple in-memory rate limiting map per publicKey (60 submissions per minute max)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(publicKey: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(publicKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(publicKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(
  req: Request,
  { params }: { params: { publicKey: string } }
) {
  try {
    const { publicKey } = params;

    if (!publicKey) {
      return NextResponse.json(
        { error: { code: 'INVALID_KEY', message: 'Form public key is required.' } },
        { status: 400 }
      );
    }

    // 1. Look up form by publicKey
    const form = await db.form.findUnique({
      where: { publicKey },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: { code: 'FORM_NOT_FOUND', message: 'Form not found or inactive.' } },
        { status: 404 }
      );
    }

    // 2. Parse request payload (supports JSON or multipart/urlencoded form data)
    let rawBody: Record<string, any> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      rawBody = await req.json();
    } else if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        rawBody[key] = val;
      });
    } else {
      try {
        rawBody = await req.json();
      } catch {
        rawBody = {};
      }
    }

    // 3. Honeypot check: reject spam silently
    if (rawBody._hp_company || rawBody._honeypot || rawBody.company_fax) {
      // Return success 200 without creating any DB rows
      return NextResponse.json({
        data: {
          success: true,
          message: form.successMessage || 'Thank you for your submission.',
          redirectUrl: form.redirectUrl || null,
        },
      });
    }

    // 4. Rate limiting check
    if (!checkRateLimit(publicKey)) {
      return NextResponse.json(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many submissions. Please try again in a few moments.' } },
        { status: 429 }
      );
    }

    // 5. Server-side required fields validation
    const missingRequired: string[] = [];
    for (const field of form.fields) {
      if (field.required) {
        const fieldKey = field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const altKey = field.label;
        const val = rawBody[fieldKey] ?? rawBody[altKey];
        if (val === undefined || val === null || String(val).trim() === '') {
          missingRequired.push(field.label);
        }
      }
    }

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: `Please fill in all required fields: ${missingRequired.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // 6. Store FormSubmission with unmodified raw payload
    const submission = await db.formSubmission.create({
      data: {
        formId: form.id,
        rawPayload: JSON.stringify(rawBody),
      },
    });

    // 7. Process enabled actions (Create Lead, Send Email, etc.)
    const actionResult = await processFormSubmissionActions(form, submission.id, rawBody);

    return NextResponse.json({
      data: {
        success: true,
        submissionId: submission.id,
        leadId: actionResult.leadId,
        message: actionResult.successMessage,
        redirectUrl: actionResult.redirectUrl,
      },
    });
  } catch (err: any) {
    console.error('[Public Form Submission Error]:', err);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred while processing your submission.' } },
      { status: 500 }
    );
  }
}
