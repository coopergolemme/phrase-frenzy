import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QrScannerModal } from "./QrScannerModal";

describe("QrScannerModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <QrScannerModal isOpen={false} onClose={vi.fn()} onScanSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal structure when isOpen is true", () => {
    render(
      <QrScannerModal isOpen={true} onClose={vi.fn()} onScanSuccess={vi.fn()} />
    );

    expect(screen.getByRole("dialog", { name: "Scan QR Code" })).toBeInTheDocument();
    expect(screen.getByText("Scan Room QR Code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close scanner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onClose when close button or Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<QrScannerModal isOpen={true} onClose={onClose} onScanSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Close scanner" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
