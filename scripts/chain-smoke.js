const { ethers } = require("ethers");
const escrow = require("../src/contracts/escrow.json");

const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const adminKey =
  process.env.CHAIN_FUNDER_PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const companyKey =
  process.env.COMPANY_WALLET_PRIVATE_KEY ??
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const clientKey =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

async function deployEscrow(adminWallet, clientAddress, companyAddress) {
  const adminAddress = await adminWallet.getAddress();
  const factory = new ethers.ContractFactory(
    escrow.abi,
    escrow.bytecode,
    adminWallet
  );
  const contract = await factory.deploy(
    clientAddress,
    companyAddress,
    adminAddress,
    ethers.parseEther("1"),
    ethers.parseEther("1")
  );
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const adminWallet = new ethers.NonceManager(
    new ethers.Wallet(adminKey, provider)
  );
  const companyWallet = new ethers.NonceManager(
    new ethers.Wallet(companyKey, provider)
  );
  const clientWallet = new ethers.NonceManager(
    new ethers.Wallet(clientKey, provider)
  );

  const clientAddress = await clientWallet.getAddress();
  const companyAddress = await companyWallet.getAddress();
  const adminAddress = await adminWallet.getAddress();

  const contract = await deployEscrow(
    adminWallet,
    clientAddress,
    companyAddress
  );
  console.log("Deployed:", await contract.getAddress());

  await (await contract.connect(clientWallet).fundDeposit({ value: ethers.parseEther("1") })).wait();
  await (await contract.connect(clientWallet).fundBalance({ value: ethers.parseEther("1") })).wait();
  await (await contract.connect(adminWallet).releaseToCompany()).wait();
  console.log("Release flow complete.");

  const refundContract = await deployEscrow(
    adminWallet,
    clientAddress,
    companyAddress
  );
  await (await refundContract.connect(clientWallet).fundDeposit({ value: ethers.parseEther("1") })).wait();
  await (await refundContract.connect(adminWallet).refundToClient()).wait();
  console.log("Refund flow complete.");

  const splitContract = await deployEscrow(
    adminWallet,
    clientAddress,
    companyAddress
  );
  await (await splitContract.connect(clientWallet).fundDeposit({ value: ethers.parseEther("1") })).wait();
  await (await splitContract.connect(clientWallet).fundBalance({ value: ethers.parseEther("1") })).wait();
  await (await splitContract.connect(adminWallet).splitPayout(40)).wait();
  console.log("Split flow complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
