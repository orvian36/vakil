import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";

describe("Tooltip", () => {
  it("renders trigger without errors", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>hover me</TooltipTrigger>
          <TooltipContent>tip!</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("hover me")).toBeInTheDocument();
  });
});
