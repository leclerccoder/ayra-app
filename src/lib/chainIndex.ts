import { ethers } from "ethers";
import escrow from "@/contracts/escrow.json";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Prisma's InputJsonValue disallows `null` at the top-level, but nested `null`s
// are allowed inside objects/arrays. We return `null` for nested values and
// ensure the top-level payload never becomes `null` before writing.
function normalizeValue(value: unknown): Prisma.InputJsonValue | null {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        normalizeValue(val),
      ])
    );
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value === undefined) {
    return null;
  }
  return String(value);
}

export async function indexChainEvents(): Promise<{ indexed: number }> {
  const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const projects = await prisma.project.findMany({
    where: { escrowAddress: { not: null } },
  });

  let indexed = 0;

  for (const project of projects) {
    if (!project.escrowAddress) {
      continue;
    }
    const contract = new ethers.Contract(
      project.escrowAddress,
      escrow.abi,
      provider
    );
    const latestBlock = await provider.getBlockNumber();
    // Use "*" to fetch all events from the contract.
    const events = await contract.queryFilter("*", 0, latestBlock);

    for (const event of events) {
      const eventName =
        "fragment" in event && event.fragment ? event.fragment.name : "Event";
      const payload =
        "args" in event && event.args
          ? normalizeValue(
              Object.fromEntries(
                Object.entries(event.args as unknown as Record<string, unknown>)
              )
            )
          : undefined;

      const existing = await prisma.chainEvent.findFirst({
        where: {
          projectId: project.id,
          txHash: event.transactionHash,
          eventName,
        },
      });
      if (existing) {
        continue;
      }
      await prisma.chainEvent.create({
        data: {
          projectId: project.id,
          eventName,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber ?? undefined,
          payload: payload === null ? undefined : payload,
        },
      });
      indexed += 1;
    }
  }

  return { indexed };
}
