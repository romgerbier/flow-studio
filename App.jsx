import { useState } from "react";

const SONG = {
  title: "Ramenez la Coupe à la Maison",
  artist: "Vegedream",
  bpm: 96,
  style: "Afrobeats / R&B",
  verses: [
    {
      id: "v1", label: "Couplet 1", color: "#7C3AED",
      lines: [
        { text: "On va ramener la coupe a la maison",      stress: [1,0,1,0,0,1,0,1,0,0,1,0] },
        { text: "Demain on va faire la fete c'est la saison", stress: [0,1,0,0,1,0,0,1,0,0,1,0] },
        { text: "On a attendu si longtemps cette victoire",  stress: [0,0,1,0,0,1,0,1,0,0,1,0] },
        { text: "Aujourd'hui c'est notre jour c'est notre gloire", stress: [1,0,1,0,1,0,1,0,1,0,1] },
      ],
    },
    {
      id: "ref", label: "Refrain", color: "#F59E0B",
      lines: [
        { text: "Ramenez la coupe a la maison",   stress: [2,0,1,0,0,2,0,0,1,0] },
        { text: "Ramenez la coupe a la maison",   stress: [2,0,1,0,0,2,0,0,1,0] },
        { text: "On est les champions on est les champions", stress: [0,0,0,2,0,0,0,0,2,0] },
        { text: "Ramenez la coupe a la maison",   stress: [2,0,1,0,0,2,0,0,1,0] },
      ],
    },
    {
      id: "v2", label: "Couplet 2", color: "#10B981",
      lines: [
        { text: "Toute la nuit on va danser chanter",    stress: [1,0,1,0,0,1,0,1,0] },
        { text: "Dans les rues de Paris s'enflammer",    stress: [0,0,1,0,0,1,0,1,0] },
        { text: "Les bleus ont tout donne sur le terrain", stress: [0,1,0,0,2,0,0,0,1,0] },
        { text: "Ce soir la France entiere tient dans nos mains", stress: [0,1,0,1,0,1,0,0,0,1] },
      ],
    },
  ],
};

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
    if (isV && (!nextIsV || i === w.length - 1)) {
      syls.push(cur);
      cur = "";
    }
  }
  if (cur && syls.length > 0) syls[syls.length - 1] += cur;
  else if (cur) syls.push(cur);
  return syls.length ? syls : [w];
}

function tokenizeLine(text) {
  return text.split(/\s+/).filter(Boolean).map(function(w) {
    return { word: w, syllables: splitSyllables(w) };
  });
}

function countSyl(text) {
  return tokenizeLine(text).reduce(function(s, t) { return s + t.syllables.length; }, 0);
}

function getFlowMatch(orig, custom) {
  var diff = Math.abs(countSyl(orig) - countSyl(custom));
  if (diff === 0) return { label: "Flow parfait", color: "#10B981", score: 100 };
  if (diff <= 2) return { label: "Tres proche", color: "#F59E0B", score: 80 };
  if (diff <= 4) return { label: "Ajustable", color: "#F97316", score: 50 };
  return { label: "Rythme different", color: "#EF4444", score: 20 };
}

function StressMap({ tokens, stressMap }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
      {tokens.map(function(tok, wi) {
        return tok.syllables.map(function(syl, si) {
          var flatIdx = tokens.slice(0, wi).reduce(function(s, t) { return s + t.syllables.length; }, 0) + si;
          var stress = stressMap ? (stressMap[flatIdx] || 0) : 0;
          var bg = stress === 2 ? "#F59E0B" : stress === 1 ? "#7C3AED" : "#2d2d3f";
          var col = stress > 0 ? "#fff" : "#6b7280";
          var sz = stress === 2 ? 15 : stress === 1 ? 13 : 12;
          return (
            <span key={wi + "-" + si} style={{
              background: bg,
              color: col,
              borderRadius: 4,
              padding: "2px 5px",
              fontSize: sz,
              fontWeight: stress === 2 ? 800 : stress === 1 ? 600 : 400,
              textTransform: stress === 2 ? "uppercase" : "none",
            }}>
              {syl}
            </span>
          );
        });
      })}
    </div>
  );
}

