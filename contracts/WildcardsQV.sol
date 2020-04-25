pragma solidity 0.5.15;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ILoyaltyToken.sol";
import "./interfaces/IWildCardToken.sol";

contract WildcardsQV is Initializable {
    using SafeMath for uint256;

    //////// MASTER //////////////
    address public admin;

    //////// External contract specific //////////
    ILoyaltyToken public loyaltyToken;
    IWildCardToken public wildCardToken;

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
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasUserVotedForProposalIteration; /// iteration -> userAddress -> proposalId -> bool
    // mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userProposalVotes; /// iteration -> userAddress -> proposalId -> num tokens burnt on project (non - quadratic vote)
    mapping(uint256 => mapping(uint256 => uint256)) public proposalVotes; /// iteration -> proposalId -> num votes
    // mapping(uint256 => uint256) public topProject;
    // mapping(address => address) public voteDelegations;
    address burnAddress = 0x000000000000000000000000000000000000dEaD;
    uint currentHighestVoteCount;
    uint currentWinner;
    uint totalVotes;

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
    function initialize(uint256 _votingInterval, ILoyaltyToken _addressOfLoyalyTokenContract, IWildCardToken _addressOfWildCardTokenContract) public initializer {
        admin = msg.sender;
        votingInterval = _votingInterval;

        proposalDeadline = now.add(_votingInterval);

        loyaltyToken = _addressOfLoyalyTokenContract;
        wildCardToken = _addressOfWildCardTokenContract;
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
    function createProposal(string calldata proposalHash)
        external
        onlyAdmin
        returns (uint256 newProposalId)
    {
        // So the first proposal will have an ID of 1
        proposalId = proposalId.add(1);

        proposalDetails[proposalId] = proposalHash;
        //proposalOwner[proposalId] = msg.sender;
        //benefactorsProposal[msg.sender] = proposalId;
        state[proposalId] = ProposalState.Active;
        return proposalId;
    }

    ///////////////////////////////////
    /////// vote function  ///////////
    ///////////////////////////////////
    function vote(uint256 proposalIdToVoteFor, uint256 amount, uint256 sqrt) external {
        // Check they are a wildcards user
        require(wildCardToken.balanceOf(msg.sender)>0, "Does not own a WildCard");
        // Check they have at least 1 wildcards loyalty token:
        require(amount >= 10**18, " Minimum vote one token");
        // Check they are voting for a valid proposal: 
        // require(proposalDetails[proposalIdToVoteFor]!=0, "Proposal does not exist"); // <-- doesnt work, not sure how to do this atm
        // Check that they haven't yet voted for the proposal in this iteration
        require(!hasUserVotedForProposalIteration[proposalIteration][msg.sender][proposalIdToVoteFor], "Already voted on this proposal");
        // Approve us to send wildcards tokens on their behalf
        //    needs to be done front end I think, calling the Loyaly Token contract directly
        // Send their wildcards tokens to the burn address
        require(loyaltyToken.transferFrom(msg.sender,burnAddress,amount), "Loyalty Token transfer failed");
        // Validate the square root
        require(sqrt.mul(sqrt) == amount, "Square root incorrect");
        // Add the tokens to the total tally
        proposalVotes[proposalIteration][proposalIdToVoteFor] = proposalVotes[proposalIteration][proposalIdToVoteFor]
            .add(sqrt);
        uint256 _currentVoteCount = proposalVotes[proposalIteration][proposalIdToVoteFor];
        // Take note that the user has voted on this proposal so they can't do it again
        hasUserVotedForProposalIteration[proposalIteration][msg.sender][proposalIdToVoteFor] = true;
        // Update currentWinner, currentHighestVoteCount, totalVotes
        if (_currentVoteCount > currentHighestVoteCount) {
            currentHighestVoteCount = _currentVoteCount;
            currentWinner = proposalIdToVoteFor;
        }
        totalVotes = totalVotes.add(_currentVoteCount);
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
            //    no longer necessary
            uint256 _totalFundsToDistribute = address(this).balance;

            // Sends funds proportionally, can change if needed
            // Assumes this contract has the ether, that it is not taken from elsewhere
            for (uint i = 0; i < proposalId; i++) {
                address payable _addressOfCharity; // <=-- placeholder, I dont know where to get this from
                uint256 _voteCount = proposalVotes[proposalIteration][i];
                uint256 _fundsToDistribute = _totalFundsToDistribute.mul(_voteCount).div(totalVotes);
                _addressOfCharity.transfer(_fundsToDistribute);
            }

            // We need to be able to call the wildcards contract to distribute the collected hackathon
            // To the winners in the ratio determined by the QV
            // Also do the logic of removing proposals / putting them in different leagues, states, etc...
        }
        proposalDeadline = now.add(votingInterval);
        proposalIteration = proposalIteration.add(1);

        // Clean up for next iteration
        currentHighestVoteCount = 0;
        totalVotes = 0;
    }

}
