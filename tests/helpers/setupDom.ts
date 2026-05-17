import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Radix UI portaled components (Select, etc.) call pointer-capture APIs that
// happy-dom does not implement. Stub them so the select dropdown can open.
if (typeof HTMLElement !== "undefined") {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => undefined;
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => undefined;
  }
}

afterEach(() => {
  cleanup();
});
