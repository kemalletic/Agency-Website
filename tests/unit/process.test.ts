import { describe, expect, it } from 'vitest';
import { GO_LIVE, PROCESS_BARS, barLength, barSchedule } from '../../src/lib/process';

describe('process geometry', () => {
  it('has five bars and hands over to Run at go-live', () => {
    expect(PROCESS_BARS).toHaveLength(5);
    expect(PROCESS_BARS[3]?.end).toBe(GO_LIVE);
    expect(PROCESS_BARS[4]?.start).toBe(GO_LIVE);
    expect(PROCESS_BARS[4]?.end).toBeNull();
  });

  it('measures closed bars and leaves the open one unbounded', () => {
    expect(barLength(PROCESS_BARS[0]!)).toBe(11.429);
    expect(barLength(PROCESS_BARS[2]!)).toBe(54.286);
    expect(barLength(PROCESS_BARS[4]!)).toBeNull();
  });

  it('schedules a bar to grow while the cursor crosses it', () => {
    const build = barSchedule(PROCESS_BARS[2]!);
    expect(build.at).toBeCloseTo(0.22857, 5);
    expect(build.duration).toBeCloseTo(0.54286, 5);
  });

  it('lets the open-ended bar grow until the end of the timeline', () => {
    const run = barSchedule(PROCESS_BARS[4]!);
    expect(run.at).toBeCloseTo(0.85714, 5);
    expect(run.at + run.duration).toBeCloseTo(1, 5);
  });
});
