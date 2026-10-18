import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { ACTORS, GATES, chapterLink, conflictChapters, storyState } from "./conflict-story.js";

const NAMES = { host: "Host", persona: "Persona", feedback: "Feedback" };
const RENDERER_Y = { host: 58, persona: 158, feedback: 258 };
const SHEET_X = 232;
const SHEET_W = 176;
const SHEET_H = 74;
const SHEET_Y = [70, 196];
const GATE_X = 450;
const GATE_W = 86;
const CSSOM_X = 572;

function sheetY(state, id) {
  return SHEET_Y[state.sheets.findIndex(sheet => sheet.id === id)];
}

function describeState(chapter, state) {
  const sheets = state.sheets.map(sheet =>
    `${NAMES[sheet.creator]} created ${sheet.marked ? "an approved" : "an unmarked"} sheet`);
  const handles = state.handles.filter(handle => handle.kind !== "created").map(handle => {
    const creator = NAMES[state.sheets.find(sheet => sheet.id === handle.sheet).creator];
    return `${NAMES[handle.actor]} ${handle.kind} ${creator}'s sheet`;
  });
  const attempts = state.attempts.map(attempt =>
    `${NAMES[attempt.actor]}'s rule ${attempt.verdict === "blocked" ? "was rejected" : "was inserted"}`);
  return [GATES[state.gate]?.label, ...sheets, ...handles, ...attempts].filter(Boolean).join(". ") + ".";
}

function Renderer({ actor, label, mounted, cached }) {
  const y = RENDERER_Y[actor];
  return <motion.g data-renderer={actor} className={`explainer-actor actor-${actor}`}
    animate={{ opacity: mounted ? 1 : 0.28 }}>
    <rect x="16" y={y} width="168" height="62" rx="12" />
    <text x="32" y={y + 26} className="explainer-title">{NAMES[actor]} renderer</text>
    <text x="32" y={y + 46} className="explainer-subtle">{mounted ? label : "Not mounted yet"}</text>
    <AnimatePresence>
      {cached && <motion.g key="cache" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}>
        <rect x="118" y={y - 10} width="72" height="20" rx="10" className="explainer-cache" />
        <text x="154" y={y + 4} textAnchor="middle" className="explainer-badge-text">cached</text>
      </motion.g>}
    </AnimatePresence>
  </motion.g>;
}

function Sheet({ sheet, y }) {
  return <motion.g data-sheet={sheet.id} data-creator={sheet.creator} data-marked={String(sheet.marked)}
    className={`explainer-sheet actor-${sheet.creator}`}
    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
    style={{ transformOrigin: `${SHEET_X + SHEET_W / 2}px ${y + SHEET_H / 2}px` }}>
    <rect x={SHEET_X} y={y} width={SHEET_W} height={SHEET_H} rx="10" />
    <text x={SHEET_X + 14} y={y + 24} className="explainer-code">{"<style … bucket=\"d\">"}</text>
    <text x={SHEET_X + 14} y={y + 44} className="explainer-subtle">Created by {NAMES[sheet.creator]}</text>
    <rect x={SHEET_X + 14} y={y + 52} width={sheet.marked ? 92 : 74} height="16" rx="8"
      className={sheet.marked ? "explainer-approved" : "explainer-unmarked"} />
    <text x={SHEET_X + 22} y={y + 64} className="explainer-badge-text">
      {sheet.marked ? "✓ approved" : "unmarked"}</text>
  </motion.g>;
}

function Handle({ handle, state, index, duration }) {
  const fromY = RENDERER_Y[handle.actor] + 31 + (handle.kind === "discarded" ? 8 : 0);
  const toY = sheetY(state, handle.sheet) + 20 + index * 6;
  const midX = (184 + SHEET_X) / 2;
  const d = `M184 ${fromY} C${midX} ${fromY} ${midX} ${toY} ${SHEET_X} ${toY}`;
  return <g data-handle={handle.kind} data-actor={handle.actor}>
    <motion.path d={d} className={`explainer-handle actor-${handle.actor} handle-${handle.kind}`}
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration }} />
    {handle.kind === "discarded" && <motion.text x="196" y={SHEET_Y[0] + SHEET_H + 26}
      className="explainer-reject-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay: duration }}>✕ discarded</motion.text>}
  </g>;
}

