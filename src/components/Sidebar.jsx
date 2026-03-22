import { NavLink } from "react-router-dom";
import {
  Home, MessageCircle, Users, Compass, User, PlusCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/feed", icon: Home, label: "Feed" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/connections", icon: Users, label: "Connections" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function Sidebar({ onCreatePost }) {
  const { userProfile, currentUser } = useAuth();

  return (
    <aside style={{
      width: 260,
      minHeight: "100vh",
      background: "#fff",
      borderRight: "1px solid #f1f5f9",
      display: "flex",
      flexDirection: "column",
      padding: "24px 16px",
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 32, padding: "0 8px",
      }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: 18,
        }}>C</div>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
          Connect<span style={{ color: "#7c3aed" }}>X</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px", borderRadius: 12, marginBottom: 4,
              textDecoration: "none",
              background: isActive ? "#f5f3ff" : "transparent",
              color: isActive ? "#7c3aed" : "#475569",
              fontWeight: isActive ? 700 : 500,
              fontSize: 15,
              transition: "all .15s",
            })}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Create Post button */}
      <button
        onClick={onCreatePost}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "13px 0",
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          color: "#fff",
          border: "none", borderRadius: 14,
          fontWeight: 700, fontSize: 15,
          cursor: "pointer",
          marginTop: 16,
          boxShadow: "0 4px 16px rgba(124,58,237,.35)",
          transition: "transform .15s, box-shadow .15s",
        }}
      >
        <PlusCircle size={18} />
        Create Post
      </button>

      {/* User avatar at bottom */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginTop: 20, padding: "12px 10px",
        borderRadius: 12, background: "#f8fafc",
      }}>
        <img
          src={
            userProfile?.photoURL ||
            currentUser?.photoURL ||
            `https://ui-avatars.com/api/?name=${userProfile?.displayName || "U"}&background=7c3aed&color=fff`
          }
          alt="me"
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {userProfile?.displayName || currentUser?.displayName || "User"}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            @{userProfile?.username || "user"}
          </div>
        </div>
      </div>
    </aside>
  );
}