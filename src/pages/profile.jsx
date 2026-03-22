import { useEffect, useRef, useState } from "react";
import {
  doc, onSnapshot, setDoc, collection, addDoc,
  query, where, orderBy, getDocs, deleteDoc,
  serverTimestamp, updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import {
  BadgeCheck, MapPin, Calendar, Pencil, Camera, X, Plus,
  FolderPlus, Folder, FolderOpen, Upload, FileText, Image,
  Film, File, Trash2, ChevronLeft, Download, Briefcase,
  GraduationCap, Award, Globe, Link, Mail, Phone,
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

const ROLES = [
  { value: "Mentor",  emoji: "🎓" },
  { value: "Student", emoji: "📚" },
];
function roleEmoji(r) { return ROLES.find(x => x.value === r)?.emoji || "✨"; }

function fileIcon(type) {
  if (!type) return <File size={20} style={{ color: "#94a3b8" }} />;
  if (type.startsWith("image/")) return <Image size={20} style={{ color: "#7c3aed" }} />;
  if (type.startsWith("video/")) return <Film size={20} style={{ color: "#0ea5e9" }} />;
  if (type.includes("pdf")) return <FileText size={20} style={{ color: "#ef4444" }} />;
  return <File size={20} style={{ color: "#64748b" }} />;
}
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Shared card wrapper ── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", borderRadius: 16,
    border: "1px solid #f1f5f9",
    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
    padding: "24px 28px", marginBottom: 16, ...style,
  }}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, onEdit, isOwner }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Icon size={18} style={{ color: "#7c3aed" }} />
      <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{title}</span>
    </div>
    {isOwner && (
      <button onClick={onEdit} style={{
        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
        padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center",
        gap: 5, fontSize: 12, fontWeight: 600, color: "#64748b",
      }}
        onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
        onMouseLeave={e => e.currentTarget.style.background = "#f8fafc"}
      ><Plus size={13} /> Add</button>
    )}
  </div>
);

