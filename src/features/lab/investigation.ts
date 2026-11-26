/**
 * The investigation as a pure state machine. The stage only moves forward, and the counterexample can only be revealed
 * after the learner has predicted and tried at least one input of their own (or asked for a hint). Nothing is stored or scored.
 */
export type Stage = "predict" | "experiment" | "find" | "understand" | "repair";
export const STAGES: readonly Stage[] = ["predict", "experiment", "find", "understand", "repair"];
export const STAGE_LABEL: Record<Stage, string> = { predict: "Predict", experiment: "Experiment", find: "Find the failure", understand: "Understand", repair: "Repair the reasoning" };

export type Prediction = "works" | "fails";
export type Investigation = {
  stage: Stage;
  prediction: Prediction | null;
  runs: number;
  /** The learner's own input exposed the bug. */
  foundByLearner: boolean;
  revealed: boolean;
  hints: 0 | 1 | 2 | 3;
  /** Option chosen for "which assumption?", and whether it was right. */
  answer: number | null;
  answeredRight: boolean;
  solutionShown: boolean;
};
export type InvAction =
  | { type: "predict"; prediction: Prediction }
  | { type: "run"; differs: boolean }
  | { type: "reveal" }
  | { type: "hint" }
  | { type: "answer"; index: number; correct: boolean }
  | { type: "continue" }
  | { type: "repair" }
  | { type: "showSolution" }
  | { type: "restart" };

export const initialInvestigation = (): Investigation => ({ stage: "predict", prediction: null, runs: 0, foundByLearner: false, revealed: false, hints: 0, answer: null, answeredRight: false, solutionShown: false });

export const stageIndex = (s: Stage) => STAGES.indexOf(s);
/** The counterexample may be revealed once the learner has predicted and tried something or asked for help. */
export const canReveal = (i: Investigation) => i.stage === "experiment" && !i.revealed && (i.runs >= 1 || i.hints >= 1);
/** The failure trace is shown only after the failure has been found. */
export const traceVisible = (i: Investigation) => stageIndex(i.stage) >= stageIndex("find");

export function investigate(s: Investigation, a: InvAction): Investigation {
  switch (a.type) {
    case "predict":
      return s.stage === "predict" ? { ...s, prediction: a.prediction, stage: "experiment" } : s;
    case "run": {
      if (s.stage === "predict") return s;
      const runs = s.runs + 1;
      if (s.stage === "experiment" && a.differs) return { ...s, runs, foundByLearner: true, stage: "find" };
      return { ...s, runs };
    }
    case "reveal":
      return canReveal(s) ? { ...s, revealed: true, stage: "find" } : s;
    case "hint":
      return s.stage === "predict" || s.hints >= 3 ? s : { ...s, hints: (s.hints + 1) as Investigation["hints"] };
    case "continue":
      return s.stage === "find" ? { ...s, stage: "understand" } : s;
    case "answer":
      return s.stage === "understand" ? { ...s, answer: a.index, answeredRight: a.correct } : s;
    case "repair":
      return toRepair(s);
    case "showSolution":
      return s.stage === "repair" ? { ...s, solutionShown: true } : s;
    case "restart":
      return initialInvestigation();
  }
  return s;
}

/** After answering correctly (or after seeing the explanation for a wrong answer) the learner may move on to repair. */
export const canRepair = (s: Investigation) => s.stage === "understand" && s.answer !== null;
export function toRepair(s: Investigation): Investigation {
  return canRepair(s) ? { ...s, stage: "repair" } : s;
}
