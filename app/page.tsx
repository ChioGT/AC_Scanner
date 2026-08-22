"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyze, referenceExampleCount, replyFor, violenceCategories, type Level, type Result } from "./safety-analysis";

type ChatMessage = { role: "assistant" | "user"; text: string };

const levelCopy: Record<Level, { name: string; eyebrow: string; body: string; action: string }> = {
  green: { name: "Sin indicadores claros", eyebrow: "RIESGO NO IDENTIFICADO", body: "En este fragmento no se encontraron señales suficientes de control o coerción. Esto no confirma que una relación sea segura.", action: "Observa cómo te sientes y conserva tus límites personales." },
  yellow: { name: "Atención necesaria", eyebrow: "SEÑALES TEMPRANAS", body: "Aparecen expresiones que merecen atención. Un mensaje aislado no define toda una relación, pero tu incomodidad importa.", action: "Reflexiona sobre la repetición del patrón y conversa con alguien de confianza." },
  orange: { name: "Riesgo elevado", eyebrow: "PATRONES PREOCUPANTES", body: "Se identifican señales relevantes o reiteradas de control. No necesitas esperar a que exista violencia física para pedir apoyo.", action: "Considera un plan de seguridad y busca apoyo si puedes hacerlo sin exponerte." },
  red: { name: "Riesgo alto", eyebrow: "PRIORIZA TU SEGURIDAD", body: "Esta conversación combina amenazas, coerción o múltiples conductas de control. Tu seguridad es la prioridad.", action: "Si existe peligro inmediato, llama al ECU 911 si hacerlo es seguro. Contacta a una persona de confianza." },
};

const initialAssistant = "Estoy aquí para ayudarte a entender lo que aparece en la conversación, sin juzgarte. El motor de análisis semántico funciona en tu navegador y compara el contexto con 270 ejemplos de violencia, sin enviar tus mensajes a un servidor.";
const supportMessages = [
  { icon: "♡", title: "No es tu culpa.", description: "Nadie tiene derecho a controlar, amenazar o lastimarte." },
  { icon: "◌", title: "Lo que sientes importa.", description: "No necesitas demostrar nada para pedir apoyo." },
  { icon: "◇", title: "Tu seguridad es primero.", description: "Busca ayuda solo si puedes hacerlo sin exponerte." },
  { icon: "✧", title: "Mereces respeto y libertad.", description: "Tu historia, tus decisiones y tus límites te pertenecen." },
] as const;

