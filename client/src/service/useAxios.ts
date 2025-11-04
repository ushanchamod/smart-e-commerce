import axios from "axios";
import { useState } from "react";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL!,
  headers: {
    "Content-Type": "application/json",
  },
});

const useAxios = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (
    url: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    data?: unknown
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await instance.request({
        url,
        method,
        data,
      });
      return response.data;
    } catch (error) {
      console.error("API request error:", error);
      setError("Failed to fetch data");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, fetchData };
};

export default useAxios;
