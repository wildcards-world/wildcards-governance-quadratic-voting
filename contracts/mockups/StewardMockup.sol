pragma solidity ^0.6.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@nomiclabs/buidler/console.sol";

contract StewardMockup {
    using SafeMath for uint256;

    mapping(address => uint256) public balance;
    uint256 compilerSuppressionVariable;

    constructor() public payable {}

    function _collectPatronage(uint256 id) public {
        //this doesnt need to do anything
        // remove compiler warnings:
        compilerSuppressionVariable = id;
    }

    // NOTE: in the original contracts this is just a mapping.
    function benefactorFunds(address benefactor) public returns (uint256) {
        return address(this).balance;
    }

    function withdrawBenefactorFundsTo(address payable benefactor) public {
        uint256 _fundsToDistribute = address(this).balance;
        benefactor.transfer(_fundsToDistribute);
    }

    function topUpSteward() public payable {}
}
