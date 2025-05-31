import { Account, SimulateContractReturnType, WalletClient, Chain, Transport, ParseAccount, zeroAddress } from "viem";
import { NitroliteService, Erc20Service } from "./services";
import { CreateChannelParams, CheckpointChannelParams, ChallengeChannelParams, CloseChannelParams, ResizeChannelParams } from "./types";
import { ContractAddresses } from "../abis";
import * as Errors from "../errors";
import { _prepareAndSignInitialState, _prepareAndSignFinalState, _prepareAndSignResizeState } from "./state";

/**
 * Represents the data needed to construct a transaction or UserOperation call.
 * Derived from viem's SimulateContractReturnType['request'].
 */
export type PreparedTransaction = SimulateContractReturnType["request"];

/**
 * @dev Note: `stateWalletClient.signMessage` function should NOT add an EIP-191 prefix to the message signed as
 * the contract expects the raw message to be signed.
 */
export interface PreparerDependencies {
    nitroliteService: NitroliteService;
    erc20Service: Erc20Service;
    addresses: ContractAddresses;
    account: ParseAccount<Account>;
    walletClient: WalletClient<Transport, Chain, ParseAccount<Account>>;
    stateWalletClient: WalletClient<Transport, Chain, ParseAccount<Account>>;
    challengeDuration: bigint;
    chainId: number;
}

/**
 * Handles the preparation of transaction data for various Nitrolite operations,
 * suitable for use with Account Abstraction (UserOperations) or manual transaction sending.
 * It simulates transactions but does not execute them.
 */
export class NitroliteTransactionPreparer {
    private readonly deps: PreparerDependencies;

    /**
     * Creates an instance of NitroliteTransactionPreparer.
     * @param dependencies - The services and configuration needed for preparation. See {@link PreparerDependencies}.
     */
    constructor(dependencies: PreparerDependencies) {
        this.deps = dependencies;
    }

    /**
     * Prepares the transactions data necessary for a deposit operation,
     * including ERC20 approval if required.
     * @param amount The amount of tokens/ETH to deposit.
     * @returns An array of PreparedTransaction objects (approve + deposit, or just deposit).
     */
    async prepareDepositTransactions(amount: bigint): Promise<PreparedTransaction[]> {
        const transactions: PreparedTransaction[] = [];
        const tokenAddress = this.deps.addresses.tokenAddress;
        const spender = this.deps.addresses.custody;
        const owner = this.deps.account.address;

        if (tokenAddress !== zeroAddress) {
            const allowance = await this.deps.erc20Service.getTokenAllowance(tokenAddress, owner, spender);
            if (allowance < amount) {
                try {
                    const approveTx = await this.deps.erc20Service.prepareApprove(tokenAddress, spender, amount);
                    transactions.push(approveTx);
                } catch (err) {
                    throw new Errors.ContractCallError("prepareApprove (for deposit)", err as Error, { tokenAddress, spender, amount });
                }
            }
        }

        try {
            const depositTx = await this.deps.nitroliteService.prepareDeposit(tokenAddress, amount);
            transactions.push(depositTx);
        } catch (err) {
            throw new Errors.ContractCallError("prepareDeposit", err as Error, { tokenAddress, amount });
        }

        return transactions;
    }

    /**
     * Prepares the transaction data for creating a new state channel.
     * Handles internal state construction and signing.
     * @param params Parameters for channel creation. See {@link CreateChannelParams}.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareCreateChannelTransaction(params: CreateChannelParams): Promise<PreparedTransaction> {
        try {
            const { channel, initialState } = await _prepareAndSignInitialState(this.deps, params);

            return await this.deps.nitroliteService.prepareCreateChannel(channel, initialState);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareCreateChannelTransaction", err as Error, { params });
        }
    }

    /**
     * Prepares the transaction data for depositing funds and creating a channel in a single operation.
     * Includes potential ERC20 approval. Designed for batching.
     * @param depositAmount The amount to deposit.
     * @param params Parameters for channel creation. See {@link CreateChannelParams}.
     * @returns An array of PreparedTransaction objects (approve?, deposit, createChannel).
     */
    async prepareDepositAndCreateChannelTransactions(depositAmount: bigint, params: CreateChannelParams): Promise<PreparedTransaction[]> {
        let allTransactions: PreparedTransaction[] = [];
        try {
            const depositTxs = await this.prepareDepositTransactions(depositAmount);
            allTransactions = allTransactions.concat(depositTxs);
        } catch (err) {
            throw new Errors.ContractCallError("Failed to prepare deposit part of depositAndCreateChannel", err as Error, { depositAmount });
        }
        try {
            const createChannelTx = await this.prepareCreateChannelTransaction(params);
            allTransactions.push(createChannelTx);
        } catch (err) {
            throw new Errors.ContractCallError("Failed to prepare createChannel part of depositAndCreateChannel", err as Error, { depositAmount });
        }
        return allTransactions;
    }

