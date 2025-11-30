import { useState, useEffect } from "react";
import Cart from "./Cart";
import { useUI } from "../lib/uiContext";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, Store } from "lucide-react";
import { useAuthStore } from "../store/userAuthStore";
import { useAxios } from "../service/useAxios";

const NAV_LINKS = [
  { to: "/", label: "All Products" },
  { to: "/orders", label: "Orders" },
];

function Navbar() {
  const { fetchData } = useAxios();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { cartOpen, setCartOpen } = useUI();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const cartItemCount = 0;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (cartOpen || mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [cartOpen, mobileMenuOpen]);

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 w-full z-40">
        <div className="container mx-auto max-w-7xl px-4 h-16 flex justify-between items-center">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg group-hover:bg-indigo-700 transition">
              <Store size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              E-Shop
            </h2>
          </NavLink>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={getNavLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user?.id && (
              <button
                onClick={() => {
                  if (!user?.id) {
                    return navigate("/auth/login");
                  }
                  setCartOpen(true);
                }}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors group"
                aria-label="Open Cart"
              >
                <ShoppingCart
                  size={22}
                  className="group-hover:text-indigo-600 transition-colors"
                />
                {cartItemCount > 0 ? (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full border-2 border-white">
                    {cartItemCount}
                  </span>
                ) : (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )}

            {!user?.id ? (
              <NavLink
                to="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Login
              </NavLink>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await fetchData("/auth/logout", "POST");
                    localStorage.removeItem("token");
                    localStorage.removeItem("chat_session_id");
                    useAuthStore.getState().logout();
                  } catch (err) {
                    console.error("Logout failed", err);
                    alert("Logout failed. Please try again.");
                  }
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Logout
              </button>
            )}

            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-lg py-4 px-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-base font-medium ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setCartOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <Cart closeCart={() => setCartOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-16" />
    </>
  );
}

export default Navbar;
