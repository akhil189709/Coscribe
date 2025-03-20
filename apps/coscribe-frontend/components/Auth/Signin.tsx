"use client";

import { useMutation } from "@tanstack/react-query";
import Input, { PasswordInput } from "@repo/ui/input";
import { useState } from "react";
import { signInUser } from "@/api/auth";
import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { HashLoader } from "react-spinners";
import toast from "react-hot-toast";

export function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: signInUser,
    onSuccess: (data) => {
      toast.success("User Signed in Successfully");
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    },
    onError: (err) => {
      setEmail("");
      setPassword("");
      toast.error(err.message || "Sign in failed");
    },
  });

  const handleSignup = (e) => {
    e.preventDefault();
    mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm sm:max-w-md bg-gray-100 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Sign in to your account</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to sketch ideas together on CoScribe.
            </p>
          </div>
          <Link href="/" className="text-gray-600 hover:text-gray-800">
            <X size={20} />
          </Link>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            title="Email address"
            placeholder="Enter your email"
            required
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
          <PasswordInput
            title="Password"
            placeholder="Enter your password"
            required
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />

          <div className="pt-2">
            <Button
              text={
                isPending ? (
                  <div className="flex justify-center">
                    <HashLoader color="#4A5568" size={20} />
                  </div>
                ) : (
                  "Sign in"
                )
              }
              type="submit"
              disabled={isPending}
            />
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Create an account? {" "}
            <Link
              href="/signup"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}