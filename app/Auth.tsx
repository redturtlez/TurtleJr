"use client";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";

export default function Auth() {
  const user = useUser();
  return (
    <div className="m-auto flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">{user.isSignedIn && <span>Logged in as {user.user.username}</span>}</p>
      <div className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20">
        {!user.isSignedIn && <SignInButton />}
        {user.isSignedIn && <SignOutButton />}
      </div>
    </div>
  );
}
