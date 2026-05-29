import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '../lib/appContext';
import { Shell } from '../components/Shell';

function renderWithShell() {
  return render(
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function navigateToChat() {
  const chatIcon = document.querySelector('[title^="对话"]') as HTMLElement;
  fireEvent.click(chatIcon);
}

describe('ChatMain — 确认执行 behavior', () => {
  it('shows 确认执行 button before confirming', () => {
    renderWithShell();
    navigateToChat();
    expect(screen.getByText('确认执行')).toBeInTheDocument();
  });

  it('clicking 确认执行 toggles to done-state (buttons replaced by audit-chain confirmation)', () => {
    renderWithShell();
    navigateToChat();

    const confirmBtn = screen.getByText('确认执行');
    fireEvent.click(confirmBtn);

    // Done state shows "已确认并执行"
    expect(screen.getByText(/已确认并执行/)).toBeInTheDocument();
    // The original action buttons (修改, 取消) should be gone
    expect(screen.queryByText('修改')).toBeNull();
    expect(screen.queryByText('取消')).toBeNull();
  });

  it('switching role resets done state — 确认执行 button reappears', () => {
    renderWithShell();
    navigateToChat();

    // Click confirm
    fireEvent.click(screen.getByText('确认执行'));
    expect(screen.getByText(/已确认并执行/)).toBeInTheDocument();

    // Switch role to employee (label '员工')
    const employeeBtn = screen.getByText('员工');
    fireEvent.click(employeeBtn);

    // Done state should reset — 确认执行 reappears
    expect(screen.getByText('确认执行')).toBeInTheDocument();
    expect(screen.queryByText(/已确认并执行/)).toBeNull();
  });
});
