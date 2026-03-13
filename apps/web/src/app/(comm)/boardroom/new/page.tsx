import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewMeetingForm from "./NewMeetingForm";

export default async function NewMeetingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <NewMeetingForm
      defaultChairId={session.user.id}
    />
  );
}
