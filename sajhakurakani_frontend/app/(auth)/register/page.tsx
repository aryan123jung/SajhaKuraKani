import RegisterForm from "../_components/RegisterForm";
import { getCsrfToken } from "@/lib/csrf";

export default async function RegisterPage() {
  const csrfToken = await getCsrfToken();

  return <RegisterForm csrfToken={csrfToken} />;
}
