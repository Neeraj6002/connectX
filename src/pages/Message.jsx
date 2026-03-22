import { useEffect, useRef, useState } from "react";
import {
  collection, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, doc, setDoc,
  getDoc, getDocs, where,
} from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "../context/AuthContext";
import { Send, Search, MessageCircle, ArrowLeft } from "lucide-react";

/* ── helpers ── */
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts.toMillis();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d`;
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m}m`;
  return "now";
}

function formatTime(ts) {
  if (!ts) return "";
  return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, photoURL, size = 40 }) {
  return (
    <img
      src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=7c3aed&color=fff&size=128`}
      alt={name}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  );
}

/* ── Conversation list item ── */
function ConvoItem({ convo, isActive, onClick, currentUserId }) {
  const other = convo.members.find(m => m.uid !== currentUserId) || convo.members[0];
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", cursor: "pointer", borderRadius: 12,
        background: isActive ? "#f5f3ff" : "transparent",
        transition: "background .15s",
      }}
    >
      <div style={{ position: "relative" }}>
        <Avatar name={other?.name} photoURL={other?.photoURL} size={46} />
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: 11, height: 11, borderRadius: "50%",
          background: "#22c55e", border: "2px solid #fff",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{other?.name || "User"}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(convo.lastMessageAt)}</span>
        </div>
        <div style={{
          fontSize: 13, color: convo.unread ? "#7c3aed" : "#94a3b8",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          fontWeight: convo.unread ? 600 : 400,
        }}>
          {convo.lastMessage || "Start a conversation"}
        </div>
      </div>
      {convo.unread && (
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#7c3aed", flexShrink: 0,
        }} />
      )}
    </div>
  );
}

/* ── Message bubble ── */
function Bubble({ msg, isOwn }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isOwn ? "flex-end" : "flex-start",
      marginBottom: 4,
    }}>
      <div style={{
        maxWidth: "68%", padding: "10px 14px",
        borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isOwn ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#f1f5f9",
        color: isOwn ? "#fff" : "#0f172a",
        fontSize: 14, lineHeight: 1.5,
        wordBreak: "break-word",
      }}>
        {msg.text}
      </div>
      <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
        {formatTime(msg.createdAt)}
      </span>
    </div>
  );
}

/* ── New conversation search ── */
function NewConvoPanel({ currentUser, userProfile, onStart, onCancel }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (val) => {
    setSearch(val);
    if (!val.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const all = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .filter(u =>
          u.uid !== currentUser.uid &&
          (u.displayName?.toLowerCase().includes(val.toLowerCase()) ||
           u.username?.toLowerCase().includes(val.toLowerCase()))
        );
      setResults(all);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <ArrowLeft size={18} color="#64748b" />
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>New Message</span>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#f8fafc", borderRadius: 12, padding: "10px 14px", marginBottom: 16,
        border: "1px solid #e2e8f0",
      }}>
        <Search size={16} color="#94a3b8" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name or username…"
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, flex: 1, color: "#0f172a" }}
        />
      </div>
      {searching && <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>Searching…</div>}
      {results.map(user => (
        <div
          key={user.uid}
          onClick={() => onStart(user)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 8px", cursor: "pointer", borderRadius: 10,
            transition: "background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Avatar name={user.displayName} photoURL={user.photoURL} size={40} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>{user.displayName}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>@{user.username || "user"}</div>
          </div>
        </div>
      ))}
      {!searching && search && results.length === 0 && (
        <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginTop: 20 }}>No users found</div>
      )}
    </div>
  );
}

/* ── Chat window ── */
function ChatWindow({ convo, currentUser, userProfile }) {
  const other = convo.members.find(m => m.uid !== currentUser.uid) || convo.members[0];
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    const q = query(
      collection(db, "conversations", convo.id, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [convo.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    try {
      await addDoc(collection(db, "conversations", convo.id, "messages"), {
        text: msgText,
        senderId: currentUser.uid,
        senderName: userProfile?.displayName || currentUser.displayName || "User",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "conversations", convo.id), {
        lastMessage: msgText,
        lastMessageAt: serverTimestamp(),
      }, { merge: true });
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", gap: 12, background: "#fff",
      }}>
        <Avatar name={other?.name} photoURL={other?.photoURL} size={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{other?.name}</div>
          <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 500 }}>● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 2,
        background: "#fafbfc",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", margin: "auto", color: "#94a3b8", fontSize: 14 }}>
            <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Say hi to {other?.name}!</div>
          </div>
        )}
        {messages.map(msg => (
          <Bubble key={msg.id} msg={msg} isOwn={msg.senderId === currentUser.uid} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "14px 20px", borderTop: "1px solid #f1f5f9",
        display: "flex", alignItems: "flex-end", gap: 10, background: "#fff",
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Write a message… (Enter to send)"
          rows={1}
          style={{
            flex: 1, border: "1px solid #e2e8f0", borderRadius: 16,
            padding: "10px 16px", fontSize: 14, color: "#0f172a",
            resize: "none", outline: "none", fontFamily: "inherit",
            lineHeight: 1.5, background: "#f8fafc",
            maxHeight: 100, overflowY: "auto",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: text.trim() ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "#e2e8f0",
            color: text.trim() ? "#fff" : "#94a3b8",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: text.trim() ? "pointer" : "not-allowed",
            flexShrink: 0, transition: "all .2s",
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

/* ── Main Messages Page ── */
export default function MessagesPage() {
  const { currentUser, userProfile } = useAuth();
  const [convos, setConvos] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "conversations"),
      where("memberIds", "array-contains", currentUser.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setConvos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  const startConvo = async (otherUser) => {
    if (!currentUser) return;
    // Check if convo already exists
    const q = query(
      collection(db, "conversations"),
      where("memberIds", "array-contains", currentUser.uid)
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => d.data().memberIds.includes(otherUser.uid));
    if (existing) {
      setActiveConvo({ id: existing.id, ...existing.data() });
      setShowNew(false);
      return;
    }
    // Create new conversation
    const convoRef = await addDoc(collection(db, "conversations"), {
      memberIds: [currentUser.uid, otherUser.uid],
      members: [
        {
          uid: currentUser.uid,
          name: userProfile?.displayName || currentUser.displayName || "User",
          photoURL: userProfile?.photoURL || currentUser.photoURL || null,
        },
        {
          uid: otherUser.uid,
          name: otherUser.displayName || "User",
          photoURL: otherUser.photoURL || null,
        },
      ],
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    });
    const newConvo = await getDoc(convoRef);
    setActiveConvo({ id: newConvo.id, ...newConvo.data() });
    setShowNew(false);
  };

  return (
    <div style={{
      display: "flex", height: "calc(100vh - 0px)",
      maxWidth: 1000, margin: "0 auto",
      background: "#fff", borderRadius: 20,
      border: "1px solid #f1f5f9",
      overflow: "hidden",
      marginTop: 24,
      boxShadow: "0 4px 24px rgba(0,0,0,.06)",
    }}>
      {/* Left panel — conversation list */}
      <div style={{
        width: 320, borderRight: "1px solid #f1f5f9",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 16px 12px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>Messages</span>
          <button
            onClick={() => setShowNew(true)}
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              border: "none", borderRadius: 10, padding: "7px 14px",
              color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >+ New</button>
        </div>

        {/* List or new convo search */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {showNew ? (
            <NewConvoPanel
              currentUser={currentUser}
              userProfile={userProfile}
              onStart={startConvo}
              onCancel={() => setShowNew(false)}
            />
          ) : (
            <div style={{ padding: "8px 8px" }}>
              {convos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 14 }}>
                  <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>No conversations yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ New" to start one</div>
                </div>
              ) : convos.map(c => (
                <ConvoItem
                  key={c.id}
                  convo={c}
                  isActive={activeConvo?.id === c.id}
                  onClick={() => setActiveConvo(c)}
                  currentUserId={currentUser?.uid}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — chat window */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeConvo ? (
          <ChatWindow
            key={activeConvo.id}
            convo={activeConvo}
            currentUser={currentUser}
            userProfile={userProfile}
          />
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "#94a3b8",
          }}>
            <MessageCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontWeight: 600, fontSize: 16, color: "#64748b" }}>Select a conversation</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>or start a new one</div>
          </div>
        )}
      </div>
    </div>
  );
}