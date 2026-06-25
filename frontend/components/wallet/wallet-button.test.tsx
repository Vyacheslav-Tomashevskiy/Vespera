import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/stellar", () => ({
  getFreighterAddress: vi.fn(),
  connectFreighter: vi.fn(),
  disconnectFreighter: vi.fn(),
}));

import { WalletButton } from "./wallet-button";
import {
  getFreighterAddress,
  connectFreighter,
  disconnectFreighter,
} from "@/lib/stellar";

const FAKE_ADDR =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WalletButton", () => {
  it("renders a Connect button when no address is found", async () => {
    vi.mocked(getFreighterAddress).mockResolvedValue(null);

    render(<WalletButton />);

    expect(
      await screen.findByRole("button", { name: /connect/i }),
    ).toBeInTheDocument();
  });

  it("shows the truncated address once Freighter returns one", async () => {
    vi.mocked(getFreighterAddress).mockResolvedValue(FAKE_ADDR);

    render(<WalletButton />);

    // First six + last four — matches the inline truncation in the
    // component.
    expect(await screen.findByText("GA5ZSE…KZVN")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect/i }),
    ).not.toBeInTheDocument();
  });

  it("flips into the connected state after a successful connect", async () => {
    vi.mocked(getFreighterAddress).mockResolvedValue(null);
    vi.mocked(connectFreighter).mockResolvedValue(FAKE_ADDR);

    render(<WalletButton />);

    const button = await screen.findByRole("button", { name: /connect/i });
    await userEvent.click(button);

    expect(await screen.findByText("GA5ZSE…KZVN")).toBeInTheDocument();
    expect(connectFreighter).toHaveBeenCalledOnce();
  });

  it("falls back to a Connect button if Freighter never resolves an address", async () => {
    // The component reads getFreighterAddress on mount; if the call
    // rejects (e.g. extension missing) it catches and stays in the
    // disconnected state.
    vi.mocked(getFreighterAddress).mockRejectedValue(
      new Error("freighter missing"),
    );

    render(<WalletButton />);

    expect(
      await screen.findByRole("button", { name: /connect/i }),
    ).toBeInTheDocument();
  });

  it("exposes the connected wallet as an accessible, interactive control", async () => {
    vi.mocked(getFreighterAddress).mockResolvedValue(FAKE_ADDR);

    render(<WalletButton />);

    // The connected state is a real button (focusable/operable), not a
    // bare <div>, and its accessible name carries the full address so
    // assistive tech announces which wallet is connected.
    const pill = await screen.findByRole("button", {
      name: new RegExp(FAKE_ADDR),
    });
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveAttribute("title", FAKE_ADDR);
  });

  it("disconnects when the connected control is activated", async () => {
    vi.mocked(getFreighterAddress).mockResolvedValue(FAKE_ADDR);
    vi.mocked(disconnectFreighter).mockResolvedValue();

    render(<WalletButton />);

    const pill = await screen.findByRole("button", {
      name: new RegExp(FAKE_ADDR),
    });
    await userEvent.click(pill);

    expect(disconnectFreighter).toHaveBeenCalledOnce();
    // Back to the disconnected Connect button.
    expect(
      await screen.findByRole("button", { name: /connect/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("GA5ZSE…KZVN")).not.toBeInTheDocument();
  });
});
