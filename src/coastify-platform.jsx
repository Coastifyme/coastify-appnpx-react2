import { useState, useRef, useCallback, useEffect } from "react";

// ─── BRAND + MODES ────────────────────────────────────────────────────────────
const BRAND = { turquoise: "#2BBFBF", teal: "#003d40", sand: "#c8a97e" };

const MODE_DEFS = {
  business:  { 
    label:"Business",  emoji:"💼", color:"#2BBFBF", 
    gradient:"linear-gradient(145deg,#003d40,#006d72,#2BBFBF)", 
    links:[
      { label:"💾 Save My Contact", action:"save-vcf" },
      { label:"🔗 LinkedIn", url:"https://www.linkedin.com/in/petra-coastify-16b3a0397?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
      { label:"💳 Venmo", url:"https://www.venmo.com/u/coastify" },
      { label:"📸 Instagram", url:"https://www.instagram.com/coastify_org?igsh=emVrdHRrdTU3a3Rz" },
      { label:"🌐 Website", url:"https://www.coastify.org" },
    ]
  },
  social:    { label:"Social",    emoji:"🖤", color:"#ff4fa3", gradient:"linear-gradient(145deg,#1a0010,#6b0040,#ff4fa3)", links:[
      { label:"📸 Instagram", url:"https://www.instagram.com/coastify_org?igsh=emVrdHRrdTU3a3Rz" },
      { label:"📘 Facebook", url:"https://www.facebook.com/profile.php?id=6158212038966" },
      { label:"🧵 Threads", url:"https://www.threads.net/@coastify_org" },
      { label:"🎧 Coastify Song 1", url:"https://suno.com/s/YIZGFJUNarTt4xip" },
      { label:"🎧 Coastify Song 2", url:"https://suno.com/s/yO1vX6xI0HAcDcYa" },
      { label:"🎧 Coastify Song 3", url:"https://suno.com/s/nULKLDMRcvbyFz2G" },
    ] },
  portfolio: { label:"Portfolio", emoji:"🎨", color:"#a78bfa", gradient:"linear-gradient(145deg,#0d1b2a,#2d1b5a,#a78bfa)", links:["🖼 View Gallery","▶️ Watch Reel","⭐ Testimonials","💰 Pricing","📩 Book Now"] },
  event:     { label:"Event",     emoji:"🎉", color:"#ff6b6b", gradient:"linear-gradient(145deg,#1a0030,#5a0050,#ff6b6b)", links:["🎁 Exclusive Offer","🎟 Enter Giveaway","📅 Schedule Demo","🔗 Connect"], live:true },
};

const PROFILE = {
  name: "Petra",
  role: "Founder · Coastify",
  tagline: "Wearable identity for the modern professional.",
  emoji: "🧠",
  color: "#2BBFBF",
  accentGradient: "linear-gradient(135deg,#003d40,#2BBFBF)",
  activeMode: "business",
};

// ─── CONTEXT FIELDS BY MODE ───────────────────────────────────────────────────
const CAPTURE_FIELDS = {
  business: [
    { key:"name",    label:"Your Name",    placeholder:"Alex Johnson",         type:"text"  },
    { key:"company", label:"Company",      placeholder:"Acme Corp",            type:"text"  },
    { key:"role",    label:"Your Role",    placeholder:"VP of Sales",          type:"text"  },
    { key:"email",   label:"Email",        placeholder:"alex@acmecorp.com",    type:"email" },
    { key:"phone",   label:"Phone",        placeholder:"+1 (555) 000-0000",   type:"tel"   },
  ],
  event: [
    { key:"name",  label:"Your Name",  placeholder:"Alex Johnson",        type:"text"  },
    { key:"email", label:"Email",      placeholder:"alex@example.com",    type:"email" },
    { key:"phone", label:"Phone",      placeholder:"+1 (555) 000-0000",  type:"tel"   },
  ],
  social: [
    { key:"name",      label:"Your Name",    placeholder:"Alex",              type:"text" },
    { key:"instagram", label:"Instagram",    placeholder:"@alexjohnson",      type:"text" },
    { key:"spotify",   label:"Spotify",      placeholder:"Spotify username",  type:"text" },
  ],
  portfolio: [
    { key:"name",    label:"Your Name",    placeholder:"Alex Johnson",       type:"text"  },
    { key:"email",   label:"Email",        placeholder:"alex@example.com",   type:"email" },
    { key:"company", label:"Company",      placeholder:"Your studio/agency", type:"text"  },
  ],
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes up   { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
  @keyframes down { from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);} }
  @keyframes ripple { 0%{width:60px;height:60px;opacity:.8;} 100%{width:900px;height:900px;opacity:0;} }
  @keyframes pulse  { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  @keyframes spin   { to{transform:rotate(360deg);} }
  @keyframes slideUp{ from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;} }
  @keyframes glow   { 0%,100%{box-shadow:0 0 30px #2BBFBF44;} 50%{box-shadow:0 0 60px #2BBFBF88;} }
  @keyframes scanLine{ 0%{top:10%;} 100%{top:88%;} }
  @keyframes checkPop{ 0%{transform:scale(0);} 70%{transform:scale(1.2);} 100%{transform:scale(1);} }
  @keyframes float  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
  input, textarea { outline:none; }
  button { cursor:pointer; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-thumb { background:#2BBFBF33; border-radius:4px; }
`;

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ color = "#fff", size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`,
      borderTopColor: color,
      animation: "spin .8s linear infinite",
      display: "inline-block",
    }} />
  );
}

// ─── AI CARD SCANNER ─────────────────────────────────────────────────────────
function CardScanner({ onExtracted, onClose, accentColor }) {
  const fileRef = useRef(null);
  const [scanPhase, setScanPhase] = useState("idle"); // idle | scanning | extracting | done | error
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      setScanPhase("scanning");
      await new Promise(r => setTimeout(r, 1200));
      setScanPhase("extracting");

      // ── AI EXTRACTION via Claude API ────────────────────────────────────
      try {
        const base64 = dataUrl.split(",")[1];
        const mediaType = file.type || "image/jpeg";

        const response = await fetch("/api/scan-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mediaType }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || payload.details || "Card scan failed.");
        }

        setExtracted(payload);
        setScanPhase("done");
      } catch (err) {
        setErrorMsg("Couldn't read the card clearly. Try a better-lit photo.");
        setScanPhase("error");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        width: "min(420px, 100%)",
        background: "#0f1416",
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${accentColor}33`,
        animation: "slideUp .35s ease",
      }}>
        {/* Header */}
        <div style={{
          background: `${accentColor}14`,
          borderBottom: `1px solid ${accentColor}22`,
          padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📇 AI Card Scanner</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
              AI extracts your info automatically
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.6)", borderRadius: 20, padding: "6px 14px",
            fontSize: 12, fontWeight: 600,
          }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {scanPhase === "error" && errorMsg && (
            <div style={{
              marginBottom: 18,
              padding: "14px 16px",
              borderRadius: 16,
              background: "#4e1b1b",
              border: "1px solid #7f2b2b",
              color: "#ffe6e6",
              fontSize: 13,
              lineHeight: 1.4,
            }}>
              <strong>AI error:</strong> {errorMsg}
            </div>
          )}

          {/* IDLE: upload prompt */}
          {scanPhase === "idle" && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${accentColor}44`,
                  borderRadius: 18, padding: "36px 20px",
                  textAlign: "center", cursor: "pointer",
                  background: `${accentColor}08`,
                  transition: "all .2s",
                }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📇</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  Take a photo or upload
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.5 }}>
                  Point your camera at their business card.<br />
                  <span style={{ color: accentColor }}>AI fills everything in automatically.</span>
                </div>
              </div>
              <input
                ref={fileRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: "100%", marginTop: 14,
                  background: accentColor, color: "#000",
                  border: "none", borderRadius: 14,
                  padding: "14px", fontWeight: 700, fontSize: 15,
                  boxShadow: `0 6px 24px ${accentColor}55`,
                }}>
                📸 Open Camera
              </button>
            </div>
          )}

          {/* SCANNING */}
          {(scanPhase === "scanning" || scanPhase === "extracting") && preview && (
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <img src={preview} alt="card" style={{ width: "100%", borderRadius: 14, display: "block", maxHeight: 220, objectFit: "cover" }} />
                {scanPhase === "scanning" && (
                  <>
                    <div style={{ position: "absolute", inset: 0, background: `${accentColor}18` }} />
                    {/* scan line */}
                    <div style={{
                      position: "absolute", left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                      animation: "scanLine 1s ease-in-out infinite alternate",
                      boxShadow: `0 0 12px ${accentColor}`,
                    }} />
                    {/* corner brackets */}
                    {[{top:8,left:8},{top:8,right:8},{bottom:8,left:8},{bottom:8,right:8}].map((pos,i) => (
                      <div key={i} style={{
                        position:"absolute", width:20, height:20,
                        borderTop: (i<2) ? `2px solid ${accentColor}` : "none",
                        borderBottom: (i>=2) ? `2px solid ${accentColor}` : "none",
                        borderLeft: (i%2===0) ? `2px solid ${accentColor}` : "none",
                        borderRight: (i%2===1) ? `2px solid ${accentColor}` : "none",
                        ...pos,
                      }} />
                    ))}
                  </>
                )}
                {scanPhase === "extracting" && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <Spinner color={accentColor} size={28} />
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>AI is reading the card…</div>
                  </div>
                )}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                {scanPhase === "scanning" ? "Scanning card…" : "Extracting contact details with AI…"}
              </div>
            </div>
          )}

          {/* DONE: review extracted data */}
          {scanPhase === "done" && extracted && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#4ade8033", border: "2px solid #4ade80",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, animation: "checkPop .4s ease",
                }}>✓</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Card read successfully</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Review and confirm below</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {Object.entries(extracted).filter(([,v]) => v).map(([key, val]) => (
                  <div key={key} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "capitalize" }}>{key}</span>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setScanPhase("idle"); setPreview(null); setExtracted(null); }} style={{
                  flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "12px", fontSize: 13, fontWeight: 600,
                }}>Rescan</button>
                <button onClick={() => onExtracted(extracted)} style={{
                  flex: 2, background: accentColor, color: "#000",
                  border: "none", borderRadius: 12, padding: "12px",
                  fontSize: 14, fontWeight: 700,
                  boxShadow: `0 4px 20px ${accentColor}55`,
                }}>Looks good →</button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {scanPhase === "error" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
              <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>Couldn't read the card</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 20 }}>{errorMsg}</div>
              <button onClick={() => { setScanPhase("idle"); setPreview(null); }} style={{
                background: accentColor, color: "#000", border: "none",
                borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14,
              }}>Try Again</button>
            </div>
          )}
        </div>

        {/* Toggle registration form */}
        <div style={{ maxWidth: 1200, margin: "12px auto 0", padding: "0 20px", display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => setShowRegister(s => !s)} style={{
            background: showRegister ? '#444' : '#ff4fa3',
            color: showRegister ? '#fff' : '#000',
            border: 'none', borderRadius: 14, padding: '12px 18px', fontWeight: 700,
          }}>
            {showRegister ? 'Hide Registration' : 'Create New Profile'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── LEAD CAPTURE SHEET ───────────────────────────────────────────────────────
function LeadCapture({ mode, profile, onComplete, onSkip }) {
  const m = MODE_DEFS[mode];
  const fields = CAPTURE_FIELDS[mode] ?? CAPTURE_FIELDS.business;
  const [form, setForm] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState("form"); // form | success

  const handleScanExtracted = (data) => {
    // map extracted AI data to form fields
    const mapped = {};
    fields.forEach(f => {
      if (data[f.key]) mapped[f.key] = data[f.key];
    });
    setForm(prev => ({ ...prev, ...mapped }));
    setShowScanner(false);
  };

  const handleSubmit = async () => {
    if (!form.name && !form.email) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1000)); // simulate save
    setSubmitting(false);
    setStep("success");
    setTimeout(onComplete, 1800);
  };

  const filled = Object.values(form).some(v => v?.trim());

  return (
    <>
      {showScanner && (
        <CardScanner
          accentColor={m.color}
          onExtracted={handleScanExtracted}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div style={{
        position: "fixed", inset: 0, zIndex: 2000,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        padding: "0",
      }}>
        {/* Backdrop */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />

        {/* Sheet */}
        <div style={{
          position: "relative", zIndex: 1,
          width: "min(460px, 100%)",
          background: "#0f1416",
          borderRadius: "24px 24px 0 0",
          padding: "0 0 40px",
          animation: "slideUp .4s cubic-bezier(0.34,1.2,0.64,1)",
          maxHeight: "92vh", overflowY: "auto",
          border: `1px solid ${m.color}22`,
          borderBottom: "none",
        }}>
          {/* Handle */}
          <div style={{ padding: "14px 0 0", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>

          {step === "form" && (
            <div style={{ padding: "16px 24px 0" }}>
              {/* Header */}
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 22 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                  background: profile.accentGradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, boxShadow: `0 6px 24px ${m.color}44`,
                }}>{profile.emoji}</div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 17, fontFamily: "Georgia, serif" }}>
                    {profile.name}
                  </div>
                  <div style={{ color: m.color, fontSize: 12, fontWeight: 600, marginTop: 2 }}>{profile.role}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 3 }}>
                    Share your info to connect instantly
                  </div>
                </div>
              </div>

              {/* Scan CTA — hero button */}
              <button onClick={() => setShowScanner(true)} style={{
                width: "100%", marginBottom: 16,
                background: `${m.color}18`,
                border: `1.5px solid ${m.color}55`,
                borderRadius: 16, padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 14,
                transition: "all .2s", textAlign: "left",
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `${m.color}22`,
                  border: `1px solid ${m.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>📇</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Scan my business card</div>
                  <div style={{ color: m.color, fontSize: 11, marginTop: 2 }}>
                    AI fills everything in automatically
                  </div>
                </div>
                <div style={{ color: m.color, fontSize: 18, opacity: 0.6 }}>→</div>
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: 1 }}>OR TYPE</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {fields.map(f => (
                  <div key={f.key}>
                    <label style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 1, display: "block", marginBottom: 5 }}>
                      {f.label.toUpperCase()}
                    </label>
                    <input
                      type={f.type} placeholder={f.placeholder}
                      value={form[f.key] ?? ""}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{
                        width: "100%",
                        background: form[f.key] ? `${m.color}10` : "rgba(255,255,255,0.05)",
                        border: form[f.key] ? `1.5px solid ${m.color}55` : "1.5px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, padding: "13px 16px",
                        color: "#fff", fontSize: 14,
                        transition: "all .2s",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={!filled || submitting} style={{
                width: "100%",
                background: filled ? m.color : "rgba(255,255,255,0.08)",
                color: filled ? "#000" : "rgba(255,255,255,0.3)",
                border: "none", borderRadius: 14, padding: "15px",
                fontWeight: 700, fontSize: 15,
                transition: "all .25s",
                boxShadow: filled ? `0 6px 28px ${m.color}55` : "none",
                marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {submitting ? <Spinner color="#000" size={18} /> : "Connect & View Profile →"}
              </button>

              {/* Skip */}
              <button onClick={onSkip} style={{
                width: "100%", background: "transparent", border: "none",
                color: "rgba(255,255,255,0.28)", fontSize: 13, padding: "8px",
              }}>
                ⏩ Skip & continue without sharing
              </button>
            </div>
          )}

          {step === "success" && (
            <div style={{ padding: "30px 24px", textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: `${m.color}22`, border: `2px solid ${m.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 34, margin: "0 auto 16px",
                animation: "checkPop .4s ease",
              }}>✓</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 20, fontFamily: "Georgia, serif", marginBottom: 8 }}>
                Connected!
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                Unlocking {profile.name}'s profile…
              </div>
              <div style={{ marginTop: 20 }}>
                <Spinner color={m.color} size={22} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProfileRegistration({
  const [showRegister, setShowRegister] = useState(false);
  onCreated }) {
  const [form, setForm] = useState({
    name: "",
    role: "",
    tagline: "",
    email: "",
    instagram: "",
    facebook: "",
    threads: "",
    linkedin: "",
    website: "",
    emoji: "✨",
    color: "#ff4fa3",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = form.name.trim() && form.role.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.details || "Failed to create profile.");
      }

      onCreated(payload);
    } catch (err) {
      setError(err?.message || "Unable to create profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      width: "min(540px, 100%)",
      background: "#0f1416",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 28,
      padding: 28,
      marginBottom: 36,
   {/* Only show the registration layout if showRegister is true */}
{showRegister ? (
  <div style={{ marginBottom: "20px" }}>
    <div style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
      Create your own Coastify profile
    </div>
    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px", lineHeight: 1.6 }}>
      {/* Your existing registration form input fields stay right here */}
    </div>
  </div>
) : (
  /* Show ONLY this single clean button under profiles when hidden */
  <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", marginBottom: "20px" }}>
    <button
      onClick={() => setShowRegister(true)}
      style={{
        backgroundColor: "#222",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.2)",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "600"
      }}
    >
      ➕ Create New Profile
    </button>
  </div>
)}
) : (
  /* Show ONLY this single clean button under profiles when hidden */
  <div style={{ display: "flex", justifyContent: "center", marginTop: 20, marginBottom: 20 }}>
    <button
      onClick={() => setShowRegister(true)}
      style={{
        backgroundColor: "#222",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.2)",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "600",
        transition: "all 0.2s ease"
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#333"}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#222"}
    >
      ➕ Create New Profile
    </button>
  </div>
)}
      {error && (
        <div style={{
          marginBottom: 18,
          padding: "14px 16px",
          borderRadius: 16,
          background: "#4e1b1b",
          border: "1px solid #7f2b2b",
          color: "#ffe6e6",
          fontSize: 13,
          lineHeight: 1.4,
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {[
          { key: "name", label: "Name", placeholder: "Alex Johnson" },
          { key: "role", label: "Role", placeholder: "Founder · NewBrand" },
          { key: "tagline", label: "Tagline", placeholder: "Wearable identity for modern creators" },
          { key: "email", label: "Email", placeholder: "alex@newbrand.com" },
          { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourname" },
          { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourname" },
          { key: "threads", label: "Threads", placeholder: "https://www.threads.net/@yourname" },
          { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/yourname" },
          { key: "website", label: "Website", placeholder: "https://yourbrand.com" },
        ].map(field => (
          <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            {field.label}
            <input
              value={form[field.key]}
              onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                padding: "13px 14px",
                fontSize: 14,
              }}
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        style={{
          width: "100%",
          marginTop: 18,
          background: canSubmit ? "#ff4fa3" : "rgba(255,255,255,0.08)",
          color: canSubmit ? "#000" : "rgba(255,255,255,0.4)",
          border: "none",
          borderRadius: 16,
          padding: "16px",
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: submitting ? 0.95 : 1,
        }}>
        {submitting ? <Spinner color="#000" size={18} /> : "Create my profile"}
      </button>
    </div>
  );
}

function ProfilePage({ slug, profile, loading, error, onBack }) {
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c0d" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <Spinner color="#ff4fa3" size={28} />
          <div style={{ marginTop: 16 }}>Loading profile…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c0d", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "#0f1416", borderRadius: 24, padding: 28, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "#ff6b6b", fontWeight: 700, marginBottom: 12 }}>Profile not found</div>
          <div style={{ color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>{error}</div>
          <button onClick={onBack} style={{ background: "#2bbfbf", border: "none", borderRadius: 14, padding: "12px 18px", color: "#000", fontWeight: 700 }}>
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position: "fixed", top: 16, left: 16, zIndex: 9999 }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 14, padding: "10px 14px", cursor: "pointer" }}>
          ← Home
        </button>
      </div>
      <TapPage key={slug} profile={profile} mode={profile.activeMode || "social"} />
    </>
  );
}

function CoastifyApp() {
  const [route, setRoute] = useState({ type: "home", slug: null });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("business");
  const [showRegister, setShowRegister] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [started, setStarted] = useState(false);

  const fetchProfile = useCallback(async (slug) => {
    setLoading(true);
    setError("");
    setProfile(null);

    try {
      const response = await fetch(`/api/profiles?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.details || "Profile not found.");
      }
      setProfile(data.profile);
      setActiveMode(data.profile.activeMode || "social");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const parseRoute = useCallback(() => {
    const path = window.location.pathname || "/";
    if (path.startsWith("/u/")) {
      const slug = path.slice(3).replace(/\/$/, "");
      if (slug) {
        setRoute({ type: "profile", slug });
        fetchProfile(slug);
        return;
      }
    }
    setRoute({ type: "home", slug: null });
    setProfile(null);
    setError("");
  }, [fetchProfile]);

  useEffect(() => {
    parseRoute();
  }, [parseRoute]);

  useEffect(() => {
    const onPop = () => parseRoute();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [parseRoute]);

  const handleCreate = (payload) => {
    const slug = payload.slug;
    window.history.pushState({}, "", `/u/${slug}`);
    setRoute({ type: "profile", slug });
    setProfile(payload.profile);
    setActiveMode(payload.profile.activeMode || "social");
  };

  const handleBack = () => {
    window.history.pushState({}, "", "/");
    setRoute({ type: "home", slug: null });
    setProfile(null);
    setError("");
  };

  if (route.type === "profile") {
    return <ProfilePage slug={route.slug} profile={profile} loading={loading} error={error} onBack={handleBack} />;
  }

  if (started) {
    return (
      <>
        <style>{CSS}</style>
        <TapPage key={runKey} profile={PROFILE} mode={activeMode} />
        <button
          onClick={() => setStarted(false)}
          style={{
            position: "fixed", top: 16, right: 16, zIndex: 9999,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)", borderRadius: 20,
            padding: "8px 16px", fontSize: 12, fontWeight: 600,
          }}>
          ← Demo Menu
        </button>
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080c0d", color: "#fff", fontFamily: "'Helvetica Neue', Helvetica, sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "start" }}>
          <div>
            <div style={{ marginBottom: 24, animation: "up .4s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#2BBFBF,#003d40)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff" }}>C</div>
                <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 22 }}>Coastify</div>
              </div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px,5vw,42px)", margin: 0 }}>Build a unique profile link for your network.</h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, maxWidth: 560, marginTop: 12 }}>
                Create a multi-profile Coastify page that users can open at <strong>/u/your-slug</strong>. The platform now supports unique profile registration and dynamic profile pages.
              </p>
            </div>
            {showRegister && (
              <ProfileRegistration onCreated={handleCreate} />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#0f1416", borderRadius: 28, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Demo</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, margin: "0 0 12px" }}>Preview the tap experience</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7 }}>Choose a mode to simulate a bracelet tap and see how the profile reveal works.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginTop: 20 }}>
                {Object.entries(MODE_DEFS).map(([key, m], i) => (
                  <button key={key} onClick={() => { setActiveMode(key); setRunKey(k => k + 1); setStarted(true); }} style={{
                    background: `${m.color}12`,
                    border: `1.5px solid ${m.color}33`,
                    borderRadius: 18, padding: "18px 16px",
                    cursor: "pointer", textAlign: "left",
                    transition: "all .22s cubic-bezier(0.4,0,0.2,1)",
                    animation: `up .4s ease ${0.05 + i * 0.05}s both`,
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{m.emoji}</div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "Georgia, serif" }}>{m.label}</div>
                    <div style={{ color: m.color, fontSize: 11, marginTop: 3, fontWeight: 600 }}>{key === "event" ? "● LIVE" : "Tap to simulate"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "#0f1416", borderRadius: 28, padding: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Quick Start</div>
              <ul style={{ paddingLeft: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, fontSize: 14 }}>
                <li>Enter your name, role and social links.</li>
                <li>Create your profile and get a unique `/u/slug` link.</li>
                <li>Share the generated link with your network.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAP REVEAL + PROFILE PAGE ────────────────────────────────────────────────────────────────
function TapPage({ profile, mode }) {
  const m = MODE_DEFS[mode];
  const [tapPhase, setTapPhase] = useState("idle");      // idle | ring | capture | profile
  const [captureMode, setCaptureMode] = useState("lead"); // lead | skip

  useEffect(() => {
    const t1 = setTimeout(() => setTapPhase("ring"), 80);
    const t2 = setTimeout(() => setTapPhase("capture"), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleCaptureComplete = () => setTapPhase("profile");
  const handleSkip = () => setTapPhase("profile");

  const downloadVCF = () => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${profile.name}`,
      profile.role ? `ORG:${profile.role}` : null,
      `EMAIL:${profile.email || "info@coastify.org"}`,
      profile.phone ? `TEL:${profile.phone}` : null,
      `URL:${profile.website || "https://www.coastify.org"}`,
    ].filter(Boolean);

    if (profile.linkedin) lines.push(`X-SOCIAL-PROFILE;TYPE=LINKEDIN:${profile.linkedin}`);
    if (profile.instagram) lines.push(`X-SOCIAL-PROFILE;TYPE=INSTAGRAM:${profile.instagram}`);
    if (profile.facebook) lines.push(`X-SOCIAL-PROFILE;TYPE=FACEBOOK:${profile.facebook}`);
    if (profile.threads) lines.push(`X-SOCIAL-PROFILE;TYPE=THREADS:${profile.threads}`);
    lines.push("END:VCARD");

    const vcf = lines.join("\n");
    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name}-coastify.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLinkClick = (link) => {
    if (link.action === "save-vcf") {
      downloadVCF();
    } else if (link.url) {
      window.open(link.url, "_blank");
    }
  };

  const getLinkLabel = (link) => typeof link === "string" ? link : link.label;

  return (
    <div style={{
      minHeight: "100vh",
      background: tapPhase === "profile" ? m.gradient : (tapPhase === "idle" ? "#050708" : "#0a0e0f"),
      transition: "background 1.1s cubic-bezier(0.4,0,0.2,1)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", overflow: "hidden",
      position: "relative",
      fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
    }}>

      {/* Ripples on tap */}
      {tapPhase === "ring" && [0,1,2].map(i => (
        <div key={i} style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: `1.5px solid ${m.color}`,
          animation: `ripple 1.6s ease-out ${i*.22}s forwards`,
          pointerEvents: "none", zIndex: 0,
        }} />
      ))}

      {/* Lead capture sheet */}
      {tapPhase === "capture" && (
        <LeadCapture
          mode={mode}
          profile={profile}
          onComplete={handleCaptureComplete}
          onSkip={handleSkip}
        />
      )}

      {/* Profile — shown after capture/skip */}
      {tapPhase === "profile" && (
        <div style={{
          position: "relative", zIndex: 1,
          width: "min(420px, 100%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          animation: "up .6s cubic-bezier(0.34,1.4,0.64,1)",
        }}>
          {m.live ? (
            <div style={{ background:"#ff3b30", color:"#fff", fontSize:11, fontWeight:700, letterSpacing:3, padding:"4px 16px", borderRadius:20, animation:"pulse 1.4s infinite" }}>● LIVE EVENT</div>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.18)", color:"#fff", fontSize:11, fontWeight:700, letterSpacing:3, padding:"4px 16px", borderRadius:20 }}>{m.label.toUpperCase()}</div>
          )}

          <div style={{
            width:96, height:96, borderRadius:"50%",
            background:"rgba(255,255,255,0.12)",
            border:`3px solid ${m.color}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:48, boxShadow:`0 0 50px ${m.color}66`,
            animation:"glow 3s ease-in-out infinite",
          }}>{profile.emoji}</div>

          <div style={{ textAlign:"center" }}>
            <div style={{ color:"#fff", fontWeight:700, fontSize:"clamp(22px,5vw,28px)", fontFamily:"Georgia, serif" }}>{profile.name}</div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14, marginTop:5 }}>{profile.role}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:6, fontStyle:"italic" }}>"{profile.tagline}"</div>
          </div>

          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
            {(profile.links ?? m.links).map((link, i) => (
              <div 
                key={typeof link === "string" ? link : link.label}
                onClick={() => handleLinkClick(link)}
                style={{
                background: i===0 ? m.color : "rgba(255,255,255,0.13)",
                borderRadius:14, padding:"15px 20px",
                color: i===0 ? "#000" : "#fff",
                fontSize:15, fontWeight: i===0 ? 700 : 500,
                textAlign:"center", cursor:"pointer",
                boxShadow: i===0 ? `0 6px 28px ${m.color}55` : "none",
                animation:`up .5s ease ${.1+i*.09}s both`,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 32px ${m.color}66`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = i===0 ? `0 6px 28px ${m.color}55` : "none";
              }}
              >{getLinkLabel(link)}</div>
            ))}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:7, marginTop:8, animation:"up .5s ease .8s both" }}>
            <div style={{ width:20, height:20, borderRadius:6, background:"linear-gradient(135deg,#2BBFBF,#003d40)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#fff" }}>C</div>
            <span style={{ color:"rgba(255,255,255,0.25)", fontSize:11, letterSpacing:1 }}>coastify.org</span>
          </div>
        </div>
      )}

      {/* Ambient glow */}
      {tapPhase === "profile" && (
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:`radial-gradient(circle at 50% 30%, ${m.color}18, transparent 60%)`, zIndex:0 }} />
      )}

      {tapPhase === "profile" && (
        <div style={{ position:"fixed", bottom:20, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(10px)", borderRadius:20, padding:"8px 20px", fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:1, animation:"up .5s ease 1s both", zIndex:2 }}>
          ✓ No reprogram needed. Ever.
        </div>
      )}
    </div>
  );
}

export default CoastifyApp;
