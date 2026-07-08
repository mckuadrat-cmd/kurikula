import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "../contexts/AuthContext";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";

function AppLoading() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#F0EAC6] border-t-[#3C405B] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-600">Memuat Kurikula...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Suspense fallback={<AppLoading />}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
