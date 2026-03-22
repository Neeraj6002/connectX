import { useEffect, useState } from "react";
import {
  collection, onSnapshot, doc, updateDoc, setDoc,
  arrayUnion, arrayRemove, getDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { Search, MapPin, Users, UserPlus, UserCheck, MessageCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Avatar({ name, photoURL, size = 48 }) {
  return (
    <img
      src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=7c3aed&color=fff&size=128`}
      alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #f5f3ff" }}
    />
  );
}

function UserCard({ user, isFollowing, onFollow, onUnfollow, onMessage }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const name = user.displayName || user.email?.split("@")[0] || "User";

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) await onUnfollow(user);
      else await onFollow(user);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14,
      border: "1px solid #f1f5f9",
      boxShadow: "0 2px 8px rgba(0,0,0,.05)",
      overflow: "hidden", transition: "box-shadow .2s, transform .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,58,237,.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* top accent strip */}
      <div style={{
        height: 5,
        background: isFollowing ? "linear-gradient(90deg,#7c3aed,#a855f7)" : "#f1f5f9",
        transition: "background .3s",
      }} />

      <div style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={name} photoURL={user.photoURL} size={48} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* name row + buttons */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                @{user.username || user.email?.split("@")[0] || "user"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 5, flexShrink: 0, marginTop: 2 }}>
              <button
                onClick={handleToggle}
                disabled={loading}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: isFollowing ? "1px solid #c4b5fd" : "none",
                  background: isFollowing ? "#f5f3ff" : "linear-gradient(135deg,#7c3aed,#a855f7)",
                  color: isFollowing ? "#7c3aed" : "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  opacity: loading ? 0.6 : 1, whiteSpace: "nowrap",
                  transition: "all .2s",
                }}
              >
                {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                {loading ? "…" : isFollowing ? "Following" : "Follow"}
              </button>
              <button
                onClick={() => navigate(`/user/${user.uid}`)}
                title="View profile"
                style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.color = "#7c3aed"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#64748b"; }}
              ><ExternalLink size={13} /></button>
              <button
                onClick={() => onMessage(user)}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: "1px solid #e2e8f0", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#64748b", transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.color = "#7c3aed"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#64748b"; }}
              ><MessageCircle size={13} /></button>
            </div>
          </div>

          {/* roles */}
          {user.roles?.length > 0 && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>
              {user.roles.map((r, i) => (
                <span key={i}>
                  {r === "Dreamer" ? "🌍" : r === "Learner" ? "📚" : r === "Mentor" ? "🎓" : r === "Creator" ? "🎨" : "✏️"} {r}
                  {i < user.roles.length - 1 ? "  " : ""}
                </span>
              ))}
            </div>
          )}

          {/* bio */}
          {user.bio && (
            <div style={{
              fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.5,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{user.bio}</div>
          )}

          {/* skills */}
          {user.skills?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {user.skills.slice(0, 3).map((s, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 20,
                  background: "#f5f3ff", color: "#7c3aed", fontWeight: 600,
                }}>{s}</span>
              ))}
            </div>
          )}

          {/* location + followers */}
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {user.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#94a3b8" }}>
                <MapPin size={10} /> {user.location}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#94a3b8" }}>
              <Users size={10} /> {(user.followers || []).length} followers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ensure profile doc has array fields before arrayUnion ── */
async function ensureProfileArrays(uid) {
  const ref = doc(db, "profile", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const needs = {};
  if (!Array.isArray(data.followers))   needs.followers   = [];
  if (!Array.isArray(data.following))   needs.following   = [];
  if (!Array.isArray(data.connections)) needs.connections = [];
  if (Object.keys(needs).length) await updateDoc(ref, needs);
}

export default function DiscoverPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profiles, setProfiles]     = useState({});
  const [myProfile, setMyProfile]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");

  /* ── Live listen — ALL profiles ── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "profile"),
      snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { uid: d.id, ...d.data() }; });
        setProfiles(map);
        setLoading(false);
      },
      err => { console.error("Firestore error:", err.code, err.message); setLoading(false); }
    );
    return unsub;
  }, []);

  /* ── Live listen — my own profile for follow state ── */
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "profile", currentUser.uid), snap => {
      if (snap.exists()) setMyProfile({ uid: snap.id, ...snap.data() });
    });
    return unsub;
  }, [currentUser]);

  /* all users except self */
  const allUsers = Object.values(profiles).filter(u => u.uid !== currentUser?.uid);

  /* search filter */
  const filtered = search.trim()
    ? allUsers.filter(u => {
        const q = search.toLowerCase();
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.bio?.toLowerCase().includes(q) ||
          u.location?.toLowerCase().includes(q) ||
          u.skills?.some(s => s.toLowerCase().includes(q))
        );
      })
    : allUsers;

  const isFollowing = uid => (myProfile?.following || []).includes(uid);

  /* ── FOLLOW ── */
  const follow = async (user) => {
    if (!currentUser) return;
    try {
      // make sure array fields exist on both docs
      await ensureProfileArrays(currentUser.uid);
      await ensureProfileArrays(user.uid);

      // my profile: add to following[]
      await updateDoc(doc(db, "profile", currentUser.uid), {
        following: arrayUnion(user.uid),
      });

      // their profile: add to followers[]
      await updateDoc(doc(db, "profile", user.uid), {
        followers: arrayUnion(currentUser.uid),
      });

      // if they also follow me → mutual connection
      if ((profiles[user.uid]?.following || []).includes(currentUser.uid)) {
        await updateDoc(doc(db, "profile", currentUser.uid), { connections: arrayUnion(user.uid) });
        await updateDoc(doc(db, "profile", user.uid),        { connections: arrayUnion(currentUser.uid) });
      }
    } catch (err) {
      console.error("Follow error:", err.code, err.message);
    }
  };

  /* ── UNFOLLOW ── */
  const unfollow = async (user) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "profile", currentUser.uid), {
        following:   arrayRemove(user.uid),
        connections: arrayRemove(user.uid),
      });
      await updateDoc(doc(db, "profile", user.uid), {
        followers:   arrayRemove(currentUser.uid),
        connections: arrayRemove(currentUser.uid),
      });
    } catch (err) {
      console.error("Unfollow error:", err.code, err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "28px 0" }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a" }}>Discover People</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          Connect with amazing people and grow your network
        </p>
      </div>

      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "#fff", borderRadius: 14, padding: "13px 20px",
        border: "1px solid #e2e8f0", marginBottom: 28,
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}>
        <Search size={18} color="#94a3b8" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, username, email, skill, or location…"
          style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "#0f172a", background: "transparent" }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20 }}>×</button>
        )}
      </div>

      {search.trim() && (
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              background: "#fff", borderRadius: 14, padding: "14px 16px",
              border: "1px solid #f1f5f9", display: "flex", gap: 12,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f1f5f9", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 13, background: "#f1f5f9", borderRadius: 4, width: "50%", marginBottom: 8 }} />
                <div style={{ height: 11, background: "#f1f5f9", borderRadius: 4, width: "35%", marginBottom: 8 }} />
                <div style={{ height: 10, background: "#f1f5f9", borderRadius: 4, width: "80%" }} />
              </div>
            </div>
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 40px",
          background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
        }}>
          <Search size={36} style={{ color: "#c4b5fd", marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>
            {search ? "No people found" : "No other users yet"}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            {search
              ? "Try a different name, username, skill, or email"
              : "Other users will appear here once they sign up"}
          </div>
        </div>

      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map(user => (
            <UserCard
              key={user.uid}
              user={user}
              isFollowing={isFollowing(user.uid)}
              onFollow={follow}
              onUnfollow={unfollow}
              onMessage={u => navigate("/messages", { state: { startWith: u } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}