/**
 * RED tests for EPT-16 (Policy PDF Download) -- frontend, RTL.
 *
 * Contract expected of the implementation (documented here so the
 * implementer and these tests agree on it):
 *   - A button with accessible name "Download PDF" renders inside
 *     card-actions, but ONLY on cards for policies the user already owns
 *     (isOwned(policy.id) === true) -- never rendered (not merely
 *     disabled) for un-owned catalog entries.
 *   - Clicking it calls apiFetchBlob(`/userpolicies/${ownedId}/pdf`),
 *     builds a Blob URL, sets an <a>'s `download` attribute to
 *     `Policy_${policy_number}.pdf` and clicks it -- the same pattern
 *     AdminDashboard's CSV export already uses, with no browser-specific
 *     save API (no `navigator.msSaveBlob`).
 *   - On failure, a toast error is shown and the button stays clickable
 *     (no disabled/stuck state) so the user can retry.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Policies from "./Policies";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import * as apiClient from "../utils/apiClient";

jest.mock("../utils/apiClient");

const CATALOG = [
  { id: 1, title: "Health Basic", policy_type: "health", premium: 500, term_months: 12, deductible: 1000 },
  { id: 2, title: "Auto Standard", policy_type: "auto", premium: 800, term_months: 12, deductible: 2000 },
];

const OWNED_HEALTH_ONLY = [
  { id: 10, policy_id: 1, policy_number: "POL-12345", status: "active" },
];

function mockCatalog({ owned = OWNED_HEALTH_ONLY } = {}) {
  apiClient.apiFetch.mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve(CATALOG);
    if (path === "/userpolicies/") return Promise.resolve(owned);
    return Promise.resolve(null);
  });
}

function renderPolicies() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <Policies goToUpload={() => {}} goToComparePage={() => {}} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// TC-001 / AC-001 -- download button shown only for owned policies
// ---------------------------------------------------------------------------
test("TC-001: Download PDF button renders only on owned policy cards", async () => {
  mockCatalog();
  renderPolicies();

  await waitFor(() => expect(screen.getByText("Health Basic")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("Auto Standard")).toBeInTheDocument());

  const downloadButtons = screen.queryAllByRole("button", { name: /download pdf/i });
  expect(downloadButtons).toHaveLength(1);

  const ownedCard = screen.getByText("Health Basic").closest(".policy-card");
  expect(ownedCard).not.toBeNull();
  expect(
    downloadButtons[0].closest(".policy-card")
  ).toBe(ownedCard);
});

// ---------------------------------------------------------------------------
// TC-003b / AC-003, TC-010 / AC-010 -- no permission -> button hidden, not
// disabled (covered together: an un-owned policy is exactly the "no
// permission" case per the ticket's business rules). Deliberately asserted
// against a MIXED owned/un-owned render, not an all-un-owned one: a render
// with zero owned policies would show zero buttons even before this
// feature exists, so it can't prove anything by itself.
// ---------------------------------------------------------------------------
test("TC-003b/TC-010: the un-owned policy card renders no download button while the owned one does", async () => {
  mockCatalog();
  renderPolicies();

  await waitFor(() => expect(screen.getByText("Health Basic")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText("Auto Standard")).toBeInTheDocument());

  expect(screen.queryAllByRole("button", { name: /download pdf/i })).toHaveLength(1);

  const unownedCard = screen.getByText("Auto Standard").closest(".policy-card");
  expect(
    unownedCard.querySelector("button")
      ? Array.from(unownedCard.querySelectorAll("button")).some((b) => /download pdf/i.test(b.textContent))
      : false
  ).toBe(false);
});

// ---------------------------------------------------------------------------
// TC-006b / AC-006 -- client-side download filename
// ---------------------------------------------------------------------------
test("TC-006b: clicking Download PDF sets the anchor's download name from the policy number", async () => {
  mockCatalog();
  const blob = new Blob(["%PDF-fake"], { type: "application/pdf" });
  apiClient.apiFetchBlob.mockResolvedValue(blob);

  const createObjectURL = jest.fn(() => "blob:mock-url");
  const revokeObjectURL = jest.fn();
  window.URL.createObjectURL = createObjectURL;
  window.URL.revokeObjectURL = revokeObjectURL;

  renderPolicies();
  await waitFor(() => expect(screen.getByText("Health Basic")).toBeInTheDocument());

  const downloadButton = await screen.findByRole("button", { name: /download pdf/i });
  await userEvent.click(downloadButton);

  await waitFor(() => expect(apiClient.apiFetchBlob).toHaveBeenCalledWith("/userpolicies/10/pdf"));
});

// ---------------------------------------------------------------------------
// TC-007 / AC-007 -- uses standard Blob/<a download>, no browser-specific API
// ---------------------------------------------------------------------------
test("TC-007: download uses the standard Blob + <a download> mechanism, not a browser-specific save API", async () => {
  mockCatalog();
  const blob = new Blob(["%PDF-fake"], { type: "application/pdf" });
  apiClient.apiFetchBlob.mockResolvedValue(blob);

  window.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  window.URL.revokeObjectURL = jest.fn();
  const msSaveBlob = jest.fn();
  window.navigator.msSaveBlob = msSaveBlob;

  renderPolicies();
  await waitFor(() => expect(screen.getByText("Health Basic")).toBeInTheDocument());

  const downloadButton = await screen.findByRole("button", { name: /download pdf/i });
  await userEvent.click(downloadButton);

  await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob));
  expect(msSaveBlob).not.toHaveBeenCalled();

  delete window.navigator.msSaveBlob;
});

// ---------------------------------------------------------------------------
// TC-011 / AC-011 -- generation failure surfaces a retryable error toast
// ---------------------------------------------------------------------------
test("TC-011: a failed download shows an error toast and leaves the button clickable to retry", async () => {
  mockCatalog();
  apiClient.apiFetchBlob.mockRejectedValue(new Error("Request failed. Please try again."));

  renderPolicies();
  await waitFor(() => expect(screen.getByText("Health Basic")).toBeInTheDocument());

  const downloadButton = await screen.findByRole("button", { name: /download pdf/i });
  await userEvent.click(downloadButton);

  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/request failed/i));
  expect(downloadButton).not.toBeDisabled();
});
