import { prisma } from "@/lib/db";
import { createLocalWallet, fundWallet, getProvider } from "@/lib/blockchain";
import { ethers } from "ethers";

const MIN_WALLET_BALANCE = ethers.parseEther("0.5");

async function maybeTopUpWallet(address: string) {
  try {
    const balance = await getProvider().getBalance(address);
    if (balance < MIN_WALLET_BALANCE) {
      await fundWallet(address, "2.0");
    }
  } catch (error) {
    console.warn("Wallet balance check failed:", error);
  }
}

export async function ensureUserWallet(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.walletAddress && user.walletPrivateKey) {
    await maybeTopUpWallet(user.walletAddress);
    return user;
  }

  const wallet = createLocalWallet();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      walletAddress: wallet.address,
      walletPrivateKey: wallet.privateKey,
    },
  });

  await maybeTopUpWallet(wallet.address);

  return updated;
}
