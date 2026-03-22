import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import CreatePostModal from "../components/CreatePostModal";

export default function Layout() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar onCreatePost={() => setShowCreate(true)} />

      {/* Main content offset for fixed sidebar */}
      <div style={{ marginLeft: 260, flex: 1, padding: "0 32px" }}>
        <Outlet />
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}