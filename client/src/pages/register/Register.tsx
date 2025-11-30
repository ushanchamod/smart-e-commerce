import { useState } from "react";
import { useAxios } from "../../service/useAxios";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const { fetchData } = useAxios();
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const register = async () => {
    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match.");
      throw new Error("Passwords do not match");
    }

    if (!data.firstName || !data.email || !data.password) {
      alert("Please fill in all required fields.");
      throw new Error("Missing required fields");
    }

    try {
      const response = await fetchData<{
        content: { token: string };
      }>("/auth/register", "POST", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName || "",
        confirmPassword: data.confirmPassword,
      });

      return response.content;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const { mutate: handleSubmit, isPending: loading } = useMutation({
    mutationFn: register,
    onSuccess: () => {
      navigate("/auth/login");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      alert(error?.response.data.message || error);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-semibold text-gray-800 text-center">
          Create an account
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
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="you@example.com"
              required
              aria-label="Email"
            />
          </label>

          <label className="block mt-4">
            <span className="text-xs text-gray-600">First Name</span>
            <input
              type="text"
              value={data.firstName}
              onChange={(e) => setData({ ...data, firstName: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="First Name"
              required
              aria-label="First Name"
            />
          </label>

          <label className="block mt-4">
            <span className="text-xs text-gray-600">Password</span>
            <input
              type="password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
              required
              aria-label="Password"
            />
          </label>

          <label className="block mt-4">
            <span className="text-xs text-gray-600">Confirm Password</span>
            <input
              type="password"
              value={data.confirmPassword}
              onChange={(e) =>
                setData({ ...data, confirmPassword: e.target.value })
              }
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
            {loading ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
