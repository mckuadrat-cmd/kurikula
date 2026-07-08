import { createBrowserRouter } from "react-router";
import { lazy } from "react";

const Root = lazy(() => import("./pages/Root"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Attendance = lazy(() => import("./pages/Attendance"));
const StudentData = lazy(() => import("./pages/StudentData"));
const Assessment = lazy(() => import("./pages/Assessment"));
const AILessonPlanner = lazy(() => import("./pages/AILessonPlanner"));
const AITeachingMaterials = lazy(() => import("./pages/AITeachingMaterials"));
const SemesterPlanner = lazy(() => import("./pages/SemesterPlanner"));
const Administration = lazy(() => import("./pages/Administration"));
const Billing = lazy(() => import("./pages/Billing"));
const Settings = lazy(() => import("./pages/Settings"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SchoolAdmin = lazy(() => import("./pages/SchoolAdmin"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazy(() => import("./pages/PaymentFailed"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AIChatPage = lazy(() => import("./pages/AIChatPage"));

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
    path: "/reset-password",
    Component: ResetPassword,
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
      { path: "ai-chat", Component: AIChatPage },
    ],
  },
]);
