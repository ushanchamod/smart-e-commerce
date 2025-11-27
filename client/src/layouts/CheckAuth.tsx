import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/userAuthStore";

const CheckAuth = () => {
  const user = useAuthStore((s) => s.user);
  if (!user?.id) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default CheckAuth;
