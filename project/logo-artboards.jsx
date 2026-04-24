/* global React */
const {
  MarkApex,
  CANNEXA_COLORS
} = window;

// Override with updated palette — drop orange from primary use.
const INK = "#1F3A28";
const INK_2 = "#2C4A37";
const OLIVE = "#4A5A3A";
const CREAM = "#EFEBE2";
const CREAM_2 = "#E3DDCF";
const SAGE = "#CFD4C6";
const SIGNAL = "#C85A2B"; // reserved — appears only on packaging detail
const MUTE = "#6B7468";

// ============================================================
// WORDMARK — humanist lowercase in the enua vein
// Uses Fraunces with SOFT axis + light weight + wide tracking reset.
// ============================================================
function Wordmark({ size = 120, color = INK, weight = 300 }) {
  return (
    <span style={{
      fontFamily: '"Fraunces", serif',
      fontVariationSettings: '"SOFT" 100, "opsz" 144',
      fontWeight: weight,
      fontSize: size,
      color,
      lineHeight: 1,
      letterSpacing: "-.015em",
      display: "inline-block"
    }}>
      cannexa
    </span>
  );
}

function EditorialItalic({ size = 48, color = INK }) {
  return (
    <span style={{
      fontFamily: '"Fraunces", serif',
      fontStyle: "italic",
      fontVariationSettings: '"SOFT" 100, "opsz" 144',
      fontWeight: 400,
      fontSize: size,
      color,
      lineHeight: 1.05,
      letterSpacing: "-.01em"
    }}>
      high craft,<br/><em>higher standards.</em>
    </span>
  );
}

// Small uppercase utility type — matches enua's nav / kicker
function Kicker({ children, size = 11, color = INK, spacing = ".26em" }) {
  return (
    <span style={{
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: size,
      color,
      letterSpacing: spacing,
      textTransform: "uppercase",
      fontWeight: 500
    }}>{children}</span>
  );
}

// ============================================================
// BACKGROUNDS — enua-style moss→olive gradient
// ============================================================
const mossGradient = {
  background: "linear-gradient(115deg, #1F3A28 0%, #27432D 45%, #4A5A3A 100%)"
};

// ============================================================
// LEAF — refined, smaller, secondary role
// (uses the existing MarkApex 7-leaflet leaf from logo-marks.jsx)
// ============================================================
function LeafMark(props) {
  // Neutralise accent by passing the leaf color as the "accent" too,
  // so the orange dot disappears in primary use.
  return <MarkApex {...props} accent={props.accent ?? props.color ?? INK} />;
}

// ============================================================
// 01 · HERO — pure wordmark, enua style
// ============================================================
function HeroBoard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, color: INK }}>
      {/* top nav to echo enua's chrome */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "22px 40px", borderBottom: `1px solid ${SAGE}`, background: "#F4F0E7"
      }}>
        <div style={{ display: "flex", gap: 28 }}>
          <Kicker color={MUTE}>Patients</Kicker>
          <Kicker color={MUTE}>Clinicians</Kicker>
          <Kicker color={MUTE}>Pharmacies</Kicker>
        </div>
        <Wordmark size={36} />
        <div style={{ display: "flex", gap: 28 }}>
          <Kicker color={MUTE}>Prescription</Kicker>
          <Kicker color={MUTE}>Journal</Kicker>
        </div>
      </div>

      {/* Hero — moss gradient with centered wordmark */}
      <div style={{
        flex: 1,
        ...mossGradient,
        color: CREAM,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* soft light leak */}
        <div style={{
          position: "absolute", right: "-20%", top: "-10%", width: "60%", height: "120%",
          background: "radial-gradient(ellipse at center, rgba(230,210,170,.22), transparent 60%)",
          pointerEvents: "none"
        }}/>
        <Kicker color="#CFD4C6" spacing=".36em">UK Medicinal Cannabis</Kicker>
        <div style={{ marginTop: 32 }}>
          <Wordmark size={220} color={CREAM} weight={300} />
        </div>
        <div style={{ marginTop: 36, maxWidth: 540, textAlign: "center" }}>
          <span style={{
            fontFamily: '"Fraunces", serif',
            fontStyle: "italic",
            fontVariationSettings: '"SOFT" 100, "opsz" 144',
            fontWeight: 400,
            fontSize: 28,
            color: CREAM,
            letterSpacing: "-.005em",
            lineHeight: 1.2
          }}>
            Medicine, unhurried.
          </span>
        </div>
      </div>

      {/* foot */}
      <div style={{ padding: "14px 40px", borderTop: `1px solid ${SAGE}`, background: "#F4F0E7", display: "flex", justifyContent: "space-between" }}>
        <Kicker color={MUTE} size={10}>01 · Primary wordmark · Fraunces Light SOFT 100</Kicker>
        <Kicker color={MUTE} size={10}>No mark in primary lockup</Kicker>
      </div>
    </div>
  );
}

