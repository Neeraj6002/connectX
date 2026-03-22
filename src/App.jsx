import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./pages/layout";
import FeedPage from "./pages/feed";
import MessagesPage from "./pages/Message";
import ConnectionsPage from "./pages/connections";
import DiscoverPage from "./pages/discover";
import ProfilePage from "./pages/profile";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
