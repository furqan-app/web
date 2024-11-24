import { NextMiddlewareResult } from "next/dist/server/web/types";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

export type CustomMiddleware = (
  req: NextRequest,
  event: NextFetchEvent,
  resp: NextResponse
) => NextMiddlewareResult | Promise<NextMiddlewareResult>;

export type MiddlewareWrapper = (
  middleware: CustomMiddleware
) => CustomMiddleware;

const recursivePipe = (
  middlewareWrappers: MiddlewareWrapper[],
  index = 0
): CustomMiddleware => {
  const wrapper = middlewareWrappers[index];
  if (wrapper) {
    const next = recursivePipe(middlewareWrappers, index + 1);
    return wrapper(next);
  }
  return (req: NextRequest, event: NextFetchEvent, response: NextResponse) =>
    response;
};

export const pipeMiddlewares = (middlewareWrappers: MiddlewareWrapper[]) => {
  return recursivePipe(middlewareWrappers);
};

