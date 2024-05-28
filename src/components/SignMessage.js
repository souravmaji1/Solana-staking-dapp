import { verify } from '@noble/ed25519';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback } from 'react';
import { notify } from "../utils/notifications";
import idl from './idl.json';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { Program, Provider, web3, BN, AnchorProvider } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

const programId = new PublicKey('7MHr6ZPGTWZkRk6m52GfEWoMxSV7EoDjYyoXAYf3MBwS');
const stakingTokenMint = new PublicKey('5UTwdzNpwziFhPMi1GeCPXxGRUsd83iN2yFV65YKCTVp'); // Replace with your token's mint address

const connection = new Connection('https://api.devnet.solana.com');

export const SignMessage = () => {
  const { publicKey, signTransaction, sendTransaction, wallet } = useWallet();

  const provider = new AnchorProvider(connection, wallet, { preflightCommitment: 'recent' });
  const program = new Program(idl, programId, provider);

  const stakeTokens = useCallback(async (amount) => {
    try {
      const amountToStake = new BN(amount * 10 ** 9); // Convert to lamports

      let poolInfo;
      try {
        poolInfo = await program.account.poolInfo.fetch();
      } catch (error) {
        // PoolInfo account does not exist, initialize it
        const [poolInfoPda, _] = await PublicKey.findProgramAddress(
          [Buffer.from('pool_info')],
          program.programId
        );

        const adminStakingWallet = await Token.getAssociatedAccountInfo(
          connection,
          provider.wallet.publicKey,
          stakingTokenMint,
          false
        );

        await program.methods
          .initialize(new BN(0), new BN(0)) // Example start and end slot values
          .accounts({
            admin: provider.wallet.publicKey,
            poolInfo: poolInfoPda,
            stakingToken: stakingTokenMint,
            adminStakingWallet: adminStakingWallet.address,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        poolInfo = await program.account.poolInfo.fetch(poolInfoPda);
      }

      const adminPubkey = poolInfo.admin;

      const adminStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        adminPubkey,
        stakingTokenMint,
        false
      );

      const userStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        provider.wallet.publicKey,
        stakingTokenMint,
        false
      );

      const userInfo = await program.account.userInfo.associated(provider.wallet.publicKey);

      const stakeTx = await program.methods
        .stake(amountToStake)
        .accounts({
          user: provider.wallet.publicKey,
          admin: adminPubkey,
          userInfo: userInfo.publicKey,
          userStakingWallet: userStakingWallet.address,
          adminStakingWallet: adminStakingWallet.address,
          stakingToken: stakingTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const tx = new Transaction().add(stakeTx);
      const signature = await provider.send(tx);
      await connection.confirmTransaction(signature);
      notify({ message: `Staked ${amount} tokens. Tx: ${signature}`, type: 'success' });
    } catch (error) {
      notify({ message: `Error staking tokens: ${error}`, type: 'error' });
    }
  }, [program, provider]);

  const unstakeTokens = useCallback(async () => {
    try {
      const userInfo = await program.account.userInfo.associated(provider.wallet.publicKey);
      const poolInfo = await program.account.poolInfo.fetch();
      const adminPubkey = poolInfo.admin;

      const adminStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        adminPubkey,
        stakingTokenMint,
        false
      );

      const userStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        provider.wallet.publicKey,
        stakingTokenMint,
        false
      );

      const unstakeTx = await program.methods
        .unstake()
        .accounts({
          user: provider.wallet.publicKey,
          admin: adminPubkey,
          userInfo: userInfo.publicKey,
          userStakingWallet: userStakingWallet.address,
          adminStakingWallet: adminStakingWallet.address,
          stakingToken: stakingTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const tx = new Transaction().add(unstakeTx);
      const signature = await provider.send(tx);
      await connection.confirmTransaction(signature);
      notify({ message: `Unstaked tokens. Tx: ${signature}`, type: 'success' });
    } catch (error) {
      notify({ message: `Error unstaking tokens: ${error}`, type: 'error' });
    }
  }, [program, provider]);

  const claimReward = useCallback(async () => {
    try {
      const userInfo = await program.account.userInfo.associated(provider.wallet.publicKey);
      const poolInfo = await program.account.poolInfo.fetch();
      const adminPubkey = poolInfo.admin;

      const adminStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        adminPubkey,
        stakingTokenMint,
        false
      );

      const userStakingWallet = await Token.getAssociatedAccountInfo(
        connection,
        provider.wallet.publicKey,
        stakingTokenMint,
        false
      );

      const claimRewardTx = await program.methods
        .claimReward()
        .accounts({
          user: provider.wallet.publicKey,
          admin: adminPubkey,
          userInfo: userInfo.publicKey,
          userStakingWallet: userStakingWallet.address,
          adminStakingWallet: adminStakingWallet.address,
          stakingToken: stakingTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const tx = new Transaction().add(claimRewardTx);
      const signature = await provider.send(tx);
      await connection.confirmTransaction(signature);
      notify({ message: `Claimed reward. Tx: ${signature}`, type: 'success' });
    } catch (error) {
      notify({ message: `Error claiming reward: ${error}`, type: 'error' });
    }
  }, [program, provider]);

  const onClick = useCallback(async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      return;
    }

    try {
      // Call the desired function with the appropriate arguments
      await stakeTokens(10); // Example: Stake 10 tokens
      // await unstakeTokens(); // Uncomment this line to unstake tokens
      // await claimReward(); // Uncomment this line to claim reward
    } catch (error) {
      notify({ message: `Error: ${error}`, type: 'error' });
    }

   

  }, [publicKey, signTransaction, sendTransaction, stakeTokens]);


  const handleUnstake = useCallback(async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      return;
    }

    try {
      await unstakeTokens();
    } catch (error) {
      notify({ message: `Error: ${error}`, type: 'error' });
    }
  }, [publicKey, signTransaction, sendTransaction, unstakeTokens]);


  const handleClaimReward = useCallback(async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      return;
    }

    try {
      await claimReward();
    } catch (error) {
      notify({ message: `Error: ${error}`, type: 'error' });
    }
  }, [publicKey, signTransaction, sendTransaction, claimReward]);



  return (
    <div className="flex flex-row justify-center">
      <div className="relative group items-center">
        <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
        <button
          className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
          onClick={onClick}
          disabled={!publicKey || !signTransaction || !sendTransaction}
        >
          <div className="hidden group-disabled:block">
            Wallet not connected or does not support signing transactions
          </div>
          <span className="block group-disabled:hidden">Stake</span>
        </button>

        <button
          className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
          onClick={handleUnstake}
          disabled={!publicKey || !signTransaction || !sendTransaction}
        >
          <div className="hidden group-disabled:block">
            Wallet not connected or does not support signing transactions
          </div>
          <span className="block group-disabled:hidden">Unstake</span>
        </button>

        <button
          className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
          onClick={handleClaimReward}
          disabled={!publicKey || !signTransaction || !sendTransaction}
        >
          <div className="hidden group-disabled:block">
            Wallet not connected or does not support signing transactions
          </div>
          <span className="block group-disabled:hidden">Claim Reward</span>
        </button>
      </div>
    </div>
  );
};