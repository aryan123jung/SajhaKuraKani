// import Image from "next/image";
// import type { ReactNode } from "react";

// type AuthShellProps = {
//   eyebrow: string;
//   title: string;
//   description: string;
//   children: ReactNode;
//   footer?: ReactNode;
//   width?: "narrow" | "wide";
// };

// export default function AuthShell({
//   eyebrow,
//   title,
//   description,
//   children,
//   footer,
//   width = "wide",
// }: AuthShellProps) {
//   return (
//     <div className="auth-page">
//       <div className="auth-page-logo">
//         <Image
//           src="/brand/logo.svg"
//           alt="SajhaKuraKani"
//           width={220}
//           height={62}
//           className="auth-brand-logo auth-page-logo-image"
//           priority
//         />
//       </div>

//       <div className="auth-stage">
//         <section className="auth-brand-panel">
//           <div className="auth-brand-inner">
//             <div className="auth-brand-body">
//               <div className="auth-brand-copy">
//                 <p className="auth-brand-kicker">Private by design</p>
//                 <h1 className="auth-brand-heading">
//                   Safer conversations,
//                   <br />
//                   designed with identity in mind.
//                 </h1>
//                 <p className="auth-brand-description">
//                   A lighter, calmer entry point for a community platform that
//                   treats identity, privacy, and trust as part of the product.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="auth-form-area">
//           <div className="auth-form-shell" data-width={width}>
//             <div className="auth-form-card">
//               <p className="auth-form-eyebrow">{eyebrow}</p>
//               <h1 className="auth-form-title">{title}</h1>
//               <p className="auth-form-description">{description}</p>

//               <div className="auth-form-grid">{children}</div>

//               {footer ? <div className="auth-divider">{footer}</div> : null}
//             </div>
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }


import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "narrow" | "wide";
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  width = "wide",
}: AuthShellProps) {
  return (
    <div className="auth-page">
      {/* Separate logo header */}
      <header className="auth-header">
        <div className="auth-header-container">
          <Link
            href="/"
            className="auth-header-logo-link"
            aria-label="Go to SajhaKuraKani homepage"
          >
            <Image
              src="/brand/logo.svg"
              alt="SajhaKuraKani"
              width={80}
              height={20}
              className="auth-header-logo"
              priority
            />
          </Link>
        </div>
      </header>

      <main className="auth-stage">
        <section className="auth-brand-panel">
          <div className="auth-brand-inner">
            <div className="auth-brand-body">
              <div className="auth-brand-copy">
                <p className="auth-brand-kicker">Private by design</p>

                <h1 className="auth-brand-heading">
                  Safer conversations,
                  <br />
                  designed with identity in mind.
                </h1>

                <p className="auth-brand-description">
                  A lighter, calmer entry point for a community platform that
                  treats identity, privacy, and trust as part of the product.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-area">
          <div className="auth-form-shell" data-width={width}>
            <div className="auth-form-card">
              <p className="auth-form-eyebrow">{eyebrow}</p>

              <h1 className="auth-form-title">{title}</h1>

              <p className="auth-form-description">{description}</p>

              <div className="auth-form-grid">{children}</div>

              {footer ? <div className="auth-divider">{footer}</div> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}