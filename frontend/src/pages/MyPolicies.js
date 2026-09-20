import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/apiClient";
import "./MyPolicies.css";

const STATUS_BADGE = {
  active: "badge-success",
  expired: "badge-danger",
  cancelled: "badge-neutral",
  pending: "badge-warning",
};

function PolicySkeleton() {
  return (
    <div className="card mypolicy-card">
      <div className="skeleton" style={{ height: 16, width: "50%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 12, width: "70%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 22, width: "35%" }} />
    </div>
  );
}

function MyPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/userpolicies/");
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load your policies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>My Policies</h2>
            <p>Policies you currently own.</p>
          </div>
        </div>

        {loading && (
          <div className="mypolicies-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <PolicySkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load your policies</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchPolicies}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && policies.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No policies yet</h3>
            <p>Purchase a policy from the catalog to see it here.</p>
          </div>
        )}

        {!loading && !error && policies.length > 0 && (
          <div className="mypolicies-grid">
            {policies.map((policy) => (
              <div key={policy.id} className="card mypolicy-card">
                <h4>{policy.title || `Policy #${policy.policy_id}`}</h4>
                <p className="mypolicy-meta">
                  <strong>Policy number:</strong> {policy.policy_number}
                </p>
                {policy.policy_type && (
                  <p className="mypolicy-meta">
                    <strong>Type:</strong> {policy.policy_type}
                  </p>
                )}
                <p className="mypolicy-meta">
                  <strong>Premium:</strong> ₹{policy.premium}
                </p>
                <p className="mypolicy-meta">
                  <strong>Coverage period:</strong> {policy.start_date} to {policy.end_date}
                </p>
                <p className="mypolicy-meta">
                  <strong>Auto-renew:</strong> {policy.auto_renew ? "Yes" : "No"}
                </p>
                <span className={`badge ${STATUS_BADGE[policy.status] || "badge-neutral"}`}>
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyPolicies;
