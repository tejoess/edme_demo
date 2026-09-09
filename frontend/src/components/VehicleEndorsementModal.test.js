// EPT-13 — TC-015 / AC-002: the vehicle endorsement modal blocks submit and
// shows inline validation errors before calling onSubmit.
import { render, screen, fireEvent } from "@testing-library/react";
import VehicleEndorsementModal from "./VehicleEndorsementModal";

const current = {
  make: "Toyota",
  model: "Corolla",
  year: 2020,
  vin: "1HGCM82633A004352",
  registration: "KA01AB1234",
};

test("TC-015 / AC-002 — invalid vehicle input blocks submit and shows errors", () => {
  const onSubmit = jest.fn();
  render(
    <VehicleEndorsementModal
      policyTitle="Private Car Comprehensive"
      currentVehicle={current}
      onCancel={() => {}}
      onSubmit={onSubmit}
    />
  );

  fireEvent.change(screen.getByLabelText(/make/i), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText(/year/i), { target: { value: "1700" } });
  fireEvent.click(screen.getByRole("button", { name: /submit|request update/i }));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
});
