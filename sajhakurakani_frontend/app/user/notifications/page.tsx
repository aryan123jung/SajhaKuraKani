export default function UserNotificationsPage() {
  return (
    <div className="rounded-[24px] border border-[#edd8cb] bg-white/84 p-6 shadow-[0_18px_42px_rgba(128,84,53,0.07)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#ef744b]">
        Notifications
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#1d243f]">
        Alerts and activity will live here.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7080] sm:text-base">
        This page is ready for mentions, friend requests, security alerts, and
        community updates once we start wiring the real data.
      </p>
    </div>
  );
}
