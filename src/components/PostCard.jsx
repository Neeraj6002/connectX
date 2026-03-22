import { useState } from "react";
import {
  doc, updateDoc, arrayUnion, arrayRemove, increment,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { Heart, MessageCircle, Share2, BadgeCheck } from "lucide-react";

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts.toMillis();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(diff / 2592000000);
  if (months >= 1) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes >= 1) return `${minutes} min ago`;
  return "just now";
}

function renderContent(text) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} style={{ color: "#7c3aed", fontWeight: 600 }}>{part}</span>
    ) : part
  );
}

export default function PostCard({ post }) {
  const { currentUser } = useAuth();
  const [liked, setLiked] = useState(
    currentUser ? (post.likes || []).includes(currentUser.uid) : false
  );
  const [likeCount, setLikeCount] = useState((post.likes || []).length);

  const handleLike = async () => {
    if (!currentUser) return;
    const ref = doc(db, "posts", post.id);
    if (liked) {
      await updateDoc(ref, {
        likes: arrayRemove(currentUser.uid),
        likeCount: increment(-1),
      });
      setLikeCount((c) => c - 1);
    } else {
      await updateDoc(ref, {
        likes: arrayUnion(currentUser.uid),
        likeCount: increment(1),
      });
      setLikeCount((c) => c + 1);
    }
    setLiked(!liked);
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
      overflow: "hidden",
      border: "1px solid #f1f5f9",
      transition: "box-shadow .2s",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src={post.userPhotoURL || `https://ui-avatars.com/api/?name=${post.userName}&background=7c3aed&color=fff`}
          alt="avatar"
          style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
              {post.userName}
            </span>
            <BadgeCheck size={15} style={{ color: "#7c3aed" }} />
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            @{(post.userHandle || post.userName?.toLowerCase().replace(/\s/g, "_"))} · {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Content text */}
      {post.content && (
        <div style={{ padding: "0 20px 14px", fontSize: 15, color: "#1e293b", lineHeight: 1.6 }}>
          {renderContent(post.content)}
        </div>
      )}

      {/* Image */}
      {post.mediaURL && (
        <div style={{ width: "100%", maxHeight: 480, overflow: "hidden" }}>
          <img
            src={post.mediaURL}
            alt="post"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        borderTop: "1px solid #f1f5f9",
      }}>
        <button
          onClick={handleLike}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: liked ? "#e11d48" : "#64748b",
            fontSize: 14, fontWeight: 500, padding: 0,
            transition: "color .15s",
          }}
        >
          <Heart size={18} fill={liked ? "#e11d48" : "none"} />
          {likeCount > 0 && likeCount}
        </button>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "#64748b", fontSize: 14, fontWeight: 500, padding: 0,
          }}
        >
          <MessageCircle size={18} />
          {post.commentCount > 0 && post.commentCount}
        </button>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "#64748b", fontSize: 14, fontWeight: 500, padding: 0,
          }}
        >
          <Share2 size={18} />
          {post.shareCount > 0 && post.shareCount}
        </button>
      </div>
    </div>
  );
}