function Attempt({ attempt, state, index, duration }) {
  const y = sheetY(state, attempt.sheet) + 24 + index * 24;
  const blocked = attempt.verdict === "blocked";
  const end = blocked ? GATE_X + 4 : CSSOM_X;
  return <g data-attempt={attempt.actor} data-verdict={attempt.verdict}>
    <motion.path d={`M${SHEET_X + SHEET_W} ${y} L${end} ${y}`}
      className={`explainer-attempt actor-${attempt.actor}${blocked ? " is-blocked" : ""}`}
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration }} />
    <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: duration }} style={{ transformOrigin: `${GATE_X + 24}px ${y}px` }}>
      <circle cx={GATE_X + 24} cy={y} r="10" className={blocked ? "explainer-reject" : "explainer-pass"} />
      <text x={GATE_X + 24} y={y + 4} textAnchor="middle" className="explainer-verdict">{blocked ? "✕" : "✓"}</text>
    </motion.g>
  </g>;
}

function Cssom({ state, duration }) {
  const rows = state.attempts;
  return <g className="explainer-cssom">
    <rect x={CSSOM_X} y="40" width="172" height="290" rx="12" />
    <text x={CSSOM_X + 14} y="64" className="explainer-title">Browser CSSOM</text>
    <AnimatePresence>
      {rows.map((attempt, index) => {
        const present = attempt.verdict === "inserted";
        const y = 82 + index * 44;
        return <motion.g key={`${attempt.actor}-${index}`} data-cssom-rule={attempt.actor}
          data-present={String(present)} className={`actor-${attempt.actor}`}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
          transition={{ delay: duration }}>
          <rect x={CSSOM_X + 12} y={y} width="148" height="34" rx="8"
            className={present ? "explainer-rule" : "explainer-rule is-missing"} />
          <text x={CSSOM_X + 22} y={y + 15} className="explainer-subtle">{NAMES[attempt.actor]} rule</text>
          <text x={CSSOM_X + 22} y={y + 28} className={present ? "explainer-badge-text" : "explainer-reject-text"}>
            {present ? "present" : "missing"}</text>
        </motion.g>;
      })}
    </AnimatePresence>
  </g>;
}

function Diagram({ chapter, state, titleId, descId }) {
  const reduced = useReducedMotion();
  const duration = reduced ? 0 : 0.6;
  const gate = GATES[state.gate];
  const attemptsBySheet = new Map();
  const handlesBySheet = new Map();
  return <div className="explainer-figure"><svg className="explainer-diagram" viewBox="0 0 760 350" role="img"
    aria-labelledby={titleId} aria-describedby={descId} data-gate={state.gate || "none"}>
    <title id={titleId}>{chapter.title}</title>
    <desc id={descId}>{describeState(chapter, state)}</desc>
    <text x="16" y="28" className="explainer-heading">Renderers</text>
    <text x={CSSOM_X} y="28" className="explainer-heading">Insertion</text>
    <text x={SHEET_X} y="28" className="explainer-heading">Document sheets</text>
    <text x={GATE_X} y="28" className="explainer-heading">Host filter</text>
    {ACTORS.map(actor => <Renderer key={actor} actor={actor} label={chapter.renderers[actor]}
      mounted={state.mounted.has(actor)} cached={state.attempts.some(attempt => attempt.actor === actor)} />)}
    <motion.g className={`explainer-gate gate-${state.gate || "none"}`} animate={{ opacity: gate?.installed ? 1 : 0.45 }}>
      <rect x={GATE_X} y="40" width={GATE_W} height="290" rx="10" />
      {(gate?.short || ["Host", "filter"]).map((line, index) => <text key={line} x={GATE_X + GATE_W / 2}
        y={60 + index * 15} textAnchor="middle" className="explainer-gate-label">{line}</text>)}
    </motion.g>
    <AnimatePresence>
      {state.sheets.map((sheet, index) => <Sheet key={sheet.id} sheet={sheet} y={SHEET_Y[index]} />)}
    </AnimatePresence>
    {state.handles.map(handle => {
      const index = handlesBySheet.get(handle.sheet) || 0;
      handlesBySheet.set(handle.sheet, index + 1);
      return <Handle key={`${handle.actor}-${handle.sheet}-${handle.kind}`} handle={handle} state={state}
        index={index} duration={duration} />;
    })}
    {state.attempts.map(attempt => {
      const index = attemptsBySheet.get(attempt.sheet) || 0;
      attemptsBySheet.set(attempt.sheet, index + 1);
      return <Attempt key={`${attempt.actor}-${attempt.sheet}`} attempt={attempt} state={state}
        index={index} duration={duration} />;
    })}
    <Cssom state={state} duration={duration} />
  </svg></div>;
}

