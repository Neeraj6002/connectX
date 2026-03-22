import { useEffect, useState } from "react";
import {
  doc, onSnapshot, updateDoc, getDoc,
  arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { UserCheck, Clock, Users } from "lucide-react";

function Avatar({ name, photoURL, size = 48 }) {
  return (
    <img
      src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=7c3aed&color=fff&size=128`}
      alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

function StatCard({ count, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      flex: 1, background: "#fff", borderRadius: 16, padding: "20px 16px",
      border: active ? "2px solid #7c3aed" : "1px solid #f1f5f9",
      textAlign: "center", cursor: "pointer", transition: "all .15s",
      boxShadow: active ? "0 0 0 4px #f5f3ff" : "none",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: active ? "#7c3aed" : "#0f172a" }}>{count}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Tab({ label, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "9px 18px", borderRadius: 10, border: "none",
      background: active ? "#f5f3ff" : "transparent",
      color: active ? "#7c3aed" : "#64748b",
      fontWeight: active ? 700 : 500, fontSize: 14,
      cursor: "pointer", transition: "all .15s",
    }}>
      <Icon size={16} />{label}
    </button>
  );
}

function UserCard({ user, tab, onAccept, onDecline, onUnfollow, onRemove, loading }) {
  const name = user.displayName || user.email?.split("@")[0] || "User";
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "18px 20px",
      border: "1px solid #f1f5f9", display: "flex", alignItems: "center",
      gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,.04)",
    }}>
      <Avatar name={name} photoURL={user.photoURL} size={50} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: user.skills?.length ? 6 : 0 }}>
          @{user.username || user.email?.split("@")[0] || "user"}
        </div>
        {user.skills?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {user.skills.slice(0, 3).map((s, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f5f3ff", color: "#7c3aed", fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
        {tab === "pending" && <>
          <button onClick={() => onAccept(user)} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>{loading ? "…" : "Accept"}</button>
          <button onClick={() => onDecline(user)} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0",
            background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>Decline</button>
        </>}
        {tab === "following" && (
          <button onClick={() => onUnfollow(user)} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid #fee2e2",
            background: "#fff", color: "#dc2626", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>{loading ? "…" : "Unfollow"}</button>
        )}
        {tab === "followers" && (
          <button onClick={() => onRemove(user)} disabled={loading} style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0",
            background: "#fff", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>{loading ? "…" : "Remove"}</button>
        )}
        {tab === "connections" && (
          <span style={{
            padding: "8px 16px", borderRadius: 10,
            background: "#f5f3ff", color: "#7c3aed", fontWeight: 700, fontSize: 13,
          }}>Connected</span>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const { currentUser } = useAuth();
  const [myProfile, setMyProfile]   = useState(null);
  const [tab, setTab]               = useState("following");
  const [userCache, setUserCache]   = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  /* ── Live-listen to MY profile doc ── */
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "profile", currentUser.uid), snap => {
      if (snap.exists()) setMyProfile({ uid: snap.id, ...snap.data() });
    });
    return unsub;
  }, [currentUser]);

  /* ── Fetch profile details for all UIDs in my lists ── */
  useEffect(() => {
    if (!myProfile) return;
    const allUids = [
      ...(myProfile.followers   || []),
      ...(myProfile.following   || []),
      ...(myProfile.pendingIn   || []),
      ...(myProfile.connections || []),
    ];
    const missing = [...new Set(allUids)].filter(uid => !userCache[uid]);
    if (!missing.length) return;

    missing.forEach(async uid => {
      try {
        const snap = await getDoc(doc(db, "profile", uid));
        const data = snap.exists() ? snap.data() : {};
        setUserCache(prev => ({
          ...prev,
          [uid]: {
            uid,
            displayName: data.displayName || data.email?.split("@")[0] || "User",
            username:    data.username    || "",
            email:       data.email       || "",
            photoURL:    data.photoURL    || null,
            skills:      data.skills      || [],
            bio:         data.bio         || "",
          }
        }));
      } catch (e) { console.error("fetch user error", e); }
    });
  }, [myProfile]);

  const setLoading = (uid, val) => setLoadingMap(m => ({ ...m, [uid]: val }));
  const upd = (uid, data) => updateDoc(doc(db, "profile", uid), data);

  const accept = async (user) => {
    setLoading(user.uid, true);
    try {
      await upd(currentUser.uid, { pendingIn: arrayRemove(user.uid), followers: arrayUnion(user.uid), connections: arrayUnion(user.uid) });
      await upd(user.uid, { pendingOut: arrayRemove(currentUser.uid), following: arrayUnion(currentUser.uid), connections: arrayUnion(currentUser.uid) });
    } finally { setLoading(user.uid, false); }
  };

  const decline = async (user) => {
    setLoading(user.uid, true);
    try {
      await upd(currentUser.uid, { pendingIn: arrayRemove(user.uid) });
      await upd(user.uid, { pendingOut: arrayRemove(currentUser.uid) });
    } finally { setLoading(user.uid, false); }
  };

  const unfollow = async (user) => {
    setLoading(user.uid, true);
    try {
      await upd(currentUser.uid, { following: arrayRemove(user.uid), connections: arrayRemove(user.uid) });
      await upd(user.uid, { followers: arrayRemove(currentUser.uid), connections: arrayRemove(currentUser.uid) });
    } finally { setLoading(user.uid, false); }
  };

  const removeFollower = async (user) => {
    setLoading(user.uid, true);
    try {
      await upd(currentUser.uid, { followers: arrayRemove(user.uid), connections: arrayRemove(user.uid) });
      await upd(user.uid, { following: arrayRemove(currentUser.uid), connections: arrayRemove(currentUser.uid) });
    } finally { setLoading(user.uid, false); }
  };

  const followerIds   = myProfile?.followers   || [];
  const followingIds  = myProfile?.following   || [];
  const pendingIds    = myProfile?.pendingIn   || [];
  const connectionIds = myProfile?.connections || [];

  const lists = {
    followers:   followerIds.map(uid => userCache[uid]).filter(Boolean),
    following:   followingIds.map(uid => userCache[uid]).filter(Boolean),
    pending:     pendingIds.map(uid => userCache[uid]).filter(Boolean),
    connections: connectionIds.map(uid => userCache[uid]).filter(Boolean),
  };

  const tabs = [
    { key: "followers",   label: "Followers",   icon: Users },
    { key: "following",   label: "Following",   icon: UserCheck },
    { key: "pending",     label: "Pending",     icon: Clock },
    { key: "connections", label: "Connections", icon: UserCheck },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f172a" }}>Connections</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>Manage your network and discover new connections</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        {[
          { key: "followers",   count: followerIds.length },
          { key: "following",   count: followingIds.length },
          { key: "pending",     count: pendingIds.length },
          { key: "connections", count: connectionIds.length },
        ].map(({ key, count }) => (
          <StatCard key={key} count={count}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            active={tab === key} onClick={() => setTab(key)}
          />
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f8fafc", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {tabs.map(t => <Tab key={t.key} label={t.label} icon={t.icon} active={tab === t.key} onClick={() => setTab(t.key)} />)}
      </div>

      {/* List */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {lists[tab].length === 0 ? (
          <div style={{
            gridColumn: "1 / -1", textAlign: "center", padding: "60px 40px",
            background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
          }}>
            <Users size={36} style={{ color: "#c4b5fd", marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>No {tab} yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              {tab === "followers"   && "Nobody has followed you yet."}
              {tab === "following"   && "You haven't followed anyone yet — go to Discover!"}
              {tab === "pending"     && "No pending requests."}
              {tab === "connections" && "No mutual connections yet."}
            </div>
          </div>
        ) : lists[tab].map(user => (
          <UserCard
            key={user.uid}
            user={user}
            tab={tab}
            loading={loadingMap[user.uid]}
            onAccept={accept}
            onDecline={decline}
            onUnfollow={unfollow}
            onRemove={removeFollower}
          />
        ))}
      </div>
    </div>
  );
}