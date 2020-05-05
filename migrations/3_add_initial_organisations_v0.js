const wildcardsQVArtifact = artifacts.require("WildcardsQV");

const wildTomorrowFundAddress = "0xFA53ed45C13A2b86daA0074E7AdA739280635d19";

module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    const wildcardsQVContract = await wildcardsQVArtifact.deployed();

    wildcardsQVContract.createProposal(wildTomorrowFundAddress);
    wildcardsQVContract.createProposal(accounts[0]); // senda verde
    wildcardsQVContract.createProposal(accounts[0]); // the great whale conservance
    wildcardsQVContract.createProposal(accounts[0]); // darwin animal doctors
  });
};
