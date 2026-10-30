// Project page sections. Built-in sections show data the app already tracks; custom
// sections ("custom:<id>") live in the sections table.

export const BUILTIN_SECTIONS = ['figures', 'notebook', 'tasks', 'links', 'viewer', 'photos', 'purchases', 'activity'];

export const DEFAULT_LAYOUT = ['figures', 'notebook', 'tasks', 'links', 'viewer', 'photos', 'purchases', 'activity'];

export const SECTION_KINDS = ['notes', 'checklist', 'table', 'embed'];

// Starting points for new projects: which built-ins show, plus custom sections to create.
export const TEMPLATES = {
  hardware: {
    label: 'Hardware build',
    layout: DEFAULT_LAYOUT,
    sections: [],
  },
  product: {
    label: 'Product',
    layout: ['figures', 'notebook', 'tasks', 'links', 'viewer', 'photos', 'purchases'],
    sections: [
      { kind: 'notes', title: 'Requirements', data: { body: '## Must have\n\n- _Add a requirement…_\n\n## Nice to have\n\n- _…_\n' }, after: 'figures' },
      {
        kind: 'table',
        title: 'Bill of materials',
        data: { columns: [{ name: 'Part' }, { name: 'Qty' }, { name: 'Unit cost', unit: '$' }, { name: 'Source' }], rows: [['', '', '', '']], chart: null },
        after: 'purchases',
      },
      { kind: 'checklist', title: 'Launch checklist', data: { items: [] }, after: 'tasks' },
    ],
  },
  software: {
    label: 'Software',
    layout: ['notebook', 'tasks', 'links', 'activity'],
    sections: [{ kind: 'notes', title: 'Architecture', data: { body: '' }, after: 'notebook' }],
  },
  testing: {
    label: 'Test & analysis',
    layout: ['figures', 'notebook', 'viewer', 'photos', 'tasks', 'links'],
    sections: [
      { kind: 'notes', title: 'Test plan', data: { body: '**Objective:** _what are you trying to learn?_\n\n**Setup:** _fixtures, instruments, sample size_\n\n**Procedure:**\n\n1. _…_\n' }, after: 'figures' },
      {
        kind: 'table',
        title: 'Test data',
        data: { columns: [{ name: 'Load', unit: 'N' }, { name: 'Deflection', unit: 'mm' }], rows: [['', '']], chart: { x: 0, y: 1 } },
        after: 'notebook',
      },
    ],
  },
  blank: {
    label: 'Blank',
    layout: ['notebook', 'tasks'],
    sections: [],
  },
};
