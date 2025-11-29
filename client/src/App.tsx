import { AuthInitializer } from "./AuthInitializer";
import Routes from "./Routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <Routes />
    </QueryClientProvider>
  );
};

export default App;
