import Link from "next/link";

type HeaderAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: HeaderAction[];
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
};

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions = [],
  stats = [],
}: AdminPageHeaderProps) {
  return (
    <section className="rounded-[24px] border border-[#ead6ca] bg-white/92 p-5 shadow-[0_18px_42px_rgba(88,57,38,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1d243f]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6a7282]">{description}</p>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={
                  action.tone === "primary"
                    ? "rounded-[14px] bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(241,111,56,0.18)]"
                    : "rounded-[14px] border border-[#ead6ca] bg-[#fff8f3] px-4 py-2.5 text-sm font-semibold text-[#526077]"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[18px] border border-[#efe2d9] bg-[#fffaf6] px-4 py-3"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8c8690]">
                {stat.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#1d243f]">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
