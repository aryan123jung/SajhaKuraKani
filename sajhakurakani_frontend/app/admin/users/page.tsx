import { getAdminUsers } from "@/lib/api/admin";
import { getCsrfToken } from "@/lib/csrf";
import AdminReauthPanel from "../_components/AdminReauthPanel";
import AdminUsersTable from "../_components/AdminUsersTable";

type AdminUsersPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const search = params.search?.trim() || undefined;
  const csrfToken = await getCsrfToken();
  const response = await getAdminUsers({
    page,
    size: 20,
    search,
  });

  return (
    <div className="space-y-4">
      <AdminReauthPanel csrfToken={csrfToken} />

      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Users
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
          Search and control user accounts
        </h2>
        <form action="/admin/users" className="mt-4 flex flex-wrap gap-3">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by name or username"
            className="min-w-[280px] flex-1 rounded-[14px] border border-[#ead9ce] bg-[#fffdfa] px-4 py-3 text-sm text-[#1d243f] outline-none placeholder:text-[#ada4ad]"
          />
          <button
            type="submit"
            className="rounded-[14px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)]"
          >
            Search
          </button>
        </form>
      </section>

      <AdminUsersTable csrfToken={csrfToken} users={response.data.data} />
    </div>
  );
}
