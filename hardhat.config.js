require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("hardhat-gas-reporter");
// Plugin de documentação (instalado no CI)
try {
  require("@primitivefi/hardhat-dodoc");
} catch (e) {
  // Plugin não instalado localmente - normal
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  gasReporter: {
    enabled: true,
    currency: "BRL",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  dodoc: {
    runOnCompile: true,
    debugMode: false,
    outputDir: "docs",
    exclude: ["test"]
  }
}; 