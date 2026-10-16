import { experiments } from "../experiments/scenarios.js";
import { scenarioContent } from "./scenario-content.js";

export const threeActorCases = experiments.map(experiment => ({
  ...experiment, ...scenarioContent[experiment.id],
}));
