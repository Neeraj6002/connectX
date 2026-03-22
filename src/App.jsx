import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./pages/layout";
import FeedPage from "./pages/feed";
import MessagesPage from "./pages/Message";
import ConnectionsPage from "./pages/connections";
import DiscoverPage from "./pages/discover";
import ProfilePage from "./pages/profile";
import LoginPage from "./pages/login";
import UserProfilePage from "./pages/UserProfile";

/* Redirect to /login if not logged in */
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

/* Redirect to /feed if already logged in */
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/feed" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login — only accessible when NOT logged in */}
        <Route
          path="/login"
          element={<PublicRoute><LoginPage /></PublicRoute>}
        />

        {/* All app pages — only accessible when logged in */}
        <Route
          path="/"
          element={<PrivateRoute><Layout /></PrivateRoute>}
        >
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="feed"        element={<FeedPage />} />
          <Route path="messages"    element={<MessagesPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="discover"    element={<DiscoverPage />} />
          <Route path="profile"     element={<ProfilePage />} />
          <Route path="user/:uid"   element={<UserProfilePage />} />
        </Route>

        {/* Any unknown route → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}