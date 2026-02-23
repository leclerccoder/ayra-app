const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

const contractPath = path.join(__dirname, "..", "contracts", "Escrow.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "Escrow.sol": { content: source },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

function findImports(importPath) {
  if (importPath.startsWith("@openzeppelin/")) {
    const resolved = path.join(__dirname, "..", "node_modules", importPath);
    return { contents: fs.readFileSync(resolved, "utf8") };
  }
  return { error: "File not found" };
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  const errors = output.errors.filter((err) => err.severity === "error");
  if (errors.length > 0) {
    console.error(errors);
    process.exit(1);
  }
}

const contract = output.contracts["Escrow.sol"].Escrow;
const artifact = {
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
};

const outDir = path.join(__dirname, "..", "src", "contracts");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "escrow.json"),
  JSON.stringify(artifact, null, 2)
);

console.log("Escrow contract compiled.");
