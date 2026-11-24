// Splits a ticket's reports into the problems they describe. causes.ts decides by tenant and form;
// the desk's one-day-move reports (desk-notes.json) are a different bug, so they get their own group
// instead of a footnote under `parser`.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day-move' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day-move', 'unplaced'];

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day-move';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (rs: Report[], key: (r: Report) => string): Record<string, number> =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { total: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const groups = PROBLEMS.map((problem) => {
    const rs = merged.filter((r) => problemOf(r, tenantOf(r), oneDayMove) === problem);
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: new Set(rs.map((r) => r.tenant)).size,
      channels: tally(rs, (r) => r.channel),
      taggedAs: tally(rs, (r) => r.meta.intakeTag),
      firstSeen: days[0] ?? '',
      lastSeen: days[days.length - 1] ?? '',
    };
  }).filter((g) => g.reports.length > 0);
  return { total: merged.length, groups };
}
