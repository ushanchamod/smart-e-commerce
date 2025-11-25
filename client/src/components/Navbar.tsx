import { useState } from "react";
import Cart from "./Cart";
import { NavLink } from "react-router-dom";

function Navbar() {
  const [cartOpen, setCartOpen] = useState(false);

  const closeCart = () => {
    setCartOpen(false);
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-blue-600 font-semibold hover:text-blue-800"
      : "text-gray-600 hover:text-gray-800";

  const NavLinkList = [
    { to: "/", label: "All Products" },
    { to: "/orders", label: "Orders" },
  ];
  return (
    <>
      <nav className="bg-white shadow-md w-full fixed top-0 left-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">E-Shop</h2>

          <div>
            {NavLinkList.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                <span className="mx-4">{link.label}</span>
              </NavLink>
            ))}
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="text-lg font-medium text-gray-600 flex items-center"
          >
            <span className="mr-2 text-xl">🛒</span>
            Cart (0)
          </button>
        </div>
      </nav>

      {cartOpen && (
        <div className="fixed right-0 h-full w-full top-0 z-51 flex justify-end backdrop-blur-sm bg-black/30">
          <div className=" w-80 shadow-lg">
            <Cart closeCart={closeCart} />
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
