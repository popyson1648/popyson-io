import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

import { Chip } from "../src/components.jsx";

// Smoke test for the component-testing base (happy-dom + Testing Library).
// Chip is a leaf component with no context/window dependencies, so it proves
// the React render + interaction pipeline works without dragging in the
// site-content graph.
describe("Chip", () => {
  test("renders an interactive button reflecting the pressed state", () => {
    render(<Chip on>tag</Chip>);

    const button = screen.getByRole("button", { name: "tag" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.className).toContain("on");
  });

  test("calls onClick when activated", async () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>react</Chip>);

    await userEvent.click(screen.getByRole("button", { name: "react" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  test("renders a non-interactive span when static", () => {
    render(<Chip isStatic>label</Chip>);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("label").tagName).toBe("SPAN");
  });
});
