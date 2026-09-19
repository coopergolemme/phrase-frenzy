import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MultiplayerHomeScreen } from "./MultiplayerHomeScreen";

describe("MultiplayerHomeScreen", () => {
  const categories = [{ id: "cat1", label: "General", emoji: "⭐", words: ["Apple"] }];

  it("renders choose mode initially with Host and Join options", () => {
    render(
      <MultiplayerHomeScreen
        categories={categories}
        isBusy={false}
        error={null}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText("Host a Game")).toBeInTheDocument();
    expect(screen.getByText("Join a Game")).toBeInTheDocument();
  });

  it("switches to join mode and renders Scan QR Code button", () => {
    render(
      <MultiplayerHomeScreen
        categories={categories}
        isBusy={false}
        error={null}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Join a Game"));

    expect(screen.getByPlaceholderText("Room code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scan qr code/i })).toBeInTheDocument();
  });

  it("opens QrScannerModal when Scan QR Code is clicked", () => {
    render(
      <MultiplayerHomeScreen
        categories={categories}
        isBusy={false}
        error={null}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Join a Game"));
    fireEvent.click(screen.getByRole("button", { name: /scan qr code/i }));

    expect(screen.getByRole("dialog", { name: "Scan QR Code" })).toBeInTheDocument();
  });
});
