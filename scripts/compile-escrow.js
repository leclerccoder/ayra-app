const fs = require("node:fs");
const path = require("node:path");
const solc = require("solc");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "contracts", "Escrow.sol");
const outputPath = path.join(repoRoot, "src", "contracts", "escrow.json");
const entryName = "contracts/Escrow.sol";

function resolveImport(importPath) {
  const candidates = [
    path.join(repoRoot, importPath),
    path.join(repoRoot, "node_modules", importPath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }

  return { error: `File not found: ${importPath}` };
}

const input = {
  language: "Solidity",
  sources: {
    [entryName]: {
      content: fs.readFileSync(sourcePath, "utf8"),
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), {
    import: resolveImport,
  })
);

const errors = output.errors ?? [];
const fatalErrors = errors.filter((error) => error.severity === "error");

for (const error of errors) {
  const log = error.severity === "error" ? console.error : console.warn;
  log(error.formattedMessage.trim());
}

if (fatalErrors.length > 0) {
  process.exitCode = 1;
  return;
}

const contract = output.contracts?.[entryName]?.Escrow;

if (!contract?.abi || !contract?.evm?.bytecode?.object) {
  console.error("Escrow contract output is missing ABI or bytecode.");
  process.exitCode = 1;
  return;
}

const artifact = {
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
