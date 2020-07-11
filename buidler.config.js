usePlugin("@nomiclabs/buidler-truffle5");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await web3.eth.getAccounts();

  for (const account of accounts) {
    console.log(account);
  }
});

module.exports = {
  defaultNetwork: "buidlerevm",
  networks: {
    buidlerevm: {
      gas: 95000000,
      blockGasLimit: 95000000,
    },
  },
  reporterOptions: {
    currency: "USD",
    gasPrice: 25, //in gwei
  },
  solc: {
    version: "0.6.10",
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: "constantinople",
  },
};
