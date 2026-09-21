// Pure filtering helpers shared by the Policies (catalog) and My Policies
// pages. See .agentic/tickets/EPT-25/plan.md "Ordered steps" #1.
//
// Search and every selected filter are evaluated independently against the
// full input list and combined with AND -- there is no sequential
// narrowing (per the PM's recorded clarification, AC-003).

/**
 * Case-insensitive substring match of `item[field]` against `query`.
 * An empty/undefined query matches everything. A missing field on the
 * item never matches a non-empty query.
 */
export function matchesSearch(item, query, field) {
  if (query === undefined || query === null || query === "") return true;
  if (!field) return true;

  const value = item ? item[field] : undefined;
  if (value === undefined || value === null) return false;

  return String(value).toLowerCase().includes(String(query).toLowerCase());
}

// A filter value may be a plain string (single value, used directly by
// callers/unit tests) or an array (multi-select, used by
// PolicySearchFilter). An empty array or undefined/"" filter value means
// "no filter applied" -- matches everything.
function matchesFilterValue(itemValue, filterValue) {
  if (filterValue === undefined || filterValue === null || filterValue === "") return true;

  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    return filterValue.includes(itemValue);
  }

  return itemValue === filterValue;
}

/**
 * Filters `items` by search (against `searchField`) AND every selected
 * `status`/`type` filter, each evaluated independently against the full
 * list. Returns an empty array (not a throw) for non-array input.
 */
export function applyFilters(items, { search, searchField, status, type } = {}) {
  if (!Array.isArray(items)) return [];

  return items.filter(
    (item) =>
      matchesSearch(item, search, searchField) &&
      matchesFilterValue(item.status, status) &&
      matchesFilterValue(item.policy_type, type)
  );
}
