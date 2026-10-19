import { describe, expect, test } from "vitest";
import { experiments, personaRevisions } from "../src/experiments/scenarios.js";
import {
  GATES,
  chapterLink,
  conflictChapters,
  storyState,
} from "../src/playground/conflict-story.js";

describe("conflict explainer story", () => {
  test("chapter ids are unique", () => {
    expect(new Set(conflictChapters.map((chapter) => chapter.id)).size).toBe(
      conflictChapters.length,
    );
  });

  test("the opening encounter and guard comparison change only the Persona version", () => {
    const [release, guarded] = conflictChapters;
    expect(release.scenario).toBe("raw-marked-first");
    expect(guarded.scenario).toBe(release.scenario);
    expect(guarded.host).toBe(release.host);
    expect(release.personaVersion).toBe("1.20260927.13.2");
    expect(guarded.personaVersion).toBe("main-2026-10-16");
    const before = storyState(release, release.steps.length - 1);
    const after = storyState(guarded, guarded.steps.length - 1);
    expect(before.gate).toBe("prefix");
    expect(after.gate).toBe(before.gate);
    expect(before.attempts.map((attempt) => attempt.verdict)).toStrictEqual([
      "inserted",
      "blocked",
    ]);
    expect(after.attempts.map((attempt) => attempt.verdict)).toStrictEqual([
      "inserted",
      "inserted",
    ]);
  });

  test.for(conflictChapters)(
    "$id references a real configuration and replays its arrival order",
    (chapter) => {
      const config = experiments.find((experiment) => experiment.id === chapter.scenario);
      expect(config, `${chapter.scenario} is a defined scenario`).toBeTruthy();
      expect(Object.hasOwn(personaRevisions, chapter.personaVersion)).toBe(true);
      expect(["extracted", "runtime"]).toContain(chapter.host);
      const final = storyState(chapter, chapter.steps.length - 1);
      const gate =
        chapter.host === "runtime"
          ? "off"
          : Object.entries(GATES).find(
              ([, value]) => value.policy === (chapter.hostPolicy || "master"),
            )?.[0];
      expect(final.gate, "The drawn filter matches the configured host policy").toBe(gate);
      const arrivals = chapter.steps
        .flatMap((step) => step.events)
        .map((event) => event.actor)
        .filter(
          (actor, index, all) =>
            ["persona", "feedback"].includes(actor) && all.indexOf(actor) === index,
        );
      expect(arrivals, "Integrations appear in configured order").toStrictEqual(config.order);
      expect(final.attempts.map((attempt) => attempt.actor).sort()).toStrictEqual(
        [...config.order].sort(),
      );
      const profile = config.personaProfile || personaRevisions[chapter.personaVersion].profile;
      const personaHandles = final.handles.filter((handle) => handle.actor === "persona");
      if (profile === "historical") {
        expect(personaHandles.some((handle) => handle.kind === "discarded")).toBe(false);
      }
      if (profile === "marker-guard") {
        const used = final.attempts.find((attempt) => attempt.actor === "persona").sheet;
        expect(
          final.sheets.find((sheet) => sheet.id === used).marked,
          "The guard never writes into sheets without the enhanced-specificity attribute",
        ).toBe(true);
      }
    },
  );

  test.for(conflictChapters)("$id only writes through handles the actor holds", (chapter) => {
    chapter.steps.forEach((_, index) => {
      const state = storyState(chapter, index);
      const sheetIds = new Set(state.sheets.map((sheet) => sheet.id));
      for (const handle of state.handles) {
        expect(sheetIds.has(handle.sheet)).toBe(true);
      }
      for (const attempt of state.attempts) {
        const live = state.handles.filter(
          (handle) => handle.actor === attempt.actor && handle.sheet === attempt.sheet,
        );
        expect(
          live.some((handle) => handle.kind !== "discarded"),
          `${attempt.actor} holds ${attempt.sheet}`,
        ).toBe(true);
        expect(live.some((handle) => handle.kind === "discarded")).toBe(false);
        const sheet = state.sheets.find((item) => item.id === attempt.sheet);
        const gate = GATES[state.gate];
        const allowed =
          !gate.installed || sheet.marked || (state.gate === "prefix" && attempt.prefix);
        expect(attempt.verdict, "Drawn verdicts follow the drawn filter rule").toBe(
          allowed ? "inserted" : "blocked",
        );
      }
    });
  });

  test("live links keep coverage and select the chapter's host and Persona version", () => {
    const chapter = conflictChapters.find((item) => item.host === "runtime");
    const url = new URL(
      chapterLink(chapter, "?coverage=minimal&host=extracted"),
      "http://localhost",
    );
    expect(url.pathname).toBe("/");
    expect(url.hash).toBe(`#${chapter.scenario}`);
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      coverage: "minimal",
      host: "runtime",
      personaVersion: chapter.personaVersion,
      hostPolicy: "master",
    });
  });
});
