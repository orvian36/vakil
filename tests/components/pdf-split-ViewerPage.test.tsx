import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ViewerPage } from "@/components/pdf-split/ViewerPage";

const fakeDoc: any = {
  numPages: 1,
  getPage: async () => ({
    getViewport: () => ({ height: 100, width: 80 }),
    render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
  }),
};

describe("ViewerPage", () => {
  it("renders without throwing", () => {
    const { container } = render(<ViewerPage pdfDocument={fakeDoc} pageNumber={1} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});
