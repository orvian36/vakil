import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

describe("Tabs", () => {
  it("switches between tab contents", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">first</TabsContent>
        <TabsContent value="b">second</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
