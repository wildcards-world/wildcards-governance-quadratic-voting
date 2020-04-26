const Greeter = artifacts.require("Greeter");
const WildcardsQV = artifacts.require("WildcardsQV");
const WildCardTokenMockup = artifacts.require("WildCardTokenMockup");
const LoyaltyTokenMockup = artifacts.require("LoyaltyTokenMockup");
const StewardMockup = artifacts.require("StewardMockup");

const {
  BN,
  shouldFail,
  ether,
  expectEvent,
  balance,
  time
} = require('openzeppelin-test-helpers');

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("WV Contract", function() {
  let accounts;
  let _votingInterval = 3600;
  let _dragonCardId = 69;

  before(async function() {
    accounts = await web3.eth.getAccounts();
  });

  it("Check variables on deploy", async function() {
    // SETUP
    const wctokenmockup = await WildCardTokenMockup.new();
    const ltokenmockup = await LoyaltyTokenMockup.new();
    const stewardmockup = await StewardMockup.new();
    const qvcontract = await WildcardsQV.new(_votingInterval, ltokenmockup.address, wctokenmockup.address, stewardmockup.address, _dragonCardId);
    // TESTS
    assert.equal(await qvcontract.votingInterval.call(), 3600);
    assert.equal(await qvcontract.loyaltyToken.call(), ltokenmockup.address);
    assert.equal(await qvcontract.wildCardToken.call(), wctokenmockup.address);
    assert.equal(await qvcontract.wildCardSteward.call(), stewardmockup.address);
    assert.equal(await qvcontract.dragonCardId.call(), 69);
  });

  it("Check createProposal", async function() {
    // SETUP
    const wctokenmockup = await WildCardTokenMockup.new();
    const ltokenmockup = await LoyaltyTokenMockup.new();
    const stewardmockup = await StewardMockup.new();
    const qvcontract = await WildcardsQV.new(_votingInterval, ltokenmockup.address, wctokenmockup.address, stewardmockup.address, _dragonCardId);
    // TESTS
    // check proposal ID currently zero
    assert.equal(await qvcontract.proposalId.call(), 0);
    // add two proposals
    var addressOfProposal1 = "0x0000000000000000000000000000000000000000";
    var addressOfProposal2 = "0x0000000000000000000000000000000000000001";
    // check the state of proposalID 0 is currently 0 (= DoesNotExist)
    var proposalState = await qvcontract.state.call(0)
    assert.equal(proposalState,0);
    // create 1 proposal
    await qvcontract.createProposal(addressOfProposal1);
    // check state is now 2 ( = Active )
    var proposalState = await qvcontract.state.call(0)
    assert.equal(proposalState,2);
    // check address of proposal
    var proposalAddress = await qvcontract.proposalAddresses.call(0)
    assert.equal(proposalAddress,addressOfProposal1);
    // check proposalId is now 1
    assert.equal(await qvcontract.proposalId.call(), 1);
    // repeat all the above for second proposal
    await qvcontract.createProposal(addressOfProposal2);
    assert.equal(await qvcontract.proposalId.call(), 2);
    var proposalState = await qvcontract.state.call(1)
    assert.equal(proposalState,2);
    var proposalAddress = await qvcontract.proposalAddresses.call(1)
    assert.equal(proposalAddress,addressOfProposal2);
  });

  it("Check vote", async function() {
    // SETUP
    const wctokenmockup = await WildCardTokenMockup.new();
    const ltokenmockup = await LoyaltyTokenMockup.new();
    const stewardmockup = await StewardMockup.new();
    const qvcontract = await WildcardsQV.new(_votingInterval, ltokenmockup.address, wctokenmockup.address, stewardmockup.address, _dragonCardId);
    // TESTS
    // check expected failure if don't have WC token
    await shouldFail.reverting.withMessage(qvcontract.vote(0,0,0), "Does not own a WildCard");
    // buy a WC token, check expected failure if amount too low
    await wctokenmockup.createToken(accounts[0]);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,0,0), "Minimum vote one token");
    // send sufficient amount, check expected failure if voting on inactive proposal
    var amount = new BN('1000000000000000000');
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Proposal not Active");
    // create proposal, check expected failure if do not have sufficient balance
    var addressOfProposal1 = "0x0000000000000000000000000000000000000000";
    await qvcontract.createProposal(addressOfProposal1);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Loyalty Token transfer failed");
    // mint sufficient loyalty tokens, supply incorrect root
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Square root incorrect");



  });

});


