import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc, onSnapshot, collection, query, where, getDoc,
  updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import {
  BadgeCheck, MapPin, Calendar, Globe, Mail, Phone,
  Briefcase, GraduationCap, Award, UserPlus, UserCheck,
  MessageCircle, ChevronLeft, Folder, FolderOpen,
  File, Image, Film, FileText, Download, ChevronRight,
} from "lucide-react";

/* ── helpers ── */
function timeAgo(ts) {
  if (!ts) return "recently";
  const diff = Date.now() - ts.toMillis();
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(diff / 2592000000);
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  return "today";
}
function roleEmoji(r) {
  return r === "Mentor" ? "🎓" : r === "Student" ? "📚" : "✨";
}
function fileIcon(type) {
  if (!type) return <File size={18} style={{ color: "#94a3b8" }} />;
  if (type.startsWith("image/")) return <Image size={18} style={{ color: "#7c3aed" }} />;
  if (type.startsWith("video/")) return <Film size={18} style={{ color: "#0ea5e9" }} />;
  if (type.includes("pdf")) return <FileText size={18} style={{ color: "#ef4444" }} />;
  return <File size={18} style={{ color: "#64748b" }} />;
}
function formatSize(b) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(0,0,0,.04)", padding: "24px 28px",
    marginBottom: 16, ...style,
  }}>{children}</div>
);

