import LoginForm from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-ocean-50 via-sand-50 to-sand-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-600 text-white shadow-card">
            <WaveIcon />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ocean-950">Beach Kids</h1>
          <p className="mt-1 text-sm text-ocean-600">ERO Self-Audit Portal</p>
        </div>

        <div className="card p-6">
          <LoginForm next={searchParams?.next ?? "/dashboard"} />
        </div>

        <p className="mt-6 text-center text-xs text-ocean-500">
          Private management system. Not for public access.
        </p>
      </div>
    </main>
  );
}

function WaveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 15c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0 3.5-1.5 5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M2 9c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0 3.5-1.5 5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
