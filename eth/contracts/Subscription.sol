pragma solidity >0.6.99 <0.8.0;

// SPDX-License-Identifier: MIT

contract SubscriptionFactory {
    function createSubscription(uint minFee) public payable returns (address) {
        Subscription sub = new Subscription{value: msg.value}(msg.sender, minFee);
        return address(sub);
    }
}

contract Subscription {
    // owns the subscription, can execute restricted functions
    address public owner;
    // the minimum fee i
    uint public minFee;

    mapping(address => uint) private subscribed;
    uint public subscribedCount;
    mapping(address => uint) private tips;
    uint public tipsAmount;

    // Allowed withdrawals of previous bids
    mapping(address => uint) pendingWithdrawals;

    event Subscribed(address from, uint amount);
    event Unsubscribed(address from, uint amount);
    event Tipped(address from, uint amount);

    constructor(address creator, uint fee) payable {
        minFee = fee;
        owner = creator;
    }

    function changeOwner(address newOwner) public restricted {
        owner = newOwner;
    }

    function subscribe() public payable {
        require(msg.value > minFee, "minimum fee is required");
        subscribed[msg.sender] += msg.value;
        subscribedCount++;
        emit Subscribed(msg.sender, msg.value);
    }

    function unsubscribe(address  addr) public restricted {
        uint value = subscribed[addr];
        require(value > 0, "only subscribed address can unsubcribed");
        require(value <= address(this).balance, "can't withdraw more tokens than the contract holds");
        pendingWithdrawals[addr] += value;
        subscribed[addr] = 0;
        subscribedCount--;
        emit Unsubscribed(msg.sender, value);
    }

    function withdraw() public returns (bool) {
        uint value = pendingWithdrawals[msg.sender];
        if (value > 0) {
            // init the amount
            pendingWithdrawals[msg.sender] = 0;

            if (!msg.sender.send(value)) {
                // reset the amount as transaction didn't took place
                pendingWithdrawals[msg.sender] = value;
                return false;
            }
        }
        return true;
    }

    function tip() public payable {
        tipsAmount += msg.value;
        tips[msg.sender] += msg.value;
        emit Tipped(msg.sender, msg.value);
    }

    function checkAddress(address addr) public restricted view returns (uint) {
        return subscribed[addr];
    }

    function checkTip(address addr) public restricted view returns (uint) {
        return tips[addr];
    }

    function withdraw(address recipient, uint value) public restricted {
        require(value <= address(this).balance, "can't withdraw more tokens than the contract holds");
        pendingWithdrawals[recipient] += value;
    }

    modifier restricted() {
        require(msg.sender == owner, "restricted! only owner can execute");
        _;
    }

}