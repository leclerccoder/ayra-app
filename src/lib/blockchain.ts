import { ethers } from "ethers";
import escrowArtifact from "@/contracts/escrow.json";

const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const chainId = Number(process.env.CHAIN_ID ?? "31337");

type EscrowArtifact = {
  abi: ethers.InterfaceAbi;
  bytecode: string;
};

const escrow = escrowArtifact as EscrowArtifact;

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
  if (!key) {
    throw new Error("COMPANY_WALLET_PRIVATE_KEY is not set.");
  }
  return getWallet(key);
}

export function getFunderWallet() {
  const key = process.env.CHAIN_FUNDER_PRIVATE_KEY;
  if (!key) {
    throw new Error("CHAIN_FUNDER_PRIVATE_KEY is not set.");
  }
  return getWallet(key);
}

export async function fundWallet(address: string, amountEth = "2.0") {
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
  const contract = getEscrowContract(address, clientPrivateKey);
  const tx = await contract.fundDeposit({
    value: toWei(amount),
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function fundBalance(address: string, clientPrivateKey: string, amount: string) {
  const contract = getEscrowContract(address, clientPrivateKey);
  const tx = await contract.fundBalance({
    value: toWei(amount),
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function recordDepositFiat(address: string, adminPrivateKey: string) {
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.recordDepositFiat();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function recordBalanceFiat(address: string, adminPrivateKey: string) {
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.recordBalanceFiat();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function releaseEscrow(address: string, adminPrivateKey: string) {
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.releaseToCompany();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function refundEscrow(address: string, adminPrivateKey: string) {
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
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.splitPayout(clientPercent);
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function pauseEscrow(address: string, adminPrivateKey: string) {
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.pause();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

export async function unpauseEscrow(address: string, adminPrivateKey: string) {
  const contract = getEscrowContract(address, adminPrivateKey);
  const tx = await contract.unpause();
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}
