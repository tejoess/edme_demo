import "./PolicySearchFilter.css";

// Shared, presentational search + filter bar used by both the Policies
// catalog and My Policies pages (see plan.md "Ordered steps" #2). Takes
// statusOptions/typeOptions as props so the catalog tab (no status
// concept, ASSUMPTION-1) can omit statusOptions entirely.

function toggleValue(list, value) {
  const current = Array.isArray(list) ? list : [];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function optionLabel(option) {
  const str = String(option);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function PolicySearchFilter({
  search,
  onSearchChange,
  typeOptions = [],
  type = [],
  onTypeChange,
  statusOptions,
  status = [],
  onStatusChange,
  onClear,
}) {
  const hasStatusOptions = Array.isArray(statusOptions) && statusOptions.length > 0;
  const hasTypeOptions = Array.isArray(typeOptions) && typeOptions.length > 0;
  const hasActiveFilters =
    Boolean(search) || (Array.isArray(status) && status.length > 0) || (Array.isArray(type) && type.length > 0);

  return (
    <div className="policy-search-filter">
      <div className="psf-search-field">
        <label htmlFor="policy-search-input" className="psf-search-label">
          Search
        </label>
        <input
          id="policy-search-input"
          type="text"
          className="psf-search-input"
          placeholder="Search…"
          value={search || ""}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      {hasStatusOptions && (
        <div className="psf-filter-group" role="group" aria-label="Filter by status">
          {statusOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`psf-chip ${status.includes(opt) ? "psf-chip-active" : ""}`}
              aria-pressed={status.includes(opt)}
              onClick={() => onStatusChange && onStatusChange(toggleValue(status, opt))}
            >
              {optionLabel(opt)}
            </button>
          ))}
        </div>
      )}

      {hasTypeOptions && (
        <div className="psf-filter-group" role="group" aria-label="Filter by type">
          {typeOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`psf-chip ${type.includes(opt) ? "psf-chip-active" : ""}`}
              aria-pressed={type.includes(opt)}
              onClick={() => onTypeChange && onTypeChange(toggleValue(type, opt))}
            >
              {optionLabel(opt)}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button type="button" className="psf-clear-btn btn-link" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}

export default PolicySearchFilter;
