import { NavLink, useNavigate } from "react-router-dom";
import { Home, MessageCircle, Users, Compass, User, PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase-config";

const navItems = [
  { to: "/feed",        Icon: Home,          label: "Feed" },
  { to: "/messages",    Icon: MessageCircle, label: "Messages" },
  { to: "/connections", Icon: Users,         label: "Connections" },
  { to: "/discover",    Icon: Compass,       label: "Discover" },
  { to: "/profile",     Icon: User,          label: "Profile" },
];

export default function Sidebar({ onCreatePost }) {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <aside style={{
      width: 260, minHeight: "100vh",
      background: "#fff", borderRight: "1px solid #f1f5f9",
      display: "flex", flexDirection: "column",
      padding: "24px 16px",
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "0 8px" }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: 18,
        }}>C</div>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
          Connect<span style={{ color: "#7c3aed" }}>X</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 16px", borderRadius: 12, marginBottom: 4,
            textDecoration: "none",
            background: isActive ? "#f5f3ff" : "transparent",
            color: isActive ? "#7c3aed" : "#475569",
            fontWeight: isActive ? 700 : 500,
            fontSize: 15, transition: "all .15s",
          })}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Create Post */}
      <button onClick={onCreatePost} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "13px 0",
        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
        color: "#fff", border: "none", borderRadius: 14,
        fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 16,
        boxShadow: "0 4px 16px rgba(124,58,237,.35)",
      }}>
        <PlusCircle size={18} /> Create Post
      </button>

      {/* User + Logout */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginTop: 20, padding: "10px 10px",
        borderRadius: 12, background: "#f8fafc",
      }}>
        <img
          src={
            userProfile?.photoURL ||
            currentUser?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || currentUser?.displayName || "U")}&background=7c3aed&color=fff`
          }
          alt="me"
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {userProfile?.displayName || currentUser?.displayName || "User"}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            @{userProfile?.username || "user"}
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Log out"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            border: "1px solid #e2e8f0", background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#94a3b8", transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}