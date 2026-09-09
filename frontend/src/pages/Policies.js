import { useState, useEffect, useCallback } from "react";
import "./Policies.css";
import { apiFetch } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import FileClaimModal from "../components/FileClaimModal";
import VehicleEndorsementModal from "../components/VehicleEndorsementModal";
import EndorsementHistory from "../components/EndorsementHistory";

const FILTERS = ["all", "health", "life", "travel", "auto", "home"];

function PolicyCardSkeleton() {
  return (
    <div className="card policy-card policy-card-skeleton">
      <div className="skeleton" style={{ height: 18, width: "60%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 38, width: "100%" }} />
    </div>
  );
}

function Policies({ goToUpload, goToComparePage }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [policies, setPolicies] = useState([]);
  const [userPolicies, setUserPolicies] = useState([]);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [busyPolicyId, setBusyPolicyId] = useState(null);
  const [claimModalPolicy, setClaimModalPolicy] = useState(null);
  const [filingClaim, setFilingClaim] = useState(false);
  const [vehicleModalPolicy, setVehicleModalPolicy] = useState(null);
  const [submittingEndorsement, setSubmittingEndorsement] = useState(false);
  const [historyPolicyId, setHistoryPolicyId] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadError("");
      const [policiesData, userPoliciesData] = await Promise.all([
        apiFetch("/policies"),
        apiFetch("/userpolicies/"),
      ]);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
      setUserPolicies(Array.isArray(userPoliciesData) ? userPoliciesData : []);
    } catch (err) {
      setLoadError(err.message || "Unable to load policies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isOwned = (policyId) =>
    userPolicies.some((up) => Number(up.policy_id) === Number(policyId));

  const toggleSelect = (policy) => {
    const exists = selectedPolicies.find((p) => p.id === policy.id);

    if (exists) {
      setSelectedPolicies(selectedPolicies.filter((p) => p.id !== policy.id));
      return;
    }

    if (selectedPolicies.length >= 3) {
      toast.info("You can compare up to 3 policies at a time.");
      return;
    }
    setSelectedPolicies([...selectedPolicies, policy]);
  };

  const buyPolicy = async (policy) => {
    const ok = await confirm({
      title: "Confirm purchase",
      message: `Activate "${policy.title}" for ₹${policy.premium}/term? This will create an active policy on your account.`,
      confirmLabel: "Buy Policy",
    });
    if (!ok) return;

    try {
      setBusyPolicyId(policy.id);
      await apiFetch(`/userpolicies/${policy.id}`, { method: "POST" });
      toast.success(`"${policy.title}" purchased successfully.`);
      await fetchData();
    } catch (err) {
      toast.error(err.message || "Purchase failed.");
    } finally {
      setBusyPolicyId(null);
    }
  };

  const openClaimModal = (policy) => {
    const owned = userPolicies.find((up) => Number(up.policy_id) === Number(policy.id));
    if (!owned) {
      toast.info("Purchase this policy before filing a claim.");
      return;
    }
    setClaimModalPolicy({ ...policy, _userPolicyId: owned.id });
  };

  const submitClaim = async (claimPayload) => {
    try {
      setFilingClaim(true);
      const data = await apiFetch("/claims/", {
        method: "POST",
        body: {
          user_policy_id: claimModalPolicy._userPolicyId,
          ...claimPayload,
        },
      });
      toast.success(`Claim ${data.claim_number} filed.`);
      setClaimModalPolicy(null);
      goToUpload(data.id);
    } catch (err) {
      toast.error(err.message || "Unable to file claim.");
    } finally {
      setFilingClaim(false);
    }
  };

  const openVehicleModal = (policy) => {
    const owned = userPolicies.find((up) => Number(up.policy_id) === Number(policy.id));
    if (!owned) {
      toast.info("Purchase this policy before updating vehicle details.");
      return;
    }
    setVehicleModalPolicy({ ...policy, _userPolicyId: owned.id });
  };

  const loadHistory = async (userPolicyId) => {
    try {
      setHistoryLoading(true);
      const data = await apiFetch(`/userpolicies/${userPolicyId}/endorsements`);
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Unable to load vehicle history.");
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitEndorsement = async (payload) => {
    try {
      setSubmittingEndorsement(true);
      await apiFetch(`/userpolicies/${vehicleModalPolicy._userPolicyId}/endorsements`, {
        method: "POST",
        body: payload,
      });
      toast.success("Vehicle update request submitted for review.");
      const submittedFor = vehicleModalPolicy._userPolicyId;
      setVehicleModalPolicy(null);
      if (historyPolicyId === submittedFor) {
        loadHistory(submittedFor);
      }
    } catch (err) {
      toast.error(err.message || "Unable to submit vehicle update.");
    } finally {
      setSubmittingEndorsement(false);
    }
  };

  const toggleHistory = (policy) => {
    const owned = userPolicies.find((up) => Number(up.policy_id) === Number(policy.id));
    if (!owned) return;
    if (historyPolicyId === owned.id) {
      setHistoryPolicyId(null);
      setHistoryItems([]);
      return;
    }
    setHistoryPolicyId(owned.id);
    loadHistory(owned.id);
  };

  const filteredPolicies = Array.isArray(policies)
    ? activeFilter === "all"
      ? policies
      : policies.filter((p) => p.policy_type === activeFilter)
    : [];

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>Insurance Policies</h2>
            <p>Browse, compare, and manage your coverage.</p>
          </div>
        </div>

        <div className="filter-tabs">
          {FILTERS.map((type) => (
            <button
              key={type}
              className={activeFilter === type ? "active-tab" : ""}
              onClick={() => setActiveFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {selectedPolicies.length >= 2 && (
          <div className="compare-banner">
            <button onClick={() => goToComparePage(selectedPolicies)} className="compare-button">
              Compare {selectedPolicies.length} Policies →
            </button>
            <button className="btn-link" onClick={() => setSelectedPolicies([])}>
              Clear selection
            </button>
          </div>
        )}

        {loading && (
          <div className="policy-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <PolicyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load policies</h3>
            <p>{loadError}</p>
            <button className="btn btn-primary" onClick={fetchData}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && filteredPolicies.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No policies found</h3>
            <p>Try a different category filter.</p>
          </div>
        )}

        {!loading && !loadError && filteredPolicies.length > 0 && (
          <div className="policy-grid">
            {filteredPolicies.map((policy) => {
              const selected = selectedPolicies.some((p) => p.id === policy.id);
              const owned = isOwned(policy.id);
              const isBusy = busyPolicyId === policy.id;

              return (
                <div
                  key={policy.id}
                  className={`card policy-card ${selected ? "selected-card" : ""}`}
                  onClick={() => toggleSelect(policy)}
                  role="checkbox"
                  aria-checked={selected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelect(policy);
                    }
                  }}
                >
                  <div className="card-header">
                    <h4>{policy.title}</h4>
                    <span className="badge badge-info">{policy.policy_type}</span>
                  </div>

                  <div className="price">
                    ₹{policy.premium}
                    <span className="price-term"> / {policy.term_months}mo</span>
                  </div>
                  <div className="deductible-line">Deductible: ₹{policy.deductible}</div>

                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                    {!owned ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => buyPolicy(policy)}
                        disabled={isBusy}
                      >
                        {isBusy ? <span className="spinner" /> : null}
                        {isBusy ? "Processing…" : "Buy Policy"}
                      </button>
                    ) : (
                      <button className="btn btn-success" disabled>
                        ✓ Purchased
                      </button>
                    )}

                    <button className="btn btn-secondary" onClick={() => openClaimModal(policy)}>
                      File Claim
                    </button>

                    {owned && policy.policy_type === "auto" && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={() => openVehicleModal(policy)}
                        >
                          Update vehicle details
                        </button>
                        <button
                          className="btn btn-link"
                          onClick={() => toggleHistory(policy)}
                        >
                          Vehicle history
                        </button>
                      </>
                    )}
                  </div>

                  {owned &&
                    policy.policy_type === "auto" &&
                    historyPolicyId ===
                      userPolicies.find(
                        (up) => Number(up.policy_id) === Number(policy.id)
                      )?.id && (
                      <div className="vehicle-history-panel" onClick={(e) => e.stopPropagation()}>
                        {historyLoading ? (
                          <p>Loading vehicle history…</p>
                        ) : (
                          <EndorsementHistory items={historyItems} />
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {claimModalPolicy && (
        <FileClaimModal
          policyTitle={claimModalPolicy.title}
          submitting={filingClaim}
          onCancel={() => !filingClaim && setClaimModalPolicy(null)}
          onSubmit={submitClaim}
        />
      )}

      {vehicleModalPolicy && (
        <VehicleEndorsementModal
          policyTitle={vehicleModalPolicy.title}
          currentVehicle={vehicleModalPolicy._currentVehicle}
          submitting={submittingEndorsement}
          onCancel={() => !submittingEndorsement && setVehicleModalPolicy(null)}
          onSubmit={submitEndorsement}
        />
      )}
    </div>
  );
}

export default Policies;
