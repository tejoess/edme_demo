/**
 * EPT-15 -- Policy Cancellation: frontend/RTL test cases.
 *
 * RED phase (red-first skill): these assert the UI behaviour described in
 * .agentic/tickets/EPT-15/plan.md and test-plan.md against the CURRENT,
 * unimplemented Policies.js. There is no "Cancel Policy" button, no
 * "Cancelled" badge, and no cancel API call anywhere in the component yet
 * -- every test here is expected to fail for exactly that reason (missing
 * UI element) until the feature is implemented.
 *
 * TC ids are carried in the test names themselves per the `traceability`
 * skill; see test-plan.md for the full AC -> TC mapping.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Policies from "./Policies";
import { ConfirmProvider } from "../context/ConfirmContext";
import { apiFetch } from "../utils/apiClient";

jest.mock("../utils/apiClient", () => ({
  apiFetch: jest.fn(),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("../context/ToastContext", () => ({
  useToast: () => mockToast,
}));

const POLICY = {
  id: 1,
  title: "FamilyCare Health Plan",
  policy_type: "health",
  premium: 8500,
  term_months: 12,
  deductible: 5000,
};

const ACTIVE_USER_POLICY = {
  id: 501,
  policy_id: 1,
  status: "active",
  cancelled_at: null,
};

function renderPolicies() {
  return render(
    <ConfirmProvider>
      <Policies goToUpload={() => {}} goToComparePage={() => {}} />
    </ConfirmProvider>
  );
}

async function setupOwnedActivePolicy() {
  apiFetch.mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve([POLICY]);
    if (path === "/userpolicies/") return Promise.resolve([ACTIVE_USER_POLICY]);
    return Promise.resolve({});
  });
  renderPolicies();
  await screen.findByText(POLICY.title);
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("TC-002 / AC-001 -- confirming cancellation in the modal calls the cancel API and updates the UI", async () => {
  await setupOwnedActivePolicy();

  apiFetch.mockImplementation((path, options = {}) => {
    if (path === "/policies") return Promise.resolve([POLICY]);
    if (path === `/userpolicies/${ACTIVE_USER_POLICY.id}/cancel` && options.method === "PATCH") {
      return Promise.resolve({
        message: "Policy cancelled successfully",
        status: "cancelled",
        cancelled_at: "2026-09-18T00:00:00.000Z",
      });
    }
    if (path === "/userpolicies/") {
      return Promise.resolve([
        { ...ACTIVE_USER_POLICY, status: "cancelled", cancelled_at: "2026-09-18T00:00:00.000Z" },
      ]);
    }
    return Promise.resolve({});
  });

  // Trigger button per plan.md: a "Cancel Policy" action on the owned, active card.
  const trigger = screen.getByRole("button", { name: /cancel policy/i });
  await userEvent.click(trigger);

  const dialog = await screen.findByRole("alertdialog");
  const confirmBtn = within(dialog).getByRole("button", { name: /cancel policy/i });
  await userEvent.click(confirmBtn);

  await waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith(
      `/userpolicies/${ACTIVE_USER_POLICY.id}/cancel`,
      expect.objectContaining({ method: "PATCH" })
    )
  );

  await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument());
});

it("TC-005 / AC-003 -- a cancelled policy card shows a Cancelled badge and the cancellation date", async () => {
  apiFetch.mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve([POLICY]);
    if (path === "/userpolicies/") {
      return Promise.resolve([
        { ...ACTIVE_USER_POLICY, status: "cancelled", cancelled_at: "2026-09-01T10:00:00.000Z" },
      ]);
    }
    return Promise.resolve({});
  });

  renderPolicies();
  await screen.findByText(POLICY.title);

  expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  expect(screen.getByText(/2026-09-01/)).toBeInTheDocument();
});

it("TC-011 / AC-006 -- successful cancellation shows a readable success toast", async () => {
  await setupOwnedActivePolicy();

  apiFetch.mockImplementation((path, options = {}) => {
    if (path === "/policies") return Promise.resolve([POLICY]);
    if (path === `/userpolicies/${ACTIVE_USER_POLICY.id}/cancel` && options.method === "PATCH") {
      return Promise.resolve({
        message: "Policy cancelled successfully",
        status: "cancelled",
        cancelled_at: "2026-09-18T00:00:00.000Z",
      });
    }
    if (path === "/userpolicies/") {
      return Promise.resolve([{ ...ACTIVE_USER_POLICY, status: "cancelled" }]);
    }
    return Promise.resolve({});
  });

  const trigger = screen.getByRole("button", { name: /cancel policy/i });
  await userEvent.click(trigger);

  const dialog = await screen.findByRole("alertdialog");
  const confirmBtn = within(dialog).getByRole("button", { name: /cancel policy/i });
  await userEvent.click(confirmBtn);

  await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  expect(mockToast.success.mock.calls[0][0]).toEqual(expect.stringMatching(/cancel/i));
});

it("TC-012 / AC-007 -- a rejected cancellation shows the backend's error detail as a toast", async () => {
  await setupOwnedActivePolicy();

  apiFetch.mockImplementation((path, options = {}) => {
    if (path === "/policies") return Promise.resolve([POLICY]);
    if (path === `/userpolicies/${ACTIVE_USER_POLICY.id}/cancel` && options.method === "PATCH") {
      return Promise.reject(new Error("This policy has already been cancelled"));
    }
    if (path === "/userpolicies/") return Promise.resolve([ACTIVE_USER_POLICY]);
    return Promise.resolve({});
  });

  const trigger = screen.getByRole("button", { name: /cancel policy/i });
  await userEvent.click(trigger);

  const dialog = await screen.findByRole("alertdialog");
  const confirmBtn = within(dialog).getByRole("button", { name: /cancel policy/i });
  await userEvent.click(confirmBtn);

  await waitFor(() =>
    expect(mockToast.error).toHaveBeenCalledWith("This policy has already been cancelled")
  );
});

it("TC-013 / edge case -- dismissing the confirm modal makes no API call and leaves the policy unchanged", async () => {
  await setupOwnedActivePolicy();
  apiFetch.mockClear();

  const trigger = screen.getByRole("button", { name: /cancel policy/i });
  await userEvent.click(trigger);

  const dialog = await screen.findByRole("alertdialog");
  const dismissBtn = within(dialog).getByRole("button", { name: /^cancel$/i });
  await userEvent.click(dismissBtn);

  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

  expect(apiFetch).not.toHaveBeenCalledWith(
    expect.stringContaining("/cancel"),
    expect.objectContaining({ method: "PATCH" })
  );
  // Policy is still shown as owned/active, not cancelled.
  expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();
});
