import { useState } from "react";
import FormField from "./FormField";

const CLAIM_TYPES = [
  { value: "medical", label: "Medical" },
  { value: "accident", label: "Accident" },
  { value: "theft", label: "Theft" },
  { value: "fire_damage", label: "Fire Damage" },
  { value: "travel_delay", label: "Travel Delay" },
  { value: "general", label: "General" },
];

const todayISO = () => new Date().toISOString().split("T")[0];

function FileClaimModal({ policyTitle, onCancel, onSubmit, submitting }) {
  const [claimType, setClaimType] = useState("");
  const [incidentDate, setIncidentDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!claimType) next.claimType = "Please select a claim type";

    if (!incidentDate) {
      next.incidentDate = "Incident date is required";
    } else if (new Date(incidentDate).getTime() > Date.now()) {
      next.incidentDate = "Incident date cannot be in the future";
    }

    const amountNum = Number(amount);
    if (!amount) {
      next.amount = "Claim amount is required";
    } else if (Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = "Enter a valid amount greater than 0";
    } else if (amountNum > 10000000) {
      next.amount = "Amount seems too high — please double-check";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      claim_type: claimType,
      incident_date: incidentDate,
      amount_claimed: Number(amount),
    });
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="file-claim-title">
        <h3 id="file-claim-title">File a Claim</h3>
        <p className="modal-message">
          For <strong>{policyTitle}</strong>. Provide accurate details — claims are screened by our fraud
          detection system.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Claim type" required error={errors.claimType} htmlFor="claim-type">
            <select
              id="claim-type"
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
              aria-invalid={!!errors.claimType}
            >
              <option value="">Select a type…</option>
              {CLAIM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Incident date" required error={errors.incidentDate} htmlFor="claim-date">
            <input
              id="claim-date"
              type="date"
              max={todayISO()}
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              aria-invalid={!!errors.incidentDate}
            />
          </FormField>

          <FormField label="Amount claimed (₹)" required error={errors.amount} htmlFor="claim-amount">
            <input
              id="claim-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
            />
          </FormField>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : null}
              {submitting ? "Filing claim…" : "File Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FileClaimModal;
