import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PolicySearchFilter from "./PolicySearchFilter";

// TC-015 / AC-007: PolicySearchFilter renders a search input and filter
// controls with accessible roles/labels on both tabs. This is a wiring
// check (jsdom has no real CSS box model, per definition-of-done skill) --
// the real alignment/spacing check is TC-016 in the Playwright spec.

describe("PolicySearchFilter", () => {
  test("TC-015 / AC-007: renders an accessible search textbox", () => {
    render(
      <PolicySearchFilter
        search=""
        onSearchChange={() => {}}
        typeOptions={["health", "auto"]}
        type={[]}
        onTypeChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("textbox", { name: /search/i })).toBeInTheDocument();
  });

  test("TC-015 / AC-007: renders type filter controls with accessible roles when typeOptions supplied", () => {
    render(
      <PolicySearchFilter
        search=""
        onSearchChange={() => {}}
        typeOptions={["health", "auto"]}
        type={[]}
        onTypeChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /health/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auto/i })).toBeInTheDocument();
  });

  test("TC-015 / AC-007: renders status filter controls with accessible roles when statusOptions supplied (My Policies)", () => {
    render(
      <PolicySearchFilter
        search=""
        onSearchChange={() => {}}
        typeOptions={["health", "auto"]}
        type={[]}
        onTypeChange={() => {}}
        statusOptions={["active", "expired", "cancelled", "pending"]}
        status={[]}
        onStatusChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /active/i })).toBeInTheDocument();
  });

  test("TC-015 / AC-002: omits status controls entirely when statusOptions is not supplied (catalog tab, ASSUMPTION-1)", () => {
    render(
      <PolicySearchFilter
        search=""
        onSearchChange={() => {}}
        typeOptions={["health", "auto"]}
        type={[]}
        onTypeChange={() => {}}
        onClear={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: /^active$/i })).not.toBeInTheDocument();
  });

  test("TC-015 / AC-006: renders an accessible Clear action that calls onClear", () => {
    const onClear = jest.fn();
    render(
      <PolicySearchFilter
        search="something"
        onSearchChange={() => {}}
        typeOptions={["health"]}
        type={[]}
        onTypeChange={() => {}}
        onClear={onClear}
      />
    );
    userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });

  test("TC-015 / AC-001: typing in the search box calls onSearchChange", () => {
    const onSearchChange = jest.fn();
    render(
      <PolicySearchFilter
        search=""
        onSearchChange={onSearchChange}
        typeOptions={["health"]}
        type={[]}
        onTypeChange={() => {}}
        onClear={() => {}}
      />
    );
    userEvent.type(screen.getByRole("textbox", { name: /search/i }), "h");
    expect(onSearchChange).toHaveBeenCalled();
  });
});