// ============================================================
// 02 · EDITORIAL PAIRING — shows the italic serif companion
// ============================================================
function EditorialBoard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", background: CREAM, color: INK }}>
      {/* left column — type specimen */}
      <div style={{ padding: "60px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: `1px solid ${SAGE}` }}>
        <Kicker color={MUTE}>02 · Editorial pairing</Kicker>

        <div>
          <Kicker color={MUTE} size={10}>Wordmark</Kicker>
          <div style={{ marginTop: 14, borderBottom: `1px solid ${SAGE}`, paddingBottom: 28 }}>
            <Wordmark size={120} />
          </div>

          <div style={{ marginTop: 36 }}>
            <Kicker color={MUTE} size={10}>Editorial display · italic</Kicker>
            <div style={{ marginTop: 14 }}>
              <EditorialItalic size={64} />
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <Kicker color={MUTE} size={10}>Utility · Inter medium, uppercase</Kicker>
            <div style={{ marginTop: 14, display: "flex", gap: 24 }}>
              <Kicker size={13}>Prescription</Kicker>
              <Kicker size={13}>Clinicians</Kicker>
              <Kicker size={13}>Patients</Kicker>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: '"Fraunces", serif', fontSize: 14, color: MUTE, lineHeight: 1.6, maxWidth: 440 }}>
          The wordmark does the work. A wide, humanist lowercase in Fraunces Light
          (SOFT 100) carries the brand — echoing the parent identity without
          copying it. An italic Fraunces handles editorial moments.
        </div>
      </div>

      {/* right — editorial headline */}
      <div style={{ ...mossGradient, color: CREAM, padding: "80px 64px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", right: "-30%", bottom: "-30%", width: "80%", height: "80%",
          background: "radial-gradient(circle at center, rgba(230,210,170,.18), transparent 65%)"
        }}/>
        <Kicker color="#CFD4C6" spacing=".38em">Journal</Kicker>
        <div style={{ marginTop: 40, fontFamily: '"Fraunces", serif', fontWeight: 300, fontVariationSettings: '"SOFT" 100, "opsz" 144', fontSize: 60, lineHeight: 1.05, color: CREAM, letterSpacing: "-.02em", maxWidth: 560 }}>
          Welcome to the new <em style={{ fontStyle: "italic", fontWeight: 400 }}>quiet medicine.</em>
        </div>
        <div style={{ marginTop: 56, fontFamily: '"Fraunces", serif', fontSize: 17, color: "#DCE0D4", lineHeight: 1.55, maxWidth: 460 }}>
          A UK medicinal cannabis brand — patient-first, clinician-led, and built
          on the cultivation standards of our sister company.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 03 · SYSTEM — palette, marks, favicon, stacked lockup
