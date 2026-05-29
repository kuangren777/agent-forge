import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from './lib/appContext';
import { Shell } from './components/Shell';
import { FlowMain } from './screens/Flow';
import { AuditMain } from './screens/Audit';
import { FLOW_NODES, AUDIT_EVENTS } from './lib/data';

function renderShell() {
  return render(
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

describe('Flow screen', () => {
  it('renders 5 capability nodes', () => {
    render(
      <AppProvider>
        <FlowMain />
      </AppProvider>
    );
    // Each node has class "node" + capability class
    const nodes = document.querySelectorAll('.node');
    expect(nodes.length).toBe(5);
    expect(FLOW_NODES).toHaveLength(5);
  });

  it('flow nodes have correct capability classes (trusted/data/parsed/write)', () => {
    render(
      <AppProvider>
        <FlowMain />
      </AppProvider>
    );
    const nodes = document.querySelectorAll('.node');
    const caps = Array.from(nodes).map(n => n.classList[1]);
    expect(caps).toContain('trusted');
    expect(caps).toContain('data');
    expect(caps).toContain('parsed');
    expect(caps).toContain('write');
  });
});

describe('Audit screen', () => {
  it('renders 8 timeline events', () => {
    render(
      <AppProvider>
        <AuditMain />
      </AppProvider>
    );
    expect(AUDIT_EVENTS).toHaveLength(8);
    // Verify each event is rendered
    for (const ev of AUDIT_EVENTS) {
      expect(screen.getByText(ev.event)).toBeInTheDocument();
    }
  });
});

describe('Shell — screen switching via nav icons', () => {
  it('clicking Flow icon shows flow screen content', () => {
    renderShell();
    const flowIcon = document.querySelector('[title^="数据流"]') as HTMLElement;
    fireEvent.click(flowIcon);
    // Flow screen has title "数据流图"
    expect(screen.getByText('数据流图')).toBeInTheDocument();
  });

  it('clicking Audit icon shows audit screen', () => {
    renderShell();
    const auditIcon = document.querySelector('[title^="审计"]') as HTMLElement;
    fireEvent.click(auditIcon);
    // Audit screen has the first audit event in it
    expect(screen.getByText('REQUEST_RECEIVED')).toBeInTheDocument();
  });
});
