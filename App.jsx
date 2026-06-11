import { useState } from "react";

// ─── UTILITAIRES FLOW ────────────────────────────────────────────────────────
function splitSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return [];
  const vowels = /[aeiouy]/;
  const syls = [];
  let cur = "";
  for (let i = 0; i < w.length; i++) {
    cur += w[i];
    const isV = vowels.test(w[i]);
    const nextIsV = i + 1 < w.length && vowels.test(w[i + 1]);
    if (isV && (!nextIsV || i === w.length - 1)) { syls.push(cur); cur = ""; }
  }
  if (cur && syls.length > 0) syls[syls.length - 1] += cur;
  else if (cur) syls.push(cur);
  return syls.length ? syls : [w];
}

function tokenizeLine(text) {
  return text.split(/\s+/).filter(Boolean).map(w => ({ word: w, syllables: splitSyllables(w) }));
}

function countSyl(text) {
  return tokenizeLine(text).reduce((s, t) => s + t.syllables.length, 0);
}

function getFlowMatch(orig, custom) {
  const diff = Math.abs(countSyl(orig) - countSyl(custom));
  if (diff === 0) return { label: "Flow parfait", color: "#10B981", score: 100 };
  if (diff <= 2) return { label: "Tres proche", color: "#F59E0B", score: 80 };
  if (diff <= 4) return { label: "Ajustable", color: "#F97316", score: 50 };
  return { label: "Rythme different", color: "#EF4444", score: 20 };
}

// ─── APPEL IA ────────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),

  });
  const data = await res.json();
  const text = data.content ? data.content.map(b => b.text || "").join("") : "";
  return text.replace(/```json|```/g, "").trim();
}

// ─── COMPOSANTS ──────────────────────────────────────────────────────────────

function StressMap({ tokens, stressMap }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
      {tokens.map((tok, wi) =>
        tok.syllables.map((syl, si) => {
          const flatIdx = tokens.slice(0, wi).reduce((s, t) => s + t.syllables.length, 0) + si;
          const stress = stressMap ? (stressMap[flatIdx] || 0) : 0;
          const bg = stress === 2 ? "#F59E0B" : stress === 1 ? "#7C3AED" : "#2d2d3f";
          const col = stress > 0 ? "#fff" : "#6b7280";
          const sz = stress === 2 ? 15 : stress === 1 ? 13 : 12;
          return (
            <span key={wi + "-" + si} style={{
              background: bg, color: col, borderRadius: 4,
              padding: "2px 5px", fontSize: sz,
              fontWeight: stress === 2 ? 800 : stress === 1 ? 600 : 400,
              textTransform: stress === 2 ? "uppercase" : "none",
            }}>{syl}</span>
          );
        })
      )}
    </div>
  );
}

