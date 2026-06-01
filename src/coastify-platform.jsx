import { useCallback, useEffect, useRef, useState } from "react";

const myContact = {
  name: "Petra Coastify",
  company: "Coastify",
  email: "info@coastify.org",
  phone: "+1 (484) 649-4326",
  website: "https://coastify.org",
};

const emptyForm = { name: "", email: "", phone: "", note: "" };

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function compressImage(dataUrl, maxWidth = 1080, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function CardScanner({ onExtracted, onClose, accentColor }) {
  const fileRef = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setErrorMsg("");
    setPhase("scanning");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalDataUrl = event.target.result;
      setPreview(originalDataUrl);

      try {
        const compressedDataUrl = await compressImage(originalDataUrl);
        const base64 = compressedDataUrl.split(",")[1];
        const mediaType = "image/jpeg";
        setPhase("extracting");

        const response = await fetch("/api/scan-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mediaType }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to extract card data.");
        }

        onExtracted(data);
        setPhase("done");
      } catch (err) {
        setErrorMsg(err.message || "AI couldn’t fill the card. Try a clearer photo.");
        setPhase("error");
      }
    };
    reader.readAsDataURL(file);
  }, [onExtracted]);

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
      }}>
        <div style={{
          background: `${accentColor}14`,
          borderBottom: `1px solid ${accentColor}22`,
          padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📇 AI Card Scanner</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
              Capture your card and auto-fill the lead form.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.6)", borderRadius: 20, padding: "6px 14px",
            fontSize: 12, fontWeight: 600,
          }}>✕</button>
        </div>

        {/* AI error banner (dismissible) */}
        {errorMsg && (
          <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(90deg,#3a1 0%,#2bbfbf 100%)", color: "#002522" }}>
            <div style={{ fontWeight: 700 }}>AI Error</div>
            <div style={{ flex: 1, color: "rgba(0,0,0,0.75)", fontSize: 13, overflowWrap: "anywhere" }}>{errorMsg}</div>
            <button onClick={() => setErrorMsg("")} style={{ background: "transparent", border: "none", color: "#002522", fontWeight: 700 }}>Dismiss</button>
          </div>
        )}

        <div style={{ padding: 20 }}>
          {phase === "idle" && (
            <>
              <div style={{
                border: `2px dashed ${accentColor}44`,
                borderRadius: 18, padding: "36px 20px",
                textAlign: "center", cursor: "pointer",
                background: `${accentColor}08`,
              }} onClick={() => fileRef.current?.click()}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📇</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  Take a photo or upload
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.5 }}>
                  Upload a card image and let AI fill the form.
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button onClick={() => fileRef.current?.click()} style={{
                width: "100%", marginTop: 14,
                background: accentColor, color: "#000",
                border: "none", borderRadius: 14,
                padding: "14px", fontWeight: 700, fontSize: 15,
              }}>
                📷 Scan Business Card
              </button>
            </>
          )}

          {(phase === "scanning" || phase === "extracting") && preview && (
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                <img src={preview} alt="card preview" style={{ width: "100%", borderRadius: 14, display: "block", maxHeight: 220, objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Spinner color={accentColor} size={26} />
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                    {phase === "scanning" ? "Preparing image…" : "Extracting contact info…"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div style={{ color: "#fff", textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✅ Extracted</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>The form has been filled. Review and submit.</div>
            </div>
          )}

          {phase === "error" && (
            <div style={{ color: "#ffb3b3", textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>😕 Extraction failed</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 14 }}>{errorMsg}</div>
              <button onClick={() => setPhase("idle")} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: accentColor, color: "#000", fontWeight: 700 }}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoastifyPlatform() {
  const [stage, setStage] = useState("idle");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [leads, setLeads] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Unable to load leads");
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.warn(error);
    }
  };

  const handleTap = () => {
    if (navigator.vibrate) navigator.vibrate(120);
    setStage("connect");
    setMessage("");
  };

  const saveLead = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setMessage("Name and email are required to save a lead.");
      return;
    }

    setLoading(true);
    setMessage("");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(body.error || "Unable to save lead.");
      return;
    }

    setUnlocked(true);
    setStage("unlocked");
    setForm(emptyForm);
    fetchLeads();
  };

  const downloadVCF = () => {
    const vcf = `BEGIN:VCARD\nVERSION:3.0\nFN:${myContact.name}\nORG:${myContact.company}\nEMAIL:${myContact.email}\nTEL:${myContact.phone}\nURL:${myContact.website}\nEND:VCARD`;
    const blob = new Blob([vcf], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coastify-contact.vcf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStage("idle");
    setForm(emptyForm);
    setMessage("");
    setUnlocked(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#071214", color: "#fff", padding: "40px 20px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 24 }}>
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,#2BBFBF,#003d40)", display: "grid", placeItems: "center", fontWeight: 700, color: "#fff" }}>C</div>
            <div>
              <p style={{ margin: 0, color: "#2BBFBF", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>Coastify NFC</p>
              <h1 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05 }}>Real lead capture with Supabase persistence</h1>
            </div>
          </div>

          <p style={{ margin: 0, color: "rgba(255,255,255,0.68)", maxWidth: 680, lineHeight: 1.75 }}>
            Tap to connect, submit lead details, then unlock the contact card. Leads are stored in Supabase so they stay after refresh and can be reviewed in the dashboard.
          </p>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 20 }}>
          <div style={{ background: "#0b1318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: 28, minHeight: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, color: "#2BBFBF", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>NFC-style lead flow</p>
                <h2 style={{ margin: "10px 0 0", fontSize: "1.5rem" }}>Touch to start</h2>
              </div>
              <div style={{ padding: "10px 16px", borderRadius: 16, background: "rgba(43,188,188,0.12)", color: "#2BBFBF", fontWeight: 700 }}>LIVE</div>
            </div>

            {stage === "idle" && (
              <div style={{ display: "grid", gap: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.7 }}>
                  Simulate a bracelet tap and open the lead capture sheet. This is the real system upgrade for Coastify.
                </p>
                <button onClick={handleTap} style={{ width: "100%", padding: "16px 20px", borderRadius: 18, border: "none", background: "#2BBFBF", color: "#000", fontWeight: 700, fontSize: 16, boxShadow: "0 18px 32px rgba(43,188,188,0.24)" }}>
                  Tap to Connect ✦
                </button>
              </div>
            )}

            {stage === "connect" && (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: 700 }}>Connection Found ✦</div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", lineHeight: 1.7 }}>
                    Enter the lead details and save them to Supabase. The contact unlocks after the lead is stored.
                  </p>
                </div>

                <button onClick={() => setShowScanner(true)} style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: 18,
              border: "none",
              background: "rgba(43,188,188,0.16)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}>
              📷 Scan Business Card and Autofill
            </button>

            <div style={{ display: "grid", gap: 12 }}>
                  <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" style={fieldStyle} />
                  <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" type="email" style={fieldStyle} />
                  <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" type="tel" style={fieldStyle} />
                  <textarea value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Note" rows={4} style={{ ...fieldStyle, minHeight: 110, resize: "vertical" }} />
                </div>
                {showScanner && (
                  <CardScanner
                    accentColor="#2BBFBF"
                    onExtracted={(data) => {
                      setForm((prev) => ({
                        ...prev,
                        name: data.name || prev.name,
                        email: data.email || prev.email,
                        phone: data.phone || prev.phone,
                        note: data.note ? data.note : (data.company ? `Company: ${data.company}` : prev.note),
                      }));
                      setShowScanner(false);
                      setStage("connect");
                    }}
                    onClose={() => setShowScanner(false)}
                  />
                )}

                {message && <div style={{ color: "#ffb3b3", fontSize: 13 }}>{message}</div>}

                <button onClick={saveLead} disabled={loading} style={{ width: "100%", padding: "16px 20px", borderRadius: 18, border: "none", background: "#2BBFBF", color: "#000", fontWeight: 700, fontSize: 15, display: "flex", justifyContent: "center", gap: 10 }}>
                  {loading ? "Saving lead..." : "Unlock Contact"}
                </button>
              </div>
            )}

            {stage === "unlocked" && unlocked && (
              <div style={{ display: "grid", gap: 18 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ color: "#2BBFBF", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 }}>Unlocked ✦</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{myContact.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{myContact.company}</div>
                </div>

                <div style={{ display: "grid", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 18 }}>
                  <div style={detailRow}>Email</div>
                  <div style={detailValue}>{myContact.email}</div>
                  <div style={detailRow}>Phone</div>
                  <div style={detailValue}>{myContact.phone}</div>
                  <div style={detailRow}>Website</div>
                  <div style={detailValue}>{myContact.website}</div>
                </div>

                <button onClick={downloadVCF} style={{ width: "100%", padding: "16px 20px", borderRadius: 18, border: "none", background: "#fff", color: "#003d40", fontWeight: 700, fontSize: 15 }}>
                  Save to Phone 📲
                </button>
                <button onClick={reset} style={{ width: "100%", padding: "14px 20px", borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.72)", fontWeight: 700 }}>
                  Start New Lead
                </button>
              </div>
            )}
          </div>

          <div style={{ background: "#081216", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 28, padding: 28, minHeight: 420, display: "grid", gap: 22 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>
                Stored Leads
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 700 }}>Persistent Supabase storage</div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {leads.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                  No leads yet. Save a lead and it will appear here instantly.
                </div>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{lead.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{lead.email}</div>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{formatDate(lead.created_at)}</div>
                    </div>
                    {lead.phone && <div style={{ marginTop: 10, color: "rgba(255,255,255,0.55)", fontSize: 13 }}>{lead.phone}</div>}
                    {lead.note && <div style={{ marginTop: 8, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{lead.note}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "14px 16px",
  fontSize: 15,
  outline: "none",
};

const detailRow = {
  color: "rgba(255,255,255,0.45)",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const detailValue = {
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.6,
};
