import Link from "next/link";

type QueryValue = string | number | undefined;

type AdminPaginationProps = {
  basePath: string;
  page: number;
  size: number;
  total: number;
  query?: Record<string, QueryValue>;
};

const buildHref = (
  basePath: string,
  page: number,
  query: Record<string, QueryValue> = {}
) => {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && `${value}`.trim() !== "") {
      searchParams.set(key, String(value));
    }
  });

  searchParams.set("page", String(page));
  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export default function AdminPagination({
  basePath,
  page,
  size,
  total,
  query = {},
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * size + 1;
  const end = total === 0 ? 0 : Math.min(safePage * size, total);

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = Array.from(
    new Set(
      [1, safePage - 1, safePage, safePage + 1, totalPages].filter(
        (value) => value >= 1 && value <= totalPages
      )
    )
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#ead6ca] bg-white/92 px-4 py-3 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
      <p className="text-sm text-[#6a7282]">
        Showing <span className="font-semibold text-[#1d243f]">{start}</span> to{" "}
        <span className="font-semibold text-[#1d243f]">{end}</span> of{" "}
        <span className="font-semibold text-[#1d243f]">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(basePath, Math.max(1, safePage - 1), query)}
          aria-disabled={safePage === 1}
          className={`rounded-[12px] px-3 py-2 text-sm font-semibold transition ${
            safePage === 1
              ? "pointer-events-none border border-[#f0e5dd] bg-[#fbf7f3] text-[#b4adb6]"
              : "border border-[#ead6ca] bg-[#fff8f3] text-[#526077]"
          }`}
        >
          Previous
        </Link>

        {pageNumbers.map((pageNumber, index) => {
          const previous = pageNumbers[index - 1];
          const showGap = previous && pageNumber - previous > 1;

          return (
            <div key={pageNumber} className="flex items-center gap-2">
              {showGap ? <span className="px-1 text-sm text-[#8c8690]">…</span> : null}
              <Link
                href={buildHref(basePath, pageNumber, query)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-[12px] px-3 text-sm font-semibold transition ${
                  pageNumber === safePage
                    ? "bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)]"
                    : "border border-[#ead6ca] bg-[#fff8f3] text-[#526077]"
                }`}
              >
                {pageNumber}
              </Link>
            </div>
          );
        })}

        <Link
          href={buildHref(basePath, Math.min(totalPages, safePage + 1), query)}
          aria-disabled={safePage === totalPages}
          className={`rounded-[12px] px-3 py-2 text-sm font-semibold transition ${
            safePage === totalPages
              ? "pointer-events-none border border-[#f0e5dd] bg-[#fbf7f3] text-[#b4adb6]"
              : "border border-[#ead6ca] bg-[#fff8f3] text-[#526077]"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