export default function Home() {
  const [text, setText] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [neutralMode, setNeutralMode] = useState(false);
  const [online, setOnline] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([{ role: "assistant", text: initialAssistant }]);
  const [tab, setTab] = useState<"analysis" | "support">("analysis");
  const [toast, setToast] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const supportRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const copy = result ? levelCopy[result.level] : null;
  const activeCount = useMemo(() => result?.findings.length || 0, [result]);

  const cancelPendingAnalysis = useCallback(() => {
    setIsAnalyzing(false);
  }, []);

  const quickExit = useCallback(() => {
    cancelPendingAnalysis();
    setText("");
    setResult(null);
    setChatInput("");
    setChat([{ role: "assistant", text: initialAssistant }]);
    setTab("analysis");
    setToast("");
    setAnalysisError("");
    setNeutralMode(true);
  }, [cancelPendingAnalysis]);

  useEffect(() => { const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") quickExit(); }; window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }, [quickExit]);
  useEffect(() => { const previousTitle = document.title; if (neutralMode) document.title = "Mis notas"; return () => { document.title = previousTitle; }; }, [neutralMode]);
  useEffect(() => { const updateConnection = () => setOnline(navigator.onLine); updateConnection(); window.addEventListener("online", updateConnection); window.addEventListener("offline", updateConnection); return () => { window.removeEventListener("online", updateConnection); window.removeEventListener("offline", updateConnection); }; }, []);
  useEffect(() => { if (result && typeof resultsRef.current?.scrollIntoView === "function") resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [result]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3400); return () => window.clearTimeout(timer); }, [toast]);

  const runAnalysis = () => {
    const conversation = text.trim();
    setAnalysisError("");
    if (!conversation) {
      setAnalysisError("Escribe o pega al menos un mensaje para realizar el análisis.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = analyze(conversation);
      setResult(analysis);
      setToast(`Análisis completado: ${analysis.messageCount} ${analysis.messageCount === 1 ? "mensaje revisado" : "mensajes revisados"}.`);
    } catch {
      setResult(null);
      setAnalysisError("No fue posible analizar la conversación. Revisa el texto e inténtalo nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const clearData = () => { cancelPendingAnalysis(); setAnalysisError(""); setText(""); setResult(null); setChatInput(""); setChat([{ role: "assistant", text: initialAssistant }]); setToast("Se eliminó la información visible de esta sesión."); };
  const sendChat = (preset?: string) => { const message = (preset || chatInput).trim(); if (!message) return; setChat((previous) => [...previous, { role: "user", text: message }, { role: "assistant", text: replyFor(message, result) }]); setChatInput(""); window.setTimeout(() => { if (typeof supportRef.current?.scrollIntoView === "function") supportRef.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, 80); };

  if (neutralMode) return <main className="neutral-screen"><div className="neutral-sheet"><span className="neutral-icon">▦</span><h1>Mis notas</h1><p>Apuntes y pendientes de la semana</p><div className="neutral-note"><strong>Lista de compras</strong><span>Pan · café · frutas · avena</span></div><div className="neutral-note"><strong>Miércoles</strong><span>Revisar material para la reunión.</span></div><button className="neutral-return" onClick={() => setNeutralMode(false)} aria-label="Volver a la aplicación">•••</button></div></main>;

  return <main className="app-shell"><header className="topbar"><a className="brand" href="#home"><span className="brand-mark">◈</span><span>love <i>or</i> control<span className="brand-question">?</span><small>PRIVATE SAFETY COMPANION</small></span></a><div className="topbar-actions"><span className={`status-pill ${online ? "" : "offline"}`} role="status"><span className="status-dot"/>{online ? "Motor semántico activo" : "Sin conexión · motor activo"}</span><button className="exit-button" onClick={quickExit} aria-label="Salida rápida: borrar mensajes y mostrar una pantalla neutra"><span>↗</span> Salida rápida <kbd>ESC</kbd></button></div></header>
  <section className="workspace" id="home"><aside className="left-panel"><div className="section-kicker"><span>01</span> ESPACIO PRIVADO</div><h1>¿Es amor<br/><span>o es control?</span></h1><p className="intro-copy">Identifica señales de violencia sin compartir tus conversaciones. Tu historia te pertenece.</p><div className="privacy-note"><span>◉</span><div><strong>Motor semántico local activo</strong><p>Reconoce expresiones nuevas y compara su contexto con 270 ejemplos. La integración con QVAC sigue siendo una fase posterior.</p></div></div><section className="taxonomy" aria-label="Seis tipos de violencia analizados"><div className="taxonomy-heading"><strong>6 TIPOS DE VIOLENCIA</strong><span>{referenceExampleCount} ejemplos de referencia</span></div><div className="taxonomy-list">{violenceCategories.map((category) => <span className="taxonomy-chip" key={category.category}><span aria-hidden="true">{category.icon}</span>{category.label}</span>)}</div></section><section aria-label="Mensajes de apoyo"><div className="scenario-header"><span>ESTE ESPACIO ES PARA TI</span><span>♡</span></div><div className="scenario-list">{supportMessages.map((message) => <article key={message.title} className="scenario-card support-message-card"><span className="scenario-icon" aria-hidden="true">{message.icon}</span><span><strong>{message.title}</strong><small>{message.description}</small></span></article>)}</div></section><div className="connection-info" role="status"><span className={`connection-indicator ${online ? "connected" : "disconnected"}`}/><span>{online ? "Con conexión · análisis siempre local" : "Sin conexión · análisis disponible"}</span></div><p className="demo-disclaimer">MVP de demostración · Team Comadres · Aleph Hackathon</p></aside>
  <section className="main-panel"><nav className="panel-tabs" aria-label="Secciones de la aplicación"><button className={tab === "analysis" ? "selected" : ""} onClick={() => setTab("analysis")} aria-pressed={tab === "analysis"}>Análisis de conversación</button><button className={tab === "support" ? "selected" : ""} onClick={() => setTab("support")} aria-pressed={tab === "support"}>Acompañamiento</button><span className="qvac-tag">QVAC · PROTOTIPO</span></nav>
  {tab === "analysis" ? <><div className="composer"><div className="composer-top"><div><span className="section-kicker"><span>02</span> TU CONVERSACIÓN</span><h2>Pega los mensajes que quieras revisar</h2></div><button className="text-button" onClick={clearData}>Borrar todo</button></div><textarea value={text} onChange={(event) => { cancelPendingAnalysis(); setAnalysisError(""); setText(event.target.value); setResult(null); }} placeholder="Escribe o pega aquí los mensajes que deseas revisar." aria-label="Conversación para analizar" aria-invalid={Boolean(analysisError)}/>{analysisError && <p className="analysis-error" role="alert">{analysisError}</p>}<div className="composer-bottom"><span>⌁ Procesamiento semántico local; tus mensajes no se envían a terceros.</span><button className="analyze-button" onClick={runAnalysis} disabled={isAnalyzing} type="button">{isAnalyzing ? <><span className="spinner"/> Analizando…</> : <>Analizar conversación <span>→</span></>}</button></div></div>
  {result && copy ? <div className={`results level-${result.level}`} ref={resultsRef} aria-live="polite"><div className="results-heading"><span className="section-kicker"><span>03</span> LECTURA DE SEGURIDAD</span><span>{result.messageCount} {result.messageCount === 1 ? "mensaje analizado" : "mensajes analizados"}</span></div><div className="risk-card"><div className="risk-main"><div className="risk-text"><span className="risk-eyebrow">{copy.eyebrow}</span><h3>{copy.name}</h3><p>{copy.body}</p></div><div className="risk-meter" style={{ "--score": `${Math.max(result.score, 4)}` } as React.CSSProperties}><div><strong>{result.score}</strong><span>/100</span></div></div></div><div className="risk-track"><span style={{ width: `${Math.max(result.score, 3)}%` }}/></div><div className="risk-action"><span>↗</span>{copy.action}</div></div>{result.findings.length > 0 && <div className="findings"><div className="findings-title"><h3>Señales identificadas</h3><span>{activeCount.toString().padStart(2, "0")} patrones</span></div>{result.findings.map((finding) => <article className="finding-card" key={finding.category}><div className="finding-top"><span className="finding-icon">{finding.icon}</span><strong>{finding.label}</strong><span className="finding-badge">{finding.analysisMethod === "semantic" ? "LECTURA SEMÁNTICA" : "PATRÓN DETECTADO"}</span></div>{finding.sourceCategories.length > 0 && <p className="finding-source">Subtipos identificados: {finding.sourceCategories.join(" · ")}</p>}<blockquote>“{finding.excerpt}”</blockquote><p>{finding.explanation}</p></article>)}</div>}<div className="support-callout"><div><span>◌</span><div><strong>Lo que sientes importa.</strong><p>Puedes hablar de esto sin que nadie te juzgue.</p></div></div><button onClick={() => setTab("support")}>Hablar con el asistente →</button></div><p className="clinical-note">Evaluación orientativa mediante procesamiento semántico local y {referenceExampleCount} ejemplos de referencia. No constituye diagnóstico, predicción de violencia ni asesoría clínica o jurídica. Si existe peligro inmediato y puedes hacerlo con seguridad, llama al ECU 911.</p></div> : <div className="empty-results"><div>◎</div><h3>Tu lectura aparecerá aquí</h3><p>Escribe o pega los mensajes que quieras revisar y presiona analizar. Este espacio es para ti.</p></div>}</> : <section className="support-panel"><div className="support-header"><span className="section-kicker"><span>02</span> ACOMPAÑAMIENTO PRIVADO</span><h2>Un espacio para entender<br/><span>lo que estás viviendo.</span></h2><p>Orientación informativa sin juicios, adaptada a los patrones identificados en tu conversación.</p></div><div className="chat-thread">{chat.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" && <span className="assistant-avatar">◈</span>}<p>{message.text}</p></div>)}<div ref={supportRef}/></div><div className="chat-prompts">{["¿Estoy exagerando?", "¿Por qué pedir mi ubicación es control?", "¿Cómo puedo buscar ayuda?"].map((prompt) => <button key={prompt} onClick={() => sendChat(prompt)}>{prompt}</button>)}</div><form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendChat(); }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Escribe lo que necesitas preguntar…" aria-label="Mensaje para el asistente"/><button type="submit">Enviar →</button></form><p className="clinical-note">Esta demo no sustituye atención psicológica, acompañamiento especializado ni servicios de emergencia.</p></section>}</section></section><footer className="footer"><span>Diseñado con perspectiva de género y enfoque psicológico.</span><span><b>TEAM COMADRES</b> · CUENCA, ECUADOR</span></footer>{toast && <div className="toast" role="status"><span>◉</span>{toast}</div>}</main>;
}
