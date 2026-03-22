import { useEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* ── helpers ── */
const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts.toMillis();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 1) return `${h} hour${h > 1 ? "s" : ""} ago`;
  if (m >= 1) return `${m} min ago`;
  return "just now";
}

/* ── Story Viewer ── */
function StoryViewer({ stories, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const story = stories[idx];

  return (
    <div
      className="story-viewer-overlay"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.85)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 340, height: 580,
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)",
        }}
      >
        <img
          src={story.mediaURL}
          alt="story"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,.6) 100%)",
        }} />
        {/* user info */}
        <div style={{
          position: "absolute", top: 16, left: 16, right: 48,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <img
            src={story.userPhotoURL || `https://ui-avatars.com/api/?name=${story.userName}&background=7c3aed&color=fff`}
            alt="avatar"
            style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #fff", objectFit: "cover" }}
          />
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{story.userName}</div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: 11 }}>{timeAgo(story.createdAt)}</div>
          </div>
        </div>
        {/* close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(0,0,0,.4)", border: "none", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#fff",
          }}
        ><X size={16} /></button>
        {/* nav */}
        {idx > 0 && (
          <button
            onClick={() => setIdx(idx - 1)}
            style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,.2)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          ><ChevronLeft size={18} /></button>
        )}
        {idx < stories.length - 1 && (
          <button
            onClick={() => setIdx(idx + 1)}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,.2)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          ><ChevronRight size={18} /></button>
        )}
        {/* progress bar */}
        <div style={{
          position: "absolute", top: 8, left: 8, right: 8,
          display: "flex", gap: 3,
        }}>
          {stories.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= idx ? "#fff" : "rgba(255,255,255,.35)",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Create Story Modal ── */
function CreateStoryModal({ onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `stories/${currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const mediaURL = await getDownloadURL(storageRef);
      await addDoc(collection(db, "stories"), {
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.displayName || "User",
        userPhotoURL: userProfile?.photoURL || currentUser.photoURL || null,
        mediaURL,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + STORY_TTL_MS),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
      zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: 380, padding: "28px 28px 24px",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create Story</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {preview ? (
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <img src={preview} alt="preview" style={{ width: "100%", height: 280, objectFit: "cover" }} />
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%",
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff",
              }}
            ><X size={14} /></button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current.click()}
            style={{
              border: "2px dashed #e2e8f0", borderRadius: 12, height: 180,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              cursor: "pointer", marginBottom: 16, background: "#f8fafc",
              transition: "border-color .2s",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
            <div style={{ color: "#64748b", fontSize: 14 }}>Click to upload a photo</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

        <button
          onClick={handleSubmit}
          disabled={!file || uploading}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12,
            background: file && !uploading ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#e2e8f0",
            color: file && !uploading ? "#fff" : "#94a3b8",
            border: "none", fontWeight: 600, fontSize: 15, cursor: file && !uploading ? "pointer" : "not-allowed",
            transition: "all .2s",
          }}
        >
          {uploading ? "Uploading…" : "Share Story"}
        </button>
      </div>
    </div>
  );
}

/* ── Main StoryBar ── */
export default function StoryBar() {
   useAuth();
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    const cutoff = Timestamp.fromMillis(Date.now() - STORY_TTL_MS);
    const q = query(
      collection(db, "stories"),
      where("createdAt", ">", cutoff),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 140, behavior: "smooth" });
  };

  return (
    <>
      <div style={{ position: "relative", marginBottom: 24 }}>
        {/* left arrow */}
        <button
          onClick={() => scroll(-1)}
          style={{
            position: "absolute", left: -16, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.1)",
          }}
        ><ChevronLeft size={16} /></button>

        <div
          ref={scrollRef}
          style={{
            display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none",
            paddingBottom: 4,
          }}
        >
          {/* Create Story card */}
          <div
            onClick={() => setShowCreate(true)}
            style={{
              minWidth: 110, height: 168, borderRadius: 14,
              border: "2px dashed #c4b5fd", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              background: "#faf5ff", flexShrink: 0, transition: "all .2s",
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 8, color: "#fff", fontSize: 22,
            }}>+</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>Create Story</span>
          </div>

          {/* Story cards */}
          {stories.map((story, i) => (
            <div
              key={story.id}
              onClick={() => setViewerIndex(i)}
              style={{
                minWidth: 110, height: 168, borderRadius: 14, overflow: "hidden",
                position: "relative", cursor: "pointer", flexShrink: 0,
                boxShadow: "0 4px 16px rgba(0,0,0,.12)",
              }}
            >
              <img
                src={story.mediaURL}
                alt="story"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.65))",
              }} />
              <img
                src={story.userPhotoURL || `https://ui-avatars.com/api/?name=${story.userName}&background=7c3aed&color=fff`}
                alt="avatar"
                style={{
                  position: "absolute", top: 8, left: 8,
                  width: 32, height: 32, borderRadius: "50%",
                  border: "2px solid #a855f7", objectFit: "cover",
                }}
              />
              <div style={{
                position: "absolute", bottom: 8, left: 8, right: 8,
                color: "#fff", fontSize: 11, fontWeight: 600,
              }}>{timeAgo(story.createdAt)}</div>
            </div>
          ))}
        </div>

        {/* right arrow */}
        <button
          onClick={() => scroll(1)}
          style={{
            position: "absolute", right: -16, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.1)",
          }}
        ><ChevronRight size={16} /></button>
      </div>

      {showCreate && <CreateStoryModal onClose={() => setShowCreate(false)} />}
      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}