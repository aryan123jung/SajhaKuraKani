import RequestResetPasswordForm from "../_components/RequestResetPasswordForm";
import { getCsrfToken } from "@/lib/csrf";

export default async function RequestResetPasswordPage() {
  const csrfToken = await getCsrfToken();

  return <RequestResetPasswordForm csrfToken={csrfToken} />;
}
