pragma solidity 0.5.16;

// import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";


contract WildcardsQV is Initializable {
    using SafeMath for uint256;

    //////// MASTER //////////////
    address public admin;

    //////// Iteration specific //////////
    uint256 public votingInterval;
    uint256 public proposalIteration;

    ///////// Proposal specific ///////////
    uint256 public proposalId;
    uint256 public proposalDeadline; // keeping track of time
    mapping(uint256 => string) public proposalDetails;
    enum ProposalState {DoesNotExist, Withdrawn, Active, Cooldown} // Add Cooldown state and pending state
    mapping(uint256 => ProposalState) public state; // ProposalId to current state

    //////// DAO / VOTE specific //////////
    // TODO: - we can replace `hasUserVotedForProposalIniteration` value with `userProposalVotes` in the future and allow user to vote multiple times
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasUserVotedForProposalIteration; /// iteration -> userAddress -> proposalId -> num votes
    // mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userProposalVotes; /// iteration -> userAddress -> proposalId -> num tokens burnt on project (non - quadratic vote)
    mapping(uint256 => mapping(uint256 => uint256)) public proposalVotes; /// iteration -> proposalId -> num votes
    // mapping(uint256 => uint256) public topProject;
    // mapping(address => address) public voteDelegations;

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
    function initialize(uint256 _votingInterval) public initializer {
        admin = msg.sender;
        votingInterval = _votingInterval;

        proposalDeadline = now.add(_votingInterval);
    }

    ///////////////////////////////////
    /////// Config functions //////////
    ///////////////////////////////////
    function changeVotingInterval(uint256 newInterval) external onlyAdmin {
        votingInterval = newInterval;
    }

    ///////////////////////////////////
    /////// CreateProposal  ///////////
    ///////////////////////////////////
    function createProposal(string memory proposalHash)
        external
        onlyAdmin
        returns (uint256 newProposalId)
    {
        // So the first proposal will have an ID of 1
        proposalId = proposalId.add(1);

        proposalDetails[proposalId] = proposalHash;
        proposalOwner[proposalId] = msg.sender;
        benefactorsProposal[msg.sender] = proposalId;
        state[proposalId] = ProposalState.Active;
        return proposalId;
    }

    ///////////////////////////////////
    /////// vote function  ///////////
    ///////////////////////////////////
    function vote(uint256 proposalIdToVoteFor, uint256 amount) external {
        // Check they are a wildcards user
        // Check they have wildcards loyalty Tokens
        // Check they are voting for a valid proposal + the they haven't yet voted for the proposal in this iteration

        // Approve us to send wildcards tokens on their behalf
        // Send their wildcards tokens to the burn address

        // Add the tokens to the total tally
        proposalVotes[proposalIteration][proposalIdToVoteFor] = proposalVotes[proposalIteration][proposalIdToVoteFor]
            .add(sqrt(amount));
    }

    ///////////////////////////////////
    //// Iteration changes/////////////
    ///////////////////////////////////
    function distributeFunds() public {
        require(proposalDeadline < now, "iteration interval not ended");

        // There wont be a winner in the first iteration
        if (proposalIteration != 0) {
            // Here we send the money to the winner/winners!
            // Need to call a function that calculates the winners.
            // We need to be able to call the wildcards contract to distribute the collected hackathon
            // To the winners in the ratio determined by the QV
            // Also do the logic of removing proposals / putting them in different leagues, states, etc...
        }
        proposalDeadline = now.add(votingInterval);
        proposalIteration = proposalIteration.add(1);
    }

    /**
     * @dev returns the square root (in int) of a number
     * @param x the number (int)
     */
    // NB check the integrity of this function
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
