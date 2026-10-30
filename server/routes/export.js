import { Router } from 'express';
import { listLinks } from '../repos/links.js';
import { listLogEntries } from '../repos/logEntries.js';
import { listPhotos } from '../repos/photos.js';
import { getProject } from '../repos/projects.js';
import { listPurchases } from '../repos/purchases.js';
import { listSections } from '../repos/sections.js';
import { listTasks } from '../repos/tasks.js';

// Mounted at /api: a whole project as Markdown, and purchases as CSV.
const router = Router();

const money = (cents) => `$${((cents ?? 0) / 100).toFixed(2)}`;
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => [`| ${head.map(cell).join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n');
const fileName = (name, ext) => `${name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'project'}.${ext}`;

function projectMarkdown(project) {
  const id = project.id;
  const out = [`# ${project.name}`, ''];
  const meta = [project.status, project.start_date && `started ${project.start_date}`, project.target_date && `target ${project.target_date}`, project.tags.length && project.tags.map((t) => `#${t}`).join(' ')].filter(Boolean);
  out.push(`_${meta.join(' · ')}_`, '');
  if (project.summary) out.push(`> ${project.summary}`, '');
  if (project.goal) out.push(`**Goal:** ${project.goal}`, '');
  if (project.next_action) out.push(`**Next action:** ${project.next_action}`, '');

  const custom = Object.fromEntries(listSections(id).map((s) => [`custom:${s.id}`, s]));
  const writers = {
    figures: () =>
      project.specs.length && ['## Key figures', '', table(['Figure', 'Value', 'Note'], project.specs.map((s) => [s.label, `${s.value} ${s.unit}`.trim(), s.note]))],
    notebook: () => {
      const entries = listLogEntries(id);
      return (
        entries.length && [
          '## Notebook',
          ...entries.flatMap((e) => [
            '',
            `### ${e.timestamp.slice(0, 10)} — ${e.type}: ${e.title}`,
            '',
            e.body.trim(),
            ...(e.photos.length ? ['', ...e.photos.map((p) => `- Photo: ${p.caption || p.original_name}`)] : []),
          ]),
        ]
      );
    },
    tasks: () => {
      const tasks = listTasks(id);
      return tasks.length && ['## Tasks', '', ...tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''} — ${t.priority}`)];
    },
    purchases: () => {
      const list = listPurchases(id);
      if (!list.length) return null;
      const spent = list.filter((p) => ['Ordered', 'Arrived'].includes(p.status)).reduce((s, p) => s + p.total_cents, 0);
      return [
        '## Purchases',
        '',
        table(['Item', 'Vendor', 'Qty', 'Unit', 'Total', 'Ordered', 'Status'], list.map((p) => [p.item, p.vendor, p.qty, money(p.unit_cost_cents), money(p.total_cents), p.date_ordered ?? '', p.status])),
        '',
        `**Spent:** ${money(spent)}${project.budget_cents ? ` of ${money(project.budget_cents)} budget` : ''}`,
      ];
    },
    links: () => {
      const links = listLinks(id);
      return links.length && ['## Links & files', '', ...links.map((l) => `- **${l.category}:** ${l.file ? `${l.label} (file: ${l.file.original_name})` : `[${l.label}](${l.url})`}`)];
    },
    viewer: () => null, // featured files are listed under Links & files
    photos: () => {
      const photos = listPhotos(id);
      return photos.length && ['## Photos', '', ...photos.map((p) => `- ${p.taken_on} — ${p.caption || p.original_name}`)];
    },
    activity: () => null,
  };

  for (const key of project.layout) {
    let block = null;
    if (writers[key]) block = writers[key]();
    else if (custom[key]) {
      const s = custom[key];
      if (s.kind === 'notes') block = [`## ${s.title}`, '', s.data.body.trim()];
      if (s.kind === 'checklist') block = [`## ${s.title}`, '', ...s.data.items.map((it) => `- [${it.done ? 'x' : ' '}] ${it.text}`)];
      if (s.kind === 'table') block = [`## ${s.title}`, '', table(s.data.columns.map((c) => (c.unit ? `${c.name} (${c.unit})` : c.name)), s.data.rows)];
      if (s.kind === 'embed') block = [`## ${s.title}`, '', s.data.url];
    }
    if (block) out.push(...block, '');
  }
  out.push('---', `_Exported from EPL on ${new Date().toISOString().slice(0, 10)}._`, '');
  return out.join('\n');
}

router.get('/projects/:id/export.md', (req, res) => {
  const project = getProject(Number(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.attachment(fileName(project.name, 'md')).type('text/markdown; charset=utf-8').send(projectMarkdown(project));
});

router.get('/projects/:id/purchases.csv', (req, res) => {
  const project = getProject(Number(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Item', 'Vendor', 'Category', 'Qty', 'Unit cost', 'Shipping/tax', 'Total', 'Date ordered', 'Status', 'Link', 'Notes'];
  const rows = listPurchases(project.id).map((p) =>
    [p.item, p.vendor, p.category, p.qty, (p.unit_cost_cents / 100).toFixed(2), (p.shipping_tax_cents / 100).toFixed(2), (p.total_cents / 100).toFixed(2), p.date_ordered, p.status, p.link, p.notes].map(q).join(','),
  );
  res.attachment(fileName(`${project.name} purchases`, 'csv')).type('text/csv; charset=utf-8').send('﻿' + [head.map(q).join(','), ...rows].join('\r\n'));
});

export default router;
