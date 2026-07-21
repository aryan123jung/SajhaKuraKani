import { getCurrentUser } from "@/lib/api/auth";
import { getAuthToken } from "@/lib/cookie";
import { getCsrfToken } from "@/lib/csrf";
import { redirect } from "next/navigation";
import Navbar from "./_components/navbar";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAuthToken();
  const csrfToken = await getCsrfToken();
  let user = null;
  let sessionMessage: string | null = null;

  if (token) {
    try {
      const response = await getCurrentUser();
      user = response.data;
      if (user.role === "admin") {
        redirect("/admin");
      }
    } catch (error) {
      sessionMessage =
        error instanceof Error
          ? error.message
          : "Unable to load your account right now.";
    }
  }

  return (
    <Navbar csrfToken={csrfToken} user={user} sessionMessage={sessionMessage}>
      {children}
    </Navbar>
  );
}
