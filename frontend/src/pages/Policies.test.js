import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Policies from "./Policies";
import { apiFetch } from "../utils/apiClient";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";

jest.mock("../utils/apiClient", () => ({
  apiFetch: jest.fn(),
}));

function renderPolicies() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <Policies goToUpload={() => {}} goToComparePage={() => {}} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

// Catalog fixture -- Policy rows have no policy_number/status (ASSUMPTION-1,
// confirmed at Gate 1). Search is by title, filters are type-only.
const CATALOG_FIXTURE = [
  { id: 1, provider_id: 1, policy_type: "health", title: "Health Shield Plan", coverage: "Hospitalisation", premium: 500, term_months: 12, deductible: 1000 },
  { id: 2, provider_id: 1, policy_type: "auto", title: "Auto Secure Plan", coverage: "Collision", premium: 300, term_months: 12, deductible: 500 },
  { id: 3, provider_id: 1, policy_type: "health", title: "Family Health Cover", coverage: "Family", premium: 700, term_months: 12, deductible: 1500 },
];

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve(CATALOG_FIXTURE);
    if (path === "/userpolicies/") return Promise.resolve([]);
    return Promise.reject(new Error(`unexpected call: ${path}`));
  });
});

async function renderReady() {
  renderPolicies();
  await waitFor(() => screen.getAllByText(/Plan|Cover/));
}

describe("Policies catalog search and filter", () => {
  test("TC-002 / AC-001: searching 'health' by title leaves only matching catalog policies visible", async () => {
    await renderReady();

    const search = screen.getByRole("textbox", { name: /search/i });
    await userEvent.type(search, "health");

    await waitFor(() => {
      expect(screen.getByText("Health Shield Plan")).toBeInTheDocument();
      expect(screen.getByText("Family Health Cover")).toBeInTheDocument();
      expect(screen.queryByText("Auto Secure Plan")).not.toBeInTheDocument();
    });
  });

  test("TC-005 / AC-002: shared PolicySearchFilter control bar (search textbox) is rendered on this tab; selecting the 'auto' type filter within it leaves only auto policies visible, no status control rendered", async () => {
    await renderReady();

    // Gates on the new shared PolicySearchFilter control bar's accessible
    // search textbox -- the old standalone single-select FILTERS button row
    // does not carry this control, so this fails until the new component
    // ships (see test-plan.md TC-005, revised post-RED).
    expect(screen.getByRole("textbox", { name: /search/i })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^active$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^auto$/i }));

    await waitFor(() => {
      expect(screen.getByText("Auto Secure Plan")).toBeInTheDocument();
      expect(screen.queryByText("Health Shield Plan")).not.toBeInTheDocument();
    });
  });

  test("TC-007 / AC-003: search 'shield' + type 'health' combine with AND", async () => {
    await renderReady();

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "shield");
    await userEvent.click(screen.getByRole("button", { name: /^health$/i }));

    await waitFor(() => {
      expect(screen.getByText("Health Shield Plan")).toBeInTheDocument();
      expect(screen.queryByText("Family Health Cover")).not.toBeInTheDocument();
      expect(screen.queryByText("Auto Secure Plan")).not.toBeInTheDocument();
    });
  });

  test("TC-009 / AC-004: filtered catalog cards never show policy_number or per-user status fields", async () => {
    await renderReady();

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "health");

    await waitFor(() => expect(screen.getByText("Health Shield Plan")).toBeInTheDocument());
    expect(screen.queryByText(/policy number/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/POL-/)).not.toBeInTheDocument();
  });

  test("TC-011 / AC-005: search matching nothing shows the 'no results' empty state with a Clear button", async () => {
    await renderReady();

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "zzz-no-match");

    await waitFor(() => {
      expect(screen.getByText(/no policies match/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });
  });

  test("TC-014 / AC-006: clicking Clear resets search/type filter and restores the full catalog", async () => {
    await renderReady();

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "shield");
    await userEvent.click(screen.getByRole("button", { name: /^health$/i }));

    await waitFor(() => expect(screen.queryByText("Auto Secure Plan")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /search/i }).value).toBe("");
      expect(screen.getByText("Health Shield Plan")).toBeInTheDocument();
      expect(screen.getByText("Auto Secure Plan")).toBeInTheDocument();
      expect(screen.getByText("Family Health Cover")).toBeInTheDocument();
    });
  });

  test("TC-018 / AC-004: unmounting and remounting the page (simulating tab navigation away and back) resets search state", async () => {
    const { unmount } = renderPolicies();
    await waitFor(() => screen.getAllByText(/Plan|Cover/));
    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "shield");
    await waitFor(() => expect(screen.queryByText("Auto Secure Plan")).not.toBeInTheDocument());
    unmount();

    renderPolicies();
    await waitFor(() => screen.getAllByText(/Plan|Cover/));
    expect(screen.getByRole("textbox", { name: /search/i }).value).toBe("");
    expect(screen.getByText("Auto Secure Plan")).toBeInTheDocument();
  });
});
