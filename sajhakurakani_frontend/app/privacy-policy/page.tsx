import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SajhaKuraKani",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_100%)] px-6 py-12 text-[#1d243f]">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-[#edd8cb] bg-white/88 p-8 shadow-[0_20px_50px_rgba(128,84,53,0.08)] sm:p-10">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#ef744b]">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-[2.4rem] font-semibold tracking-[-0.05em]">
          Your data stays yours.
        </h1>
        <p className="mt-4 max-w-3xl text-[1rem] leading-7 text-[#60697d]">
          SajhaKuraKani is designed around user control, secure identity, and
          safer social sharing. This page summarizes the privacy commitments
          currently implemented in the platform.
        </p>

        <section className="mt-8 space-y-5">
          <div>
            <h2 className="text-[1.2rem] font-semibold">What we collect</h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#60697d]">
              We store only the data required to operate your account, protect
              your sessions, and deliver the features you choose to use.
            </p>
          </div>

          <div>
            <h2 className="text-[1.2rem] font-semibold">How your posts are protected</h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#60697d]">
              Post text is encrypted at rest, uploads go through type validation
              and security checks, and visibility settings control who can view
              protected content.
            </p>
          </div>

          <div>
            <h2 className="text-[1.2rem] font-semibold">Your deletion rights</h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#60697d]">
              You can delete individual posts, and the backend also supports
              deleting all of your posts for privacy and data-removal requests.
            </p>
          </div>

          <div>
            <h2 className="text-[1.2rem] font-semibold">Data sharing</h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#60697d]">
              SajhaKuraKani does not sell user data. Data is used only to run
              the application, apply security protections, and investigate abuse.
            </p>
          </div>

          <div>
            <h2 className="text-[1.2rem] font-semibold">Safety and abuse handling</h2>
            <p className="mt-2 text-[0.96rem] leading-7 text-[#60697d]">
              We log important post actions, allow users to report harmful
              content, and apply moderation and anti-spam protections to reduce
              abuse.
            </p>
          </div>
        </section>

        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex rounded-full bg-[linear-gradient(135deg,#f68155_0%,#ef744b_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(241,111,56,0.18)]"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
