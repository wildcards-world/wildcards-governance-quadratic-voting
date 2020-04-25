pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";

interface ILoyaltyToken 
{
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
}
