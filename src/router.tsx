import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Tetap coba request saat offline: service worker bisa menjawab dari salinan terakhir.
        networkMode: "offlineFirst",
        retry: (failureCount) => (typeof navigator !== "undefined" && !navigator.onLine ? false : failureCount < 3),
      },
      // Simpan/ubah data tidak boleh antre diam-diam saat offline; langsung gagal dan tampilkan error.
      mutations: { networkMode: "always" },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
