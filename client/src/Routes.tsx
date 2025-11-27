import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProductsPage from "./pages/Product-list/ProductsPage";
import { ProductDetails } from "./pages/one-product/ProductDetails";
import AuthLayout from "./layouts/AuthLayout";
import Login from "./pages/login/Login";
import ConfirmOrder from "./pages/confirm-order/ConfirmOrder";
import Order from "./pages/order-page/Order";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "",
        element: <ProductsPage />,
      },
      {
        path: "product/:id",
        element: <ProductDetails />,
      },
      {
        path: "orders",
        element: <Order />,
      },
      {
        path: "confirm-orders",
        element: <ConfirmOrder />,
      },
    ],
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <div>Register Page</div>,
      },
    ],
  },
]);

const Routes = () => {
  return <RouterProvider router={browserRouter} />;
};

export default Routes;
