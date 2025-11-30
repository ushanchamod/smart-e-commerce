import { useEffect } from "react";
import { useAuthStore } from "./store/userAuthStore";
import { useAxios } from "./service/useAxios";

export function AuthInitializer() {
  const { fetchData, error } = useAxios();
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const resMe = (await fetchData("/auth/me", "GET")) as {
          content: { data: { userId: number } };
        };

        if (!resMe || error) {
          throw new Error("Failed to fetch user data");
        }

        setUser({
          id: resMe?.content.data.userId,
        });
      } catch (error: unknown) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return null;
}
