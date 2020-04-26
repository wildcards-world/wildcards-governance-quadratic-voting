pragma solidity ^0.5.1;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";

contract StewardMockup {
    using SafeMath for uint256;

    mapping (address => uint256) balances;
    uint compilerSuppressionVariable;

    constructor() payable public {}

    function _collectPatronagePatron(address tokenPatron) public {
        //this doesnt need to do anything
        compilerSuppressionVariable = 69;
    }

    function withdrawBenefactorFundsTo(address payable benefactor) public {
        
        uint256 _fundsToDistribute = address(this).balance;
        benefactor.transfer(_fundsToDistribute);

    }

    function currentPatron(uint tokenId) public returns (address) {
        compilerSuppressionVariable = 69;
        return address(1);
    }



}
