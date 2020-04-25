pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

interface IWildCardToken
{
    function balanceOf(address owner) external view returns (uint256) ;
}
