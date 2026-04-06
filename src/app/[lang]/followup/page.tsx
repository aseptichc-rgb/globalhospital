import { redirect } from "next/navigation";

export default async function FollowUpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // Follow-up is now integrated into the consultation chat.
  // Redirect to summary if someone navigates here directly.
  redirect(`/${lang}/summary`);
}
