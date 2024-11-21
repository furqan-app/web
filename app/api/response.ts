import { NextResponse } from "next/server";

export type ApiResponse<T> = {
  data?: T | null;
  error?: unknown | null;
  code?: number;
  message?: string;
};

export const jsonResponse = <T>({
  data = null,
  code = 200,
  error = null,
  message = undefined,
}: ApiResponse<T>) => {
  return NextResponse.json({
    data,
    success: code >= 200 && code < 300,
    error,
    code,
    message,
  });
};

