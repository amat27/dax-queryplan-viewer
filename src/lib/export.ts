export function exportVisiblePlanSvg() {
  const panels = [...document.querySelectorAll<HTMLElement>('.plan-panel')]
    .filter((panel) => panel.offsetParent !== null);
  const flow = panels[0]?.querySelector<HTMLElement>('.react-flow');
  const viewport = flow?.querySelector<HTMLElement>('.react-flow__viewport');
  if (!flow || !viewport) return;

  const bounds = flow.getBoundingClientRect();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(Math.ceil(bounds.width)));
  svg.setAttribute('height', String(Math.ceil(bounds.height)));
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(bounds.width)} ${Math.ceil(bounds.height)}`);
  svg.style.background = cssColor('--background', '#ffffff');

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = collectStyles();
  svg.appendChild(style);
  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');
  const wrapper = document.createElement('div');
  wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  wrapper.style.cssText = `width:${bounds.width}px;height:${bounds.height}px;overflow:hidden;background:${cssColor('--background', '#ffffff')};`;
  wrapper.appendChild(viewport.cloneNode(true));
  foreignObject.appendChild(wrapper);
  svg.appendChild(foreignObject);

  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `dax-query-plan-${Date.now()}.svg`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function collectStyles(): string {
  let result = '';
  for (const sheet of [...document.styleSheets]) {
    try {
      for (const rule of [...(sheet as CSSStyleSheet).cssRules]) result += `${rule.cssText}\n`;
    } catch { /* Ignore protected stylesheets. */ }
  }
  return result;
}

function cssColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `hsl(${value})` : fallback;
}
