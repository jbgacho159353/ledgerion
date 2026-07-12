import Image from "next/image";
import Link from "next/link";

export default function SignupPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md animate-fade-up p-8 text-center">
        <Image src="/lion-logo.png" alt="Ledgerion" width={72} height={72} className="mx-auto h-[72px] w-[72px] object-contain" />
        <div className="mt-3 text-4xl">⏳</div>
        <h1 className="mt-4 font-sans text-2xl font-semibold text-white">Account created</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your account is pending approval. You&apos;ll be notified once an admin approves your access.
        </p>
        <Link href="/login" className="btn-secondary mt-6 inline-flex">
          Back to login
        </Link>
      </div>
    </main>
  );
}