const SectionHead = ({ icon: Icon, title, color = "#7c3aed" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
    <Icon size={18} style={{ color }} />
    <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{title}</span>
  </div>
);

const Entry = ({ icon, title, subtitle, meta, description }) => (
  <div style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #f8fafc" }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{title}</div>
      {subtitle    && <div style={{ fontSize: 13, color: "#64748b", marginTop: 1 }}>{subtitle}</div>}
      {meta        && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{meta}</div>}
      {description && <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
    </div>
  </div>
);

/* ── Folder viewer (read-only) ── */
function FolderView({ folder, onBack }) {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "folderFiles"), where("folderId", "==", folder.id)),
      snap => setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)))
    );
    return unsub;
  }, [folder.id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: folder.color || "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FolderOpen size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{folder.name}</div>
          {folder.description && <div style={{ fontSize: 13, color: "#94a3b8" }}>{folder.description}</div>}
        </div>
      </div>
      {files.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: 14, border: "1px dashed #e2e8f0" }}>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No files in this folder</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {files.map(file => (
            <div key={file.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden" }}>
              {file.type?.startsWith("image/")
                ? <img src={file.downloadURL} alt={file.name} style={{ width: "100%", height: 110, objectFit: "cover" }} />
                : <div style={{ height: 80, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>{fileIcon(file.type)}</div>
              }
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{formatSize(file.size)}</div>
                <a href={file.downloadURL} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 0", borderRadius: 8, background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  <Download size={12} /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Study tab (read-only folders) ── */
function StudyTab({ userId }) {
  const [folders, setFolders]     = useState([]);
  const [openFolder, setOpenFolder] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "folders"), where("userId", "==", userId)),
      snap => {
        setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
        setLoading(false);
      }
    );
    return unsub;
  }, [userId]);

  if (openFolder) return <FolderView folder={openFolder} onBack={() => setOpenFolder(null)} />;

  if (loading) return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>{[1,2,3].map(i => <div key={i} style={{ height: 88, background: "#f1f5f9", borderRadius: 14 }} />)}</div>;

  if (folders.length === 0) return (
    <div style={{ textAlign: "center", padding: "50px 20px", background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
      <Folder size={32} style={{ color: "#c4b5fd", marginBottom: 10 }} />
      <div style={{ fontSize: 14, color: "#94a3b8" }}>No study posts yet</div>
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
      {folders.map(folder => (
        <div key={folder.id} onClick={() => setOpenFolder(folder)} style={{
          background: "#fff", borderRadius: 14, padding: "16px", border: "1px solid #f1f5f9",
          cursor: "pointer", transition: "all .2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${folder.color}30`; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 10, background: folder.color || "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Folder size={20} color="#fff" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</div>
          {folder.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.description}</div>}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   MAIN UserProfile PAGE
══════════════════════════════════ */
export default function UserProfilePage() {
  const { uid } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile,      setProfile]      = useState(null);
  const [myProfile,    setMyProfile]    = useState(null);
  const [experience,   setExperience]   = useState([]);
  const [education,    setEducation]    = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [posts,        setPosts]        = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab,    setActiveTab]    = useState("about");
  const [followLoading, setFollowLoading] = useState(false);

  /* profile */
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "profile", uid), snap => {
      setProfile(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [uid]);

  /* my profile for follow state */
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "profile", currentUser.uid), snap => {
      if (snap.exists()) setMyProfile(snap.data());
    });
    return unsub;
  }, [currentUser]);

  /* sections */
  useEffect(() => {
    if (!uid) return;
    const subs = [
      onSnapshot(query(collection(db, "experience"),   where("userId","==",uid)), s => setExperience(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
      onSnapshot(query(collection(db, "education"),    where("userId","==",uid)), s => setEducation(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
      onSnapshot(query(collection(db, "certificates"), where("userId","==",uid)), s => setCertificates(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
    ];
    return () => subs.forEach(u => u());
  }, [uid]);

  /* posts */
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "posts"), where("userId", "==", uid)),
      snap => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a,b) => (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0)));
        setPostsLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const isFollowing = (myProfile?.following || []).includes(uid);

  const handleFollow = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await updateDoc(doc(db, "profile", currentUser.uid), { following: arrayRemove(uid), connections: arrayRemove(uid) });
        await updateDoc(doc(db, "profile", uid), { followers: arrayRemove(currentUser.uid), connections: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(doc(db, "profile", currentUser.uid), { following: arrayUnion(uid) });
        await updateDoc(doc(db, "profile", uid), { followers: arrayUnion(currentUser.uid) });
      }
    } finally { setFollowLoading(false); }
  };

  const handleMessage = () => navigate("/messages", { state: { startWith: profile } });

  if (!profile) return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
      Loading profile…
    </div>
  );

  const p = profile;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 0 60px" }}>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
        background: "none", border: "none", cursor: "pointer",
        color: "#64748b", fontSize: 14, fontWeight: 500, padding: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.color = "#7c3aed"}
        onMouseLeave={e => e.currentTarget.style.color = "#64748b"}
      >
        <ChevronLeft size={18} /> Back
      </button>

      {/* Hero card */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ width: "100%", height: 180, background: p.coverURL ? `url(${p.coverURL}) center/cover no-repeat` : "linear-gradient(135deg,#c7d2fe 0%,#e0c3fc 50%,#fbc2eb 100%)" }} />
        <div style={{ padding: "0 28px 24px", position: "relative" }}>
          {/* Avatar */}
          <div style={{ position: "absolute", top: -48, width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
            <img src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName||"U")}&background=7c3aed&color=fff&size=200`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12 }}>
            <button onClick={handleMessage} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            ><MessageCircle size={15} /> Message</button>
            <button onClick={handleFollow} disabled={followLoading} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
              border: isFollowing ? "1px solid #c4b5fd" : "none",
              background: isFollowing ? "#f5f3ff" : "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: isFollowing ? "#7c3aed" : "#fff",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
              {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
            </button>
          </div>

          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{p.displayName || "User"}</span>
              <BadgeCheck size={20} style={{ color: "#7c3aed" }} />
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>@{p.username || p.email?.split("@")[0] || "user"}</div>
            {p.headline && <div style={{ fontSize: 15, color: "#374151", fontWeight: 500, marginBottom: 10 }}>{p.headline}</div>}

            {p.roles?.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {p.roles.map((r, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: r === "Mentor" ? "#f5f3ff" : "#eff6ff", color: r === "Mentor" ? "#7c3aed" : "#1d4ed8", border: r === "Mentor" ? "1px solid #c4b5fd" : "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: 13 }}>{roleEmoji(r)}</span> {r}
                  </span>
                ))}
              </div>
            )}

            {p.bio && <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>{p.bio}</div>}

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {p.location && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><MapPin size={13} /> {p.location}</span>}
              {p.website  && <a href={p.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}><Globe size={13} /> {p.website.replace(/https?:\/\//,"")}</a>}
              {p.email    && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Mail size={13} /> {p.email}</span>}
              {p.phone    && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Phone size={13} /> {p.phone}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Calendar size={13} /> Joined {p.createdAt ? timeAgo(p.createdAt) : "recently"}</span>
            </div>

            <div style={{ display: "flex", gap: 24, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
              {[
                { val: (p.followers||[]).length, label: "Followers" },
                { val: (p.following||[]).length, label: "Following" },
                { val: experience.length,        label: "Experience" },
              ].map(({ val, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{val}</span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Tab bar */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", padding: "4px", display: "flex", gap: 2, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
        {[
          { key: "about", label: "About",  icon: "👤" },
          { key: "study", label: "Study",  icon: "📚" },
          { key: "posts", label: "Posts",  icon: "📝" },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: activeTab === t.key ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent",
            color: activeTab === t.key ? "#fff" : "#64748b",
            fontWeight: activeTab === t.key ? 700 : 500,
            fontSize: 14, cursor: "pointer", transition: "all .2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ABOUT */}
      {activeTab === "about" && (
        <>
          {p.skills?.length > 0 && (
            <Card>
              <SectionHead icon={Award} title="Skills" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {p.skills.map((s, i) => <span key={i} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 20, background: "#f5f3ff", color: "#7c3aed", fontWeight: 600, border: "1px solid #c4b5fd" }}>{s}</span>)}
              </div>
            </Card>
          )}
          {experience.length > 0 && (
            <Card>
              <SectionHead icon={Briefcase} title="Experience" />
              {experience.map(item => <Entry key={item.id} icon={<Briefcase size={20} style={{ color: "#7c3aed" }} />} title={item.title} subtitle={item.company} meta={`${item.startDate||""}${item.endDate ? ` – ${item.endDate}` : " – Present"}${item.location ? ` · ${item.location}` : ""}`} description={item.description} />)}
            </Card>
          )}
          {education.length > 0 && (
            <Card>
              <SectionHead icon={GraduationCap} title="Education" />
              {education.map(item => <Entry key={item.id} icon={<GraduationCap size={20} style={{ color: "#7c3aed" }} />} title={item.school} subtitle={`${item.degree||""}${item.field ? ` · ${item.field}` : ""}`} meta={`${item.startYear||""}${item.endYear ? ` – ${item.endYear}` : ""}`} description={item.description} />)}
            </Card>
          )}
          {certificates.length > 0 && (
            <Card>
              <SectionHead icon={Award} title="Licenses & Certifications" color="#f59e0b" />
              {certificates.map(item => <Entry key={item.id} icon={<Award size={20} style={{ color: "#f59e0b" }} />} title={item.name} subtitle={item.issuer} meta={`${item.issueDate||""}${item.credentialId ? ` · ID: ${item.credentialId}` : ""}`} />)}
            </Card>
          )}
          {!p.skills?.length && !experience.length && !education.length && !certificates.length && (
            <div style={{ textAlign: "center", padding: "50px 20px", background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Nothing to show here yet</div>
            </div>
          )}
        </>
      )}

      {/* STUDY */}
      {activeTab === "study" && <StudyTab userId={uid} />}

      {/* POSTS */}
      {activeTab === "posts" && (
        postsLoading ? (
          [1,2].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9" }} />
                <div style={{ flex: 1 }}><div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, width: "40%", marginBottom: 8 }} /><div style={{ height: 11, background: "#f1f5f9", borderRadius: 4, width: "25%" }} /></div>
              </div>
              <div style={{ height: 200, background: "#f1f5f9", borderRadius: 12 }} />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 6 }}>No posts yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>This user hasn't posted anything yet</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )
      )}
    </div>
  );
}