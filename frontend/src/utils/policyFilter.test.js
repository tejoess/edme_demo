import { matchesSearch, applyFilters } from "./policyFilter";

// Unit-level coverage backing AC-001/AC-002/AC-003 (search + filter + AND
// combination). These exercise the pure logic in isolation from any
// component; the corresponding RTL/Playwright TCs in Policies.test.js,
// MyPolicies.test.js and policy-search-filter.spec.js exercise the same
// behavior end-to-end. See test-plan.md for the TC-nnn -> AC-nnn mapping.

describe("matchesSearch (unit backing AC-001)", () => {
  test("TC-001 unit / AC-001: partial, case-insensitive match on policy_number", () => {
    expect(matchesSearch({ policy_number: "POL-12345" }, "123", "policy_number")).toBe(true);
    expect(matchesSearch({ policy_number: "POL-12345" }, "XYZ", "policy_number")).toBe(false);
    expect(matchesSearch({ policy_number: "POL-12345" }, "pol-123", "policy_number")).toBe(true);
  });

  test("TC-002 unit / AC-001: partial, case-insensitive match on title (catalog)", () => {
    expect(matchesSearch({ title: "Health Shield Plan" }, "health", "title")).toBe(true);
    expect(matchesSearch({ title: "Health Shield Plan" }, "HEALTH", "title")).toBe(true);
    expect(matchesSearch({ title: "Auto Secure Plan" }, "health", "title")).toBe(false);
  });

  test("empty/undefined query matches everything", () => {
    expect(matchesSearch({ title: "Anything" }, "", "title")).toBe(true);
    expect(matchesSearch({ title: "Anything" }, undefined, "title")).toBe(true);
  });

  test("missing field on item does not match a non-empty query", () => {
    expect(matchesSearch({}, "abc", "policy_number")).toBe(false);
  });
});

describe("applyFilters (unit backing AC-002/AC-003)", () => {
  const myPolicies = [
    { id: 1, policy_number: "POL-12000", status: "active", policy_type: "health" },
    { id: 2, policy_number: "POL-12111", status: "expired", policy_type: "health" },
    { id: 3, policy_number: "POL-99999", status: "active", policy_type: "health" },
    { id: 4, policy_number: "POL-12222", status: "active", policy_type: "auto" },
  ];

  test("TC-003 unit / AC-002: status filter alone", () => {
    const result = applyFilters(myPolicies, { status: "active" });
    expect(result.map((p) => p.id).sort()).toEqual([1, 3, 4]);
  });

  test("TC-004 unit / AC-002: type filter alone", () => {
    const result = applyFilters(myPolicies, { type: "health" });
    expect(result.map((p) => p.id).sort()).toEqual([1, 2, 3]);
  });

  test("TC-006 unit / AC-003: search + status + type combine with AND, independently against full list", () => {
    const result = applyFilters(myPolicies, {
      search: "12",
      searchField: "policy_number",
      status: "active",
      type: "health",
    });
    expect(result.map((p) => p.id)).toEqual([1]);
  });

  const catalogPolicies = [
    { id: 10, title: "Health Shield Plan", policy_type: "health" },
    { id: 11, title: "Family Health Cover", policy_type: "health" },
    { id: 12, title: "Auto Secure Plan", policy_type: "auto" },
  ];

  test("TC-007 unit / AC-003: search + type combine on catalog shape (no status field)", () => {
    const result = applyFilters(catalogPolicies, {
      search: "shield",
      searchField: "title",
      type: "health",
    });
    expect(result.map((p) => p.id)).toEqual([10]);
  });

  test("no criteria returns the full list unchanged", () => {
    expect(applyFilters(catalogPolicies, {})).toEqual(catalogPolicies);
  });

  test("non-array input returns an empty array rather than throwing", () => {
    expect(applyFilters(undefined, { search: "x" })).toEqual([]);
  });
});
