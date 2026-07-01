import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import StudentData from "./pages/StudentData";
import Assessment from "./pages/Assessment";
import AILessonPlanner from "./pages/AILessonPlanner";
import AITeachingMaterials from "./pages/AITeachingMaterials";
import SemesterPlanner from "./pages/SemesterPlanner";
import Administration from "./pages/Administration";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import SchoolAdmin from "./pages/SchoolAdmin";
import LandingPage from "./pages/LandingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import TermsOfService from "./pages/TermsOfService";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    path: "/privacy-policy",
    Component: PrivacyPolicy,
  },
  {
    path: "/terms-of-service",
    Component: TermsOfService,
  },
  {
    path: "/payment/success",
    Component: PaymentSuccess,
  },
  {
    path: "/payment/failed",
    Component: PaymentFailed,
  },
  {
    Component: Root,
    children: [
      { path: "dashboard", Component: Dashboard },
      { path: "attendance", Component: Attendance },
      { path: "students", Component: StudentData },
      { path: "assessment", Component: Assessment },
      { path: "ai-planner", Component: AILessonPlanner },
      { path: "ai-materials", Component: AITeachingMaterials },
      { path: "semester-planner", Component: SemesterPlanner },
      { path: "administration", Component: Administration },
      { path: "billing", Component: Billing },
      { path: "settings", Component: Settings },
      { path: "admin", Component: SuperAdmin },
      { path: "school-admin", Component: SchoolAdmin },
    ],
  },
]);