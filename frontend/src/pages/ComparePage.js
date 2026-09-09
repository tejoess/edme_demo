import { useState } from "react";
import "./ComparePage.css";

const RISK_MULTIPLIER = { low: 1.05, medium: 1.1, high: 1.2 };
const MAX_COVERAGE = 100000000;

function ComparePage({ policies, onBack }) {
  const [coverageInput, setCoverageInput] = useState("100000");
  const [risk, setRisk] = useState("medium");
  const [coverageError, setCoverageError] = useState("");

  const handleCoverageChange = (value) => {
    setCoverageInput(value);
    const num = Number(value);
    if (value === "") setCoverageError("Coverage amount is required");
    else if (Number.isNaN(num) || num <= 0) setCoverageError("Enter a positive amount");
    else if (num > MAX_COVERAGE) setCoverageError("That's an unrealistically large amount");
    else setCoverageError("");
  };

  const coverage = Number(coverageInput) || 0;
  const validCoverage = !coverageError && coverage > 0;

  const calculatePremium = (base) => {
    if (!validCoverage) return null;
    return (base * RISK_MULTIPLIER[risk] * (coverage / 100000)).toFixed(2);
  };

  if (!policies || policies.length === 0) {
    return (
      <div className="page-shell">
        <div className="page-content">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Nothing to compare</h3>
            <p>Select 2–3 policies from the Policies page first.</p>
            <button className="btn btn-primary" onClick={onBack}>
              Back to Policies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>Compare Policies</h2>
            <p>Estimate premiums under different coverage and risk scenarios.</p>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
        </div>

        <div className="calculator-box card">
          <div className="calculator-field">
            <label htmlFor="coverage-amount">Coverage amount (₹)</label>
            <input
              id="coverage-amount"
              type="number"
              min="1"
              value={coverageInput}
              onChange={(e) => handleCoverageChange(e.target.value)}
              aria-invalid={!!coverageError}
            />
            {coverageError && (
              <div className="field-error">
                <span aria-hidden="true">⚠</span> {coverageError}
              </div>
            )}
          </div>

          <div className="calculator-field">
            <label htmlFor="risk-level">Risk level</label>
            <select id="risk-level" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        <div className="compare-grid">
          {policies.map((policy) => (
            <div key={policy.id} className="card compare-card">
              <div className="compare-card-header">
                <h3>{policy.title}</h3>
                <span className="badge badge-info">{policy.policy_type}</span>
              </div>

              <div className="price-section">
                <div className="base-price">Base premium: ₹{policy.premium}</div>
                <div className="estimated-price">
                  {validCoverage ? `₹${calculatePremium(policy.premium)}` : "—"}
                </div>
                <div className="base-price">estimated for this scenario</div>
              </div>

              <div className="features-section">
                <p>✔ Deductible: ₹{policy.deductible}</p>
                <p>✔ Term: {policy.term_months} months</p>
                <p>✔ Risk profile: {risk}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ComparePage;
