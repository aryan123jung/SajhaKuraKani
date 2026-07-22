import { redirect, unstable_rethrow } from "next/navigation";
import AdminShell from "./_components/AdminShell";
import { getCurrentUser } from "@/lib/api/auth";
import { getAuthToken } from "@/lib/cookie";
import { getCsrfToken } from "@/lib/csrf";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = await getAuthToken();

  if (!token) {
    redirect("/login");
  }

  const csrfToken = await getCsrfToken();

  try {
    const response = await getCurrentUser();
    const user = response.data;

    if (user.role !== "admin") {
      redirect("/user/home");
    }

    return (
      <AdminShell csrfToken={csrfToken} user={user}>
        {children}
      </AdminShell>
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect("/login");
  }
}