function SyllableGrid({ origText, customText, stressMap }) {
  const origTokens = tokenizeLine(origText);
  const customTokens = customText ? tokenizeLine(customText) : null;
  const origCount = origTokens.reduce((s, t) => s + t.syllables.length, 0);
  const custCount = customTokens ? customTokens.reduce((s, t) => s + t.syllables.length, 0) : 0;
  const diff = custCount - origCount;
  return (
    <div style={{ background: "#12122a", borderRadius: 10, padding: 12, marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
        Original - {origCount} syllabes
      </div>
      <StressMap tokens={origTokens} stressMap={stressMap} />
      {customText && (
        <div>
          <div style={{ borderTop: "1px dashed #2d2d3f", margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#a78bfa", textTransform: "uppercase", letterSpacing: 1 }}>
              Ta version - {custCount} syllabes
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: Math.abs(diff) === 0 ? "#10B981" : Math.abs(diff) <= 2 ? "#F59E0B" : "#EF4444" }}>
              {diff > 0 ? "+" + diff : diff < 0 ? diff : "= Egal"}
            </span>
          </div>
          <StressMap tokens={customTokens} stressMap={null} />
          <div style={{ display: "flex", gap: 2, marginTop: 8 }}>
            {Array.from({ length: Math.max(origCount, custCount) }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < Math.min(origCount, custCount) ? "#7C3AED" : i < origCount ? "#EF4444" : "#10B981",
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ÉCRAN 1 : RECHERCHE ─────────────────────────────────────────────────────
function SearchScreen({ onSongLoaded }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const prompt = `Tu es un expert en musique et analyse musicale.
L'utilisateur cherche la chanson : "${query}"

Analyse cette chanson et retourne UNIQUEMENT un objet JSON valide sans markdown avec cette structure exacte :
{
  "title": "titre exact",
  "artist": "artiste",
  "bpm": 96,
  "style": "genre musical",
  "verses": [
    {
      "id": "v1",
      "label": "Couplet 1",
      "color": "#7C3AED",
      "lines": [
        {
          "text": "parole de la ligne",
          "stress": [1,0,1,0,1],
          "notes": "indication de flow ex: accelere ici"
        }
      ]
    }
  ]
}

IMPORTANT pour le champ "stress" : tableau d'entiers de la meme longueur que le nombre de syllabes de la ligne.
0 = syllabe faible, 1 = syllabe forte, 2 = syllabe tres forte (cri/accent majeur).

IMPORTANT pour les couleurs des sections :
- Couplets : "#7C3AED"
- Refrains : "#F59E0B"  
- Pont/Bridge : "#10B981"
- Intro/Outro : "#6b7280"

Inclus TOUTES les sections : intro, couplets, refrains, pont, outro si ils existent.
Maximum 6 lignes par section pour rester lisible.
Retourne UNIQUEMENT le JSON, rien d'autre.`;

      const text = await callClaude(prompt);
      const song = JSON.parse(text);
      onSongLoaded(song);
    } catch (e) {
      setError("Chanson non trouvee ou erreur. Essaie avec artiste + titre.");
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Vegedream - Ramenez la Coupe",
    "Jul - Comme d'hab",
    "PNL - Au DD",
    "Soprano - Pucc'",
    "Stromae - Alors on danse",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a18", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "60px 24px 30px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg, #7C3AED, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Flow Studio
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Cree ta parodie avec le meme flow</p>
      </div>

      <div style={{ padding: "0 24px", flex: 1 }}>
        <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, marginBottom: 12 }}>
            Quelle chanson tu veux parodier ?
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Ex: Vegedream Ramenez la coupe..."
            style={{
              width: "100%", background: "#12122a", border: "1px solid #2d2d3f",
              borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: 15,
              outline: "none", boxSizing: "border-box", marginBottom: 12,
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              width: "100%", background: loading ? "#2d2d3f" : "linear-gradient(135deg, #7C3AED, #4F46E5)",
              border: "none", borderRadius: 12, padding: "14px 0",
              color: "#fff", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyse du flow en cours..." : "Analyser le flow"}
          </button>
          {error && <div style={{ marginTop: 10, color: "#EF4444", fontSize: 13, textAlign: "center" }}>{error}</div>}
        </div>

        <div style={{ fontSize: 11, color: "#4b5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          Suggestions
        </div>
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => { setQuery(s); }}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: "#1e1e2e", border: "1px solid #2d2d3f",
              borderRadius: 10, padding: "12px 16px", color: "#9ca3af",
              fontSize: 14, cursor: "pointer", marginBottom: 8,
            }}
          >
            🎵 {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ÉCRAN 2 : CHOIX DU MODE ─────────────────────────────────────────────────
function ModeScreen({ song, onMode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a18", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #1a0533, #0f0f2e)", padding: "30px 24px 24px", borderBottom: "1px solid #2d2d3f" }}>
        <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Flow analyse</div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{song.title}</h2>
        <div style={{ fontSize: 13, color: "#6b7280" }}>{song.artist}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <span style={{ background: "#7C3AED22", color: "#a78bfa", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>{song.bpm} BPM</span>
          <span style={{ background: "#F59E0B22", color: "#F59E0B", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>{song.style}</span>
          <span style={{ background: "#10B98122", color: "#10B981", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>{song.verses ? song.verses.length : 0} sections</span>
        </div>
      </div>

      <div style={{ padding: "30px 24px" }}>
        <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>Comment tu veux ecrire ta parodie ?</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Choisis le mode qui te convient</div>

        <button
          onClick={() => onMode("full")}
          style={{
            width: "100%", background: "#1e1e2e", border: "2px solid #7C3AED",
            borderRadius: 16, padding: "20px 20px", cursor: "pointer",
            textAlign: "left", marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Texte complet</div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
            Colle toutes tes paroles d'un coup. L'IA analyse le flow global et te dit si ca colle a la chanson originale.
          </div>
          <div style={{ marginTop: 10, display: "inline-block", background: "#7C3AED", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Le plus simple
          </div>
        </button>

        <button
          onClick={() => onMode("line")}
          style={{
            width: "100%", background: "#1e1e2e", border: "2px solid #F59E0B",
            borderRadius: 16, padding: "20px 20px", cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Ligne par ligne</div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
            Ecris ligne par ligne avec analyse syllabique detaillee, temps forts/faibles et suggestions IA pour chaque ligne.
          </div>
          <div style={{ marginTop: 10, display: "inline-block", background: "#F59E0B", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Le plus precis
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── ÉCRAN 3A : MODE TEXTE COMPLET ───────────────────────────────────────────
function FullTextMode({ song, onBack }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function analyzeText() {
    if (!text.trim()) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const prompt = `Tu es un expert en flow musical et parodie.
Chanson originale : "${song.title}" de ${song.artist} (${song.bpm} BPM, ${song.style})

Voici la parodie ecrite par l'utilisateur :
${text}

Analyse le flow de cette parodie par rapport a la chanson originale et retourne UNIQUEMENT un JSON valide :
{
  "globalScore": 85,
  "globalLabel": "Excellent flow",
  "sections": [
    {
      "label": "Couplet 1",
      "lines": [
        {
          "text": "ligne de la parodie",
          "score": 90,
          "label": "Flow parfait",
          "syllables": 10,
          "expectedSyllables": 10,
          "tip": "conseil ou vide si parfait"
        }
      ]
    }
  ],
  "globalTip": "conseil general pour ameliorer le flow"
}

Decoupe le texte de la parodie en sections logiques (couplets, refrains...) en te basant sur la structure de la chanson originale.
Retourne UNIQUEMENT le JSON.`;

      const result = await callClaude(prompt);
      setAnalysis(JSON.parse(result));
    } catch (e) {
      showToast("Erreur d'analyse - reessaie");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = s => s >= 80 ? "#10B981" : s >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a18", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#10B981", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 999 }}>{toast}</div>
      )}

      <div style={{ background: "linear-gradient(135deg, #1a0533, #0f0f2e)", padding: "20px 20px 16px", borderBottom: "1px solid #2d2d3f" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#7C3AED", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Retour</button>
        <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: 2, textTransform: "uppercase" }}>Mode texte complet</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{song.title} — {song.artist}</div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600, marginBottom: 8 }}>Colle toutes tes paroles ici</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Ecris ou colle toutes tes paroles...\n\n[Couplet 1]\n...\n\n[Refrain]\n..."}
          rows={10}
          style={{
            width: "100%", background: "#1e1e2e", border: "1px solid #2d2d3f",
            borderRadius: 12, padding: "14px", color: "#e2e8f0", fontSize: 14,
            resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            lineHeight: 1.8,
          }}
        />
        <button
          onClick={analyzeText}
          disabled={loading || !text.trim()}
          style={{
            width: "100%", marginTop: 12, background: loading ? "#2d2d3f" : "linear-gradient(135deg, #7C3AED, #4F46E5)",
            border: "none", borderRadius: 12, padding: "14px 0",
            color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Analyse du flow..." : "Analyser mon flow"}
        </button>
      </div>

      {analysis && (
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>Score global</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(analysis.globalScore) }}>{analysis.globalScore}%</div>
                <div style={{ fontSize: 14, color: scoreColor(analysis.globalScore), fontWeight: 600 }}>{analysis.globalLabel}</div>
              </div>
              <div style={{ width: 70, height: 70, borderRadius: "50%", border: "4px solid " + scoreColor(analysis.globalScore), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 24 }}>{analysis.globalScore >= 80 ? "🔥" : analysis.globalScore >= 60 ? "👍" : "💪"}</span>
              </div>
            </div>
            {analysis.globalTip && (
              <div style={{ background: "#12122a", borderRadius: 10, padding: 12, fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                💡 {analysis.globalTip}
              </div>
            )}
          </div>

          {analysis.sections && analysis.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                {section.label}
              </div>
              {section.lines && section.lines.map((line, li) => (
                <div key={li} style={{ background: "#1e1e2e", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, flex: 1 }}>{line.text}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(line.score), flexShrink: 0 }}>{line.score}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{line.syllables} syl.</span>
                    {line.syllables !== line.expectedSyllables && (
                      <span style={{ fontSize: 11, color: "#F59E0B" }}>attendu: {line.expectedSyllables}</span>
                    )}
                    <span style={{ fontSize: 11, color: scoreColor(line.score) }}>{line.label}</span>
                  </div>
                  {line.tip && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6, fontStyle: "italic" }}>💡 {line.tip}</div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <button
            onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(text); showToast("Paroles copiees !"); }}
            style={{ width: "100%", background: "#1e1e2e", border: "1px solid #2d2d3f", borderRadius: 12, padding: "12px 0", color: "#a78bfa", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Copier mes paroles
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ÉCRAN 3B : MODE LIGNE PAR LIGNE ─────────────────────────────────────────
function LineByLineMode({ song, onBack }) {
  const initLines = {};
  if (song.verses) {
    song.verses.forEach(v => v.lines.forEach((_, li) => { initLines[v.id + "-" + li] = ""; }));
  }

  const [customLines, setCustomLines] = useState(initLines);
  const [loading, setLoading] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [activeTab, setActiveTab] = useState("edit");
  const [topic, setTopic] = useState("");
  const [expandedVerse, setExpandedVerse] = useState(song.verses ? song.verses[0].id : null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }
  function setLine(key, val) { setCustomLines(prev => { const n = Object.assign({}, prev); n[key] = val; return n; }); }

  const totalLines = song.verses ? song.verses.reduce((s, v) => s + v.lines.length, 0) : 0;
  const filledLines = Object.values(customLines).filter(v => v.trim()).length;
  const progress = totalLines > 0 ? Math.round((filledLines / totalLines) * 100) : 0;

  const flowScores = [];
  if (song.verses) {
    song.verses.forEach(v => v.lines.forEach((line, li) => {
      const c = customLines[v.id + "-" + li];
      if (c) flowScores.push(getFlowMatch(line.text, c).score);
    }));
  }
  const avgFlow = flowScores.length ? Math.round(flowScores.reduce((a, b) => a + b, 0) / flowScores.length) : 0;

  async function askAI(verseId, lineIdx, originalLine) {
    const key = verseId + "-" + lineIdx;
    setLoading(key); setAiData(null);
    const origCount = countSyl(originalLine);
    const topicHint = topic ? 'Theme : "' + topic + '".' : "";
    const verse = song.verses.find(v => v.id === verseId);
    const prevCustom = verse ? verse.lines.slice(0, lineIdx).map((_, i) => customLines[verseId + "-" + i]).filter(Boolean) : [];
    const rhymeCtx = prevCustom.length ? "Lignes precedentes : " + prevCustom.join(" / ") : "";
    const prompt = "Expert parodie RAP/Afrobeats francais.\n" + topicHint + "\n" +
      'Ligne originale : "' + originalLine + '" (' + origCount + " syllabes)\n" + rhymeCtx + "\n\n" +
      "3 versions parodie EXACTEMENT " + origCount + " syllabes. JSON uniquement :\n" +
      '{"suggestions":[{"text":"...","rhyme":"mot"},{"text":"...","rhyme":"mot"},{"text":"...","rhyme":"mot"}]}';
    try {
      const result = await callClaude(prompt);
      const parsed = JSON.parse(result);
      setAiData({ key, suggestions: parsed.suggestions, origCount });
    } catch { showToast("Erreur IA"); }
    finally { setLoading(null); }
  }

  function buildSunoPrompt() {
    return "[Genre: " + song.style + "]\n[BPM: " + song.bpm + "]\n[Sur l'air de: " + song.title + " - " + song.artist + "]\n\n" +
      (song.verses || []).map(v =>
        "[" + v.label + "]\n" + v.lines.map((line, li) => customLines[v.id + "-" + li] || line.text).join("\n")
      ).join("\n\n");
  }

  const tabs = [["edit", "Editeur"], ["preview", "Apercu"], ["export", "Suno"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a18", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#10B981", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, zIndex: 999 }}>{toast}</div>
      )}

      <div style={{ background: "linear-gradient(135deg, #1a0533, #0f0f2e)", borderBottom: "1px solid #2d2d3f", padding: "20px 20px 14px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#7C3AED", fontSize: 13, cursor: "pointer", marginBottom: 8, padding: 0 }}>← Retour</button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Flow Studio</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{song.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{song.artist} - {song.bpm} BPM</div>
          </div>
          {avgFlow > 0 && (
            <div style={{ textAlign: "center", background: "#1e1e2e", borderRadius: 10, padding: "6px 12px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: avgFlow > 75 ? "#10B981" : avgFlow > 50 ? "#F59E0B" : "#EF4444" }}>{avgFlow}%</div>
              <div style={{ fontSize: 9, color: "#6b7280" }}>FLOW</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, background: "#1e1e2e", borderRadius: 4, height: 5 }}>
            <div style={{ width: progress + "%", background: "#7C3AED", height: "100%", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{filledLines}/{totalLines}</span>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ background: "#12122a", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700, marginBottom: 6 }}>LEGENDE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {[["#F59E0B","Temps FORT"],["#7C3AED","Temps fort"],["#2d2d3f","Temps faible"],["#10B981","Flow parfait"]].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: color, borderRadius: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Theme de ta parodie..."
          style={{ width: "100%", background: "#1e1e2e", border: "1px solid #2d2d3f", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />

        <div style={{ display: "flex", background: "#1e1e2e", borderRadius: 10, padding: 3, gap: 3, marginBottom: 14 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer",
              background: activeTab === id ? "#7C3AED" : "transparent",
              color: activeTab === id ? "#fff" : "#6b7280",
              fontWeight: activeTab === id ? 700 : 400, fontSize: 11,
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "edit" && (song.verses || []).map(verse => (
          <div key={verse.id} style={{ marginBottom: 16 }}>
            <button onClick={() => setExpandedVerse(expandedVerse === verse.id ? null : verse.id)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e1e2e", border: "1px solid " + verse.color, borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: expandedVerse === verse.id ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, background: verse.color, borderRadius: "50%" }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{verse.label}</span>
              </div>
              <span style={{ color: "#6b7280", fontSize: 12 }}>{expandedVerse === verse.id ? "▲" : "▼"}</span>
            </button>

            {expandedVerse === verse.id && verse.lines.map((line, li) => {
              const key = verse.id + "-" + li;
              const custom = customLines[key];
              const match = custom ? getFlowMatch(line.text, custom) : null;
              return (
                <div key={li} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: verse.color, fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>
                    Ligne {li + 1} {line.notes && <span style={{ color: "#6b7280", fontWeight: 400 }}>· {line.notes}</span>}
                  </div>
                  <SyllableGrid origText={line.text} customText={custom} stressMap={line.stress} />
                  <div style={{ position: "relative", marginTop: 6 }}>
                    <textarea value={custom} onChange={e => setLine(key, e.target.value)}
                      placeholder={"Ecris ta version... (" + countSyl(line.text) + " syllabes)"}
                      rows={2}
                      style={{ width: "100%", background: "#1e1e2e", border: "1.5px solid " + (match ? match.color : "#2d2d3f"), borderRadius: 8, padding: "9px 80px 9px 12px", color: "#e2e8f0", fontSize: 14, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    <button onClick={() => askAI(verse.id, li, line.text)} disabled={loading === key}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: loading === key ? "#2d2d3f" : "#7C3AED", border: "none", borderRadius: 6, padding: "5px 10px", color: "#fff", fontSize: 12, cursor: loading === key ? "not-allowed" : "pointer" }}>
                      {loading === key ? "..." : "IA"}
                    </button>
                  </div>
                  {match && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <div style={{ flex: 1, background: "#1e1e2e", borderRadius: 4, height: 5 }}>
                        <div style={{ width: match.score + "%", background: match.color, height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: match.color, fontWeight: 600, minWidth: 110 }}>{match.label}</span>
                    </div>
                  )}
                  {aiData && aiData.key === key && (
                    <div style={{ background: "#1a1232", border: "1px solid #7C3AED", borderRadius: 12, padding: 14, marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 10 }}>Suggestions IA</div>
                      {aiData.suggestions.map((s, i) => (
                        <button key={i} onClick={() => { setLine(key, s.text || s); setAiData(null); }}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "#0f0f1a", border: "1px solid #2d2d3f", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, cursor: "pointer", marginBottom: 6 }}>
                          {s.text || s}
                          {s.rhyme && <span style={{ fontSize: 10, color: "#7C3AED", marginLeft: 8 }}>rime: {s.rhyme}</span>}
                        </button>
                      ))}
                      <button onClick={() => setAiData(null)} style={{ background: "none", border: "none", color: "#4b5563", fontSize: 11, cursor: "pointer" }}>Fermer</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {activeTab === "preview" && (
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Ma Parodie</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 18 }}>sur l'air de {song.artist}</div>
            {(song.verses || []).map(verse => (
              <div key={verse.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: verse.color, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>[{verse.label}]</div>
                {verse.lines.map((line, li) => {
                  const custom = customLines[verse.id + "-" + li];
                  const match = custom ? getFlowMatch(line.text, custom) : null;
                  return (
                    <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      {match && <div style={{ width: 4, background: match.color, borderRadius: 2, alignSelf: "stretch", minHeight: 16, flexShrink: 0 }} />}
                      <div style={{ fontSize: 15, lineHeight: 1.7, color: custom ? "#e2e8f0" : "#4b5563", fontStyle: custom ? "normal" : "italic" }}>{custom || line.text}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button onClick={() => { const l = (song.verses||[]).map(v => "["+v.label+"]\n"+v.lines.map((line,li)=>customLines[v.id+"-"+li]||line.text).join("\n")).join("\n\n"); if(navigator.clipboard) navigator.clipboard.writeText(l); showToast("Paroles copiees !"); }}
              style={{ marginTop: 8, width: "100%", background: "#7C3AED", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              Copier les paroles
            </button>
          </div>
        )}

        {activeTab === "export" && (
          <div>
            <div style={{ background: "#12122a", borderRadius: 12, padding: 14, marginBottom: 14, fontFamily: "monospace", fontSize: 12, color: "#9ca3af", lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #2d2d3f" }}>
              {buildSunoPrompt()}
            </div>
            <button onClick={() => { if(navigator.clipboard) navigator.clipboard.writeText(buildSunoPrompt()); showToast("Prompt Suno copie !"); }}
              style={{ width: "100%", background: "#F59E0B", border: "none", borderRadius: 12, padding: "14px 0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Copier le prompt Suno
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("search");
  const [song, setSong] = useState(null);
  const [mode, setMode] = useState(null);

  function handleSongLoaded(s) { setSong(s); setScreen("mode"); }
  function handleMode(m) { setMode(m); setScreen("editor"); }
  function handleBack() {
    if (screen === "editor") { setScreen("mode"); setMode(null); }
    else if (screen === "mode") { setScreen("search"); setSong(null); }
  }

  if (screen === "search") return <SearchScreen onSongLoaded={handleSongLoaded} />;
  if (screen === "mode") return <ModeScreen song={song} onMode={handleMode} />;
  if (screen === "editor" && mode === "full") return <FullTextMode song={song} onBack={handleBack} />;
  if (screen === "editor" && mode === "line") return <LineByLineMode song={song} onBack={handleBack} />;
  return null;
}
