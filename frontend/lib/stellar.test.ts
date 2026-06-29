import { describe, it, expect, vi, beforeEach } from "vitest";
import { Account } from "@stellar/stellar-sdk";

// Mock Soroban RPC Server so we don't make real network calls
const mockGetAccount = vi.fn();
vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    rpc: {
      ...original.rpc,
      Server: vi.fn().mockImplementation(() => ({
        getAccount: mockGetAccount,
      })),
    },
  };
});

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  setAllowed: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}));

import {
  isConnected,
  isAllowed,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import {
  connectFreighter,
  getFreighterAddress,
  signRentPayment,
  isRentPaymentConfigured,
} from "./stellar";

const FAKE_ADDR =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const FAKE_HORIZON = "https://horizon-testnet.stellar.org";
const FAKE_CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFreighterAddress", () => {
  it("returns null when Freighter is not connected", async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });

    await expect(getFreighterAddress()).resolves.toBeNull();
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it("returns null when the user has not granted access", async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: false });

    await expect(getFreighterAddress()).resolves.toBeNull();
    expect(getAddress).not.toHaveBeenCalled();
  });

  it("returns the granted address", async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(getAddress).mockResolvedValue({ address: FAKE_ADDR });

    await expect(getFreighterAddress()).resolves.toBe(FAKE_ADDR);
  });
});

describe("connectFreighter", () => {
  it("requests permission when not already allowed", async () => {
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: false });
    vi.mocked(setAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(getAddress).mockResolvedValue({ address: FAKE_ADDR });

    await expect(connectFreighter()).resolves.toBe(FAKE_ADDR);
    expect(setAllowed).toHaveBeenCalledOnce();
  });

  it("throws if the user refuses the permission prompt", async () => {
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: false });
    vi.mocked(setAllowed).mockResolvedValue({ isAllowed: false });

    await expect(connectFreighter()).rejects.toThrow("freighter not allowed");
    expect(getAddress).not.toHaveBeenCalled();
  });

  it("throws if Freighter returns no address", async () => {
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(getAddress).mockResolvedValue({ address: "" });

    await expect(connectFreighter()).rejects.toThrow("no address");
  });
});

describe("isRentPaymentConfigured", () => {
  it("returns false when env vars are not set", () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", "");
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", "");
    expect(isRentPaymentConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("returns true when both env vars are set", () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", FAKE_HORIZON);
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", FAKE_CONTRACT);
    expect(isRentPaymentConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("signRentPayment", () => {
  it("throws when env vars are not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", "");
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", "");

    await expect(
      signRentPayment({ propertyId: "prop-1", amount: 100 }),
    ).rejects.toThrow("not configured");
  });

  it("throws when Freighter is not connected", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", FAKE_HORIZON);
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", FAKE_CONTRACT);
    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: false });
    vi.mocked(setAllowed).mockResolvedValue({ isAllowed: false });

    await expect(
      signRentPayment({ propertyId: "prop-1", amount: 100 }),
    ).rejects.toThrow("freighter not allowed");
  });

  it("connects, loads account, builds contract call, signs and returns XDR", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", FAKE_HORIZON);
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", FAKE_CONTRACT);

    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(getAddress).mockResolvedValue({ address: FAKE_ADDR });

    // Use a real Account instance that TransactionBuilder expects
    mockGetAccount.mockResolvedValue(
      new Account(FAKE_ADDR, "12345"),
    );

    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "AAAA...signed",
      signerAddress: FAKE_ADDR,
    });

    const xdr = await signRentPayment({
      propertyId: "prop-1",
      amount: 100,
    });

    expect(xdr).toBe("AAAA...signed");
    expect(signTransaction).toHaveBeenCalledTimes(1);
    const [, opts] = vi.mocked(signTransaction).mock.calls[0];
    expect(opts).toEqual(
      expect.objectContaining({
        address: FAKE_ADDR,
        networkPassphrase: expect.any(String),
      }),
    );
    expect(opts?.networkPassphrase).toMatch(/Test SDF Network/);
  });

  it("returns empty string when Freighter signs but yields no XDR", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORIZON_URL", FAKE_HORIZON);
    vi.stubEnv("NEXT_PUBLIC_RENTAL_CONTRACT_ID", FAKE_CONTRACT);

    vi.mocked(isAllowed).mockResolvedValue({ isAllowed: true });
    vi.mocked(getAddress).mockResolvedValue({ address: FAKE_ADDR });
    mockGetAccount.mockResolvedValue(
      new Account(FAKE_ADDR, "12345"),
    );
    vi.mocked(signTransaction).mockResolvedValue({
      signedTxXdr: "",
      signerAddress: FAKE_ADDR,
    });

    await expect(
      signRentPayment({ propertyId: "prop-2", amount: 1 }),
    ).resolves.toBe("");
  });
});
