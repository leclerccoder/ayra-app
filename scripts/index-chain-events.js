const { PrismaClient } = require("@prisma/client");
const { ethers } = require("ethers");
const escrow = require("../src/contracts/escrow.json");

const prisma = new PrismaClient();

function normalizeValue(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeValue(val)])
    );
  }
  return value;
}

async function main() {
  const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const projects = await prisma.project.findMany({
    where: { escrowAddress: { not: null } },
  });

  for (const project of projects) {
    const contract = new ethers.Contract(project.escrowAddress, escrow.abi, provider);
    const latestBlock = await provider.getBlockNumber();
    const events = await contract.queryFilter({}, 0, latestBlock);

    for (const event of events) {
      const existing = await prisma.chainEvent.findFirst({
        where: {
          projectId: project.id,
          txHash: event.transactionHash,
          eventName: event.fragment?.name ?? "Event",
        },
      });
      if (existing) {
        continue;
      }
      await prisma.chainEvent.create({
        data: {
          projectId: project.id,
          eventName: event.fragment?.name ?? "Event",
          txHash: event.transactionHash,
          blockNumber: event.blockNumber ?? undefined,
          payload: event.args
            ? normalizeValue(Object.fromEntries(Object.entries(event.args)))
            : undefined,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
