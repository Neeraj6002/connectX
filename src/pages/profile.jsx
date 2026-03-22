import { useEffect, useRef, useState } from "react";
import {
  doc, onSnapshot, setDoc, collection,
  query, where, orderBy, getDocs, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { BadgeCheck, MapPin, Calendar, Pencil, Camera, X, Plus } from "lucide-react";
import PostCard from "../components/PostCard";

function timeAgo(ts) {
  if (!ts) return "recently";
  const diff = Date.now() - ts.toMillis();
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(diff / 2592000000);
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days >= 1)   return `${days} day${days > 1 ? "s" : ""} ago`;
  return "today";
}

/* ── Edit Modal ── */
function EditModal({ profile, onClose, onSave }) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    username:    profile.username    || "",
    bio:         profile.bio         || "",
    location:    profile.location    || "",
    website:     profile.website     || "",
    roles:       profile.roles       || [],
    skills:      profile.skills      || [],
  });
  const [avatarFile, setAvatarFile]     = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.photoURL || null);
  const [coverFile, setCoverFile]       = useState(null);
  const [coverPreview, setCoverPreview]   = useState(profile.coverURL || null);
  const [newSkill, setNewSkill]         = useState("");
  const [saving, setSaving]             = useState(false);
  const avatarRef = useRef();
  const coverRef  = useRef();

  const ROLES = ["Dreamer", "Learner", "Doer", "Mentor", "Creator"];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRole = r =>
    set("roles", form.roles.includes(r) ? form.roles.filter(x => x !== r) : [...form.roles, r]);

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !form.skills.includes(s)) set("skills", [...form.skills, s]);
    setNewSkill("");
  };

  const pickFile = (e, type) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (type === "avatar") { setAvatarFile(f); setAvatarPreview(url); }
    else                   { setCoverFile(f);  setCoverPreview(url);  }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoURL = profile.photoURL || null;
      let coverURL = profile.coverURL || null;

      if (avatarFile) {
        const r = ref(storage, `avatars/${currentUser.uid}_avatar`);
        await uploadBytes(r, avatarFile);
        photoURL = await getDownloadURL(r);
      }
      if (coverFile) {
        const r = ref(storage, `avatars/${currentUser.uid}_cover`);
        await uploadBytes(r, coverFile);
        coverURL = await getDownloadURL(r);
      }

      // save to "profile" collection
      await setDoc(doc(db, "profile", currentUser.uid), {
        ...form,
        photoURL,
        coverURL,
        uid: currentUser.uid,
        email: currentUser.email,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
      zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: 560, maxWidth: "100%",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 80px rgba(0,0,0,.2)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9",
          position: "sticky", top: 0, background: "#fff", zIndex: 10,
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Edit Profile</h3>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}><X size={16} /></button>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          {/* Cover */}
          <div style={{ position: "relative", marginBottom: 52, marginTop: 12 }}>
            <div
              onClick={() => coverRef.current.click()}
              style={{
                height: 130, borderRadius: 14, overflow: "hidden", cursor: "pointer",
                background: coverPreview
                  ? `url(${coverPreview}) center/cover`
                  : "linear-gradient(135deg, #c7d2fe, #fbc2eb)",
              }}
            />
            <button onClick={() => coverRef.current.click()} style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,.45)", border: "none", borderRadius: 8,
              padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}><Camera size={13} /> Change cover</button>
            <input ref={coverRef} type="file" accept="image/*" onChange={e => pickFile(e, "cover")} style={{ display: "none" }} />

            <div style={{ position: "absolute", bottom: -40, left: 20 }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName || "U")}&background=7c3aed&color=fff&size=128`}
                  alt="avatar"
                  style={{ width: 76, height: 76, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover" }}
                />
                <button onClick={() => avatarRef.current.click()} style={{
                  position: "absolute", bottom: 0, right: 0,
                  background: "#7c3aed", border: "2px solid #fff", borderRadius: "50%",
                  width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}><Camera size={12} color="#fff" /></button>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={e => pickFile(e, "avatar")} style={{ display: "none" }} />
            </div>
          </div>

          {/* Text fields */}
          {[
            { label: "Display name", key: "displayName", placeholder: "Your full name" },
            { label: "Username",     key: "username",    placeholder: "your_username" },
            { label: "Location",     key: "location",    placeholder: "City, Country" },
            { label: "Website",      key: "website",     placeholder: "https://yoursite.com" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              <input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
                  outline: "none", boxSizing: "border-box", background: "#f8fafc",
                }}
              />
            </div>
          ))}

          {/* Bio */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Bio</label>
            <textarea
              value={form.bio}
              onChange={e => set("bio", e.target.value)}
              placeholder="Tell the world about yourself…"
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
                outline: "none", resize: "none", fontFamily: "inherit",
                boxSizing: "border-box", background: "#f8fafc",
              }}
            />
          </div>

          {/* Roles */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Roles</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => toggleRole(r)} style={{
                  padding: "6px 16px", borderRadius: 20, fontSize: 13,
                  border: form.roles.includes(r) ? "none" : "1px solid #e2e8f0",
                  background: form.roles.includes(r) ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#fff",
                  color: form.roles.includes(r) ? "#fff" : "#64748b",
                  fontWeight: 600, cursor: "pointer", transition: "all .15s",
                }}>{r}</button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Skills</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter…"
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 10,
                  border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
                  background: "#f8fafc", color: "#0f172a",
                }}
              />
              <button onClick={addSkill} style={{
                padding: "9px 16px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                color: "#fff", fontWeight: 700, cursor: "pointer",
              }}><Plus size={16} /></button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {form.skills.map((s, i) => (
                <span key={i} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#f5f3ff", color: "#7c3aed", fontWeight: 600,
                  fontSize: 12, padding: "4px 12px", borderRadius: 20,
                }}>
                  {s}
                  <button onClick={() => set("skills", form.skills.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a855f7", display: "flex" }}
                  ><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: saving ? "#e2e8f0" : "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: saving ? "#94a3b8" : "#fff",
              fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer",
            }}
          >{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Profile Page ── */
export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile]       = useState(null);
  const [posts, setPosts]           = useState([]);
  const [showEdit, setShowEdit]     = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);

  /* Build a default profile from currentUser so it NEVER shows "Loading" */
  const defaultProfile = {
    displayName: currentUser?.displayName || "User",
    username:    "",
    bio:         "",
    location:    "",
    website:     "",
    coverURL:    null,
    photoURL:    currentUser?.photoURL || null,
    roles:       [],
    skills:      [],
    followers:   [],
    following:   [],
    createdAt:   null,
  };

  /* Live-listen to "profile" collection */
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "profile", currentUser.uid), snap => {
      if (snap.exists()) {
        setProfile({ uid: snap.id, ...snap.data() });
      } else {
        // doc doesn't exist yet — show default immediately
        setProfile(defaultProfile);
      }
    });
    return unsub;
  }, [currentUser]);

  /* Load user's posts */
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "posts"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) {}
      setPostsLoading(false);
    };
    load();
  }, [currentUser]);

  /* Always render — use profile if loaded, otherwise defaultProfile */
  const p = profile || defaultProfile;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 0 60px" }}>

      {/* Profile card */}
      <div style={{
        background: "#fff", borderRadius: 20,
        border: "1px solid #f1f5f9",
        boxShadow: "0 4px 24px rgba(0,0,0,.06)",
        marginBottom: 24, overflow: "hidden",
      }}>
        {/* Cover */}
        <div style={{
          width: "100%", height: 200,
          background: p.coverURL
            ? `url(${p.coverURL}) center/cover no-repeat`
            : "linear-gradient(135deg, #c7d2fe 0%, #e0c3fc 50%, #fbc2eb 100%)",
        }} />

        {/* Info */}
        <div style={{ padding: "0 28px 24px", position: "relative" }}>
          {/* Avatar */}
          <div style={{
            position: "absolute", top: -52,
            width: 100, height: 100, borderRadius: "50%",
            border: "4px solid #fff", overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
          }}>
            <img
              src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName || "U")}&background=7c3aed&color=fff&size=200`}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Edit button */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12 }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 20px", borderRadius: 12,
                border: "1px solid #e2e8f0", background: "#fff",
                color: "#0f172a", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            ><Pencil size={15} /> Edit</button>
          </div>

          <div style={{ marginTop: 44 }}>
            {/* Name */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
                {p.displayName || "Your Name"}
              </span>
              <BadgeCheck size={20} style={{ color: "#7c3aed" }} />
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 12 }}>
              @{p.username || "username"}
            </div>

            {/* Roles + bio */}
            {(p.roles?.length > 0 || p.bio) && (
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 14 }}>
                {p.roles?.map((r, i) => (
                  <span key={i}>
                    {r === "Dreamer" ? "🌍" : r === "Learner" ? "📚" : r === "Mentor" ? "🎓" : r === "Creator" ? "🎨" : "✏️"} {r}
                    {i < p.roles.length - 1 ? " | " : " "}
                  </span>
                ))}
                {p.bio}
              </div>
            )}

            {/* Empty state hint */}
            {!p.bio && p.roles?.length === 0 && (
              <div style={{
                fontSize: 14, color: "#94a3b8", fontStyle: "italic",
                marginBottom: 14, padding: "12px 16px",
                background: "#f8fafc", borderRadius: 10,
                border: "1px dashed #e2e8f0",
              }}>
                No bio yet — click <strong>Edit</strong> to fill in your profile!
              </div>
            )}

            {/* Location + joined */}
            <div style={{ display: "flex", gap: 20, marginBottom: p.skills?.length ? 16 : 20, flexWrap: "wrap" }}>
              {p.location && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#64748b" }}>
                  <MapPin size={14} /> {p.location}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#64748b" }}>
                <Calendar size={14} /> Joined {p.createdAt ? timeAgo(p.createdAt) : "recently"}
              </span>
              {p.website && (
                <a href={p.website} target="_blank" rel="noreferrer"
                  style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>
                  🔗 {p.website.replace(/https?:\/\//, "")}
                </a>
              )}
            </div>

            {/* Skills */}
            {p.skills?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 20 }}>
                {p.skills.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "4px 12px", borderRadius: 20,
                    background: "#f5f3ff", color: "#7c3aed", fontWeight: 600,
                  }}>{s}</span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "flex", gap: 28, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              {[
                { val: posts.length,                   label: "Posts" },
                { val: (p.followers || []).length,     label: "Followers" },
                { val: (p.following || []).length,     label: "Following" },
              ].map(({ val, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{val}</span>
                  <span style={{ fontSize: 14, color: "#64748b" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>Posts</h2>
      {postsLoading ? (
        [1, 2].map(i => (
          <div key={i} style={{
            background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16,
            border: "1px solid #f1f5f9",
          }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, width: "40%", marginBottom: 8 }} />
                <div style={{ height: 11, background: "#f1f5f9", borderRadius: 4, width: "25%" }} />
              </div>
            </div>
            <div style={{ height: 180, background: "#f1f5f9", borderRadius: 12 }} />
          </div>
        ))
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "50px 40px",
          background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>No posts yet</div>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Your posts will appear here</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditModal
          profile={p}
          onClose={() => setShowEdit(false)}
          onSave={() => {}}
        />
      )}
    </div>
  );
}