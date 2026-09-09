// EPT-13 — TC-071 / AC-005 / AC-007: the admin endorsements screen lists pending
// endorsements and its Approve / Reject actions call the decision endpoints.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import AdminEndorsements from "./AdminEndorsements";
import { apiFetch } from "../utils/apiClient";

jest.mock("../utils/apiClient");

const PENDING = [
  {
    id: 11,
    user_policy_id: 99,
    status: "Pending",
    request_date: "2026-03-01T10:00:00Z",
    old_values: { make: "Toyota" },
    new_values: { make: "Honda" },
  },
];

beforeEach(() => {
  apiFetch.mockImplementation((path, opts = {}) => {
    if (String(path).startsWith("/admin/endorsements") && (!opts.method || opts.method === "GET"))
      return Promise.resolve(PENDING);
    return Promise.resolve({ ok: true });
  });
});

test("TC-071 / AC-005 / AC-007 — approve and reject call the decision endpoints", async () => {
  render(
    <ToastProvider>
      <ConfirmProvider>
        <AdminEndorsements onBack={() => {}} />
      </ConfirmProvider>
    </ToastProvider>
  );

  await screen.findByText(/honda/i);

  fireEvent.click(screen.getByRole("button", { name: /approve/i }));
  await waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/endorsements\/11\/approve/),
      expect.objectContaining({ method: "POST" })
    )
  );

  fireEvent.click(screen.getByRole("button", { name: /reject/i }));
  await waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/endorsements\/11\/reject/),
      expect.objectContaining({ method: "POST" })
    )
  );
});
