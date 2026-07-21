import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api/auth";
import { getAuthToken } from "@/lib/cookie";

export default async function Home() {
  const token = await getAuthToken();

  if (!token) {
    redirect("/user/home");
  }

  try {
    const response = await getCurrentUser();
    redirect(response.data.role === "admin" ? "/admin" : "/user/home");
  } catch {
    redirect("/user/home");
  }
}
