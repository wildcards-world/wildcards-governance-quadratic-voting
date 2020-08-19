pragma solidity 0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ILoyaltyToken.sol";
import "./interfaces/IWildCardToken.sol";
import "./interfaces/IWildCardSteward.sol";
import "./VRFConsumerBase.sol";

contract WildcardsQV_v1 is Initializable {
    using SafeMath for uint256;

    //////// MASTER //////////////
    address public admin;

    //////// External contract specific //////////
    ILoyaltyToken public loyaltyToken;
    IWildCardToken public wildCardToken;
    IWildCardSteward public wildCardSteward;
    uint256 public deprecated_dragonCardId;

    //////// Iteration specific //////////
    uint256 public votingInterval;
    uint256 public proposalIteration;

    ///////// Proposal specific ///////////
    uint256 public latestProposalId;
    uint256 public proposalDeadline; // keeping track of time
    mapping(uint256 => address payable) public proposalAddresses;
    enum ProposalState {DoesNotExist, Withdrawn, Active}
    mapping(uint256 => ProposalState) public state; // ProposalId to current state

    //////// DAO / VOTE specific //////////
    // TODO: - we can replace `hasUserVotedForProposalIniteration` value with `userProposalVotes` in the future and allow user to vote multiple times
    mapping(uint256 => mapping(address => mapping(uint256 => bool)))
        public hasUserVotedForProposalIteration; /// iteration -> userAddress -> proposalId -> bool
    mapping(uint256 => mapping(uint256 => uint256)) public proposalVotes; /// iteration -> proposalId -> num votes
    mapping(uint256 => uint256) public topProject;
    address deprecated_burnAddress = 0x000000000000000000000000000000000000dEaD;
    uint256 public currentHighestVoteCount;
    uint256 public currentWinner;
    uint256 public totalVotes;

    // if a payment fails, the user will be able to pull the amount stored here:
    mapping(address => uint256) public failedTransferCredits;

    ////////////////////////////////////
    //////// Events ///////////////////
    ////////////////////////////////////
    event LogNewVotingInterval(uint256 indexed newInterval);
    event LogProposalStateChange(
        uint256 indexed proposalIdUpdated,
        bool isActive
    );
    event LogProposalCreated(
        uint256 indexed newProposalId,
        address indexed newProposalAddress
    );
    event LogVote(
        uint256 indexed proposalVotedFor,
        uint256 indexed votesCast,
        uint256 totalVotesForProposal,
        uint256 totalVotesAllProposals,
        address indexed addressOfVoter
    );
    event LogFundsDistributed(
        uint256 indexed fundsDistributed,
        uint256 indexed totalVotes,
        uint256 winningVotes,
        uint256 indexed winningProposal,
        uint256 newDeadline,
        uint256 newIteration
    );

    ////////////////////////////////////
    //////// Modifiers /////////////////
    ////////////////////////////////////
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    ////////////////////////////////////
    //////// SETUP CONTRACT////////////
    //// NOTE: Upgradable at the moment
    function initialize(
        uint256 _votingInterval,
        ILoyaltyToken _addressOfLoyalyTokenContract,
        IWildCardToken _addressOfWildCardTokenContract,
        IWildCardSteward _addressOfWildCardStewardContract
    ) public initializer {
        admin = msg.sender;
        votingInterval = _votingInterval;

        proposalDeadline = now.add(_votingInterval);
        currentHighestVoteCount = 0;
        totalVotes = 0;

        // externals:
        loyaltyToken = _addressOfLoyalyTokenContract;
        wildCardToken = _addressOfWildCardTokenContract;
        wildCardSteward = _addressOfWildCardStewardContract;

        // Perhaps this event is Misnamed, but we need an event to tell thegraph that things are starting up.
        emit LogFundsDistributed(
            0,
            0,
            0,
            0,
            proposalDeadline,
            proposalIteration
        );
    }

    ///////////////////////////////////
    /////// Config functions //////////
    ///////////////////////////////////
    function changeVotingInterval(uint256 newInterval) external onlyAdmin {
        votingInterval = newInterval;
        emit LogNewVotingInterval(newInterval);
    }

    function changeProposalState(uint256 _proposalId, bool newState)
        external
        onlyAdmin
    {
        // state: true = Active, false = Withdrawn
        if (newState) {
            state[_proposalId] = ProposalState.Active;
        } else {
            state[_proposalId] = ProposalState.Withdrawn;
        }
        emit LogProposalStateChange(_proposalId, newState);
    }

    function increaseInterval(uint256 time) external onlyAdmin {
        require(time <= 8640000); // Not more than 100 days
        proposalDeadline = proposalDeadline.add(time);
    }

    ///////////////////////////////////
    /////// CreateProposal  ///////////
    ///////////////////////////////////
    function createProposal(address payable _addressOfCharity)
        external
        onlyAdmin
        returns (uint256 newProposalId)
    {
        latestProposalId = latestProposalId.add(1);
        proposalAddresses[latestProposalId] = _addressOfCharity;
        state[latestProposalId] = ProposalState.Active;
        emit LogProposalCreated(latestProposalId, _addressOfCharity);

        return latestProposalId; // <- so it is returning the ID of the created proposal
    }

    function updateProposalLinkedAddress(
        uint256 proposalId,
        address payable newOrganisationAddress
    ) external {
        require(
            newOrganisationAddress != msg.sender,
            "Cannot change organisations address to itself"
        );
        require(
            msg.sender == proposalAddresses[proposalId],
            "Not owner of proposal"
        );
        proposalAddresses[proposalId] = newOrganisationAddress;
    }

    ///////////////////////////////////
    /////// vote function  ///////////
    ///////////////////////////////////
    function vote(
        uint256 proposalIdToVoteFor,
        uint256 amount,
        uint256 sqrt
    ) external {
        // Check they are a wildcards user
        require(
            wildCardToken.balanceOf(msg.sender) > 0,
            "Does not own a WildCard"
        );

        // Check they have at least 1 unit of wildcards loyalty token:
        require(amount > 0, "Cannot vote with 0");

        // Check they are voting for a valid proposal:
        require(
            state[proposalIdToVoteFor] == ProposalState.Active,
            "Proposal not Active"
        );

        // Check that they haven't yet voted for the proposal in this iteration
        require(
            !hasUserVotedForProposalIteration[proposalIteration][msg
                .sender][proposalIdToVoteFor],
            "Already voted on this proposal"
        );

        // Remove these tokens from circulation - this function reverts if there is an issue.
        loyaltyToken.burnFrom(msg.sender, amount);

        // Validate the square root
        require(sqrt.mul(sqrt) == amount, "Square root incorrect");

        hasUserVotedForProposalIteration[proposalIteration][msg
            .sender][proposalIdToVoteFor] = true;

        // Add the tokens to the total tally
        proposalVotes[proposalIteration][proposalIdToVoteFor] = proposalVotes[proposalIteration][proposalIdToVoteFor]
            .add(sqrt);


            uint256 _currentVoteCount
         = proposalVotes[proposalIteration][proposalIdToVoteFor];
        // Take note that the user has voted on this proposal so they can't do it again

        // Update currentWinner, currentHighestVoteCount, totalVotes
        if (_currentVoteCount > currentHighestVoteCount) {
            currentHighestVoteCount = _currentVoteCount;
            currentWinner = proposalIdToVoteFor;
        }

        totalVotes = totalVotes.add(sqrt);
        emit LogVote(
            proposalIdToVoteFor,
            sqrt,
            _currentVoteCount,
            totalVotes,
            msg.sender
        );
    }

    function safeFundsTransfer(address payable recipient, uint256 amount)
        internal
    {
        // attempt to send the funds to the recipient
        (bool success, ) = recipient.call.gas(2100).value(amount)("2300");
        // if it failed, update their credit balance so they can pull it later
        if (success == false) {
            failedTransferCredits[recipient] += amount;
        }
    }

    function withdrawAllFailedCredits() public {
        uint256 amount = failedTransferCredits[msg.sender];

        require(amount != 0);
        require(address(this).balance >= amount);

        failedTransferCredits[msg.sender] = 0;

        // safeFundsTransfer(msg.sender, amount);
        // NOTE: this is safe since `transfer` reverts the transaction on failure.
        msg.sender.transfer(amount);
    }

    ///////////////////////////////////
    //// Iteration changes/////////////
    ///////////////////////////////////
    function distributeFunds(uint256 userProvidedSeed) public {
        require(proposalDeadline < now, "Iteration interval not ended");

        // This happens if there is no winner.
        if (currentHighestVoteCount == 0) {
            proposalDeadline = now.add(votingInterval);
            proposalIteration = proposalIteration.add(1);
            emit LogFundsDistributed(
                0,
                0,
                0,
                0,
                proposalDeadline,
                proposalIteration
            );
            return;
        }

        // Transfer patronage to this contract
        wildCardSteward.withdrawBenefactorFundsTo(payable(this));
        uint256 amountRaisedInIteration = address(this).balance;

        if (amountRaisedInIteration > 0) {
            // Send 1% to message caller as incentive
            uint256 incentiveForCaller = amountRaisedInIteration.div(100);
            uint256 payoutForWinner = amountRaisedInIteration.sub(
                incentiveForCaller
            );

            safeFundsTransfer(msg.sender, incentiveForCaller);
            address payable _addressOfWinner = proposalAddresses[currentWinner];
            safeFundsTransfer(_addressOfWinner, payoutForWinner);
        }

        // Clean up for next iteration
        proposalDeadline = now.add(votingInterval);
        proposalIteration = proposalIteration.add(1);
        emit LogFundsDistributed(
            amountRaisedInIteration,
            totalVotes,
            currentHighestVoteCount,
            currentWinner,
            proposalDeadline,
            proposalIteration
        );

        currentHighestVoteCount = 0;
        totalVotes = 0;
    }

    ///////////////////////////////////
    /////////// Fallback //////////////
    ///////////////////////////////////
    fallback() external payable {}
}
