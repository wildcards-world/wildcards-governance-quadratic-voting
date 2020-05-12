pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";


interface ILoyaltyToken {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool);

    function burnFrom(address account, uint256 amount) external;
}
