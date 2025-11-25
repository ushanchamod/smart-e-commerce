import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProductsPage from "./pages/Product-list/ProductsPage";
import { ProductDetails } from "./pages/one-product/ProductDetails";

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
        path: "orders",
        element: <div>Orders Page</div>,
      },
      {
        path: "product/:id",
        element: <ProductDetails />,
      },
    ],
  },
]);

const Routes = () => {
  return <RouterProvider router={browserRouter} />;
};

export default Routes;
