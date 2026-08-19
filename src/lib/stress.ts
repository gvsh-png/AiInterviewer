export type StressReading = {
  stress: number;
  bpm: number;
  alert: boolean;
  label: string;
};

export function interviewStress(input: {
  round: number;
  total: number;
  turnCount: number;
  forceVerdict: number;
  therapyScore: number;
  soften: number;
  probe: number;
  shocks: number;
  callback: boolean;
}): StressReading {
  const lastHour = input.round >= input.total;
  const closing = input.turnCount >= Math.max(1, input.forceVerdict - 1);
  let stress =
    16 +
    input.round * 7 +
    input.turnCount * 8 +
    input.therapyScore * 7 +
    input.soften * 6 +
    input.probe * 4 +
    input.shocks * 14;
  if (input.callback) stress += 10;
  if (lastHour) stress += 12;
  if (closing) stress += 10;
  stress = Math.max(8, Math.min(100, Math.round(stress)));
  const bpm = Math.round(58 + stress * 0.82);
  const alert = stress >= 72;
  const label = alert
    ? "RED ALERT"
    : stress >= 48
      ? "Elevated"
      : "Stable";
  return { stress, bpm, label, alert };
}
