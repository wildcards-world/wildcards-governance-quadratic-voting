// Load zos scripts and truffle wrapper function
const { scripts, ConfigManager } = require("@openzeppelin/cli");
const { add, push, create } = scripts;

const addressOfLoyaltyTokenContract =
  "0xd7d8c42ab5b83aa3d4114e5297989dc27bdfb715";
const addressOfWildCardTokenContract =
  "0x6da7dd22a9c1b6bc7b2ba9a540a37ec786e30ea7";
const addressOfWildCardStewardContract =
  "0x0c00cfe8ebb34fe7c31d4915a43cde211e9f0f3b";

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
      addressOfLoyaltyTokenContract,
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
