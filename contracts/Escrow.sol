// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract Escrow is AccessControl, Pausable {
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    address public immutable client;
    address public immutable company;
    uint256 public immutable depositAmount;
    uint256 public immutable balanceAmount;

    enum Status {
        AWAITING_DEPOSIT,
        DEPOSIT_FUNDED,
        BALANCE_FUNDED,
        RELEASED,
        REFUNDED,
        SPLIT
    }

    Status public status;

    event DepositFunded(address indexed client, uint256 amount);
    event BalanceFunded(address indexed client, uint256 amount);
    event FundsReleased(address indexed company, uint256 amount);
    event FundsRefunded(address indexed client, uint256 amount);
    event FundsSplit(address indexed client, address indexed company, uint256 clientAmount, uint256 companyAmount);
    event EscrowPaused(address indexed admin);
    event EscrowUnpaused(address indexed admin);

    constructor(
        address clientAddress,
        address companyAddress,
        address adminAddress,
        uint256 depositWei,
        uint256 balanceWei
    ) {
        require(clientAddress != address(0), "Client required");
        require(companyAddress != address(0), "Company required");
        require(adminAddress != address(0), "Admin required");
        require(depositWei > 0, "Deposit required");
        require(balanceWei > 0, "Balance required");

        client = clientAddress;
        company = companyAddress;
        depositAmount = depositWei;
        balanceAmount = balanceWei;
        status = Status.AWAITING_DEPOSIT;

        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(ARBITER_ROLE, adminAddress);
    }

    function fundDeposit() external payable whenNotPaused {
        require(msg.sender == client, "Only client");
        require(status == Status.AWAITING_DEPOSIT, "Deposit not allowed");
        require(msg.value == depositAmount, "Incorrect deposit");

        status = Status.DEPOSIT_FUNDED;
        emit DepositFunded(msg.sender, msg.value);
    }

    function fundBalance() external payable whenNotPaused {
        require(msg.sender == client, "Only client");
        require(status == Status.DEPOSIT_FUNDED, "Balance not allowed");
        require(msg.value == balanceAmount, "Incorrect balance");

        status = Status.BALANCE_FUNDED;
        emit BalanceFunded(msg.sender, msg.value);
    }

    // Fiat gateway path: admin/oracle records a verified payment without moving ETH.
    function recordDepositFiat() external whenNotPaused onlyRole(ARBITER_ROLE) {
        require(status == Status.AWAITING_DEPOSIT, "Deposit not allowed");
        status = Status.DEPOSIT_FUNDED;
        emit DepositFunded(client, depositAmount);
    }

    // Fiat gateway path: admin/oracle records a verified balance payment without moving ETH.
    function recordBalanceFiat() external whenNotPaused onlyRole(ARBITER_ROLE) {
        require(status == Status.DEPOSIT_FUNDED, "Balance not allowed");
        status = Status.BALANCE_FUNDED;
        emit BalanceFunded(client, balanceAmount);
    }

    function releaseToCompany() external whenNotPaused onlyRole(ARBITER_ROLE) {
        require(status == Status.BALANCE_FUNDED, "Release not allowed");

        status = Status.RELEASED;
        uint256 total = address(this).balance;
        (bool success, ) = company.call{value: total}("");
        require(success, "Release failed");
        emit FundsReleased(company, total);
    }

    function refundToClient() external whenNotPaused onlyRole(ARBITER_ROLE) {
        require(
            status == Status.DEPOSIT_FUNDED || status == Status.BALANCE_FUNDED,
            "Refund not allowed"
        );

        status = Status.REFUNDED;
        uint256 total = address(this).balance;
        (bool success, ) = client.call{value: total}("");
        require(success, "Refund failed");
        emit FundsRefunded(client, total);
    }

    function splitPayout(uint256 clientPercent) external whenNotPaused onlyRole(ARBITER_ROLE) {
        require(status == Status.BALANCE_FUNDED, "Split not allowed");
        require(clientPercent <= 100, "Invalid percent");

        status = Status.SPLIT;
        uint256 total = address(this).balance;
        uint256 clientAmount = (total * clientPercent) / 100;
        uint256 companyAmount = total - clientAmount;

        if (clientAmount > 0) {
            (bool clientOk, ) = client.call{value: clientAmount}("");
            require(clientOk, "Client payout failed");
        }
        if (companyAmount > 0) {
            (bool companyOk, ) = company.call{value: companyAmount}("");
            require(companyOk, "Company payout failed");
        }

        emit FundsSplit(client, company, clientAmount, companyAmount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EscrowPaused(msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EscrowUnpaused(msg.sender);
    }
}
