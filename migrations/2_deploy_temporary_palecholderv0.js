// Load zos scripts and truffle wrapper function
const { scripts, ConfigManager } = require("@openzeppelin/cli");
const { add, push, create } = scripts;

// Mainnet
const addressOfLoyalyTokenContract =
  "0x231570F1ea43DE41adb3Ee04188CE18c8d10dEED";
const addressOfWildCardTokenContract =
  "0x6aD0f855c97eb80665F2D0C7d8204895e052C373";
const addressOfWildCardStewardContract =
  "0x6D47CF86F6A490c6410fC082Fd1Ad29CF61492d0";

async function deploy(options, accounts) {
  add({
    contractsData: [{ name: "PlaceholderContract", alias: "WildcardsQV" }],
  });

  await push({ ...options, force: true });

  const wildcardsQV = await create({
    ...options,
    contractAlias: "WildcardsQV",
    methodName: "initialize",
    methodArgs: [
      2592000, //(30 days voting interval = 30*24*60*60)
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
