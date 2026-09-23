/** Timeline geometry in % of the track width (1 unit = 11.4286 %, go-live at 7.5 units). */
export const GO_LIVE = 85.714;

export interface ProcessBar {
  start: number;
  end: number | null;
  tone: 'outline' | 'solid' | 'accent';
  demos?: readonly number[];
  outAlign?: 'start' | 'end' | 'edge';
}

export const PROCESS_BARS: readonly ProcessBar[] = [
  { start: 0, end: 11.429, tone: 'outline' },
  { start: 8.571, end: 28.571, tone: 'outline' },
  { start: 22.857, end: 77.143, tone: 'solid', demos: [34.286, 45.714, 57.143, 68.571] },
  { start: 77.143, end: GO_LIVE, tone: 'solid', outAlign: 'end' },
  { start: GO_LIVE, end: null, tone: 'accent', outAlign: 'edge' },
];

export function barLength(bar: ProcessBar): number | null {
  return bar.end === null ? null : Number((bar.end - bar.start).toFixed(3));
}

/** Where (0–1) a bar starts growing and for how long, when a cursor sweeps the track linearly from 0 to 1. */
export function barSchedule(bar: ProcessBar): { at: number; duration: number } {
  const at = bar.start / 100;
  const end = bar.end === null ? 1 : bar.end / 100;
  return { at, duration: Math.max(end - at, 0.001) };
}
