import { redirect } from "next/navigation";

type SettingsRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SettingsRedirectPage({
  searchParams,
}: SettingsRedirectPageProps) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      nextParams.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
    }
  }

  const query = nextParams.toString();
  redirect(query ? `/user/settings?${query}` : "/user/settings");
}
