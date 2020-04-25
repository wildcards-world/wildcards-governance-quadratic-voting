pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";


contract IWildcardsQV {
    constructor(string memory _greeting) public {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
    }

    /**
    submitProposal (only admin - centralized)
    - we control this initially (wildcards)
    - Reduces risk


    removeProposal (only admin - centralized)
    - we control this initially (wildcards)
    - Reduces risk


    vote
    - Anyone can vote at any point in time
    - Tokens are burnt for a vote 
    - Cannot vote for the same project twice in one iteration (otherwise defeats QV)
    - Once the iteration is over, all votes are null and void

    
    increaseIteration
    - this tries to send out the funds to the winning projects (for the hackathon we don't need to implement the fallback to pull)
    - starts the next round of voting
        THOUGHT - this could be the function that also allows us to add/remove a project.
     */
}
