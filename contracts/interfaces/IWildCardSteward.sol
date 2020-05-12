pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";


interface IWildCardSteward {
    function withdrawBenefactorFundsTo(address payable benefactor) external;

    function _collectPatronage(uint256 tokenId) external;

    function benefactorFunds(address benefactor) external returns (uint256);
}
