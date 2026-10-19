import { experiments } from "../experiments/scenarios.js";
import { getScenarioContent } from "./scenario-content.js";

export function getThreeActorCases(personaVersion = "1.20260927.13.2", solution = "baseline") {
  return experiments.map((experiment) => ({
    ...experiment,
    ...getScenarioContent(experiment, personaVersion, solution),
  }));
}