// ============================================================
function SystemBoard() {
  const palette = [
    ["#1F3A28", "Moss", "primary"],
    ["#2C4A37", "Forest", "secondary"],
    ["#4A5A3A", "Olive", "gradient"],
    ["#EFEBE2", "Paper", "canvas"],
    ["#CFD4C6", "Sage", "hairline"],
    ["#C85A2B", "Ember", "accent · reserved"],
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, color: INK }}>
      <div style={{ padding: "22px 40px", borderBottom: `1px solid ${SAGE}`, display: "flex", justifyContent: "space-between" }}>
        <Kicker color={INK}>03 · System & marks</Kicker>
        <Kicker color={MUTE}>Cannexa · UK</Kicker>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr" }}>
        {/* Palette */}
        <div style={{ padding: "40px", borderRight: `1px solid ${SAGE}` }}>
          <Kicker color={MUTE} size={10}>Palette</Kicker>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {palette.map(([hex, name, role]) => (
              <div key={hex} style={{ border: `1px solid ${SAGE}`, background: "#F4F0E7", padding: 12 }}>
                <div style={{ width: "100%", aspectRatio: "2.2", background: hex, border: hex === CREAM ? `1px solid ${SAGE}` : "none" }}/>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "baseline" }}>
                  <span style={{ fontFamily: '"Fraunces", serif', fontWeight: 400, fontSize: 15 }}>{name}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: MUTE }}>{hex}</span>
                </div>
                <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: MUTE, marginTop: 2 }}>{role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Marks — leaf for secondary use */}
        <div style={{ padding: 40, borderRight: `1px solid ${SAGE}`, display: "flex", flexDirection: "column", gap: 28 }}>
          <Kicker color={MUTE} size={10}>Secondary mark</Kicker>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 0", border: `1px solid ${SAGE}`, background: "#F4F0E7" }}>
            <LeafMark size={150} color={INK} />
          </div>
          <div style={{ fontFamily: '"Fraunces", serif', fontStyle: "italic", fontSize: 14, color: MUTE, lineHeight: 1.55 }}>
            A 7-leaflet mark reserved for favicons, packaging seals, and moments
            where the wordmark can’t appear. Never used in the primary lockup.
          </div>

          <Kicker color={MUTE} size={10}>Favicon / app icon</Kicker>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 72, height: 72, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LeafMark size={48} color={CREAM} />
            </div>
            <div style={{ width: 72, height: 72, background: CREAM, border: `1px solid ${SAGE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LeafMark size={48} color={INK} />
            </div>
            <div style={{ width: 72, height: 72, ...mossGradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LeafMark size={48} color={CREAM} />
            </div>
          </div>
        </div>

        {/* Lockups */}
        <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 28 }}>
          <Kicker color={MUTE} size={10}>Lockups</Kicker>

          <div style={{ border: `1px solid ${SAGE}`, background: "#F4F0E7", padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Wordmark size={58} />
            <div style={{ height: 1, background: SAGE, width: 160 }}/>
            <Kicker color={MUTE} size={9} spacing=".42em">Medicinal Cannabis · UK</Kicker>
          </div>

          <div style={{ border: `1px solid ${SAGE}`, background: "#F4F0E7", padding: "28px 24px", display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
            <LeafMark size={46} color={INK} />
            <div style={{ width: 1, height: 34, background: SAGE }}/>
            <Wordmark size={44} />
          </div>

          <div style={{ ...mossGradient, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Wordmark size={58} color={CREAM} />
            <div style={{ height: 1, background: "#4A5E45", width: 160 }}/>
            <Kicker color="#CFD4C6" size={9} spacing=".42em">Medicinal Cannabis · UK</Kicker>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 04 · SURFACES — packaging, business card, mobile
// ============================================================
function SurfacesBoard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", background: "#1a1a18" }}>
      {/* Packaging — amber bottle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, background: "linear-gradient(135deg,#1a1a18,#2a2a26)", position: "relative", borderRight: "1px solid #2A2A26" }}>
        {/* bottle */}
        <div style={{
          width: 200, height: 340,
          borderRadius: "24px 24px 16px 16px",
          background: "linear-gradient(180deg, #2C4A37 0%, #1F3A28 100%)",
          position: "relative",
          boxShadow: "0 40px 80px -30px rgba(0,0,0,.6), inset 0 -100px 80px -60px rgba(255,255,255,.05), inset 0 4px 0 rgba(255,255,255,.08)",
          display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 22px"
        }}>
          <div style={{ position: "absolute", top: -14, width: 100, height: 18, background: CREAM_2, borderRadius: "4px 4px 0 0" }}/>
          <div style={{ width: 130, height: 34, background: CREAM_2, borderRadius: 4, marginTop: 8, boxShadow: "0 2px 0 rgba(0,0,0,.06) inset" }}/>

          {/* label */}
          <div style={{ marginTop: 28, width: "100%", background: CREAM, padding: "22px 14px", border: `1px solid ${SAGE}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Kicker color={MUTE} size={7.5} spacing=".36em">Cannabis · Full-spectrum</Kicker>
            <Wordmark size={30} />
            <div style={{ height: 1, background: SAGE, width: "70%" }}/>
            <div style={{ fontFamily: '"Fraunces", serif', fontStyle: "italic", fontSize: 11, color: INK }}>THC 20 · CBD &lt;1</div>
          </div>

          <div style={{ marginTop: "auto", fontFamily: '"Inter", sans-serif', fontSize: 8, letterSpacing: ".3em", color: "#8FA096", textTransform: "uppercase" }}>Rx · 10g</div>
        </div>
        <div style={{ position: "absolute", bottom: 18, left: 20, fontFamily: '"Inter", sans-serif', fontSize: 9.5, letterSpacing: ".26em", color: "#6B7468", textTransform: "uppercase" }}>Packaging</div>
      </div>

      {/* Business card */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, background: "#111110", borderRight: "1px solid #2A2A26", position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* front */}
          <div style={{ width: 280, height: 170, background: CREAM, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 30px 60px -30px rgba(0,0,0,.6)" }}>
            <Wordmark size={34} />
            <div>
              <div style={{ fontFamily: '"Fraunces", serif', fontSize: 14, color: INK, lineHeight: 1.3 }}>Dr. Helena Marsh</div>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 10, letterSpacing: ".16em", color: MUTE, textTransform: "uppercase", marginTop: 4 }}>Medical Director</div>
            </div>
          </div>
          {/* back */}
          <div style={{ width: 280, height: 170, ...mossGradient, padding: 22, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 30px 60px -30px rgba(0,0,0,.6)" }}>
            <LeafMark size={64} color={CREAM} />
            <div style={{ position: "absolute", bottom: 14, left: 22, fontFamily: '"Inter", sans-serif', fontSize: 8.5, letterSpacing: ".28em", color: "#CFD4C6", textTransform: "uppercase" }}>cannexa.co.uk</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 18, left: 20, fontFamily: '"Inter", sans-serif', fontSize: 9.5, letterSpacing: ".26em", color: "#6B7468", textTransform: "uppercase" }}>Stationery</div>
      </div>

      {/* Mobile */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: "#0f0f0e", position: "relative" }}>
        <div style={{ width: 260, height: 520, borderRadius: 36, background: "#000", padding: 10, boxShadow: "0 40px 80px -20px rgba(0,0,0,.7)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", background: CREAM, display: "flex", flexDirection: "column" }}>
            {/* status */}
            <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", fontFamily: '"Inter", sans-serif', fontSize: 11, color: INK, fontWeight: 500 }}>
              <span>9:41</span>
              <span>●●●</span>
            </div>
            {/* nav */}
            <div style={{ display: "flex", justifyContent: "center", padding: "18px 0", borderBottom: `1px solid ${SAGE}` }}>
              <Wordmark size={22} />
            </div>
            {/* hero */}
            <div style={{ flex: 1, ...mossGradient, color: CREAM, padding: 22, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 16 }}>
              <Kicker color="#CFD4C6" size={9} spacing=".34em">Welcome</Kicker>
              <div style={{ fontFamily: '"Fraunces", serif', fontWeight: 300, fontVariationSettings: '"SOFT" 100, "opsz" 144', fontSize: 30, lineHeight: 1.05, color: CREAM, letterSpacing: "-.01em" }}>
                Medicine,<br/><em style={{ fontStyle: "italic", fontWeight: 400 }}>unhurried.</em>
              </div>
              <div style={{ marginTop: 8, padding: "10px 22px", border: `1px solid rgba(239,235,226,.35)`, borderRadius: 999 }}>
                <Kicker color={CREAM} size={9} spacing=".24em">Start consultation</Kicker>
              </div>
            </div>
            {/* tab */}
            <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 0", borderTop: `1px solid ${SAGE}`, background: "#F4F0E7" }}>
              {["Home","Rx","Journal","Me"].map(l => (
                <Kicker key={l} size={9} color={MUTE} spacing=".18em">{l}</Kicker>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 18, left: 20, fontFamily: '"Inter", sans-serif', fontSize: 9.5, letterSpacing: ".26em", color: "#6B7468", textTransform: "uppercase" }}>Patient app</div>
      </div>
    </div>
  );
}

// =============================================================================
Object.assign(window, { HeroBoard, EditorialBoard, SystemBoard, SurfacesBoard });
