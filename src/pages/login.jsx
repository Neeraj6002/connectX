import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase-config";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

/* ── Create both docs on first login ── */
async function ensureUserDocs(user, extraData = {}) {
  const displayName = user.displayName || extraData.displayName || "";
  const photoURL    = user.photoURL    || null;
  const email       = user.email       || "";

  // 1. users/{uid}
  const userRef  = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid, email, displayName, photoURL,
      followers: [], following: [], pendingIn: [],
      pendingOut: [], connections: [],
      createdAt: serverTimestamp(),
    });
  }

  // 2. profile/{uid} — source of truth for follow arrays + profile data
  const profileRef  = doc(db, "profile", user.uid);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    await setDoc(profileRef, {
      uid: user.uid, email, displayName, photoURL,
      username: "", bio: "", location: "", website: "",
      coverURL: null, roles: [], skills: [],
      // follow arrays live here
      followers: [], following: [], pendingIn: [],
      pendingOut: [], connections: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
  outline: "none", boxSizing: "border-box", background: "#f8fafc",
};

const friendlyError = (code) => {
  switch (code) {
    case "auth/user-not-found":        return "No account found with this email.";
    case "auth/wrong-password":        return "Incorrect password.";
    case "auth/invalid-credential":    return "Incorrect email or password.";
    case "auth/email-already-in-use":  return "This email is already registered.";
    case "auth/weak-password":         return "Password must be at least 6 characters.";
    case "auth/invalid-email":         return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":  return "Google sign-in was cancelled.";
    case "auth/popup-blocked":         return "Popup was blocked. Please allow popups for this site.";
    case "auth/unauthorized-domain":   return "This domain is not authorized. Add it in Firebase Console → Auth → Authorized domains.";
    case "auth/cancelled-popup-request": return "Sign-in cancelled.";
    default:                           return "Something went wrong. Please try again.";
  }
};

export default function LoginPage() {
  const navigate  = useNavigate();
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureUserDocs({ ...cred.user, displayName: name.trim() });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDocs(cred.user);
      }
      navigate("/feed");
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      await ensureUserDocs(cred.user);
      navigate("/feed");
    } catch (e) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 50%, #fce7f3 100%)",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, width: 420, maxWidth: "100%",
        padding: "40px 36px", boxShadow: "0 20px 60px rgba(124,58,237,.12)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 20,
          }}>C</div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
            Connect<span style={{ color: "#7c3aed" }}>X</span>
          </span>
        </div>

        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#94a3b8", textAlign: "center" }}>
          {mode === "login" ? "Sign in to continue to ConnectX" : "Join ConnectX and start connecting"}
        </p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%", padding: "12px 0", borderRadius: 12,
          border: "1px solid #e2e8f0", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontWeight: 600, fontSize: 14, color: "#0f172a", cursor: "pointer",
          marginBottom: 20, transition: "background .15s",
          opacity: loading ? 0.7 : 1,
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "Please wait…" : "Continue with Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Warren" style={inputStyle} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={inputStyle}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input type={showPw ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 44 }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <button onClick={() => setShowPw(!showPw)} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0,
            }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
            padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16,
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: loading ? "#e2e8f0" : "linear-gradient(135deg, #7c3aed, #a855f7)",
          color: loading ? "#94a3b8" : "#fff",
          fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 20,
        }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "#64748b" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
