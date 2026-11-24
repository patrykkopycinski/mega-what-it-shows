// Splits a ticket's reports into the problems they describe. Counts follow the desk's own view
// (causes.ts: tenant and form). The desk's one-day-move reports (desk-notes.json) are a different
// bug, so they get their own row too, while still counted under the cause they're filed under.
import { CAUSES, groupByCause, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'unplaced' | 'one-day-move';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // Set when these reports are already counted in another row.
  within?: Problem;
};

const tally = (rs: Report[], key: (r: Report) => string): Record<string, number> =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

const describe = (problem: Problem, rs: Report[], within?: Problem): ProblemGroup => {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    channels: tally(rs, (r) => r.channel),
    taggedAs: tally(rs, (r) => r.meta.intakeTag),
    firstSeen: days[0] ?? '',
    lastSeen: days[days.length - 1] ?? '',
    within,
  };
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { total: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const byCause = groupByCause(merged, tenantOf).sort(
    (a, b) => [...CAUSES, 'unplaced'].indexOf(a.cause) - [...CAUSES, 'unplaced'].indexOf(b.cause),
  );
  const groups = byCause.map((g) => describe(g.cause, g.reports));
  for (const g of byCause) {
    const moved = g.reports.filter((r) => oneDayMove.includes(r.id));
    if (moved.length) groups.push(describe('one-day-move', moved, g.cause));
  }
  return { total: merged.length, groups };
}
