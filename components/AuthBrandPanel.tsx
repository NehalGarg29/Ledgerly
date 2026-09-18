const FEATURES = [
  {
    title: "Automated matching",
    body: "Fuzzy-matches bank transactions to GL entries with confidence scoring.",
  },
  {
    title: "Exception review",
    body: "A clear queue for anything that needs a human decision, with full reasoning captured.",
  },
  {
    title: "Audit-ready evidence",
    body: "Every approval, rejection, and override is recorded — nothing can be silently changed.",
  },
];

export default function AuthBrandPanel() {
  return (
    <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-teal-900 md:flex">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-700/50 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-teal-950/60 blur-3xl" />
      <div className="absolute right-16 top-24 h-40 w-40 rounded-full bg-emerald-500/20 blur-2xl" />

      <div className="relative flex w-full max-w-xl flex-col items-center gap-10 px-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-white text-4xl font-bold text-teal-800 shadow-lg shadow-black/20">
            L
          </span>
          <span className="text-4xl font-bold tracking-tight text-white">Ledgerly</span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Treasury Reconciliation
          </p>
          <h1 className="mt-3 whitespace-nowrap text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Reconcile with <span className="text-emerald-300">confidence.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-teal-100">
            Automated bank-to-GL reconciliation, exception review, and audit-ready evidence —
            all in one place.
          </p>
        </div>

        <div className="w-full space-y-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-start gap-4 text-left">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-900/30">
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10.5l3.5 3.5L16 5.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-lg font-semibold text-white">{feature.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-teal-100/75">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
