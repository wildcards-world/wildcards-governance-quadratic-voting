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
  time,
} = require("openzeppelin-test-helpers");

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("WV Contract", function() {
  let accounts;
  const _votingInterval = 3600;
  const _dragonCardId = 69;

  before(async function() {
    accounts = await web3.eth.getAccounts();
  });

  it("Check constiables on deploy", async function() {
    // SETUP

    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // TESTS
    assert.equal(await qvcontract.votingInterval.call(), 3600);
    assert.equal(await qvcontract.loyaltyToken.call(), ltokenmockup.address);
    assert.equal(await qvcontract.wildCardToken.call(), wctokenmockup.address);
    assert.equal(
      await qvcontract.wildCardSteward.call(),
      stewardmockup.address
    );
    assert.equal(await qvcontract.dragonCardId.call(), 69);
  });

  it("Check createProposal", async function() {
    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // check proposal ID currently zero
    assert.equal(await qvcontract.proposalId.call(), 0);
    // add two proposals
    const addressOfProposal1 = "0x0000000000000000000000000000000000000000";
    const addressOfProposal2 = "0x0000000000000000000000000000000000000001";
    // check the state of proposalID 0 is currently 0 (= DoesNotExist)
    const proposalState0 = await qvcontract.state.call(0);
    assert.equal(proposalState0, 0);
    // create 1 proposal
    await qvcontract.createProposal(addressOfProposal1);
    // check state is now 2 ( = Active )
    const proposalState1 = await qvcontract.state.call(1);
    assert.equal(proposalState1, 2);
    // check address of proposal
    const proposalAddress = await qvcontract.proposalAddresses.call(1);
    assert.equal(proposalAddress, addressOfProposal1);
    // check proposalId is now 1
    assert.equal(await qvcontract.proposalId.call(), 1);
    // repeat all the above for second proposal
    await qvcontract.createProposal(addressOfProposal2);
    assert.equal(await qvcontract.proposalId.call(), 2);
    const proposalState = await qvcontract.state.call(2);
    assert.equal(proposalState, 2);
    const proposalAddress2 = await qvcontract.proposalAddresses.call(2);
    assert.equal(proposalAddress2, addressOfProposal2);
  });

  it("Check vote- expected failures", async function() {
    // SETUP
    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // TESTS
    // check expected failure if don't have WC token
    await shouldFail.reverting.withMessage(
      qvcontract.vote(0, 0, 0),
      "Does not own a WildCard"
    );
    // buy a WC token, check expected failure if amount 0
    await wctokenmockup.createToken(accounts[0]);
    await shouldFail.reverting.withMessage(
      qvcontract.vote(1, 0, 0),
      "Cannot vote with 0"
    );
    // send sufficient amount, check expected failure if voting on inactive proposal
    const amount = new BN("4000000000000000000");
    await shouldFail.reverting.withMessage(
      qvcontract.vote(1, amount, 0),
      "Proposal not Active"
    );
    // create proposal, check expected failure if do not have sufficient balance
    const addressOfProposal1 = "0x0000000000000000000000000000000000000000";
    await qvcontract.createProposal(addressOfProposal1);
    await shouldFail.reverting.withMessage(
      qvcontract.vote(1, amount, 0),
      "Loyalty Token transfer failed"
    );
    // mint sufficient loyalty tokens, supply incorrect root
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await shouldFail.reverting.withMessage(
      qvcontract.vote(1, amount, 0),
      "Square root incorrect"
    );
    // pass correct root, should be no failures
    const root = new BN("2000000000");
    await qvcontract.vote(1, amount, root);
  });

  it("Check vote", async function() {
    // SETUP CONTRACTS
    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // SETUP THE REST (same as previous test)
    const amount = new BN("9000000000000000000");
    const root = new BN("3000000000");
    const addressOfProposal = "0x0000000000000000000000000000000000000000";
    await wctokenmockup.createToken(accounts[0]);
    await qvcontract.createProposal(addressOfProposal);
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await qvcontract.vote(1, amount, root);
    // TESTS
    // check vote counted
    const votes = await qvcontract.proposalVotes.call(0, 1);
    assert.equal(votes.toNumber(), root.toNumber());
    // check currentWinner, currentHighestVoteCount, totalVotes
    const currentWinner0 = await qvcontract.currentWinner.call();
    assert.equal(currentWinner0, 1);
    const totalVotes0 = await qvcontract.totalVotes.call();
    assert.equal(totalVotes0.toNumber(), root.toNumber());
    const currentHighestVoteCount0 = await qvcontract.currentHighestVoteCount.call();
    assert.equal(currentHighestVoteCount0.toNumber(), root.toNumber());
    // check that I am marked as voted
    const hasVoted = await qvcontract.hasUserVotedForProposalIteration.call(
      0,
      accounts[0],
      1
    );
    assert.equal(hasVoted, true);
    // check expected failure if I try and vote again
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    await shouldFail.reverting.withMessage(
      qvcontract.vote(1, amount, root),
      "Already voted on this proposal"
    );
    // vote on different proposal, vote for less than original proposal, check currentWinner, currentHighestVoteCount, totalVotes
    await qvcontract.createProposal(addressOfProposal);
    const amount2 = new BN("4000000000000000000"); // less than last night
    const root2 = new BN("2000000000");
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount2);
    await qvcontract.vote(2, amount2, root2);
    const currentWinner1 = await qvcontract.currentWinner.call();
    assert.equal(currentWinner1, 1);
    const totalVotes1 = await qvcontract.totalVotes.call();
    const totalVotesShouldBe1 = new BN("5000000000"); // sqrt(4) + sqrt(9)
    assert.equal(totalVotes1.toNumber(), totalVotesShouldBe1.toNumber());
    const currentHighestVoteCount1 = await qvcontract.currentHighestVoteCount.call();
    assert.equal(currentHighestVoteCount1.toNumber(), root.toNumber());
    // change user, vote on second proposal such that it is now the winner, check currentWinner, currentHighestVoteCount, totalVotes
    const user2 = accounts[1];
    await wctokenmockup.createToken(user2);
    await ltokenmockup.mintLoyaltyTokens(user2, amount);
    await qvcontract.vote(2, amount, root, { from: user2 });
    const currentWinner2 = await qvcontract.currentWinner.call();
    assert.equal(currentWinner2, 2);
    const totalVotes2 = await qvcontract.totalVotes.call();
    const totalVotesShouldBe2 = new BN("8000000000"); // sqrt(4) + sqrt(9) + sqrt(9)
    assert.equal(totalVotes2.toNumber(), totalVotesShouldBe2.toNumber());
    const currentHighestVoteCount2 = await qvcontract.currentHighestVoteCount.call();
    const currentHighestVoteCountShouldBe = new BN("5000000000"); // sqrt(4) + sqrt(9)
    assert.equal(
      currentHighestVoteCount2.toNumber(),
      currentHighestVoteCountShouldBe.toNumber()
    );
  });

  it("Check distributeFunds", async function() {
    // SETUP CONTRACTS
    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // SETUP THE REST
    // proposal 0 = 2 votes, proposal 1 = 3 votes
    // vote on proposal 0:
    const user0 = accounts[0];
    const amount0 = new BN("4000000000000000000");
    const root0 = new BN("2000000000");
    const addressOfProposal1 = "0x0000000000000000000000000000000000000069";
    await wctokenmockup.createToken(user0);
    await qvcontract.createProposal(addressOfProposal1);
    await ltokenmockup.mintLoyaltyTokens(user0, amount0);
    await qvcontract.vote(1, amount0, root0);
    // vote on proposal 1:
    const user1 = accounts[1];
    const amount1 = new BN("9000000000000000000");
    const root1 = new BN("3000000000");
    const addressOfProposal2 = "0x0000000000000000000000000000000000000002";
    await wctokenmockup.createToken(user1);
    await qvcontract.createProposal(addressOfProposal2);
    await ltokenmockup.mintLoyaltyTokens(user1, amount1);
    await qvcontract.vote(2, amount1, root1, { from: user1 });
    // THE TESTS
    // top up steward so it can send us back the funds
    await stewardmockup.topUpSteward({ value: 1000000000000000000 });
    // check expected failure because not enough time has passed
    await shouldFail.reverting.withMessage(
      qvcontract.distributeFunds(),
      "Iteration interval not ended"
    );
    // advance time, no failure
    await time.increase(time.duration.hours(1));
    await qvcontract.distributeFunds();
    // check that the winner was sent the ether
    const balanceProposal2 = await web3.eth.getBalance(addressOfProposal2);
    assert.equal(balanceProposal2, 990000000000000000);
    // check expected failure if try and distributeFunds again
    await shouldFail.reverting.withMessage(
      qvcontract.distributeFunds(),
      "Iteration interval not ended"
    );
    ////////////////////////// round 2 //////////////////////
    // try again with new proposals
    // proposal 0 = 3 more votes (total 5) create a third proposal and give it 3 votes. Proposal 0 now the winner
    // vote on proposal 0:
    const amount2 = new BN("9000000000000000000");
    const root2 = new BN("3000000000");
    await ltokenmockup.mintLoyaltyTokens(user0, amount2);
    await qvcontract.vote(1, amount2, root2);
    // create and vote on proposal 2:
    const amount3 = new BN("9000000000000000000");
    const root3 = new BN("3000000000");
    const addressOfProposal3 = "0x0000000000000000000000000000000000000003";
    await wctokenmockup.createToken(user1);
    await qvcontract.createProposal(addressOfProposal3);
    await ltokenmockup.mintLoyaltyTokens(user1, amount3);
    await qvcontract.vote(3, amount3, root3, { from: user1 });
    // THE TESTS
    // top up steward so it can send us back the funds
    await stewardmockup.topUpSteward({ value: 5000000000000000000 });
    // check expected failure because not enough time has passed
    await shouldFail.reverting.withMessage(
      qvcontract.distributeFunds(),
      "Iteration interval not ended"
    );
    // advance time, no failure
    await time.increase(time.duration.hours(1));
    await qvcontract.distributeFunds(); /// <----- why is this causing a problem
    // check that the winner was sent the ether
    const balanceProposal1 = await web3.eth.getBalance(addressOfProposal1);
    assert.equal(balanceProposal1, 4950000000000000000);
  });
  it("Check distributeFunds if no project wins.", async function() {
    // SETUP CONTRACTS
    wctokenmockup = await WildCardTokenMockup.new();
    ltokenmockup = await LoyaltyTokenMockup.new();
    stewardmockup = await StewardMockup.new();
    qvcontract = await WildcardsQV.new();

    const contractBalanceBefore = await web3.eth.getBalance(qvcontract.address);

    await qvcontract.initialize(
      _votingInterval,
      ltokenmockup.address,
      wctokenmockup.address,
      stewardmockup.address,
      _dragonCardId
    );
    // SETUP THE REST (same as previous test)
    const amount = new BN("9000000000000000000");
    const root = new BN("0");
    const addressOfProposal = "0x0000000000000000000000000000000000000000";
    await wctokenmockup.createToken(accounts[0]);
    await qvcontract.createProposal(addressOfProposal);
    await ltokenmockup.mintLoyaltyTokens(accounts[0], amount);
    const contractBalanceAfter = await web3.eth.getBalance(qvcontract.address);

    // TESTS
    // check vote counted
    assert.equal(
      contractBalanceAfter.toString(),
      contractBalanceBefore.toString()
    );
    const votes = await qvcontract.proposalVotes.call(0, 1);
    assert.equal(votes.toNumber(), root.toNumber());

    // check currentWinner, currentHighestVoteCount, totalVotes
    const currentWinner0 = await qvcontract.currentWinner.call();
    assert.equal(currentWinner0, 0);
    const totalVotes0 = await qvcontract.totalVotes.call();
    assert.equal(totalVotes0.toNumber(), root.toNumber());
    const currentHighestVoteCount0 = await qvcontract.currentHighestVoteCount.call();
    assert.equal(currentHighestVoteCount0.toNumber(), root.toNumber());
  });
});
