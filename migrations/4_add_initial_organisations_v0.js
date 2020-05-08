const wildcardsQVArtifact = artifacts.require("WildcardsQV");

const wildTomorrowFundAddress = "0xFA53ed45C13A2b86daA0074E7AdA739280635d19";
const sendaVerdeAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";

module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    const wildcardsQVContract = await wildcardsQVArtifact.deployed();
    console.log("the address", wildcardsQVContract.address);

    wildcardsQVContract.createProposal(wildTomorrowFundAddress);
    wildcardsQVContract.createProposal(sendaVerdeAddress); // senda verde
    wildcardsQVContract.createProposal(accounts[0]); // the great whale conservance
    await wildcardsQVContract.createProposal(accounts[0]); // darwin animal doctors
    throw "don't save migration";
  });
};
