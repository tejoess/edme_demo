import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/apiClient";
import "./MyClaims.css";

const STATUS_BADGE = {
  draft: "badge-neutral",
  submitted: "badge-info",
  under_review: "badge-warning",
  approved: "badge-success",
  paid: "badge-success",
  rejected: "badge-danger",
};

function ClaimSkeleton() {
  return (
    <div className="card claim-card">
      <div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 12, width: "70%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 22, width: "35%" }} />
    </div>
  );
}

function MyClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/claims/");
      setClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>My Claims</h2>
            <p>Track the status of claims you've filed.</p>
          </div>
        </div>

        {loading && (
          <div className="claims-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <ClaimSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load claims</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchClaims}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && claims.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <h3>No claims yet</h3>
            <p>File a claim from one of your active policies to see it here.</p>
          </div>
        )}

        {!loading && !error && claims.length > 0 && (
          <div className="claims-grid">
            {claims.map((claim) => (
              <div key={claim.id} className="card claim-card">
                <h4>{claim.claim_number}</h4>
                <p className="claim-meta">
                  <strong>Amount:</strong> ₹{claim.amount_claimed}
                </p>
                <p className="claim-meta">
                  <strong>Incident date:</strong> {claim.incident_date}
                </p>
                <span className={`badge ${STATUS_BADGE[claim.status] || "badge-neutral"}`}>
                  {claim.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyClaims;