/* ── Section item with edit/delete ── */
const SectionItem = ({ icon, title, subtitle, meta, description, isOwner, onEdit, onDelete }) => (
  <div style={{
    display: "flex", gap: 14, padding: "12px 0",
    borderBottom: "1px solid #f8fafc", alignItems: "flex-start",
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10, background: "#f5f3ff",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "#64748b", marginTop: 1 }}>{subtitle}</div>}
      {meta && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{meta}</div>}
      {description && <div style={{ fontSize: 13, color: "#475569", marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
    </div>
    {isOwner && (
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {onEdit && (
          <button onClick={onEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = "#7c3aed"}
            onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
          ><Pencil size={14} /></button>
        )}
        <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
        ><Trash2 size={14} /></button>
      </div>
    )}
  </div>
);

/* ── Generic section entry modal ── */
function EntryModal({ title, fields, initial = {}, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: 500, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          {fields.map(({ key, label, placeholder, type = "text", options }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
              {type === "textarea" ? (
                <textarea value={form[key] || ""} onChange={e => set(key, e.target.value)} placeholder={placeholder} rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#f8fafc" }} />
              ) : type === "select" ? (
                <select value={form[key] || ""} onChange={e => set(key, e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", background: "#f8fafc", boxSizing: "border-box" }}>
                  <option value="">Select…</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={type} value={form[key] || ""} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
              )}
            </div>
          ))}
          <button onClick={handle} disabled={saving} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Folders / Posts section ── */
function CreateFolderModal({ onClose, onCreate }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [color, setColor] = useState("#7c3aed"); const [loading, setLoading] = useState(false);
  const COLORS = ["#7c3aed","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#6366f1","#14b8a6"];
  const handle = async () => { if (!name.trim()) return; setLoading(true); await onCreate({ name: name.trim(), description: desc.trim(), color }); setLoading(false); onClose(); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: 440, maxWidth: "100%", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>New Post</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Post name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fullstack, Machine Learning…" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What's this about?" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#f8fafc" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Colour</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2, transform: color === c ? "scale(1.2)" : "scale(1)", transition: "transform .15s" }} />)}
            </div>
          </div>
          <button onClick={handle} disabled={!name.trim() || loading} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: name.trim() ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#e2e8f0", color: name.trim() ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 15, cursor: name.trim() ? "pointer" : "not-allowed" }}>
            {loading ? "Creating…" : "Create Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadFileModal({ folder, onClose, onUploaded }) {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState([]); const [uploading, setUploading] = useState(false); const [progress, setProgress] = useState(0);
  const inputRef = useRef();
  const handleFiles = e => setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  const removeFile = i => setFiles(f => f.filter((_, j) => j !== i));
  const handleUpload = async () => {
    if (!files.length) return; setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `folders/${currentUser.uid}/${folder.id}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        await addDoc(collection(db, "folderFiles"), { folderId: folder.id, userId: currentUser.uid, name: file.name, type: file.type, size: file.size, downloadURL, createdAt: serverTimestamp() });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      onUploaded(); onClose();
    } finally { setUploading(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: 480, maxWidth: "100%", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div><h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Upload Files</h3><div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>→ {folder.name}</div></div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <div onClick={() => inputRef.current.click()} style={{ border: "2px dashed #c4b5fd", borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: "#faf5ff", marginBottom: 16 }}>
            <Upload size={28} style={{ color: "#a855f7", marginBottom: 10 }} />
            <div style={{ fontWeight: 600, fontSize: 14, color: "#7c3aed" }}>Click to choose files</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Any file type — images, videos, PDFs, code…</div>
          </div>
          <input ref={inputRef} type="file" multiple onChange={handleFiles} style={{ display: "none" }} />
          {files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 200, overflowY: "auto" }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                  {fileIcon(f.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatSize(f.size)}</div>
                  </div>
                  <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0 }}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}><span>Uploading…</span><span>{progress}%</span></div>
              <div style={{ height: 6, background: "#f1f5f9", borderRadius: 4 }}><div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7)", borderRadius: 4, transition: "width .3s" }} /></div>
            </div>
          )}
          <button onClick={handleUpload} disabled={!files.length || uploading} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: files.length && !uploading ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#e2e8f0", color: files.length && !uploading ? "#fff" : "#94a3b8", fontWeight: 700, fontSize: 15, cursor: files.length && !uploading ? "pointer" : "not-allowed" }}>
            {uploading ? `Uploading ${progress}%…` : `Upload ${files.length ? files.length : ""} File${files.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderView({ folder, isOwner, onBack }) {
  const [folderFiles, setFolderFiles] = useState([]); const [loading, setLoading] = useState(true); const [showUpload, setShowUpload] = useState(false);
  useEffect(() => {
    if (!folder.id) return;
    const q = query(collection(db, "folderFiles"), where("folderId", "==", folder.id));
    const unsub = onSnapshot(q, snap => {
      setFolderFiles(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
      setLoading(false);
    });
    return unsub;
  }, [folder.id]);
  const deleteFile = async (file) => { if (!window.confirm(`Delete "${file.name}"?`)) return; await deleteDoc(doc(db, "folderFiles", file.id)); };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}><ChevronLeft size={18} /></button>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: folder.color || "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}><FolderOpen size={22} color="#fff" /></div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>{folder.name}</div>{folder.description && <div style={{ fontSize: 13, color: "#94a3b8" }}>{folder.description}</div>}</div>
        {isOwner && <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Upload size={15} /> Upload</button>}
      </div>
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>{[1,2,3].map(i => <div key={i} style={{ height: 80, background: "#f1f5f9", borderRadius: 12 }} />)}</div>
      ) : folderFiles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
          <Upload size={32} style={{ color: "#c4b5fd", marginBottom: 10 }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>No files yet</div>
          {isOwner && <div style={{ fontSize: 13, color: "#94a3b8" }}>Click Upload to add files</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {folderFiles.map(file => (
            <div key={file.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
              {file.type?.startsWith("image/") ? <img src={file.downloadURL} alt={file.name} style={{ width: "100%", height: 120, objectFit: "cover" }} /> : <div style={{ height: 80, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>{fileIcon(file.type)}</div>}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatSize(file.size)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <a href={file.downloadURL} target="_blank" rel="noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 0", borderRadius: 8, background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><Download size={12} /> Open</a>
                  {isOwner && <button onClick={() => deleteFile(file)} title="Delete file" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }} onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}><Trash2 size={13} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showUpload && <UploadFileModal folder={folder} onClose={() => setShowUpload(false)} onUploaded={() => {}} />}
    </div>
  );
}

function FoldersSection({ userId, isOwner }) {
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState([]); const [openFolder, setOpenFolder] = useState(null); const [showCreate, setShowCreate] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "folders"), where("userId", "==", userId));
    const unsub = onSnapshot(q, snap => {
      setFolders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
      setLoading(false);
    }, err => { console.error("folders:", err.code); setLoading(false); });
    return unsub;
  }, [userId]);
  const createFolder = async ({ name, description, color }) => { await addDoc(collection(db, "folders"), { name, description, color, userId: currentUser.uid, createdAt: serverTimestamp() }); };
  const deleteFolder = async (folder) => { if (!window.confirm(`Delete "${folder.name}"?`)) return; await deleteDoc(doc(db, "folders", folder.id)); if (openFolder?.id === folder.id) setOpenFolder(null); };
  if (openFolder) return <FolderView folder={openFolder} isOwner={isOwner} onBack={() => setOpenFolder(null)} />;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><FolderPlus size={18} style={{ color: "#7c3aed" }} /><span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Posts</span></div>
        {isOwner && <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}><FolderPlus size={15} /> New Post</button>}
      </div>
      {loading ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>{[1,2,3].map(i => <div key={i} style={{ height: 90, background: "#f1f5f9", borderRadius: 14 }} />)}</div>
      : folders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
          <Folder size={32} style={{ color: "#c4b5fd", marginBottom: 10 }} />
          <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a", marginBottom: 6 }}>No posts yet</div>
          {isOwner && <div style={{ fontSize: 13, color: "#94a3b8" }}>Create a post to organise your files</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {folders.map(folder => (
            <div key={folder.id} onClick={() => setOpenFolder(folder)} style={{ background: "#fff", borderRadius: 14, padding: "16px 16px 14px", border: "1px solid #f1f5f9", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.04)", transition: "all .2s", position: "relative" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${folder.color}30`; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {isOwner && <button onClick={e => { e.stopPropagation(); deleteFolder(folder); }} title="Delete" style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid #fee2e2", borderRadius: 8, cursor: "pointer", color: "#ef4444", padding: "4px 6px", display: "flex", alignItems: "center" }} onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}><Trash2 size={13} /></button>}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: folder.color || "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Folder size={22} color="#fff" /></div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</div>
              {folder.description && <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.description}</div>}
            </div>
          ))}
        </div>
      )}
      {showCreate && <CreateFolderModal onClose={() => setShowCreate(false)} onCreate={createFolder} />}
    </div>
  );
}

/* ── Edit Profile Modal ── */
function EditProfileModal({ profile, onClose }) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    displayName: profile.displayName || "", username: profile.username || "",
    bio: profile.bio || "", location: profile.location || "",
    website: profile.website || "", phone: profile.phone || "",
    email: profile.email || currentUser?.email || "",
    roles: profile.roles || [], skills: profile.skills || [],
    headline: profile.headline || "",
  });
  const [avatarFile, setAvatarFile] = useState(null); const [avatarPreview, setAvatarPreview] = useState(profile.photoURL || null);
  const [coverFile, setCoverFile] = useState(null); const [coverPreview, setCoverPreview] = useState(profile.coverURL || null);
  const [newSkill, setNewSkill] = useState(""); const [saving, setSaving] = useState(false);
  const avatarRef = useRef(); const coverRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleRole = r => set("roles", form.roles.includes(r) ? form.roles.filter(x => x !== r) : [...form.roles, r]);
  const addSkill = () => { const s = newSkill.trim(); if (s && !form.skills.includes(s)) set("skills", [...form.skills, s]); setNewSkill(""); };
  const pickFile = (e, type) => { const f = e.target.files[0]; if (!f) return; const url = URL.createObjectURL(f); if (type === "avatar") { setAvatarFile(f); setAvatarPreview(url); } else { setCoverFile(f); setCoverPreview(url); } };
  const handleSave = async () => {
    setSaving(true);
    try {
      let photoURL = profile.photoURL || null; let coverURL = profile.coverURL || null;
      if (avatarFile) { const r = ref(storage, `avatars/${currentUser.uid}_avatar`); await uploadBytes(r, avatarFile); photoURL = await getDownloadURL(r); }
      if (coverFile) { const r = ref(storage, `avatars/${currentUser.uid}_cover`); await uploadBytes(r, coverFile); coverURL = await getDownloadURL(r); }
      await setDoc(doc(db, "profile", currentUser.uid), { ...form, photoURL, coverURL, uid: currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: 580, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Edit Profile</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          {/* Cover + Avatar */}
          <div style={{ position: "relative", marginBottom: 52, marginTop: 12 }}>
            <div onClick={() => coverRef.current.click()} style={{ height: 130, borderRadius: 14, overflow: "hidden", cursor: "pointer", background: coverPreview ? `url(${coverPreview}) center/cover` : "linear-gradient(135deg, #c7d2fe, #fbc2eb)" }} />
            <button onClick={() => coverRef.current.click()} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.45)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Camera size={13} /> Cover</button>
            <input ref={coverRef} type="file" accept="image/*" onChange={e => pickFile(e, "cover")} style={{ display: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: 20 }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName || "U")}&background=7c3aed&color=fff&size=128`} alt="avatar" style={{ width: 76, height: 76, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover" }} />
                <button onClick={() => avatarRef.current.click()} style={{ position: "absolute", bottom: 0, right: 0, background: "#7c3aed", border: "2px solid #fff", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Camera size={12} color="#fff" /></button>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={e => pickFile(e, "avatar")} style={{ display: "none" }} />
            </div>
          </div>

          {/* Basic info */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Basic Info</div>
            {[
              { label: "Full name", key: "displayName", placeholder: "Your full name" },
              { label: "Username", key: "username", placeholder: "your_username" },
              { label: "Headline", key: "headline", placeholder: "e.g. Full Stack Developer | React & Firebase" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
                <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#fff" }} />
              </div>
            ))}
            <div style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Bio</label>
              <textarea value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="Tell the world about yourself…" rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }} />
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact & Location</div>
            {[
              { label: "Location", key: "location", placeholder: "City, Country" },
              { label: "Website", key: "website", placeholder: "https://yoursite.com" },
              { label: "Email (public)", key: "email", placeholder: "contact@example.com" },
              { label: "Phone", key: "phone", placeholder: "+91 00000 00000" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
                <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", background: "#fff" }} />
              </div>
            ))}
          </div>

          {/* Role */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</div>
            <div style={{ display: "flex", gap: 12 }}>
              {ROLES.map(({ value, emoji }) => {
                const active = form.roles.includes(value);
                return (
                  <button key={value} onClick={() => toggleRole(value)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, border: active ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: active ? "#f5f3ff" : "#fff", color: active ? "#7c3aed" : "#64748b", fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 22 }}>{emoji}</span><span>{value}</span>
                    {active && <span style={{ fontSize: 10, background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: 20 }}>Selected</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Skills</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Add a skill and press Enter…" style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#fff", color: "#0f172a" }} />
              <button onClick={addSkill} style={{ padding: "9px 14px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", fontWeight: 700, cursor: "pointer" }}><Plus size={15} /></button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {form.skills.map((s, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff", color: "#7c3aed", fontWeight: 600, fontSize: 12, padding: "4px 12px", borderRadius: 20, border: "1px solid #c4b5fd" }}>
                  {s}<button onClick={() => set("skills", form.skills.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#a855f7", display: "flex" }}><X size={11} /></button>
                </span>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: saving ? "#e2e8f0" : "linear-gradient(135deg,#7c3aed,#a855f7)", color: saving ? "#94a3b8" : "#fff", fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PROFILE PAGE
══════════════════════════════════════════ */
export default function ProfilePage() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("about");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  /* section modals */
  const [expModal, setExpModal]   = useState(null); // null | "add" | item
  const [eduModal, setEduModal]   = useState(null);
  const [certModal, setCertModal] = useState(null);

  /* section data */
  const [experience,   setExperience]   = useState([]);
  const [education,    setEducation]    = useState([]);
  const [certificates, setCertificates] = useState([]);

  const defaultProfile = {
    displayName: currentUser?.displayName || "User", username: "", headline: "",
    bio: "", location: "", website: "", email: currentUser?.email || "", phone: "",
    coverURL: null, photoURL: currentUser?.photoURL || null,
    roles: [], skills: [], followers: [], following: [], createdAt: null,
  };

  /* live profile */
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, "profile", currentUser.uid), snap => {
      setProfile(snap.exists() ? { uid: snap.id, ...snap.data() } : defaultProfile);
    });
    return unsub;
  }, [currentUser]);

  /* live sections */
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const subs = [
      onSnapshot(query(collection(db, "experience"),   where("userId","==",uid)), s => setExperience(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
      onSnapshot(query(collection(db, "education"),    where("userId","==",uid)), s => setEducation(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
      onSnapshot(query(collection(db, "certificates"), where("userId","==",uid)), s => setCertificates(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)))),
    ];
    return () => subs.forEach(u => u());
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "posts"),
      where("userId", "==", currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPosts(sorted);
      setPostsLoading(false);
    }, () => setPostsLoading(false));
    return unsub;
  }, [currentUser]);

  const saveSection = async (colName, data, id = null) => {
    if (id) { await updateDoc(doc(db, colName, id), { ...data, updatedAt: serverTimestamp() }); }
    else    { await addDoc(collection(db, colName), { ...data, userId: currentUser.uid, createdAt: serverTimestamp() }); }
  };
  const deleteSection = async (colName, id) => { if (!window.confirm("Delete this entry?")) return; await deleteDoc(doc(db, colName, id)); };

  const p = profile || defaultProfile;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 0 60px" }}>

      {/* ── Hero Card ── */}
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        {/* Cover */}
        <div style={{ width: "100%", height: 180, background: p.coverURL ? `url(${p.coverURL}) center/cover no-repeat` : "linear-gradient(135deg, #c7d2fe 0%, #e0c3fc 50%, #fbc2eb 100%)" }} />
        <div style={{ padding: "0 28px 24px", position: "relative" }}>
          {/* Avatar */}
          <div style={{ position: "absolute", top: -48, width: 96, height: 96, borderRadius: "50%", border: "4px solid #fff", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,.12)" }}>
            <img src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName||"U")}&background=7c3aed&color=fff&size=200`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {/* Edit */}
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12 }}>
            <button onClick={() => setShowEditProfile(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <Pencil size={14} /> Edit profile
            </button>
          </div>

          <div style={{ marginTop: 40 }}>
            {/* Name + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{p.displayName || "Your Name"}</span>
              <BadgeCheck size={20} style={{ color: "#7c3aed" }} />
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>@{p.username || "username"}</div>

            {/* Headline */}
            {p.headline && <div style={{ fontSize: 15, color: "#374151", fontWeight: 500, marginBottom: 10 }}>{p.headline}</div>}

            {/* Role badges */}
            {p.roles?.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {p.roles.map((r, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: r === "Mentor" ? "#f5f3ff" : "#eff6ff", color: r === "Mentor" ? "#7c3aed" : "#1d4ed8", border: r === "Mentor" ? "1px solid #c4b5fd" : "1px solid #bfdbfe" }}>
                    <span style={{ fontSize: 13 }}>{roleEmoji(r)}</span> {r}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {p.bio && <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>{p.bio}</div>}

            {/* Empty hint */}
            {!p.bio && !p.headline && p.roles?.length === 0 && (
              <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginBottom: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                No bio yet — click <strong>Edit profile</strong> to fill in your details!
              </div>
            )}

            {/* Meta row */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {p.location && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><MapPin size={13} /> {p.location}</span>}
              {p.website  && <a href={p.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}><Globe size={13} /> {p.website.replace(/https?:\/\//, "")}</a>}
              {p.email    && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Mail size={13} /> {p.email}</span>}
              {p.phone    && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Phone size={13} /> {p.phone}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}><Calendar size={13} /> Joined {p.createdAt ? timeAgo(p.createdAt) : "recently"}</span>
            </div>

            {/* Stats */}
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

      {/* ── Tab Navigation ── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9",
        padding: "4px", display: "flex", gap: 2, marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}>
        {[
          { key: "about",  label: "About",  icon: "👤" },
          { key: "study",  label: "Study",  icon: "📚" },
          { key: "posts",  label: "Posts",  icon: "📝" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: activeTab === t.key ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent",
              color: activeTab === t.key ? "#fff" : "#64748b",
              fontWeight: activeTab === t.key ? 700 : 500,
              fontSize: 14, cursor: "pointer", transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ ABOUT TAB ══ */}
      {activeTab === "about" && (
        <>
          {/* Skills */}
          {p.skills?.length > 0 && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Award size={18} style={{ color: "#7c3aed" }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Skills</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {p.skills.map((s, i) => (
                  <span key={i} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 20, background: "#f5f3ff", color: "#7c3aed", fontWeight: 600, border: "1px solid #c4b5fd" }}>{s}</span>
                ))}
              </div>
            </Card>
          )}

          {/* Experience */}
          <Card>
            <SectionHeader icon={Briefcase} title="Experience" onEdit={() => setExpModal("add")} isOwner={true} />
            {experience.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>No experience added yet</div>
            ) : experience.map(item => (
              <SectionItem key={item.id}
                icon={<Briefcase size={20} style={{ color: "#7c3aed" }} />}
                title={item.title} subtitle={item.company}
                meta={`${item.startDate || ""}${item.endDate ? ` – ${item.endDate}` : " – Present"}${item.location ? ` · ${item.location}` : ""}`}
                description={item.description}
                isOwner={true} onEdit={() => setExpModal(item)} onDelete={() => deleteSection("experience", item.id)}
              />
            ))}
          </Card>

          {/* Education */}
          <Card>
            <SectionHeader icon={GraduationCap} title="Education" onEdit={() => setEduModal("add")} isOwner={true} />
            {education.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>No education added yet</div>
            ) : education.map(item => (
              <SectionItem key={item.id}
                icon={<GraduationCap size={20} style={{ color: "#7c3aed" }} />}
                title={item.school} subtitle={`${item.degree || ""}${item.field ? ` · ${item.field}` : ""}`}
                meta={`${item.startYear || ""}${item.endYear ? ` – ${item.endYear}` : ""}`}
                description={item.description}
                isOwner={true} onEdit={() => setEduModal(item)} onDelete={() => deleteSection("education", item.id)}
              />
            ))}
          </Card>

          {/* Certifications */}
          <Card>
            <SectionHeader icon={Award} title="Licenses & Certifications" onEdit={() => setCertModal("add")} isOwner={true} />
            {certificates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>No certifications added yet</div>
            ) : certificates.map(item => (
              <SectionItem key={item.id}
                icon={<Award size={20} style={{ color: "#f59e0b" }} />}
                title={item.name} subtitle={item.issuer}
                meta={`${item.issueDate || ""}${item.credentialId ? ` · ID: ${item.credentialId}` : ""}`}
                description={item.url ? undefined : item.description}
                isOwner={true} onEdit={() => setCertModal(item)} onDelete={() => deleteSection("certificates", item.id)}
              />
            ))}
          </Card>
        </>
      )}

      {/* ══ STUDY TAB ══ */}
      {activeTab === "study" && (
        <Card>
          <FoldersSection userId={currentUser?.uid} isOwner={true} />
        </Card>
      )}

      {/* ══ POSTS TAB ══ */}
      {activeTab === "posts" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {posts.length} Post{posts.length !== 1 ? "s" : ""}
            </span>
          </div>
          {postsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 14, background: "#f1f5f9", borderRadius: 4, width: "45%", marginBottom: 8 }} />
                      <div style={{ height: 11, background: "#f1f5f9", borderRadius: 4, width: "28%" }} />
                    </div>
                  </div>
                  <div style={{ height: 16, background: "#f1f5f9", borderRadius: 4, width: "90%", marginBottom: 8 }} />
                  <div style={{ height: 220, background: "#f1f5f9", borderRadius: 12 }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 40px", background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📝</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a", marginBottom: 8 }}>No posts yet</div>
              <div style={{ fontSize: 14, color: "#94a3b8" }}>Posts you create in the feed will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {posts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </div>
      )}

            {/* ── Modals ── */}
      {showEditProfile && <EditProfileModal profile={p} onClose={() => setShowEditProfile(false)} />}

      {expModal && (
        <EntryModal
          title={expModal === "add" ? "Add Experience" : "Edit Experience"}
          initial={expModal === "add" ? {} : expModal}
          fields={[
            { key: "title",       label: "Job title",    placeholder: "e.g. Frontend Developer" },
            { key: "company",     label: "Company",      placeholder: "e.g. Google" },
            { key: "location",    label: "Location",     placeholder: "e.g. Bangalore, India" },
            { key: "startDate",   label: "Start date",   placeholder: "e.g. Jan 2022" },
            { key: "endDate",     label: "End date",     placeholder: "Leave blank if current" },
            { key: "description", label: "Description",  placeholder: "What did you do?", type: "textarea" },
          ]}
          onClose={() => setExpModal(null)}
          onSave={d => saveSection("experience", d, expModal?.id)}
        />
      )}

      {eduModal && (
        <EntryModal
          title={eduModal === "add" ? "Add Education" : "Edit Education"}
          initial={eduModal === "add" ? {} : eduModal}
          fields={[
            { key: "school",      label: "School / University", placeholder: "e.g. IIT Madras" },
            { key: "degree",      label: "Degree",              placeholder: "e.g. B.Tech" },
            { key: "field",       label: "Field of study",      placeholder: "e.g. Computer Science" },
            { key: "startYear",   label: "Start year",          placeholder: "e.g. 2020" },
            { key: "endYear",     label: "End year",            placeholder: "e.g. 2024" },
            { key: "description", label: "Description",         placeholder: "Activities, achievements…", type: "textarea" },
          ]}
          onClose={() => setEduModal(null)}
          onSave={d => saveSection("education", d, eduModal?.id)}
        />
      )}

      {certModal && (
        <EntryModal
          title={certModal === "add" ? "Add Certification" : "Edit Certification"}
          initial={certModal === "add" ? {} : certModal}
          fields={[
            { key: "name",         label: "Certification name", placeholder: "e.g. AWS Solutions Architect" },
            { key: "issuer",       label: "Issuing organisation", placeholder: "e.g. Amazon Web Services" },
            { key: "issueDate",    label: "Issue date",          placeholder: "e.g. Mar 2023" },
            { key: "credentialId", label: "Credential ID",       placeholder: "Optional" },
            { key: "url",          label: "Credential URL",      placeholder: "https://..." },
          ]}
          onClose={() => setCertModal(null)}
          onSave={d => saveSection("certificates", d, certModal?.id)}
        />
      )}
    </div>
  );
}