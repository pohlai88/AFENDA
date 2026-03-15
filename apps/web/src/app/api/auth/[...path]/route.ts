import { neonServerAuthHandler } from "@/lib/auth/server";

type AuthRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function authUnavailable(): Response {
  return Response.json(
    {
      error: {
        code: "NEON_AUTH_NOT_CONFIGURED",
        message: "Neon Auth server SDK is not configured.",
      },
    },
    { status: 503 },
  );
}

export async function GET(request: Request, context: AuthRouteContext): Promise<Response> {
  if (!neonServerAuthHandler) {
    return authUnavailable();
  }

  return neonServerAuthHandler.GET(request, context);
}

export async function POST(request: Request, context: AuthRouteContext): Promise<Response> {
  if (!neonServerAuthHandler) {
    return authUnavailable();
  }

  return neonServerAuthHandler.POST(request, context);
}

export async function PUT(request: Request, context: AuthRouteContext): Promise<Response> {
  if (!neonServerAuthHandler) {
    return authUnavailable();
  }

  return neonServerAuthHandler.PUT(request, context);
}

export async function DELETE(request: Request, context: AuthRouteContext): Promise<Response> {
  if (!neonServerAuthHandler) {
    return authUnavailable();
  }

  return neonServerAuthHandler.DELETE(request, context);
}

export async function PATCH(request: Request, context: AuthRouteContext): Promise<Response> {
  if (!neonServerAuthHandler) {
    return authUnavailable();
  }

  return neonServerAuthHandler.PATCH(request, context);
}

