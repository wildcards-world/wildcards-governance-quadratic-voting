pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

interface IWildCardToken {
    function balanceOf(address owner) external view returns (uint256);
}
