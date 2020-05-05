// Load zos scripts and truffle wrapper function
const { scripts, ConfigManager } = require("@openzeppelin/cli");
const { add, push, create } = scripts;

// Goerli:
const addressOfLoyalyTokenContract =
  "0x64Fde89bae3e52b3b853A0ba8F8184D72a398F5b";
const addressOfWildCardTokenContract =
  "0x6Da7DD22A9c1B6bC7b2Ba9A540A37EC786E30eA7";
const addressOfWildCardStewardContract =
  "0x0C00CFE8EbB34fE7C31d4915a43Cde211e9F0F3B";

// // Mainnet
// const addressOfLoyalyTokenContract =
//   "0x231570F1ea43DE41adb3Ee04188CE18c8d10dEED";
// const addressOfWildCardTokenContract =
//   "0x6aD0f855c97eb80665F2D0C7d8204895e052C373";
// const addressOfWildCardStewardContract =
//   "0x6D47CF86F6A490c6410fC082Fd1Ad29CF61492d0";

const wildTomorrowFundAddress = "0xFA53ed45C13A2b86daA0074E7AdA739280635d19";

async function deploy(options, accounts) {
  add({
    contractsData: [{ name: "WildcardsQV", alias: "WildcardsQV" }],
  });

  await push({ ...options, force: true });

  const wildcardsQV = await create({
    ...options,
    contractAlias: "WildcardsQV",
    methodName: "initialize",
    methodArgs: [
      600, //(10 min voting interval)
      addressOfLoyalyTokenContract,
      addressOfWildCardTokenContract,
      addressOfWildCardStewardContract,
      13,
    ],
  });
}

module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    // Don't try to deploy/migrate the contracts for tests
    if (networkName === "test") {
      return;
    }
    const { network, txParams } = await ConfigManager.initNetworkConfiguration({
      network: networkName,
      from: accounts[0],
    });
    await deploy({ network, txParams }, accounts);
  });
};
