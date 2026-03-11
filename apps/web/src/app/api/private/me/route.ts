import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const GET = auth(async function GET(req) {
  if (!req.auth?.user) {
    return NextResponse.json(
      { message: "Unauthenticated" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: req.auth.user,
  });
});