export function ConflictExplainer() {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [step, setStep] = useState(0);
  const chapter = conflictChapters[chapterIndex];
  const state = storyState(chapter, step);
  const last = chapter.steps.length - 1;
  function selectChapter(index) {
    setChapterIndex(index);
    setStep(0);
  }
  function onKeyDown(event) {
    if (event.key === "ArrowRight" && step < last) { event.preventDefault(); setStep(step + 1); }
    if (event.key === "ArrowLeft" && step > 0) { event.preventDefault(); setStep(step - 1); }
  }
  return <MotionConfig reducedMotion="user">
    <section className="conflict-explainer" aria-labelledby="explainer-heading">
      <h2 id="explainer-heading">2. They meet on the same page</h2>
      <p className="explainer-intro">Start with Feedback arriving before the pinned Persona release.
        First change only Persona's version to see the guard at work. Later chapters explore
        reversed arrival order and different host policies. Each chapter follows one generated rule per integration,
        not every bucket or rule the components need.</p>
      <div className="explainer-chapters" role="group" aria-label="Explainer chapters">
        {conflictChapters.map((item, index) => <button key={item.id} type="button"
          data-chapter={item.id} aria-pressed={index === chapterIndex}
          onClick={() => selectChapter(index)}>{item.title}</button>)}
      </div>
      <div className="explainer-stage" role="group" aria-roledescription="stepper"
        aria-label={`${chapter.title}: step ${step + 1} of ${last + 1}`} tabIndex={0} onKeyDown={onKeyDown}>
        <p className="explainer-question">{chapter.question}</p>
        {chapter.control && <p className="explainer-control">{chapter.control}</p>}
        <p className="explainer-gate-rule" data-gate-rule>Host filter:{" "}
          {state.gate ? `${GATES[state.gate].label}. ${GATES[state.gate].rule}.` : "not decided yet."}</p>
        <Diagram chapter={chapter} state={state} titleId={`explainer-title-${chapter.id}`}
          descId={`explainer-desc-${chapter.id}`} />
        <p className="explainer-caption" aria-live="polite" data-step={step + 1}>
          <span className="explainer-step">Step {step + 1} of {last + 1}</span> {chapter.steps[step].caption}
        </p>
        <div className="explainer-controls">
          <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>
            <span aria-hidden="true">←</span> Previous</button>
          <ol className="explainer-progress" aria-hidden="true">
            {chapter.steps.map((_, index) => <li key={index} className={index <= step ? "is-done" : ""} />)}
          </ol>
          <button type="button" onClick={() => setStep(step + 1)} disabled={step === last}>
            Next <span aria-hidden="true">→</span></button>
        </div>
        <AnimatePresence>
          {step === last && <motion.div className="explainer-takeaway" initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p><strong>Takeaway:</strong> {chapter.takeaway}</p>
          </motion.div>}
        </AnimatePresence>
        <a className="text-link explainer-live" href={chapterLink(chapter, location.search)}>
          Open this configuration in the playground <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </MotionConfig>;
}
