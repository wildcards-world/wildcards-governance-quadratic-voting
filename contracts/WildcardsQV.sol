pragma solidity 0.5.15;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ILoyaltyToken.sol";
import "./interfaces/IWildCardToken.sol";
import "./interfaces/IWildCardSteward.sol";


contract WildcardsQV is Initializable {
    using SafeMath for uint256;

    //////// MASTER //////////////
    address public admin;

    //////// External contract specific //////////
    ILoyaltyToken public loyaltyToken;
    IWildCardToken public wildCardToken;
    IWildCardSteward public wildCardSteward;
    uint256 public dragonCardId;

    //////// Iteration specific //////////
    uint256 public votingInterval;
    uint256 public proposalIteration;

    ///////// Proposal specific ///////////
    uint256 public proposalId;
    uint256 public proposalDeadline; // keeping track of time
    mapping(uint256 => address payable) public proposalAddresses;
    enum ProposalState {DoesNotExist, Withdrawn, Active}
    mapping(uint256 => ProposalState) public state; // ProposalId to current state

    //////// DAO / VOTE specific //////////
    // TODO: - we can replace `hasUserVotedForProposalIniteration` value with `userProposalVotes` in the future and allow user to vote multiple times
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasUserVotedForProposalIteration; /// iteration -> userAddress -> proposalId -> bool
    mapping(uint256 => mapping(uint256 => uint256)) public proposalVotes; /// iteration -> proposalId -> num votes
    mapping(uint256 => uint256) public topProject;
    address burnAddress = 0x000000000000000000000000000000000000dEaD;
    uint256 public currentHighestVoteCount;
    uint256 public currentWinner;
    uint256 public totalVotes;

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
        IWildCardSteward _addressOfWildCardStewardContract,
        uint256 _dragonCardId
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
        dragonCardId = _dragonCardId;
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

    ///////////////////////////////////
    /////// CreateProposal  ///////////
    ///////////////////////////////////
    function createProposal(address payable _addressOfCharity)
        external
        onlyAdmin
        returns (uint256 newProposalId)
    {
        proposalAddresses[proposalId] = _addressOfCharity;
        state[proposalId] = ProposalState.Active;
        emit LogProposalCreated(proposalId, _addressOfCharity);
        // So the first proposal will have an ID of 0
        proposalId = proposalId.add(1);
        return proposalId.sub(1); // <- so it is returning the ID of the created proposal
    }

    ///////////////////////////////////
    /////// vote function  ///////////
    ///////////////////////////////////
    function vote(uint256 proposalIdToVoteFor, uint256 amount, uint256 sqrt)
        external
    {
        // Check they are a wildcards user
        require(
            wildCardToken.balanceOf(msg.sender) > 0,
            "Does not own a WildCard"
        );
        // Check they have at least 1 wildcards loyalty token:

        require(amount >= 10**15, "Minimum vote 0.001 loyalty tokens");
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
        // Send their wildcards tokens to the burn address
        require(
            loyaltyToken.transferFrom(msg.sender, burnAddress, amount),
            "Loyalty Token transfer failed"
        );
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

    ///////////////////////////////////
    //// Iteration changes/////////////
    ///////////////////////////////////
    function distributeFunds() public {
        require(proposalDeadline < now, "Iteration interval not ended");
        address payable _thisAddress = address(this); // <-- this is required to cast address to address payable
        // address _thisAddress = address(this);
        // address payable _thisAddress = address(uint160(_thisAddress)); // <-- this is required to cast address to address payable

        // Collect patronage on the WildCard
        wildCardSteward._collectPatronage(dragonCardId);
        // Transfer patronage to this contract
        wildCardSteward.withdrawBenefactorFundsTo(_thisAddress);
        // Get balance to distrubute
        uint256 _fundsToDistribute = _thisAddress.balance;
        // Send 1% to message caller as incentive
        msg.sender.transfer(_fundsToDistribute.div(100));
        // Get remaining balance
        _fundsToDistribute = _thisAddress.balance;
        // Send funds to winner
        address payable _addressOfWinner = proposalAddresses[currentWinner];
        _addressOfWinner.transfer(_fundsToDistribute);

        emit LogFundsDistributed(
            _fundsToDistribute,
            totalVotes,
            currentHighestVoteCount,
            currentWinner,
            now.add(votingInterval),
            proposalIteration.add(1)
        );
        // Clean up for next iteration
        currentHighestVoteCount = 0;
        totalVotes = 0;

        proposalDeadline = now.add(votingInterval);
        proposalIteration = proposalIteration.add(1);
    }

    ///////////////////////////////////
    /////////// Fallback /////////////
    ///////////////////////////////////
    function() external payable {}
}
