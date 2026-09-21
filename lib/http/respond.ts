import { NextResponse } from 'next/server';

export function ok<T>(data: T, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status: 200, headers });
}

export function created<T>(data: T, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status: 201, headers });
}

export function noContent(headers?: HeadersInit) {
  return new NextResponse(null, { status: 204, headers });
}

export function fail(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status, headers }
  );
}
