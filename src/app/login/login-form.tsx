"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setIsLoading(false);

    if (!response.ok) {
      setError("Username atau password salah.");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form onSubmit={submitLogin} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[#68705c]">
          Username
        </span>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-[#68705c]">
          Password
        </span>
        <input
          value={password}
          type="password"
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="h-12 w-full rounded-[8px] border border-[#d6c9aa] bg-white px-3 outline-none"
        />
      </label>
      {error && (
        <p className="rounded-[8px] bg-[#f5ded5] px-3 py-2 text-sm font-bold text-[#a13f28]">
          {error}
        </p>
      )}
      <button
        disabled={isLoading}
        className="h-12 w-full rounded-[8px] bg-[#28451f] font-black text-white disabled:opacity-60"
      >
        {isLoading ? "Memeriksa..." : "Masuk"}
      </button>
      <p className="text-center text-xs font-bold text-[#68705c]">
        Default awal: admin / admin123
      </p>
    </form>
  );
}
