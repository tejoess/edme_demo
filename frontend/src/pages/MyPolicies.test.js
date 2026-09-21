import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyPolicies from "./MyPolicies";
import { apiFetch } from "../utils/apiClient";

jest.mock("../utils/apiClient", () => ({
  apiFetch: jest.fn(),
}));

// Fixture for search-only tests (TC-001).
const SEARCH_FIXTURE = [
  {
    id: 1,
    policy_id: 101,
    policy_number: "POL-12345",
    title: "Health Basic",
    policy_type: "health",
    status: "active",
    premium: 500,
    start_date: "2024-01-01",
    end_date: "2025-01-01",
    auto_renew: true,
  },
  {
    id: 2,
    policy_id: 102,
    policy_number: "POL-67890",
    title: "Auto Cover",
    policy_type: "auto",
    status: "expired",
    premium: 300,
    start_date: "2023-01-01",
    end_date: "2024-01-01",
    auto_renew: false,
  },
];

// Fixture for status/type filter tests (TC-003, TC-004).
const FILTER_FIXTURE = [
  { id: 1, policy_id: 101, policy_number: "POL-A1", title: "Health Shield", policy_type: "health", status: "active", premium: 100, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
  { id: 2, policy_id: 102, policy_number: "POL-A2", title: "Auto Secure", policy_type: "auto", status: "expired", premium: 200, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
  { id: 3, policy_id: 103, policy_number: "POL-A3", title: "Health Premium", policy_type: "health", status: "pending", premium: 300, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
];

// Fixture for the AND-combination test (TC-006): only id 1 matches search
// "12" AND status "active" AND type "health" simultaneously.
const COMBINE_FIXTURE = [
  { id: 1, policy_id: 201, policy_number: "POL-12000", title: "A", policy_type: "health", status: "active", premium: 100, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
  { id: 2, policy_id: 202, policy_number: "POL-12111", title: "B", policy_type: "health", status: "expired", premium: 100, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
  { id: 3, policy_id: 203, policy_number: "POL-99999", title: "C", policy_type: "health", status: "active", premium: 100, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
  { id: 4, policy_id: 204, policy_number: "POL-12222", title: "D", policy_type: "auto", status: "active", premium: 100, start_date: "2024-01-01", end_date: "2025-01-01", auto_renew: true },
];

beforeEach(() => {
  apiFetch.mockReset();
});

async function renderReady(fixture) {
  apiFetch.mockImplementation((path) => {
    if (path === "/userpolicies/") return Promise.resolve(fixture);
    return Promise.reject(new Error(`unexpected call: ${path}`));
  });
  render(<MyPolicies />);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/userpolicies/"));
}

describe("MyPolicies search and filter", () => {
  test("TC-001 / AC-001: searching '123' by policy number leaves only matching policies visible", async () => {
    await renderReady(SEARCH_FIXTURE);
    await waitFor(() => screen.getAllByText(/POL-/));

    const search = screen.getByRole("textbox", { name: /search/i });
    await userEvent.type(search, "123");

    await waitFor(() => {
      expect(screen.getByText(/POL-12345/)).toBeInTheDocument();
      expect(screen.queryByText(/POL-67890/)).not.toBeInTheDocument();
    });
  });

  test("TC-003 / AC-002: selecting the 'active' status filter leaves only active policies visible", async () => {
    await renderReady(FILTER_FIXTURE);
    await waitFor(() => screen.getAllByText(/POL-A/));

    await userEvent.click(screen.getByRole("button", { name: /^active$/i }));

    await waitFor(() => {
      expect(screen.getByText("Health Shield")).toBeInTheDocument();
      expect(screen.queryByText("Auto Secure")).not.toBeInTheDocument();
      expect(screen.queryByText("Health Premium")).not.toBeInTheDocument();
    });
  });

  test("TC-004 / AC-002: selecting the 'health' type filter leaves only health-type policies visible", async () => {
    await renderReady(FILTER_FIXTURE);
    await waitFor(() => screen.getAllByText(/POL-A/));

    await userEvent.click(screen.getByRole("button", { name: /^health$/i }));

    await waitFor(() => {
      expect(screen.getByText("Health Shield")).toBeInTheDocument();
      expect(screen.getByText("Health Premium")).toBeInTheDocument();
      expect(screen.queryByText("Auto Secure")).not.toBeInTheDocument();
    });
  });

  test("TC-006 / AC-003: search + status + type combine with AND against the full list", async () => {
    await renderReady(COMBINE_FIXTURE);
    await waitFor(() => screen.getAllByText(/POL-1/));

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "12");
    await userEvent.click(screen.getByRole("button", { name: /^active$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^health$/i }));

    await waitFor(() => {
      expect(screen.getByText("POL-12000", { exact: false })).toBeInTheDocument();
      expect(screen.queryByText("POL-12111", { exact: false })).not.toBeInTheDocument();
      expect(screen.queryByText("POL-99999", { exact: false })).not.toBeInTheDocument();
      expect(screen.queryByText("POL-12222", { exact: false })).not.toBeInTheDocument();
    });
  });

  test("TC-008 / AC-004: filtered results never include data outside /userpolicies/ (no catalog leakage)", async () => {
    await renderReady(SEARCH_FIXTURE);
    const search = screen.getByRole("textbox", { name: /search/i });
    await userEvent.type(search, "POL");

    await waitFor(() => {
      expect(screen.getByText(/POL-12345/)).toBeInTheDocument();
      expect(screen.getByText(/POL-67890/)).toBeInTheDocument();
    });
    expect(apiFetch).not.toHaveBeenCalledWith("/policies");
  });

  test("TC-010 / AC-005: a search matching nothing shows the 'no results' empty state with a Clear button", async () => {
    await renderReady(SEARCH_FIXTURE);
    const search = screen.getByRole("textbox", { name: /search/i });
    await userEvent.type(search, "zzz");

    await waitFor(() => {
      expect(screen.getByText(/no policies match/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });
  });

  test("TC-012 / AC-005: zero owned policies with no search/filter shows the unchanged 'no policies yet' state without a Clear button", async () => {
    await renderReady([]);

    // Search/filter controls must still render even with an empty list.
    expect(screen.getByRole("textbox", { name: /search/i })).toBeInTheDocument();

    expect(await screen.findByText(/no policies yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  test("TC-013 / AC-006: clicking Clear resets search/filters and restores the full list", async () => {
    await renderReady(FILTER_FIXTURE);
    await waitFor(() => screen.getAllByText(/POL-A/));

    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "A1");
    await userEvent.click(screen.getByRole("button", { name: /^health$/i }));

    await waitFor(() => {
      expect(screen.queryByText("Auto Secure")).not.toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /search/i }).value).toBe("");
      expect(screen.getByText("Health Shield")).toBeInTheDocument();
      expect(screen.getByText("Auto Secure")).toBeInTheDocument();
      expect(screen.getByText("Health Premium")).toBeInTheDocument();
    });
  });

  test("TC-018 / AC-004: unmounting and remounting the page (simulating tab navigation away and back) resets search state", async () => {
    apiFetch.mockImplementation((path) => {
      if (path === "/userpolicies/") return Promise.resolve(SEARCH_FIXTURE);
      return Promise.reject(new Error(`unexpected call: ${path}`));
    });
    const { unmount } = render(<MyPolicies />);
    await waitFor(() => screen.getAllByText(/POL-/));
    await userEvent.type(screen.getByRole("textbox", { name: /search/i }), "123");
    await waitFor(() => expect(screen.queryByText(/POL-67890/)).not.toBeInTheDocument());
    unmount();

    render(<MyPolicies />);
    await waitFor(() => screen.getAllByText(/POL-/));
    expect(screen.getByRole("textbox", { name: /search/i }).value).toBe("");
    expect(screen.getByText(/POL-67890/)).toBeInTheDocument();
  });
});
