// EPT-13 — TC-070 / AC-001: an owned auto policy card exposes an "Update vehicle
// details" action that opens the VehicleEndorsementModal.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import Policies from "./Policies";
import { apiFetch } from "../utils/apiClient";

jest.mock("../utils/apiClient");

const AUTO_POLICY = {
  id: 7,
  title: "Private Car Comprehensive",
  policy_type: "auto",
  premium: 7000,
  term_months: 12,
  deductible: 2000,
};

beforeEach(() => {
  apiFetch.mockImplementation((path) => {
    if (path === "/policies") return Promise.resolve([AUTO_POLICY]);
    if (path === "/userpolicies/")
      return Promise.resolve([{ id: 99, policy_id: 7, status: "active" }]);
    if (String(path).includes("/endorsements"))
      return Promise.resolve({ id: 1, status: "Pending" });
    return Promise.resolve([]);
  });
});

test("TC-070 / AC-001 — owned auto policy exposes an Update vehicle details action", async () => {
  render(
    <ToastProvider>
      <ConfirmProvider>
        <Policies goToUpload={() => {}} goToComparePage={() => {}} />
      </ConfirmProvider>
    </ToastProvider>
  );

  const updateBtn = await screen.findByRole("button", { name: /update vehicle details/i });
  fireEvent.click(updateBtn);

  await waitFor(() =>
    expect(screen.getByRole("dialog", { name: /vehicle|update policy/i })).toBeInTheDocument()
  );
});
