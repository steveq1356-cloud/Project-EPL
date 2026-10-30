export const PROJECT_STATUSES = ['Active', 'Idea', 'On Hold', 'Done', 'Abandoned'];

export const LOG_TYPES = ['Note', 'Decision', 'Problem', 'Test', 'Idea', 'Milestone'];

export const PURCHASE_STATUSES = ['Planned', 'Ordered', 'Arrived', 'Returned'];
export const SPENT_STATUSES = ['Ordered', 'Arrived'];

export const PRIORITIES = ['High', 'Medium', 'Low'];

export const LINK_CATEGORIES = ['CAD', 'Code', 'Datasheet', 'Reference'];

// Built-in project page sections. "half" sections sit side by side when next to each other.
export const BUILTIN_SECTIONS = {
  figures: { label: 'Key figures', description: 'Headline numbers — loads, tolerances, cost per unit', size: 'full' },
  notebook: { label: 'Notebook', description: 'Log entries with Markdown and photos', size: 'full' },
  tasks: { label: 'Tasks', description: 'To-dos with priority and due dates', size: 'half' },
  links: { label: 'Links & files', description: 'URLs, datasheets, code, CAD files', size: 'half' },
  viewer: { label: 'CAD & drawings', description: '3D models (STL, STEP…), PDFs and embeds', size: 'full' },
  photos: { label: 'Photos', description: 'Gallery with captions and a cover photo', size: 'full' },
  purchases: { label: 'Purchases', description: 'Orders, receipts and spend charts', size: 'full' },
  activity: { label: 'Activity', description: 'Heatmap and recent changes', size: 'full' },
};

export const DEFAULT_LAYOUT = ['figures', 'notebook', 'tasks', 'links', 'viewer', 'photos', 'purchases', 'activity'];

// Sections you can add yourself.
export const CUSTOM_KINDS = {
  notes: { label: 'Notes', description: 'A Markdown page — requirements, design notes, lessons learned', size: 'full', icon: '¶' },
  checklist: { label: 'Checklist', description: 'Assembly steps, test plan, launch list', size: 'half', icon: '☑' },
  table: { label: 'Data table', description: 'Test data or a BOM — paste from Excel, chart two columns', size: 'full', icon: '▦' },
  embed: { label: 'Embed', description: 'Any web page or tool — Onshape, Desmos, a dashboard', size: 'full', icon: '⧉' },
};

export const PROJECT_TEMPLATES = [
  { id: 'hardware', label: 'Hardware build', description: 'Notebook, tasks, CAD, photos, purchases' },
  { id: 'product', label: 'Product', description: 'Adds requirements, a bill of materials and a launch checklist' },
  { id: 'testing', label: 'Test & analysis', description: 'Adds a test plan and a data table with a chart' },
  { id: 'software', label: 'Software', description: 'Notebook, tasks, links and architecture notes' },
  { id: 'blank', label: 'Blank', description: 'Just a notebook and tasks — add the rest later' },
];

export const DASHBOARD_WIDGETS = {
  stats: 'Headline numbers',
  projects: 'Project cards',
  upnext: 'Up next (tasks & deliveries)',
  recent: 'Recent activity',
  heatmap: 'Activity heatmap',
  spend: 'Spend by month',
};
