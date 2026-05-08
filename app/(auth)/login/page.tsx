import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/elmar-logo.png"
            alt="Elmar Services"
            width={200}
            height={56}
            priority
            className="h-12 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Log in om door te gaan
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
