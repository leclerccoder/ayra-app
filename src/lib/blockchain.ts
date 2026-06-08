import { ethers } from "ethers";
import escrowArtifact from "@/contracts/escrow.json";
import crypto from "node:crypto";

const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const chainId = Number(process.env.CHAIN_ID ?? "31337");

type EscrowArtifact = {
  abi: ethers.InterfaceAbi;
  bytecode: string;
};

const escrow = escrowArtifact as EscrowArtifact;

export function isMockChainMode() {
  return process.env.CHAIN_MODE?.toLowerCase() === "mock";
}

function demoPrivateKey(seed: string) {
  return `0x${crypto.createHash("sha256").update(seed).digest("hex")}`;
}

function mockTxHash(label: string, payload?: unknown) {
  return `0x${crypto
    .createHash("sha256")
    .update(`${label}:${Date.now()}:${crypto.randomUUID()}:${JSON.stringify(payload ?? {})}`)
    .digest("hex")}`;
}

function mockAddress(label: string, payload?: unknown) {
  const hash = crypto
    .createHash("sha256")
    .update(`${label}:${Date.now()}:${crypto.randomUUID()}:${JSON.stringify(payload ?? {})}`)
    .digest("hex");
  return `0x${hash.slice(-40)}`;
}

function mockReceipt(hash: string) {
  return {
    hash,
    blockNumber: Math.floor(Date.now() / 1000),
    status: 1,
  };
}

export function getProvider() {
  return new ethers.JsonRpcProvider(rpcUrl, chainId);
}

export function createLocalWallet() {
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

export function getWallet(privateKey: string) {
  return new ethers.Wallet(privateKey, getProvider());
}

export function getCompanyWallet() {
  const key = process.env.COMPANY_WALLET_PRIVATE_KEY;
  if (!key && isMockChainMode()) {
    return new ethers.Wallet(demoPrivateKey("ayra-company-demo-wallet"));
  }
  if (!key) {
    throw new Error("COMPANY_WALLET_PRIVATE_KEY is not set.");
  }
  return getWallet(key);
}

export function getFunderWallet() {
  const key = process.env.CHAIN_FUNDER_PRIVATE_KEY;
  if (!key && isMockChainMode()) {
    return new ethers.Wallet(demoPrivateKey("ayra-funder-demo-wallet"));
  }
  if (!key) {
    throw new Error("CHAIN_FUNDER_PRIVATE_KEY is not set.");
  }
  return getWallet(key);
}

export async function fundWallet(address: string, amountEth = "2.0") {
  if (isMockChainMode()) {
    return mockTxHash("fundWallet", { address, amountEth });
  }

  const funder = getFunderWallet();
  const tx = await funder.sendTransaction({
    to: address,
    value: ethers.parseEther(amountEth),
  });
  await tx.wait();
  return tx.hash;
}

export function toWei(amount: string) {
  return ethers.parseEther(amount);
}

export async function deployEscrowContract(params: {
  clientAddress: string;
  companyAddress: string;
  adminPrivateKey: string;
  depositAmount: string;
  balanceAmount: string;
}) {
  if (isMockChainMode()) {
    return {
      address: mockAddress("deployEscrowContract", params),
      chainId,
    };
  }

  const adminWallet = getWallet(params.adminPrivateKey);
  const factory = new ethers.ContractFactory(
    escrow.abi,
    escrow.bytecode,
    adminWallet
  );
  const contract = await factory.deploy(
    params.clientAddress,
    params.companyAddress,
    adminWallet.address,
    toWei(params.depositAmount),
    toWei(params.balanceAmount)
  );
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  return { address, chainId };
}

export function getEscrowContract(address: string, privateKey?: string) {
  const signer = privateKey ? getWallet(privateKey) : getProvider();
  return new ethers.Contract(address, escrow.abi, signer);
}

export async function fundDeposit(address: string, clientPrivateKey: string, amount: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("fundDeposit", { address, amount });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, clientPrivateKey);
  const tx = await contract.fundDeposit({
    value: toWei(amount),
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function fundBalance(address: string, clientPrivateKey: string, amount: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("fundBalance", { address, amount });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, clientPrivateKey);
  const tx = await contract.fundBalance({
    value: toWei(amount),
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function recordDepositFiat(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("recordDepositFiat", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.recordDepositFiat();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function recordBalanceFiat(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("recordBalanceFiat", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.recordBalanceFiat();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function releaseEscrow(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("releaseEscrow", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.releaseToCompany();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function refundEscrow(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("refundEscrow", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.refundToClient();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function splitEscrow(
  address: string,
  adminPrivateKey: string,
  clientPercent: number
) {
  if (isMockChainMode()) {
    const hash = mockTxHash("splitEscrow", { address, clientPercent });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.splitPayout(clientPercent);
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function pauseEscrow(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("pauseEscrow", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.pause();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function unpauseEscrow(address: string, adminPrivateKey: string) {
  if (isMockChainMode()) {
    const hash = mockTxHash("unpauseEscrow", { address });
    return { hash, receipt: mockReceipt(hash) };
  }

  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.unpause();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

function normalizeSha256Hash(value: string) {
  const normalized = value.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error("Invalid SHA-256 hash format.");
  }
  return normalized;
}

export async function anchorDraftProof(params: {
  escrowAddress: string;
  actorPrivateKey: string;
  action: "UPLOAD" | "REPLACE" | "DELETE";
  draftHash: string;
  previousHash?: string;
}) {
  if (!ethers.isAddress(params.escrowAddress)) {
    throw new Error("Escrow address is invalid.");
  }

  const draftHash = normalizeSha256Hash(params.draftHash);
  const previousHash = params.previousHash
    ? normalizeSha256Hash(params.previousHash)
    : undefined;

  if (isMockChainMode()) {
    const hash = mockTxHash("anchorDraftProof", {
      ...params,
      draftHash,
      previousHash,
      actorPrivateKey: undefined,
    });
    return { hash, receipt: mockReceipt(hash) };
  }

  const wallet = getWallet(params.actorPrivateKey);
  const payload = {
    type: "AYRA_DRAFT_PROOF",
    action: params.action,
    escrowAddress: params.escrowAddress,
    draftHash,
    previousHash: previousHash ?? null,
    timestamp: new Date().toISOString(),
  };

  const data = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(payload)));
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    data,
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}
