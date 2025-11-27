import { useState } from "react";
import { useAxios } from "../../service/useAxios";
import { useMutation } from "@tanstack/react-query";

export default function Login() {
  const { fetchData } = useAxios();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    try {
      const response = await fetchData<{
        content: { token: string };
      }>("/auth/login", "POST", {
        email,
        password,
      });
      console.log(response.content.token);

      localStorage.setItem("token", response.content.token);

      return response.content;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const { mutate: handleSubmit, isPending: loading } = useMutation({
    mutationFn: login,
    onSuccess: () => {
      document.location.href = "/";
    },
    onError: (error) => {
      alert("Login failed. Please check your credentials and try again.");
      console.error("Login error:", error);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-gray-800 text-center">
          Sign in
        </h1>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <label className="block">
            <span className="text-xs text-gray-600">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="you@example.com"
              required
              aria-label="Email"
            />
          </label>

          <label className="block mt-4">
            <span className="text-xs text-gray-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
              required
              aria-label="Password"
            />
          </label>

          <button
            type="submit"
            className="mt-6 w-full py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don\'t have an account?{" "}
          <a href="#" className="text-indigo-600 hover:underline">
            Create one
          </a>
        </div>
      </div>
    </div>
  );
}
