import { getAdminPosts } from "@/lib/api/admin";
import { getCsrfToken } from "@/lib/csrf";
import AdminPageHeader from "../_components/AdminPageHeader";
import AdminPagination from "../_components/AdminPagination";
import AdminPostsTable from "../_components/AdminPostsTable";
import AdminReauthPanel from "../_components/AdminReauthPanel";

type AdminPostsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function AdminPostsPage({ searchParams }: AdminPostsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const search = params.search?.trim() || undefined;
  const csrfToken = await getCsrfToken();
  const response = await getAdminPosts({
    page,
    size: 12,
    search,
  });
  const posts = response.data.data;
  const pagination = response.data.pagination;
  const hiddenCount = posts.filter((post) => post.hiddenByAdmin).length;
  const mediaCount = posts.reduce((sum, post) => sum + post.media.length, 0);

  return (
    <div className="space-y-4">
      <AdminReauthPanel csrfToken={csrfToken} />

      <AdminPageHeader
        eyebrow="Posts"
        title="Review published posts in a separate moderation queue"
        description="Browse post cards page by page, open the full post in a popup, and remove unsafe content without mixing it into the users panel."
        stats={[
          { label: "Loaded", value: posts.length },
          { label: "Total matches", value: pagination.total },
          { label: "Hidden in page", value: hiddenCount },
          { label: "Media items", value: mediaCount },
        ]}
      />

      <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
        <form action="/admin/posts" className="mt-4 flex flex-wrap gap-3">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by title, caption, username, or name"
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

      <AdminPostsTable csrfToken={csrfToken} posts={posts} />
      <AdminPagination
        basePath="/admin/posts"
        page={pagination.page}
        size={pagination.size}
        total={pagination.total}
        query={{ search }}
      />
    </div>
  );
}
