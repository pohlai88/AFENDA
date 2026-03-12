import { redirect } from "next/navigation";

import { auth } from "@/auth";

/** Session depends on cookies — force dynamic (Neon Auth). */
export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div>
      Welcome, {session.user.email}
    </div>
  );
}
