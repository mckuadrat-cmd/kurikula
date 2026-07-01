import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "../contexts/AuthContext";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
        <Toaster />
      </WorkspaceProvider>
    </AuthProvider>
  );
}