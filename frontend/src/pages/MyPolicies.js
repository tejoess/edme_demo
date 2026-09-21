import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "../utils/apiClient";
import PolicySearchFilter from "../components/PolicySearchFilter";
import { applyFilters } from "../utils/policyFilter";
import "./MyPolicies.css";

const STATUS_BADGE = {
  active: "badge-success",
  expired: "badge-danger",
  cancelled: "badge-neutral",
  pending: "badge-warning",
};

const STATUS_OPTIONS = ["active", "expired", "cancelled", "pending"];

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);

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

  const typeOptions = useMemo(
    () => Array.from(new Set(policies.map((p) => p.policy_type).filter(Boolean))),
    [policies]
  );

  const visiblePolicies = useMemo(
    () =>
      applyFilters(policies, {
        search,
        searchField: "policy_number",
        status: statusFilter,
        type: typeFilter,
      }),
    [policies, search, statusFilter, typeFilter]
  );

  const hasNoOwnedPolicies = policies.length === 0;
  const hasNoMatches = !hasNoOwnedPolicies && visiblePolicies.length === 0;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter([]);
    setTypeFilter([]);
  };

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>My Policies</h2>
            <p>Policies you currently own.</p>
          </div>
        </div>

        {!error && (
          <PolicySearchFilter
            search={search}
            onSearchChange={setSearch}
            statusOptions={STATUS_OPTIONS}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            typeOptions={typeOptions}
            type={typeFilter}
            onTypeChange={setTypeFilter}
            onClear={clearFilters}
          />
        )}

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

        {!loading && !error && hasNoOwnedPolicies && (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No policies yet</h3>
            <p>Purchase a policy from the catalog to see it here.</p>
          </div>
        )}

        {!loading && !error && hasNoMatches && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No policies match your search or filters</h3>
            <p>Try adjusting or clearing your search and filters above.</p>
          </div>
        )}

        {!loading && !error && !hasNoOwnedPolicies && !hasNoMatches && (
          <div className="mypolicies-grid">
            {visiblePolicies.map((policy) => (
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
