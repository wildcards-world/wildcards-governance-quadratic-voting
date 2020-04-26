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

  it("Check vote- expected failures", async function() {
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
    var amount = new BN('4000000000000000000');
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Proposal not Active");
    // create proposal, check expected failure if do not have sufficient balance
    var addressOfProposal1 = "0x0000000000000000000000000000000000000000";
    await qvcontract.createProposal(addressOfProposal1);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Loyalty Token transfer failed");
    // mint sufficient loyalty tokens, supply incorrect root
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,0), "Square root incorrect");
    // pass correct root, should be no failures
    var root = new BN('2000000000');
    await qvcontract.vote(0,amount,root);
  });

  it("Check vote", async function() {
    // SETUP CONTRACTS
    const wctokenmockup = await WildCardTokenMockup.new();
    const ltokenmockup = await LoyaltyTokenMockup.new();
    const stewardmockup = await StewardMockup.new();
    const qvcontract = await WildcardsQV.new(_votingInterval, ltokenmockup.address, wctokenmockup.address, stewardmockup.address, _dragonCardId);
    // SETUP THE REST (same as previous test)
    var amount = new BN('9000000000000000000');
    var root = new BN('3000000000');
    var addressOfProposal = "0x0000000000000000000000000000000000000000";
    await wctokenmockup.createToken(accounts[0]);
    await qvcontract.createProposal(addressOfProposal);
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await qvcontract.vote(0,amount,root);
    // TESTS
    // check vote counted
    var votes = await qvcontract.proposalVotes.call(0,0);
    assert.equal(votes.toNumber(),root.toNumber());
    // check currentWinner, currentHighestVoteCount, totalVotes
    var currentWinner = await qvcontract.currentWinner.call();
    assert.equal(currentWinner,0);
    var totalVotes = await qvcontract.totalVotes.call();
    assert.equal(totalVotes.toNumber(),root.toNumber());
    var currentHighestVoteCount = await qvcontract.currentHighestVoteCount.call();
    assert.equal(currentHighestVoteCount.toNumber(),root.toNumber());
    // check that I am marked as voted
    var hasVoted = await qvcontract.hasUserVotedForProposalIteration.call(0,accounts[0],0);
    assert.equal(hasVoted,true);
    // check expected failure if I try and vote again
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await shouldFail.reverting.withMessage(qvcontract.vote(0,amount,root), "Already voted on this proposal");
    // vote on different proposal, vote for less than original proposal, check currentWinner, currentHighestVoteCount, totalVotes
    await qvcontract.createProposal(addressOfProposal);
    var amount2 = new BN('4000000000000000000'); // less than last night
    var root2 = new BN('2000000000');
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount2);
    await qvcontract.vote(1,amount2,root2);
    var currentWinner = await qvcontract.currentWinner.call();
    assert.equal(currentWinner,0);
    var totalVotes = await qvcontract.totalVotes.call();
    var totalVotesShouldBe = new BN('5000000000'); // sqrt(4) + sqrt(9)
    assert.equal(totalVotes.toNumber(),totalVotesShouldBe.toNumber());
    var currentHighestVoteCount = await qvcontract.currentHighestVoteCount.call();
    assert.equal(currentHighestVoteCount.toNumber(),root.toNumber());
    // change user, vote on second proposal such that it is now the winner, check currentWinner, currentHighestVoteCount, totalVotes
    var user2 = accounts[1];
    await wctokenmockup.createToken(user2);
    await ltokenmockup.mintLoyaltyTokens(user2, amount);
    await qvcontract.vote(1,amount,root, { from: user2 });
    var currentWinner = await qvcontract.currentWinner.call();
    assert.equal(currentWinner,1);
    var totalVotes = await qvcontract.totalVotes.call();
    var totalVotesShouldBe = new BN('8000000000'); // sqrt(4) + sqrt(9) + sqrt(9)
    assert.equal(totalVotes.toNumber(),totalVotesShouldBe.toNumber());
    var currentHighestVoteCount = await qvcontract.currentHighestVoteCount.call();
    var currentHighestVoteCountShouldBe = new BN('5000000000');  // sqrt(4) + sqrt(9)
    assert.equal(currentHighestVoteCount.toNumber(),currentHighestVoteCountShouldBe.toNumber());
  });

  // it("Check distributeFunds", async function() {
  //   // SETUP CONTRACTS
  //   const wctokenmockup = await WildCardTokenMockup.new();
  //   const ltokenmockup = await LoyaltyTokenMockup.new();
  //   const stewardmockup = await StewardMockup.new();
  //   const qvcontract = await WildcardsQV.new(_votingInterval, ltokenmockup.address, wctokenmockup.address, stewardmockup.address, _dragonCardId);
  //   // SETUP THE REST
  //   // proposal 0 = 2 votes, proposal 1 = 3 votes
  //   // vote on proposal 0:
  //   var user = accounts[0];
  //   var amount = new BN('4000000000000000000');
  //   var root = new BN('2000000000');
  //   var addressOfProposal = "0x0000000000000000000000000000000000000000";
  //   await wctokenmockup.createToken(user);
  //   await qvcontract.createProposal(addressOfProposal);
  //   await ltokenmockup.mintLoyaltyTokens(user, amount);
  //   await qvcontract.vote(0,amount,root);
  //   // vote on proposal 1:
  //   var user = accounts[1];
  //   var amount = new BN('9000000000000000000');
  //   var root = new BN('3000000000');
  //   var addressOfProposal = "0x0000000000000000000000000000000000000000";
  //   await wctokenmockup.createToken(user);
  //   await qvcontract.createProposal(addressOfProposal);
  //   await ltokenmockup.mintLoyaltyTokens(user, amount);
  //   await qvcontract.vote(1,amount,root,{from: user});
  //   // THE TESTS
  //   // // check expected failure because not enough time has passed
  //   // await shouldFail.reverting.withMessage(qvcontract.distributeFunds(), "Iteration interval not ended");
  //   // // advance time, no failure
  //   // await time.increase(time.duration.hours(1));
  //   // await qvcontract.distributeFunds();

  // });

});


