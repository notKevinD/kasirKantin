import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4efe2] px-5 text-[#24351f]">
      <section className="w-full max-w-md rounded-[8px] border border-[#d6c9aa] bg-[#fffdf5] p-6 shadow-sm">
        <div className="mb-6 text-center">
          <Image
            src="/joyful-logo.svg"
            alt="Joyful Healthy Bistro & Cafe"
            width={108}
            height={108}
            priority
            className="mx-auto rounded-full"
          />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#6c7b43]">
            Joyful POS
          </p>
          <h1 className="text-2xl font-black">Login Kasir</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
