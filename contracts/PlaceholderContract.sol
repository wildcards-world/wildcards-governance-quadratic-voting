pragma solidity 0.5.15;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";
import "./interfaces/ILoyaltyToken.sol";
import "./interfaces/IWildCardToken.sol";
import "./interfaces/IWildCardSteward.sol";


contract PlaceholderContract is Initializable {
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
    uint256 public latestProposalId;
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

    // if a payment fails, the user will be able to pull the amount stored here:
    mapping(address => uint256) public failedTransferCredits;

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

    function() external payable {}
}
