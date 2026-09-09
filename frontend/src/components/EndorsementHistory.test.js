// EPT-13 — TC-062 / AC-006: the endorsement history view renders, per entry,
// the previous values, the new values, the request date and a status badge.
import { render, screen } from "@testing-library/react";
import EndorsementHistory from "./EndorsementHistory";

const ITEMS = [
  {
    id: 3,
    status: "Pending",
    request_date: "2026-03-01T10:00:00Z",
    decision_date: null,
    old_values: { make: "Toyota" },
    new_values: { make: "Kia" },
  },
  {
    id: 2,
    status: "Approved",
    request_date: "2026-02-01T10:00:00Z",
    decision_date: "2026-02-02T10:00:00Z",
    old_values: { make: "Honda" },
    new_values: { make: "Toyota" },
  },
  {
    id: 1,
    status: "Rejected",
    request_date: "2026-01-01T10:00:00Z",
    decision_date: "2026-01-02T10:00:00Z",
    old_values: { make: "Ford" },
    new_values: { make: "Honda" },
  },
];

test("TC-062 / AC-006 — history shows old vs new values and a status per entry", () => {
  render(<EndorsementHistory items={ITEMS} />);

  expect(screen.getByText(/pending/i)).toBeInTheDocument();
  expect(screen.getByText(/approved/i)).toBeInTheDocument();
  expect(screen.getByText(/rejected/i)).toBeInTheDocument();

  // old -> new for the newest entry
  expect(screen.getByText(/toyota/i)).toBeInTheDocument();
  expect(screen.getByText(/kia/i)).toBeInTheDocument();
  // request dates rendered
  expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(3);
});
