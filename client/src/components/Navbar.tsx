interface NavbarProps {
  cartCount: number;
}

function Navbar({ cartCount }: NavbarProps) {
  return (
    <nav className="bg-white shadow-md w-full">
      <div className="container mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">E-Shop</h2>
        <span className="text-lg font-medium text-gray-600 flex items-center">
          <span className="mr-2 text-xl">🛒</span>
          Cart ({cartCount})
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
