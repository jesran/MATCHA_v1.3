import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import IdeaEvaluatorPage from "./pages/IdeaEvaluatorPage";
import LegacyLibraryPage from "./pages/LegacyLibraryPage";
import MyProjectsPage from "./pages/MyProjectsPage";
import ProfileWorkspacePage from "./pages/ProfileWorkspacePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import TeamMatcherPage from "./pages/TeamMatcherPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/legacy-library" element={<LegacyLibraryPage />} />
        <Route path="/my-projects" element={<MyProjectsPage />} />
        <Route path="/idea-evaluator" element={<IdeaEvaluatorPage />} />
        <Route path="/team-matcher" element={<TeamMatcherPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/profile" element={<ProfileWorkspacePage />} />
        <Route path="/profiles/:userId" element={<PublicProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
