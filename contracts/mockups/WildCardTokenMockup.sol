pragma solidity ^0.5.1;

import "@nomiclabs/buidler/console.sol";


contract WildCardTokenMockup {
    mapping(address => uint256) balances;

    function createToken(address _owner) public {
        balances[_owner] = balances[_owner] + 1;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }
}
