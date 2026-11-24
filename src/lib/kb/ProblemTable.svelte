<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type Problem } from '#lib/kb/problems';

  type Filed = { issue: number; state: string };
  // tickets: problem → issue in `repo` and where it stands, e.g. { parser: { issue: 1, state: 'fixed' } }
  let { ticket, repo, tickets }: { ticket: number; repo: string; tickets: Partial<Record<Problem, Filed>> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const placed = $derived(split.groups.filter((g) => !g.within).reduce((n, g) => n + g.reports.length, 0));
  const list = (m: Record<string, number>) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.total}</strong> unique reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong> problems · {placed} placed by cause
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>ticket</th><th>state</th><th>tenants</th><th>channels</th><th>intake tagged as</th><th>seen</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      {@const filed = tickets[g.problem]}
      <tr class:unfiled={!filed}>
        <td><code>{g.problem}</code></td>
        <td>
          <strong>{g.reports.length}</strong>
          {#if g.within}<span class="small">(within <code>{g.within}</code>)</span>{/if}
        </td>
        <td>
          {#if filed}
            <a href="https://github.com/{repo}/issues/{filed.issue}">{repo}#{filed.issue}</a>
          {:else}
            no ticket yet
          {/if}
        </td>
        <td>{filed?.state ?? ''}</td>
        <td>{g.tenants}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .unfiled td { background: var(--warn-bg); }
</style>
