import axios from "axios";
import { useCallback, useState } from "react";

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL!,
});

export const useAxios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async <T>(
      url: string,
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      data?: unknown
    ): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const response = await instance.request<T>({
          url,
          method,
          data,
        });
        return response.data;
      } catch (err) {
        console.error("API request error:", err);
        setError("Failed to fetch data");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, fetchData };
};
