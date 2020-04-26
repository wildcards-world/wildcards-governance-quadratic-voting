// Load zos scripts and truffle wrapper function
const { scripts, ConfigManager } = require("@openzeppelin/cli");
const { add, push, create } = scripts;

const addressOfLoyalyTokenContract =
  "0x0000000000000000000000000000000000000000";
const addressOfWildCardTokenContract =
  "0x0000000000000000000000000000000000000000";
const addressOfWildCardStewardContract =
  "0x0000000000000000000000000000000000000000";

async function deploy(options, accounts) {
  add({
    contractsData: [{ name: "WildcardsQV", alias: "WildcardsQV" }],
  });

  await push({ ...options, force: true });

  const patronageToken = await create({
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

module.exports = function (deployer, networkName, accounts) {
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
