// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @notice State version convention used in tests:
 * - Version 0: Initial state during channel creation (required for INITIAL state)
 * - Version 41: State before resize operation
 * - Version 42: Resize state
 * - Version 43: State after resize operation
 * - Version 55: Checkpoint state
 * - Version 97: Challenge state
 * - Version 98: Counter-challenge state
 * - Version 100: Closing state
 */
import {Test, console} from "lib/forge-std/src/Test.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol";

import {MessageHashUtils} from "lib/openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

import {TestUtils} from "./TestUtils.sol";
import {Custody} from "../src/Custody.sol";
import {Channel, State, Allocation, Signature, ChannelStatus, StateIntent, Amount} from "../src/interfaces/Types.sol";
import {Utils} from "../src/Utils.sol";

import {FlagAdjudicator} from "./mocks/FlagAdjudicator.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract CustodyTest is Test {
    Custody public custody;
    FlagAdjudicator public adjudicator;
    MockERC20 public token;

    // Private keys for testing
    uint256 constant hostSKPrivKey = 1;
    uint256 constant guestSKPrivKey = 2;
    uint256 constant nonParticipantPrivKey = 3;
    uint256 constant depositorPrivKey = 4;
    uint256 constant hostWalletPrivKey = 5;
    uint256 constant guestWalletPrivKey = 6;

    // Test users
    address public hostSK;
    address public guestSK;
    address public nonParticipant;
    address public depositor;
    address public hostWallet;
    address public guestWallet;

    // Common test values
    uint64 constant CHALLENGE_DURATION = 3600; // 1 hour
    uint64 constant NONCE = 1;
    uint256 constant DEPOSIT_AMOUNT = 1000;
    uint256 constant INITIAL_BALANCE = 10000;

    function setUp() public {
        // Set up user addresses from private keys
        hostSK = vm.addr(hostSKPrivKey);
        guestSK = vm.addr(guestSKPrivKey);
        nonParticipant = vm.addr(nonParticipantPrivKey);
        depositor = vm.addr(depositorPrivKey);
        hostWallet = vm.addr(hostWalletPrivKey);
        guestWallet = vm.addr(guestWalletPrivKey);

        // Deploy contracts
        custody = new Custody();
        adjudicator = new FlagAdjudicator(true);
        token = new MockERC20("Test Token", "TST", 18);

        // Fund accounts
        token.mint(hostSK, INITIAL_BALANCE);
        token.mint(guestSK, INITIAL_BALANCE);
        token.mint(nonParticipant, INITIAL_BALANCE);
        token.mint(depositor, INITIAL_BALANCE);
        token.mint(hostWallet, INITIAL_BALANCE);
        token.mint(guestWallet, INITIAL_BALANCE);

        // Approve token transfers
        vm.startPrank(hostSK);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(guestSK);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(nonParticipant);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(depositor);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(hostWallet);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();

        vm.startPrank(guestWallet);
        token.approve(address(custody), INITIAL_BALANCE);
        vm.stopPrank();
    }

    function createTestChannelWithSK() internal view returns (Channel memory) {
        address[] memory participants = new address[](2);
        participants[0] = hostSK;
        participants[1] = guestSK;

        return Channel({
            participants: participants,
            adjudicator: address(adjudicator),
            challenge: CHALLENGE_DURATION,
            nonce: NONCE
        });
    }

    function createTestChannelWithWallets() internal view returns (Channel memory) {
        address[] memory participants = new address[](2);
        participants[0] = hostWallet;
        participants[1] = guestWallet;

        return Channel({
            participants: participants,
            adjudicator: address(adjudicator),
            challenge: CHALLENGE_DURATION,
            nonce: NONCE
        });
    }

    function createInitialStateWithSK() internal view returns (State memory) {
        Allocation[] memory allocations = new Allocation[](2);

        allocations[0] = Allocation({destination: hostSK, token: address(token), amount: DEPOSIT_AMOUNT});
        allocations[1] = Allocation({destination: guestSK, token: address(token), amount: DEPOSIT_AMOUNT});

        return State({
            intent: StateIntent.INITIALIZE,
            version: 0, // Initial state has version 0
            data: bytes(""), // Empty data
            allocations: allocations,
            sigs: new Signature[](0) // Empty initially
        });
    }

    function createInitialStateWithWallets() internal view returns (State memory) {
        Allocation[] memory allocations = new Allocation[](2);

        allocations[0] = Allocation({destination: hostWallet, token: address(token), amount: DEPOSIT_AMOUNT});
        allocations[1] = Allocation({destination: guestWallet, token: address(token), amount: DEPOSIT_AMOUNT});

        return State({
            intent: StateIntent.INITIALIZE,
            version: 0, // Initial state has version 0
            data: bytes(""), // Empty data
            allocations: allocations,
            sigs: new Signature[](0) // Empty initially
        });
    }

    function createClosingStateWithSK() internal view returns (State memory) {
        Allocation[] memory allocations = new Allocation[](2);

        allocations[0] = Allocation({destination: hostSK, token: address(token), amount: DEPOSIT_AMOUNT});
        allocations[1] = Allocation({destination: guestSK, token: address(token), amount: DEPOSIT_AMOUNT});

        // Create unsigned state with FINALIZE intent
        return State({
            intent: StateIntent.FINALIZE,
            version: 0, // Initial state has version 0
            data: bytes(""), // Empty data
            allocations: allocations,
            sigs: new Signature[](0) // Empty initially
        });
    }

    function createClosingStateWithWallets() internal view returns (State memory) {
        Allocation[] memory allocations = new Allocation[](2);

        allocations[0] = Allocation({destination: hostWallet, token: address(token), amount: DEPOSIT_AMOUNT});
        allocations[1] = Allocation({destination: guestWallet, token: address(token), amount: DEPOSIT_AMOUNT});

        return State({
            intent: StateIntent.FINALIZE,
            version: 0, // Initial state has version 0
            data: bytes(""), // Empty data
            allocations: allocations,
            sigs: new Signature[](0) // Empty initially
        });
    }

    function signState(Channel memory chan, State memory state, uint256 privateKey)
        internal
        view
        returns (Signature memory)
    {
        bytes32 stateHash = Utils.getStateHash(chan, state);
        (uint8 v, bytes32 r, bytes32 s) = TestUtils.sign(vm, privateKey, stateHash);
        return Signature({v: v, r: r, s: s});
    }

    function depositTokens(address user, uint256 amount) internal {
        vm.prank(user);
        custody.deposit(address(token), amount);
    }

    function skipChallengeTime() internal {
        skip(CHALLENGE_DURATION + 1);
    }

    // ==================== TEST CASES ====================

    // ==== 1. Channel Creation and Joining ====

    function test_ChannelCreation() public {
        // 1. Prepare channel and initial state
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // 2. Sign the state by the host
        vm.deal(hostSK, 1 ether); // Ensure host has ETH for gas

        // Sign the state
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory sigs = new Signature[](1);
        sigs[0] = hostSig;
        initialState.sigs = sigs;

        // 3. Deposit tokens for the host
        vm.prank(hostSK);
        custody.deposit(address(token), DEPOSIT_AMOUNT * 2);

        // 4. Create the channel as host
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Verify the channel is created and in INITIAL state
        (uint256 available, uint256 channelCount) = custody.getAccountInfo(hostSK, address(token));
        assertEq(available, DEPOSIT_AMOUNT, "Host should have correct available balance");
        assertEq(channelCount, 1, "Host should have 1 channel");

        // Also check that the channelId is consistent
        bytes32 expectedChannelId = Utils.getChannelId(chan);
        assertEq(channelId, expectedChannelId, "Channel ID is incorrect");
    }

    function test_CompleteChannelFunding() public {
        // 1. Create channel with host
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // 2. Sign the state by the host
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // 3. Host creates channel with initial funding
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // 4. Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);

        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // Verify channel is now ACTIVE
        bytes32[] memory hostChannels = custody.getAccountChannels(hostSK);
        assertEq(hostChannels.length, 1, "Host should have 1 channel");

        bytes32[] memory guestChannels = custody.getAccountChannels(guestSK);
        assertEq(guestChannels.length, 1, "Guest should have 1 channel");

        // Check available amounts
        (uint256 hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (uint256 guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(hostAvailable, DEPOSIT_AMOUNT, "Host should have correct available balance");
        assertEq(guestAvailable, DEPOSIT_AMOUNT, "Guest should have correct available balance");
    }

    function test_InvalidChannelCreation() public {
        // Create channel with invalid participant (empty array)
        address[] memory invalidParticipants = new address[](1);
        invalidParticipants[0] = hostSK;
        Channel memory chanWithInvalidParticipants = Channel({
            participants: invalidParticipants,
            adjudicator: address(adjudicator),
            challenge: CHALLENGE_DURATION,
            nonce: NONCE
        });

        State memory initialState = createInitialStateWithSK();
        Signature memory hostSig = signState(chanWithInvalidParticipants, initialState, hostSKPrivKey);
        Signature[] memory sigs = new Signature[](1);
        sigs[0] = hostSig;
        initialState.sigs = sigs;

        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);

        vm.startPrank(hostSK);
        vm.expectRevert(Custody.InvalidParticipant.selector);
        custody.create(chanWithInvalidParticipants, initialState);
        vm.stopPrank();

        // Test with zero address as adjudicator
        address[] memory validParticipants = new address[](2);
        validParticipants[0] = hostSK;
        validParticipants[1] = guestSK;

        Channel memory chanWithZeroAdjudicator = Channel({
            participants: validParticipants,
            adjudicator: address(0),
            challenge: CHALLENGE_DURATION,
            nonce: NONCE
        });

        vm.startPrank(hostSK);
        vm.expectRevert(Custody.InvalidAdjudicator.selector);
        custody.create(chanWithZeroAdjudicator, initialState);
        vm.stopPrank();

        // Test with zero challenge period
        Channel memory chanWithZeroChallenge =
            Channel({participants: validParticipants, adjudicator: address(adjudicator), challenge: 0, nonce: NONCE});

        vm.startPrank(hostSK);
        vm.expectRevert(Custody.InvalidChallengePeriod.selector);
        custody.create(chanWithZeroChallenge, initialState);
        vm.stopPrank();
    }

    // ==== 2. Channel Closing ====

    function test_ChannelCooperativeClose() public {
        // 1. First create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Host signs initial state
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Create a final state that both participants sign
        State memory finalState = createClosingStateWithSK();
        finalState.version = 100; // Version 100 indicates a closing state

        // Both sign the final state
        hostSig = signState(chan, finalState, hostSKPrivKey);
        guestSig = signState(chan, finalState, guestSKPrivKey);

        Signature[] memory bothSigs = new Signature[](2);
        bothSigs[0] = hostSig;
        bothSigs[1] = guestSig;
        finalState.sigs = bothSigs;

        // 3. Close the channel cooperatively
        vm.prank(hostSK);
        custody.close(channelId, finalState, new State[](0));

        // 4. Verify channel is closed and funds returned
        bytes32[] memory hostChannels = custody.getAccountChannels(hostSK);
        assertEq(hostChannels.length, 0, "Host should have no channels after close");

        (uint256 hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (uint256 guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(hostAvailable, DEPOSIT_AMOUNT, "Host's available balance incorrect");
        assertEq(guestAvailable, DEPOSIT_AMOUNT, "Guest's available balance incorrect");
    }

    function test_InvalidChannelClose() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Try to close with invalid close state (missing CHANCLOSE magic number)
        State memory invalidState = initialState; // Not a closing state

        Signature[] memory bothSigs = new Signature[](2);
        bothSigs[0] = hostSig;
        bothSigs[1] = guestSig;
        invalidState.sigs = bothSigs;

        vm.startPrank(hostSK);
        vm.expectRevert(Custody.InvalidState.selector);
        custody.close(channelId, invalidState, new State[](0));
        vm.stopPrank();

        // 3. Try to close non-existent channel
        bytes32 nonExistentChannelId = bytes32(uint256(1234));
        State memory closingState = createClosingStateWithSK();
        closingState.sigs = bothSigs;

        vm.startPrank(hostSK);
        vm.expectRevert(abi.encodeWithSelector(Custody.ChannelNotFound.selector, nonExistentChannelId));
        custody.close(nonExistentChannelId, closingState, new State[](0));
        vm.stopPrank();
    }

    // ==== 3. Challenge Mechanism ====

    function test_RejectEqualVersionChallenge() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Create and submit first challenge state
        State memory challengeState = initialState;
        challengeState.intent = StateIntent.OPERATE;
        challengeState.data = abi.encode(42);
        challengeState.version = 97; // Version 97 indicates a challenge state

        // Host signs the challenge state
        Signature memory hostChallengeSig = signState(chan, challengeState, hostSKPrivKey);
        Signature[] memory challengeSigs = new Signature[](1);
        challengeSigs[0] = hostChallengeSig;
        challengeState.sigs = challengeSigs;

        // Submit first challenge
        vm.prank(hostSK);
        custody.challenge(channelId, challengeState, new State[](0));

        // 3. Create a new challenge state with the same version number
        State memory sameVersionChallenge = initialState;
        sameVersionChallenge.intent = StateIntent.OPERATE;
        sameVersionChallenge.data = abi.encode(43); // Different data but same version
        sameVersionChallenge.version = 97; // Same version as previous challenge (97)

        // Host signs the same version challenge
        Signature memory hostSameVersionSig = signState(chan, sameVersionChallenge, hostSKPrivKey);
        Signature[] memory sameVersionSigs = new Signature[](1);
        sameVersionSigs[0] = hostSameVersionSig;
        sameVersionChallenge.sigs = sameVersionSigs;

        // 4. Try to challenge with the same version - should revert
        vm.prank(hostSK);
        vm.expectRevert(Custody.InvalidState.selector);
        custody.challenge(channelId, sameVersionChallenge, new State[](0));
    }

    function test_ChannelChallenge() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Create a challenge state
        State memory challengeState = initialState;
        challengeState.intent = StateIntent.OPERATE;
        challengeState.data = abi.encode(42);
        challengeState.version = 97; // Version 97 indicates a challenge state

        // Host signs the challenge state
        Signature memory hostChallengeSig = signState(chan, challengeState, hostSKPrivKey);
        Signature[] memory challengeSigs = new Signature[](1);
        challengeSigs[0] = hostChallengeSig;
        challengeState.sigs = challengeSigs;

        // 3. Host challenges with this state
        vm.prank(hostSK);
        custody.challenge(channelId, challengeState, new State[](0));

        // 4. Create a counter-challenge state
        State memory counterChallengeState = initialState;
        counterChallengeState.intent = StateIntent.OPERATE;
        counterChallengeState.data = abi.encode(4242);
        counterChallengeState.version = 98; // Higher version than the challenge state (97)

        // Both sign the counter-challenge
        Signature memory hostCounterSig = signState(chan, counterChallengeState, hostSKPrivKey);
        Signature memory guestCounterSig = signState(chan, counterChallengeState, guestSKPrivKey);

        Signature[] memory counterChallengeSigs = new Signature[](2);
        counterChallengeSigs[0] = hostCounterSig;
        counterChallengeSigs[1] = guestCounterSig;
        counterChallengeState.sigs = counterChallengeSigs;

        // 5. Guest counter-challenges
        vm.prank(guestSK);
        custody.challenge(channelId, counterChallengeState, new State[](0));

        // 6. Skip time and close the channel
        skipChallengeTime();

        vm.prank(hostSK);
        custody.close(channelId, counterChallengeState, new State[](0));

        // 7. Verify channel is closed and funds returned
        bytes32[] memory hostChannels = custody.getAccountChannels(hostSK);
        assertEq(hostChannels.length, 0, "Host should have no channels after challenge resolution");

        (uint256 hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (uint256 guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(hostAvailable, DEPOSIT_AMOUNT * 2, "Host's available balance incorrect");
        assertEq(guestAvailable, DEPOSIT_AMOUNT * 2, "Guest's available balance incorrect");
    }

    function test_InvalidChallenge() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Try to challenge with invalid state (adjudicator rejects)
        State memory invalidState = initialState;
        invalidState.intent = StateIntent.OPERATE;
        invalidState.data = abi.encode(42);
        invalidState.version = 97; // Version 97 indicates a challenge state (but will be rejected)
        adjudicator.setFlag(false); // Set flag to false for invalid state

        // Host signs the invalid state
        Signature memory hostInvalidSig = signState(chan, invalidState, hostSKPrivKey);
        Signature[] memory invalidSigs = new Signature[](1);
        invalidSigs[0] = hostInvalidSig;
        invalidState.sigs = invalidSigs;

        // Attempt to challenge with invalid state
        vm.prank(hostSK);
        vm.expectRevert(Custody.InvalidState.selector);
        custody.challenge(channelId, invalidState, new State[](0));

        // 3. Try to challenge non-existent channel
        bytes32 nonExistentChannelId = bytes32(uint256(1234));
        adjudicator.setFlag(true); // Set flag back to true

        vm.prank(hostSK);
        vm.expectRevert(abi.encodeWithSelector(Custody.ChannelNotFound.selector, nonExistentChannelId));
        custody.challenge(nonExistentChannelId, invalidState, new State[](0));
    }

    // ==== 4. Checkpoint Mechanism ====

    function test_RejectEqualVersion() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Create a checkpoint state
        State memory checkpointState = initialState;
        checkpointState.intent = StateIntent.OPERATE;
        checkpointState.data = abi.encode(42);
        checkpointState.version = 55; // Version 55 indicates a checkpoint state

        // Both sign the checkpoint state
        Signature memory hostCheckpointSig = signState(chan, checkpointState, hostSKPrivKey);
        Signature memory guestCheckpointSig = signState(chan, checkpointState, guestSKPrivKey);

        Signature[] memory checkpointSigs = new Signature[](2);
        checkpointSigs[0] = hostCheckpointSig;
        checkpointSigs[1] = guestCheckpointSig;
        checkpointState.sigs = checkpointSigs;

        // 3. Checkpoint the state
        vm.prank(hostSK);
        custody.checkpoint(channelId, checkpointState, new State[](0));

        // 4. Create a new state with the same version number
        State memory sameVersionState = initialState;
        sameVersionState.intent = StateIntent.OPERATE;
        sameVersionState.data = abi.encode(56); // Different data but same version
        sameVersionState.version = 55; // Same version as previous checkpoint (55)

        // Both sign the new state
        Signature memory hostSameVersionSig = signState(chan, sameVersionState, hostSKPrivKey);
        Signature memory guestSameVersionSig = signState(chan, sameVersionState, guestSKPrivKey);

        Signature[] memory sameVersionSigs = new Signature[](2);
        sameVersionSigs[0] = hostSameVersionSig;
        sameVersionSigs[1] = guestSameVersionSig;
        sameVersionState.sigs = sameVersionSigs;

        // 5. Try to checkpoint with the same version - should revert
        vm.prank(hostSK);
        vm.expectRevert(Custody.InvalidState.selector);
        custody.checkpoint(channelId, sameVersionState, new State[](0));
    }

    function test_Checkpoint() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 2. Create a new state to checkpoint
        State memory checkpointState = initialState;
        checkpointState.intent = StateIntent.OPERATE;
        checkpointState.data = abi.encode(42);
        checkpointState.version = 55; // Version 55 indicates a checkpoint state

        // Both sign the checkpoint state
        Signature memory hostCheckpointSig = signState(chan, checkpointState, hostSKPrivKey);
        Signature memory guestCheckpointSig = signState(chan, checkpointState, guestSKPrivKey);

        Signature[] memory checkpointSigs = new Signature[](2);
        checkpointSigs[0] = hostCheckpointSig;
        checkpointSigs[1] = guestCheckpointSig;
        checkpointState.sigs = checkpointSigs;

        // 3. Checkpoint the state
        vm.prank(hostSK);
        custody.checkpoint(channelId, checkpointState, new State[](0));

        // 4. Start a challenge with single-signed state
        State memory challengeState = initialState;
        challengeState.intent = StateIntent.OPERATE;
        challengeState.data = abi.encode(21);
        challengeState.version = 97; // Version 97 indicates a challenge state (higher than checkpoint's 55)
        Signature memory hostChallengeSig = signState(chan, challengeState, hostSKPrivKey);
        Signature[] memory challengeSigs = new Signature[](1);
        challengeSigs[0] = hostChallengeSig;
        challengeState.sigs = challengeSigs;

        vm.prank(hostSK);
        custody.challenge(channelId, challengeState, new State[](0));

        // 5. Checkpoint should resolve the challenge with a higher version state
        State memory resolveState = initialState;
        resolveState.intent = StateIntent.OPERATE;
        resolveState.data = abi.encode(42);
        resolveState.version = 98; // Even higher version to resolve the challenge

        // Both sign the resolve state
        Signature memory hostResolveSignature = signState(chan, resolveState, hostSKPrivKey);
        Signature memory guestResolveSignature = signState(chan, resolveState, guestSKPrivKey);

        Signature[] memory resolveSignatures = new Signature[](2);
        resolveSignatures[0] = hostResolveSignature;
        resolveSignatures[1] = guestResolveSignature;
        resolveState.sigs = resolveSignatures;

        vm.prank(guestSK);
        custody.checkpoint(channelId, resolveState, new State[](0));

        // Close with checkpointed state
        skipChallengeTime();

        // Try to close normally - should succeed because challenge timer expired
        State memory closeState = createClosingStateWithSK();
        closeState.version = 100; // Version 100 indicates a closing state
        // Add signatures
        Signature memory hostCloseSig = signState(chan, closeState, hostSKPrivKey);
        Signature memory guestCloseSig = signState(chan, closeState, guestSKPrivKey);
        Signature[] memory closeSigs = new Signature[](2);
        closeSigs[0] = hostCloseSig;
        closeSigs[1] = guestCloseSig;
        closeState.sigs = closeSigs;

        vm.prank(hostSK);
        custody.close(channelId, closeState, new State[](0));
    }

    // ==== 5. Fund Management ====

    function test_DepositAndWithdraw() public {
        // 1. Test deposit
        vm.startPrank(hostSK);
        custody.deposit(address(token), DEPOSIT_AMOUNT);

        (uint256 available,) = custody.getAccountInfo(hostSK, address(token));
        assertEq(available, DEPOSIT_AMOUNT, "Deposit not recorded correctly");

        // 2. Test withdrawal
        custody.withdraw(address(token), DEPOSIT_AMOUNT / 2);

        (available,) = custody.getAccountInfo(hostSK, address(token));
        assertEq(available, DEPOSIT_AMOUNT / 2, "Withdrawal not processed correctly");

        // 3. Test insufficient balance for withdrawal
        vm.expectRevert(
            abi.encodeWithSelector(Custody.InsufficientBalance.selector, DEPOSIT_AMOUNT / 2, DEPOSIT_AMOUNT)
        );
        custody.withdraw(address(token), DEPOSIT_AMOUNT);

        vm.stopPrank();
    }

    // ==== 6. Resize Function ====

    function test_Resize() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK();
        State memory initialState = createInitialStateWithSK();

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host
        depositTokens(hostSK, DEPOSIT_AMOUNT * 2);
        vm.prank(hostSK);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestSK, DEPOSIT_AMOUNT * 2);
        vm.prank(guestSK);
        custody.join(channelId, 1, guestSig);

        // 1.1 Check available and locked are correct
        (uint256 hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (uint256 guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(hostAvailable, DEPOSIT_AMOUNT, "Host's initial available tokens should be DEPOSIT_AMOUNT");
        assertEq(guestAvailable, DEPOSIT_AMOUNT, "Guest's initial available tokens should be DEPOSIT_AMOUNT");

        // 1.2 Create a state before resize (preceding state)
        State memory precedingState = State({
            intent: StateIntent.OPERATE,
            version: 41, // Version 41 indicates state before resize
            data: abi.encode(41), // Simple application data
            allocations: initialState.allocations,
            sigs: new Signature[](0) // Empty initially
        });

        // If adjudicator allows, then only one can sign the preceding state
        Signature memory hostPrecedingSig = signState(chan, precedingState, hostSKPrivKey);

        Signature[] memory precedingSigs = new Signature[](1);
        precedingSigs[0] = hostPrecedingSig;
        precedingState.sigs = precedingSigs;

        // 2. Create a resize state with RESIZE intent
        // Create resize data with resize amounts
        int256[] memory resizeAmounts = new int256[](2);
        int256 resizeHostDelta = int256(DEPOSIT_AMOUNT / 2); // add DEPOSIT_AMOUNT / 2 to host's deposit
        int256 resizeGuestDelta = -int256(DEPOSIT_AMOUNT / 2); // withdraw DEPOSIT_AMOUNT / 2 from guest's deposit
        resizeAmounts[0] = resizeHostDelta; // Increase host's deposit by corresponding amount
        resizeAmounts[1] = resizeGuestDelta; // Decrease guest's deposit by corresponding amount

        State memory resizedState = State({
            intent: StateIntent.RESIZE,
            version: 42, // Version 42 indicates a resize state
            data: abi.encode(resizeAmounts),
            allocations: new Allocation[](2),
            sigs: new Signature[](0) // Empty initially
        });

        uint256 resizedHostLockedBalance = uint256(int256(DEPOSIT_AMOUNT) + resizeHostDelta);
        uint256 resizedGuestLockedBalance = uint256(int256(DEPOSIT_AMOUNT) + resizeGuestDelta);

        // Update allocations to match the resize
        resizedState.allocations[0].amount = resizedHostLockedBalance; // Host now has updated amount
        resizedState.allocations[1].amount = resizedGuestLockedBalance; // Guest now has updated amount

        // Both sign the resized state
        Signature memory hostResizeSig = signState(chan, resizedState, hostSKPrivKey);
        Signature memory guestResizeSig = signState(chan, resizedState, guestSKPrivKey);

        Signature[] memory resizeSigs = new Signature[](2);
        resizeSigs[0] = hostResizeSig;
        resizeSigs[1] = guestResizeSig;
        resizedState.sigs = resizeSigs;

        // Define empty preceding proof
        State[] memory proof = new State[](1);
        proof[0] = precedingState;

        // 3. Resize the channel with the new interface
        vm.prank(hostSK);
        custody.resize(channelId, resizedState, proof);

        // 4. Verify channel has been resized correctly
        bytes32[] memory hostChannels = custody.getAccountChannels(hostSK);
        assertEq(hostChannels.length, 1, "Host should still have 1 channel after resize");

        // Check locked amounts have been updated correctly
        (hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(
            hostAvailable, DEPOSIT_AMOUNT * 2 - resizedHostLockedBalance, "Host's available tokens should decrease"
        );
        assertEq(
            guestAvailable, DEPOSIT_AMOUNT * 2 - resizedGuestLockedBalance, "Guest's available tokens should increase"
        );

        // 4.1 Create a state after resize
        State memory afterResizeState = initialState;
        afterResizeState.intent = StateIntent.OPERATE;
        afterResizeState.data = abi.encode(43); // Simple application data
        afterResizeState.version = 43; // Version 43 indicates state after resize

        // Update allocations to match the resize results
        afterResizeState.allocations[0].amount = resizedHostLockedBalance;
        afterResizeState.allocations[1].amount = resizedGuestLockedBalance;

        // Both sign the state after resize
        Signature memory hostAfterSig = signState(chan, afterResizeState, hostSKPrivKey);
        Signature memory guestAfterSig = signState(chan, afterResizeState, guestSKPrivKey);

        Signature[] memory afterSigs = new Signature[](2);
        afterSigs[0] = hostAfterSig;
        afterSigs[1] = guestAfterSig;
        afterResizeState.sigs = afterSigs;

        // Checkpoint the state after resize
        vm.prank(hostSK);
        custody.checkpoint(channelId, afterResizeState, new State[](0));

        // 5. Check available and locked balances after resize
        (hostAvailable,) = custody.getAccountInfo(hostSK, address(token));
        (guestAvailable,) = custody.getAccountInfo(guestSK, address(token));

        assertEq(
            hostAvailable,
            DEPOSIT_AMOUNT * 2 - resizedHostLockedBalance,
            "Host's available balance should be correctly updated"
        );

        assertEq(
            guestAvailable,
            DEPOSIT_AMOUNT * 2 - resizedGuestLockedBalance,
            "Guest's available balance should be correctly updated"
        );

        uint256 absResizeGuestDelta = uint256(resizeGuestDelta > 0 ? resizeGuestDelta : -resizeGuestDelta);

        // Verify guest can withdraw some of the unlocked tokens
        vm.prank(guestSK);
        custody.withdraw(address(token), absResizeGuestDelta);

        // Check balances after withdrawal
        (guestAvailable,) = custody.getAccountInfo(guestSK, address(token));
        assertEq(
            guestAvailable,
            DEPOSIT_AMOUNT * 2 - resizedGuestLockedBalance - absResizeGuestDelta,
            "Guest should have correct available balance after withdrawal"
        );

        // Check actual token balance
        uint256 guestBalance = token.balanceOf(guestSK);
        assertEq(
            guestBalance,
            INITIAL_BALANCE - DEPOSIT_AMOUNT * 2 + absResizeGuestDelta,
            "Guest should have correct token balance after deposits and withdrawal"
        );
    }

    // ==== 7. Implicit Transfer in Resize ====

    /**
     * @notice Test case for basic implicit transfer functionality
     * In this test, the host tops up their funds while the guest withdraws their initial deposit
     */
    function test_ImplicitTransfer() public {
        // 1. Create and fund a channel
        Channel memory chan = createTestChannelWithSK(); // session keys are participants
        State memory initialState = createInitialStateWithWallets(); // wallets are depositors and destinations in allocations

        // Set up signatures
        Signature memory hostSig = signState(chan, initialState, hostSKPrivKey);
        Signature[] memory hostSigs = new Signature[](1);
        hostSigs[0] = hostSig;
        initialState.sigs = hostSigs;

        // Create channel with host, giving extra deposit for future top-up
        depositTokens(hostWallet, DEPOSIT_AMOUNT * 2);
        vm.prank(hostWallet);
        bytes32 channelId = custody.create(chan, initialState);

        // Guest joins the channel
        Signature memory guestSig = signState(chan, initialState, guestSKPrivKey);
        depositTokens(guestWallet, DEPOSIT_AMOUNT * 2);
        vm.prank(guestWallet);
        custody.join(channelId, 1, guestSig);

        // 2. Create a state before resize (preceding state)
        State memory precedingState = State({
            intent: StateIntent.OPERATE,
            version: 41, // Version 41 indicates state before resize
            data: abi.encode(41), // Simple application data
            allocations: initialState.allocations,
            sigs: new Signature[](0) // Empty initially
        });

        // Host signs the preceding state
        Signature memory hostPrecedingSig = signState(chan, precedingState, hostSKPrivKey);
        Signature[] memory precedingSigs = new Signature[](1);
        precedingSigs[0] = hostPrecedingSig;
        precedingState.sigs = precedingSigs;

        // 3. Create a resize state with implicit transfer
        // To ensure the equation (initial_sum + delta_sum = final_sum) is balanced:
        // Initial: [D, D] - Sum: 2*D
        // Delta: [D, -2*D] - Sum: -D
        // Final: [D, 0] - Sum: D
        // Available after resize: [0, 3*D]

        int256[] memory resizeAmounts = new int256[](2);
        resizeAmounts[0] = int256(DEPOSIT_AMOUNT); // Host tops up with DEPOSIT_AMOUNT
        resizeAmounts[1] = -int256(2 * DEPOSIT_AMOUNT); // Guest withdraws their 2 * DEPOSIT_AMOUNT

        // Create resize state with new allocations
        State memory resizedState = State({
            intent: StateIntent.RESIZE,
            version: 42, // Version 42 indicates a resize state
            data: abi.encode(resizeAmounts),
            allocations: new Allocation[](2),
            sigs: new Signature[](0) // Empty initially
        });

        // Calculate new allocation amounts
        uint256 newHostAmount = DEPOSIT_AMOUNT; // Original
        uint256 newGuestAmount = 0; // Zero after withdrawal

        // Set allocations to match the resize - both must have the SAME token
        resizedState.allocations[0] =
            Allocation({destination: hostWallet, token: address(token), amount: newHostAmount});

        resizedState.allocations[1] = Allocation({
            destination: guestWallet,
            token: address(token), // Must be the same token as in allocation[0]
            amount: newGuestAmount
        });

        // Both sign the resized state
        Signature memory hostResizeSig = signState(chan, resizedState, hostSKPrivKey);
        Signature memory guestResizeSig = signState(chan, resizedState, guestSKPrivKey);

        Signature[] memory resizeSigs = new Signature[](2);
        resizeSigs[0] = hostResizeSig;
        resizeSigs[1] = guestResizeSig;
        resizedState.sigs = resizeSigs;

        // 4. Resize the channel with implicit transfer
        State[] memory proof = new State[](1);
        proof[0] = precedingState;

        vm.prank(hostSK);
        custody.resize(channelId, resizedState, proof);

        // 5. Verify channel has been resized correctly with implicit transfer
        // Check locked amounts have been updated correctly
        (uint256 hostAvailableAfterResize,) = custody.getAccountInfo(hostWallet, address(token));
        (uint256 guestAvailableAfterResize,) = custody.getAccountInfo(guestWallet, address(token));

        assertEq(hostAvailableAfterResize, 0, "Host's available tokens should be updated to new amount");
        // Guest should have received the withdrawn amount
        assertEq(guestAvailableAfterResize, 3 * DEPOSIT_AMOUNT, "Guest should have their 3 * deposit available");
    }

    // ==== 8. Separate Depositor and Participant Addresses ====

    function test_SeparateDepositorAndParticipant() public {
        // 1. Prepare channel with different participant addresses
        Channel memory chan = createTestChannelWithWallets();
        State memory initialState = createInitialStateWithWallets();
        // NOTE: depositor is specified instead of host in allocations
        initialState.allocations[0].destination = depositor;

        // 2. Sign the state by the host participant (not the depositor/creator)
        Signature memory hostPartSig = signState(chan, initialState, hostWalletPrivKey);
        Signature[] memory sigs = new Signature[](1);
        sigs[0] = hostPartSig;
        initialState.sigs = sigs;

        // 3. Depositor deposits tokens into the participant accounts first
        vm.startPrank(depositor);
        custody.deposit(address(token), DEPOSIT_AMOUNT);
        vm.stopPrank();

        // 4. Create the channel as host participant
        vm.prank(depositor);
        bytes32 channelId = custody.create(chan, initialState);

        // 5. Verify the channel is created
        (uint256 available, uint256 channelCount) = custody.getAccountInfo(depositor, address(token));
        assertEq(available, 0, "Depositor should have no available balance after locking");
        assertEq(channelCount, 0, "Depositor should have 0 channels");

        bytes32[] memory hostChannels = custody.getAccountChannels(hostWallet);
        assertEq(hostChannels.length, 1, "Host should have 1 channel");

        // 6. Guest participant joins the channel
        vm.startPrank(guestWallet);
        token.mint(guestWallet, INITIAL_BALANCE);
        token.approve(address(custody), INITIAL_BALANCE);
        custody.deposit(address(token), DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Sign the state by guest participant
        Signature memory guestPartSig = signState(chan, initialState, guestWalletPrivKey);

        // Guest participant joins with their own signature
        vm.prank(guestWallet);
        custody.join(channelId, 1, guestPartSig);

        // 7. Verify channel is ACTIVE
        bytes32[] memory depositorChannels = custody.getAccountChannels(depositor);
        assertEq(depositorChannels.length, 0, "Depositor should have 0 channels");

        hostChannels = custody.getAccountChannels(hostWallet);
        assertEq(hostChannels.length, 1, "Host should have 1 channel");

        bytes32[] memory guestChannels = custody.getAccountChannels(guestWallet);
        assertEq(guestChannels.length, 1, "Guest participant should have 1 channel");

        // 8. Create a checkpoint state
        State memory checkpointState = initialState;
        checkpointState.intent = StateIntent.OPERATE;
        checkpointState.data = abi.encode(42);
        checkpointState.version = 55; // Version 55 indicates a checkpoint state

        // Both participants sign the checkpoint state
        Signature memory hostPartCheckpointSig = signState(chan, checkpointState, hostWalletPrivKey);
        Signature memory guestPartCheckpointSig = signState(chan, checkpointState, guestWalletPrivKey);

        Signature[] memory checkpointSigs = new Signature[](2);
        checkpointSigs[0] = hostPartCheckpointSig;
        checkpointSigs[1] = guestPartCheckpointSig;
        checkpointState.sigs = checkpointSigs;

        // 9. Checkpoint the state by the host participant
        vm.prank(depositor);
        custody.checkpoint(channelId, checkpointState, new State[](0));

        // 10. Create a closing state
        State memory finalState = createClosingStateWithWallets();
        finalState.version = 100; // Version 100 indicates a closing state
        finalState.allocations[0].destination = depositor;

        // Both participants sign the final state
        Signature memory hostPartFinalSig = signState(chan, finalState, hostWalletPrivKey);
        Signature memory guestPartFinalSig = signState(chan, finalState, guestWalletPrivKey);

        Signature[] memory finalSigs = new Signature[](2);
        finalSigs[0] = hostPartFinalSig;
        finalSigs[1] = guestPartFinalSig;
        finalState.sigs = finalSigs;

        // 11. Close the channel cooperatively
        vm.prank(depositor);
        custody.close(channelId, finalState, new State[](0));

        // 12. Verify funds are returned correctly
        bytes32[] memory depositorChannelsAfter = custody.getAccountChannels(depositor);
        assertEq(depositorChannelsAfter.length, 0, "Depositor should have no channels after close");

        bytes32[] memory guestChannelsAfter = custody.getAccountChannels(guestWallet);
        assertEq(guestChannelsAfter.length, 0, "Guest participant should have no channels after close");

        (uint256 depositorAvailable,) = custody.getAccountInfo(depositor, address(token));
        (uint256 guestAvailable,) = custody.getAccountInfo(guestWallet, address(token));

        // In this flow, the funds go back to participants (who are also depositors)
        assertEq(depositorAvailable, DEPOSIT_AMOUNT, "Depositor available balance incorrect");
        assertEq(guestAvailable, DEPOSIT_AMOUNT, "Guest available balance incorrect");
    }
}