function SyllableGrid({ origText, customText, stressMap }) {
  var origTokens = tokenizeLine(origText);
  var customTokens = customText ? tokenizeLine(customText) : null;
  var origCount = origTokens.reduce(function(s, t) { return s + t.syllables.length; }, 0);
  var custCount = customTokens ? customTokens.reduce(function(s, t) { return s + t.syllables.length; }, 0) : 0;
  var diff = custCount - origCount;

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
            {Array.from({ length: Math.max(origCount, custCount) }, function(_, i) {
              return (
                <div key={i} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i < Math.min(origCount, custCount) ? "#7C3AED" : i < origCount ? "#EF4444" : "#10B981",
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginTop: 3 }}>
            <span>Commun ({Math.min(origCount, custCount)})</span>
            {diff < 0 && <span style={{ color: "#EF4444" }}>Manquant ({Math.abs(diff)})</span>}
            {diff > 0 && <span style={{ color: "#10B981" }}>En plus ({diff})</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function LineEditor({ line, custom, onChange, onAsk, loading }) {
  var match = custom ? getFlowMatch(line.text, custom) : null;
  var origCount = countSyl(line.text);
  return (
    <div style={{ marginBottom: 20 }}>
      <SyllableGrid origText={line.text} customText={custom} stressMap={line.stress} />

      {!custom && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {[
            { color: "#F59E0B", label: "Temps FORT" },
            { color: "#7C3AED", label: "Temps fort" },
            { color: "#2d2d3f", label: "Temps faible" },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, background: item.color, borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: "#6b7280" }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <textarea
          value={custom}
          onChange={function(e) { onChange(e.target.value); }}
          placeholder={"Ecris ta version... (" + origCount + " syllabes)"}
          rows={2}
          style={{
            width: "100%",
            background: "#1e1e2e",
            border: "1.5px solid " + (match ? match.color : "#2d2d3f"),
            borderRadius: 8,
            padding: "9px 80px 9px 12px",
            color: "#e2e8f0",
            fontSize: 14,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={onAsk}
          disabled={loading}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: loading ? "#2d2d3f" : "#7C3AED",
            border: "none", borderRadius: 6, padding: "5px 10px",
            color: "#fff", fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "..." : "IA"}
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
    </div>
  );
}

function AISuggestions({ suggestions, origCount, onAccept, onClose }) {
  return (
    <div style={{ background: "#1a1232", border: "1px solid #7C3AED", borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 10 }}>Suggestions IA - meme flow</div>
      {suggestions.map(function(s, i) {
        var c = countSyl(s.text || s);
        var ok = Math.abs(c - origCount) <= 2;
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <button
              onClick={function() { onAccept(s.text || s); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "#0f0f1a", border: "1px solid #2d2d3f",
                borderRadius: 8, padding: "8px 12px", color: "#e2e8f0",
                fontSize: 13, cursor: "pointer", marginBottom: 4,
              }}
            >
              {s.text || s}
            </button>
            <div style={{ display: "flex", gap: 8, paddingLeft: 4 }}>
              <span style={{ fontSize: 10, color: "#6b7280" }}>{c} syl.</span>
              <span style={{ fontSize: 10, color: ok ? "#10B981" : "#F59E0B" }}>{ok ? "Flow ok" : "Proche"}</span>
              {s.rhyme && <span style={{ fontSize: 10, color: "#7C3AED" }}>Rime: {s.rhyme}</span>}
            </div>
          </div>
        );
      })}
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#4b5563", fontSize: 11, cursor: "pointer", marginTop: 4 }}>
        Fermer
      </button>
    </div>
  );
}

export default function App() {
  var initLines = {};
  SONG.verses.forEach(function(v) {
    v.lines.forEach(function(_, li) { initLines[v.id + "-" + li] = ""; });
  });

  var [customLines, setCustomLines] = useState(initLines);
  var [loading, setLoading] = useState(null);
  var [aiData, setAiData] = useState(null);
  var [activeTab, setActiveTab] = useState("edit");
  var [topic, setTopic] = useState("");
  var [expandedVerse, setExpandedVerse] = useState("v1");
  var [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(function() { setToast(null); }, 2500);
  }

  function setLine(key, val) {
    setCustomLines(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  var totalLines = SONG.verses.reduce(function(s, v) { return s + v.lines.length; }, 0);
  var filledLines = Object.values(customLines).filter(function(v) { return v.trim(); }).length;
  var progress = Math.round((filledLines / totalLines) * 100);

  var flowScores = [];
  SONG.verses.forEach(function(v) {
    v.lines.forEach(function(line, li) {
      var c = customLines[v.id + "-" + li];
      if (c) flowScores.push(getFlowMatch(line.text, c).score);
    });
  });
  var avgFlow = flowScores.length ? Math.round(flowScores.reduce(function(a, b) { return a + b; }, 0) / flowScores.length) : 0;

  async function askAI(verseId, lineIdx, originalLine) {
    var key = verseId + "-" + lineIdx;
    setLoading(key);
    setAiData(null);
    var origCount = countSyl(originalLine);
    var topicHint = topic ? 'Le theme de la parodie est : "' + topic + '".' : "";
    var verse = SONG.verses.find(function(v) { return v.id === verseId; });
    var prevCustom = verse ? verse.lines.slice(0, lineIdx).map(function(_, i) { return customLines[verseId + "-" + i]; }).filter(Boolean) : [];
    var rhymeCtx = prevCustom.length ? "Lignes precedentes : " + prevCustom.join(" / ") : "";

    var prompt = "Tu es un expert en parodie musicale RAP/Afrobeats en francais.\n" +
      topicHint + "\n" +
      'Ligne originale : "' + originalLine + '" (' + origCount + " syllabes)\n" +
      rhymeCtx + "\n\n" +
      "Genere 3 versions de parodie avec EXACTEMENT " + origCount + " syllabes chacune.\n" +
      "Reponds UNIQUEMENT avec du JSON valide sans markdown :\n" +
      '{"suggestions":[{"text":"...","rhyme":"mot"},{"text":"...","rhyme":"mot"},{"text":"...","rhyme":"mot"}]}';

    try {
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      var data = await res.json();
      var text = data.content ? data.content.map(function(b) { return b.text || ""; }).join("") : "";
      var clean = text.replace(/```json|```/g, "").trim();
      var parsed = JSON.parse(clean);
      setAiData({ key: key, suggestions: parsed.suggestions, origCount: origCount });
    } catch (e) {
      showToast("Erreur IA - reessaie");
    } finally {
      setLoading(null);
    }
  }

  function buildSunoPrompt() {
    return "[Genre: " + SONG.style + "]\n[BPM: " + SONG.bpm + "]\n[Sur l'air de: " + SONG.title + " - " + SONG.artist + "]\n\n" +
      SONG.verses.map(function(v) {
        return "[" + v.label + "]\n" + v.lines.map(function(line, li) {
          return customLines[v.id + "-" + li] || line.text;
        }).join("\n");
      }).join("\n\n");
  }

  var tabs = [["edit", "Editeur"], ["preview", "Apercu"], ["export", "Export Suno"]];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a18", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#10B981", color: "#fff", padding: "10px 20px", borderRadius: 20,
          fontSize: 13, fontWeight: 600, zIndex: 999,
        }}>{toast}</div>
      )}

      <div style={{ background: "linear-gradient(135deg, #1a0533, #0f0f2e)", borderBottom: "1px solid #2d2d3f", padding: "18px 16px 14px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 10, color: "#7C3AED", letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>Flow Studio</div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{SONG.title}</h1>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{SONG.artist} - {SONG.bpm} BPM - {SONG.style}</div>
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
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 16px 0" }}>
        <div style={{ background: "#12122a", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#F59E0B", fontWeight: 700, marginBottom: 6 }}>LEGENDE DU FLOW</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {[
              { color: "#F59E0B", label: "Temps FORT (accent fort)" },
              { color: "#7C3AED", label: "Temps fort (accent)" },
              { color: "#2d2d3f", label: "Temps faible (rapide)" },
              { color: "#10B981", label: "Flow parfait (= syllabes)" },
            ].map(function(item) {
              return (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, background: item.color, borderRadius: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <input
          value={topic}
          onChange={function(e) { setTopic(e.target.value); }}
          placeholder="Theme de ta parodie (ex: le foot, les vacances...)"
          style={{
            width: "100%", background: "#1e1e2e", border: "1px solid #2d2d3f",
            borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 13,
            outline: "none", boxSizing: "border-box", marginBottom: 10,
          }}
        />

        <div style={{ display: "flex", background: "#1e1e2e", borderRadius: 10, padding: 3, gap: 3, marginBottom: 14 }}>
          {tabs.map(function(tab) {
            return (
              <button key={tab[0]} onClick={function() { setActiveTab(tab[0]); }} style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer",
                background: activeTab === tab[0] ? "#7C3AED" : "transparent",
                color: activeTab === tab[0] ? "#fff" : "#6b7280",
                fontWeight: activeTab === tab[0] ? 700 : 400,
                fontSize: 11,
              }}>{tab[1]}</button>
            );
          })}
        </div>

        {activeTab === "edit" && SONG.verses.map(function(verse) {
          return (
            <div key={verse.id} style={{ marginBottom: 16 }}>
              <button
                onClick={function() { setExpandedVerse(expandedVerse === verse.id ? null : verse.id); }}
                style={{
                  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#1e1e2e", border: "1px solid " + verse.color,
                  borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                  marginBottom: expandedVerse === verse.id ? 12 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: verse.color, borderRadius: "50%" }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{verse.label}</span>
                </div>
                <span style={{ color: "#6b7280", fontSize: 12 }}>{expandedVerse === verse.id ? "▲" : "▼"}</span>
              </button>

              {expandedVerse === verse.id && verse.lines.map(function(line, li) {
                var key = verse.id + "-" + li;
                return (
                  <div key={li}>
                    <div style={{ fontSize: 11, color: verse.color, fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>
                      Ligne {li + 1}
                    </div>
                    <LineEditor
                      line={line}
                      custom={customLines[key]}
                      onChange={function(v) { setLine(key, v); }}
                      onAsk={function() { askAI(verse.id, li, line.text); }}
                      loading={loading === key}
                    />
                    {aiData && aiData.key === key && (
                      <AISuggestions
                        suggestions={aiData.suggestions}
                        origCount={aiData.origCount}
                        onAccept={function(s) { setLine(key, s); setAiData(null); }}
                        onClose={function() { setAiData(null); }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {activeTab === "preview" && (
          <div style={{ background: "#1e1e2e", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Ma Parodie</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 18 }}>sur l'air de {SONG.artist}</div>
            {SONG.verses.map(function(verse) {
              return (
                <div key={verse.id} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: verse.color, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                    [{verse.label}]
                  </div>
                  {verse.lines.map(function(line, li) {
                    var custom = customLines[verse.id + "-" + li];
                    var match = custom ? getFlowMatch(line.text, custom) : null;
                    return (
                      <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        {match && <div style={{ width: 4, background: match.color, borderRadius: 2, alignSelf: "stretch", minHeight: 16, flexShrink: 0 }} />}
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: custom ? "#e2e8f0" : "#4b5563", fontStyle: custom ? "normal" : "italic" }}>
                          {custom || line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <button
              onClick={function() {
                var lyrics = SONG.verses.map(function(v) {
                  return "[" + v.label + "]\n" + v.lines.map(function(l, li) { return customLines[v.id + "-" + li] || l.text; }).join("\n");
                }).join("\n\n");
                if (navigator.clipboard) navigator.clipboard.writeText(lyrics);
                showToast("Paroles copiees !");
              }}
              style={{ marginTop: 8, width: "100%", background: "#7C3AED", border: "none", borderRadius: 10, padding: "12px 0", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Copier les paroles
            </button>
          </div>
        )}

        {activeTab === "export" && (
          <div>
            <div style={{ background: "#1a0533", border: "1px solid #7C3AED", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>Comment utiliser avec Suno / Udio</div>
              <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.9 }}>
                1. Clique sur "Copier le prompt Suno" ci-dessous{"\n"}
                2. Va sur suno.com ou udio.com{"\n"}
                3. Colle dans "Custom mode"{"\n"}
                4. Style : {SONG.style}, {SONG.bpm} BPM{"\n"}
                5. Genere ta parodie !
              </div>
            </div>
            <div style={{ background: "#12122a", borderRadius: 12, padding: 14, marginBottom: 14, fontFamily: "monospace", fontSize: 12, color: "#9ca3af", lineHeight: 1.7, whiteSpace: "pre-wrap", border: "1px solid #2d2d3f" }}>
              {buildSunoPrompt()}
            </div>
            <button
              onClick={function() {
                if (navigator.clipboard) navigator.clipboard.writeText(buildSunoPrompt());
                showToast("Prompt Suno copie !");
              }}
              style={{ width: "100%", background: "#F59E0B", border: "none", borderRadius: 12, padding: "14px 0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              Copier le prompt Suno
            </button>

            <div style={{ marginTop: 16, background: "#1e1e2e", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>Analyse du flow global</div>
              {SONG.verses.map(function(v) {
                return v.lines.map(function(line, li) {
                  var custom = customLines[v.id + "-" + li];
                  if (!custom) return null;
                  var match = getFlowMatch(line.text, custom);
                  var origS = countSyl(line.text);
                  var custS = countSyl(custom);
                  return (
                    <div key={v.id + "-" + li} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, background: match.color, borderRadius: "50%", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{custom}</div>
                      <span style={{ fontSize: 11, color: match.color, fontWeight: 600, flexShrink: 0 }}>{custS}/{origS}</span>
                    </div>
                  );
                });
              })}
              {flowScores.length === 0 && <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "10px 0" }}>Ecris tes paroles dans l'editeur d'abord</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
