import { Outlet } from "react-router-dom";
import Chat from "../components/chat/Chat";

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-100 w-full">
      <main className="bg-amber-100 w-full">
        <Outlet />
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <Chat />
      </div>
    </div>
  );
};

export default AuthLayout;