    /**
     * Prepares the transaction data for checkpointing a state on-chain.
     * Requires the state to be signed by both participants.
     * @param params Parameters for checkpointing the state. See {@link CheckpointChannelParams}.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareCheckpointChannelTransaction(params: CheckpointChannelParams): Promise<PreparedTransaction> {
        const { channelId, candidateState, proofStates = [] } = params;

        if (!candidateState.sigs || candidateState.sigs.length < 2) {
            throw new Errors.InvalidParameterError("Candidate state for checkpoint must be signed by both participants.");
        }

        try {
            return await this.deps.nitroliteService.prepareCheckpoint(channelId, candidateState, proofStates);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareCheckpointChannelTransaction", err as Error, { params });
        }
    }

    /**
     * Prepares the transaction data for challenging a channel on-chain.
     * @param params Parameters for challenging the channel. See {@link ChallengeChannelParams}.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareChallengeChannelTransaction(params: ChallengeChannelParams): Promise<PreparedTransaction> {
        const { channelId, candidateState, proofStates = [] } = params;

        try {
            return await this.deps.nitroliteService.prepareChallenge(channelId, candidateState, proofStates);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareChallengeChannelTransaction", err as Error, { params });
        }
    }

    /**
     * Prepares the transaction data for resize a channel on-chain.
     * @param params Parameters for resizing the channel. See {@link ResizeChannelParams}.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareResizeChannelTransaction(params: ResizeChannelParams): Promise<PreparedTransaction> {
        const { resizeStateWithSigs, channelId } = await _prepareAndSignResizeState(this.deps, params);

        try {
            return await this.deps.nitroliteService.prepareResize(channelId, resizeStateWithSigs);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareResizeChannelTransaction", err as Error, { params });
        }
    }

    /**
     * Prepares the transaction data for closing a channel collaboratively.
     * Handles internal state construction and signing.
     * @param params Parameters for closing the channel. See {@link CloseChannelParams}.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareCloseChannelTransaction(params: CloseChannelParams): Promise<PreparedTransaction> {
        try {
            const { finalStateWithSigs, channelId } = await _prepareAndSignFinalState(this.deps, params);

            return await this.deps.nitroliteService.prepareClose(channelId, finalStateWithSigs);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareCloseChannelTransaction", err as Error, { params });
        }
    }

    /**
     * Prepares the transaction data for withdrawing deposited funds from the custody contract.
     * This does not withdraw funds locked in active channels.
     * @param amount The amount of tokens/ETH to withdraw.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareWithdrawalTransaction(amount: bigint): Promise<PreparedTransaction> {
        const tokenAddress = this.deps.addresses.tokenAddress;

        try {
            return await this.deps.nitroliteService.prepareWithdraw(tokenAddress, amount);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareWithdrawalTransaction", err as Error, { amount, tokenAddress });
        }
    }

    /**
     * Prepares the transaction data for approving the custody contract to spend ERC20 tokens.
     * @param amount The amount to approve.
     * @returns The prepared transaction data ({ to, data, value }).
     */
    async prepareApproveTokensTransaction(amount: bigint): Promise<PreparedTransaction> {
        const tokenAddress = this.deps.addresses.tokenAddress;
        const spender = this.deps.addresses.custody;

        if (tokenAddress === zeroAddress) {
            throw new Errors.InvalidParameterError("Cannot prepare approval for ETH (zero address)");
        }
        try {
            return await this.deps.erc20Service.prepareApprove(tokenAddress, spender, amount);
        } catch (err) {
            if (err instanceof Errors.NitroliteError) throw err;
            throw new Errors.ContractCallError("prepareApproveTokensTransaction", err as Error, { amount, tokenAddress, spender });
        }
    }
}
