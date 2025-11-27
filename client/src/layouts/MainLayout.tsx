import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Chat from "../components/chat/Chat";
import { UIProvider, useUI } from "../lib/uiContext";

const MainLayout = () => {
  return (
    <UIProvider>
      <MainLayoutContent />
    </UIProvider>
  );
};

const MainLayoutContent = () => {
  const { cartOpen } = useUI();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* FIXED NAVBAR */}
      <Navbar />

      {/* PAGE CONTENT */}
      <main className="container mx-auto max-w-7xl px-4 lg:px-8 pt-5 pb-10">
        <Outlet />
      </main>

      {/* FIXED CHAT WIDGET (BOTTOM RIGHT) - hidden when cart is open */}
      {!cartOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Chat />
        </div>
      )}
    </div>
  );
};

export default MainLayout;
