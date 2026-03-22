import { useEffect, useState } from "react";
import {
  collection, onSnapshot, query, orderBy, limit,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import StoryBar from "../components/StoryBar";
import PostCard from "../components/PostCard";
import CreatePostModal from "../components/CreatePostModal";
import { useAuth } from "../context/AuthContext";
import { Sparkles, TrendingUp } from "lucide-react";

function RightPanel() {
  return (
    <aside style={{ width: 260, flexShrink: 0 }}>
      {/* Trending */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: 20,
        border: "1px solid #f1f5f9", marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <TrendingUp size={16} style={{ color: "#7c3aed" }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Trending</span>
        </div>
        {["#AI", "#ReactJS", "#Firebase", "#WebDev", "#OpenSource"].map((tag) => (
          <div key={tag} style={{
            padding: "8px 0", borderBottom: "1px solid #f8fafc",
            fontSize: 14, color: "#7c3aed", fontWeight: 600, cursor: "pointer",
          }}>{tag}</div>
        ))}
      </div>

      {/* Sponsored */}
      <div style={{
        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
        borderRadius: 16, padding: 20, color: "#fff",
      }}>
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>SPONSORED</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
          Grow your skills with ConnectX Pro
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          Connect with top mentors and unlock premium learning paths.
        </div>
        <button style={{
          background: "#fff", color: "#7c3aed", border: "none",
          borderRadius: 10, padding: "8px 18px", fontWeight: 700, fontSize: 13,
          cursor: "pointer",
        }}>Learn More</button>
      </div>
    </aside>
  );
}

export default function FeedPage() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div style={{
      display: "flex",
      gap: 24,
      maxWidth: 1100,
      margin: "0 auto",
      padding: "28px 0",
    }}>
      {/* Main feed */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Story bar */}
        <StoryBar />

        {/* Post prompt bar */}
        {currentUser && (
          <div
            onClick={() => setShowCreate(true)}
            style={{
              background: "#fff", borderRadius: 16, padding: "14px 20px",
              border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", marginBottom: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,.04)",
              transition: "box-shadow .2s",
            }}
          >
            <img
              src={`https://ui-avatars.com/api/?name=U&background=7c3aed&color=fff`}
              alt="avatar"
              style={{ width: 40, height: 40, borderRadius: "50%" }}
            />
            <div style={{
              flex: 1, padding: "10px 16px",
              background: "#f8fafc", borderRadius: 24,
              color: "#94a3b8", fontSize: 15,
            }}>
              What's on your mind?
            </div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            {[1, 2, 3].map((i) => (
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
                <div style={{ height: 200, background: "#f1f5f9", borderRadius: 12 }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 40px",
            background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9",
          }}>
            <Sparkles size={40} style={{ color: "#c4b5fd", marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", marginBottom: 8 }}>
              No posts yet
            </div>
            <div style={{ color: "#94a3b8", fontSize: 14 }}>
              Be the first to share something with the community!
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      {/* Right panel */}
      <RightPanel />

      {/* Create post modal */}
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}