import { useState } from "react";
import FormField from "./FormField";
import { vehicleChecks } from "../utils/validation";

const FIELDS = [
  { key: "make", label: "Make", type: "text" },
  { key: "model", label: "Model", type: "text" },
  { key: "year", label: "Year", type: "number" },
  { key: "vin", label: "VIN", type: "text" },
  { key: "registration", label: "Registration", type: "text" },
];

function VehicleEndorsementModal({ policyTitle, currentVehicle, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(() => ({
    make: currentVehicle?.make ?? "",
    model: currentVehicle?.model ?? "",
    year: currentVehicle?.year ?? "",
    vin: currentVehicle?.vin ?? "",
    registration: currentVehicle?.registration ?? "",
  }));
  const [errors, setErrors] = useState({});

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = vehicleChecks(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      make: String(form.make).trim(),
      model: String(form.model).trim(),
      year: Number(form.year),
      vin: String(form.vin).trim().toUpperCase(),
      registration: String(form.registration).trim(),
    });
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-endorsement-title"
      >
        <h3 id="vehicle-endorsement-title">Update Vehicle Details</h3>
        <p className="modal-message">
          For <strong>{policyTitle}</strong>. Changes are submitted as an endorsement for admin review.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map(({ key, label, type }) => (
            <FormField key={key} label={label} required error={errors[key]} htmlFor={`vehicle-${key}`}>
              <input
                id={`vehicle-${key}`}
                type={type}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                aria-invalid={!!errors[key]}
              />
            </FormField>
          ))}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : null}
              {submitting ? "Submitting…" : "Submit Request Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VehicleEndorsementModal;
