import { useRef, useState } from "react";
import {
  addDoc, collection, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { X, Image, Smile } from "lucide-react";

export default function CreatePostModal({ onClose }) {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState("");
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
    if (!content.trim() && !file) return;
    if (!currentUser) return;
    setUploading(true);
    try {
      let mediaURL = null;
      if (file) {
        const storageRef = ref(storage, `posts/${currentUser.uid}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        mediaURL = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        userName: userProfile?.displayName || currentUser.displayName || "User",
        userHandle: userProfile?.username || null,
        userPhotoURL: userProfile?.photoURL || currentUser.photoURL || null,
        content: content.trim(),
        mediaURL,
        likes: [],
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const canPost = (content.trim() || file) && !uploading;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,.55)",
      zIndex: 998, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        width: 520,
        maxWidth: "95vw",
        boxShadow: "0 24px 80px rgba(0,0,0,.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f1f5f9",
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Create Post
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          ><X size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* User row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <img
              src={
                userProfile?.photoURL ||
                currentUser?.photoURL ||
                `https://ui-avatars.com/api/?name=${userProfile?.displayName || "U"}&background=7c3aed&color=fff`
              }
              alt="avatar"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                {userProfile?.displayName || currentUser?.displayName || "You"}
              </div>
              <div style={{
                fontSize: 12, color: "#fff",
                background: "#7c3aed", borderRadius: 20, padding: "2px 10px",
                display: "inline-block", marginTop: 3,
              }}>Public</div>
            </div>
          </div>

          {/* Text area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Use #hashtags to categorize your post…"
            style={{
              width: "100%", minHeight: 100, border: "none", outline: "none",
              resize: "none", fontSize: 16, color: "#1e293b", lineHeight: 1.6,
              fontFamily: "inherit", background: "transparent",
              boxSizing: "border-box",
            }}
          />

          {/* Image preview */}
          {preview && (
            <div style={{
              position: "relative", borderRadius: 12, overflow: "hidden",
              marginTop: 12, maxHeight: 280,
            }}>
              <img src={preview} alt="preview" style={{ width: "100%", objectFit: "cover" }} />
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
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px 20px",
          borderTop: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => inputRef.current.click()}
              title="Add photo"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 10px", borderRadius: 10, color: "#7c3aed",
                transition: "background .15s",
              }}
            ><Image size={20} /></button>
            <button
              title="Add emoji"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 10px", borderRadius: 10, color: "#f59e0b",
                transition: "background .15s",
              }}
            ><Smile size={20} /></button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

          <button
            onClick={handleSubmit}
            disabled={!canPost}
            style={{
              padding: "10px 28px", borderRadius: 12,
              background: canPost ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#e2e8f0",
              color: canPost ? "#fff" : "#94a3b8",
              border: "none", fontWeight: 700, fontSize: 15,
              cursor: canPost ? "pointer" : "not-allowed",
              transition: "all .2s",
            }}
          >
            {uploading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}