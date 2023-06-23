import { 
  useState, 
  useEffect, 
} from 'react';

import ReactPaginate from 'react-paginate';  

import useNotify from './notify'
import { 
  useWallet, 
} from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { programs } from '@metaplex/js'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  ConfirmOptions,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import axios from "axios"

import {
  TOKEN_METADATA_PROGRAM_ID,
  conn,
  // solanaNetwork,
  programId,
  POOL,
  REWARD_TOKEN,
  totalNFTs,
  collections,
} from './address.js';

import {WalletConnect} from '../wallet';
import { getAssociateTokenAddress } from './mint';

let wallet : any
let notify : any
const { metadata: { Metadata } } = programs

// const COLLECTION_NAME = "UBIK"

const STAKEDATA_SIZE = 8 + 1 + 32 + 32 + 32 +8 + 1;
const TOKENDATA_SIZE = 8 + 32 + 32 + 8 + 8 + 8 + 1;

const idl = require('./solana_anchor.json')
const confirmOption : ConfirmOptions = {
    commitment : 'finalized',
    preflightCommitment : 'finalized',
    skipPreflight : false
}

const stakePageStyle = {
  color: "rgb(235, 43, 99)",
}

const footerStyle = {
  textDecoration: "none",
  paddingTop: "0.8rem",
  paddingBottom: "0.8rem",
  fontSize: "0.65rem",
  lineHeight: "1rem",
}

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey
    ) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

const getMetadata = async (
  mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getTokenWallet = async (
  wallet: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
    ) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
};

async function sendTransaction(transaction : Transaction,signers : Keypair[]) {
  try {
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
    await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
    if(signers.length !== 0)
      await transaction.partialSign(...signers)
    const signedTransaction  = await wallet.signTransaction(transaction);
    let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
    await conn.confirmTransaction(hash);

    notify('success', 'Success!');
    return 1;
  } catch(err) {
    console.log(err)
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

// async function initPool(
//   rewardMint : PublicKey,
//   ){
//   console.log("+ initPool")
//   let provider = new anchor.Provider(conn, wallet as any, confirmOption)
//   let program = new anchor.Program(idl,programId,provider)
//   let randomPubkey = Keypair.generate().publicKey
//   let [pool,bump] = await PublicKey.findProgramAddress([randomPubkey.toBuffer()],programId)
//   let rewardAccount = await getTokenWallet(pool,rewardMint)
//   let transaction = new Transaction()
//   let signers : Keypair[] = []
//   transaction.add(createAssociatedTokenAccountInstruction(rewardAccount,wallet.publicKey,pool,rewardMint))
//   transaction.add(
//     await program.instruction.initPool(
//       new anchor.BN(bump),
//       {
//         accounts:{
//           owner : wallet.publicKey,
//           pool : pool,
//           rand : randomPubkey,
//           rewardMint : rewardMint,
//           rewardAccount : rewardAccount,
//           systemProgram : anchor.web3.SystemProgram.programId,
//         }
//       }
//     )
//   )
//   await sendTransaction(transaction,[])
//   console.log("Pool Address",pool.toBase58());
//   return pool
// }

async function stake(
	nftMint : PublicKey,
  // collection : any,
	){
	console.log("+ stake")
  try {
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    const stakeData = Keypair.generate()
    const metadata = await getMetadata(nftMint)
    const sourceNftAccount = await getTokenWallet(wallet.publicKey,nftMint)
    const destNftAccount = await getTokenWallet(POOL,nftMint)
    // console.log(sourceNftAccount.toBase58())
    // console.log(destNftAccount.toBase58())
    let transaction = new Transaction()
    let signers : Keypair[] = []
    signers.push(stakeData)

    if((await conn.getAccountInfo(destNftAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destNftAccount,wallet.publicKey,POOL,nftMint))
    transaction.add(
      await program.instruction.stake(
        // new anchor.BN(collection),
        {
        accounts: {
          owner : wallet.publicKey,
          pool : POOL,
          stakeData : stakeData.publicKey,
          nftMint : nftMint,
          metadata : metadata,
          sourceNftAccount : sourceNftAccount,
          destNftAccount : destNftAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )
    const res = await sendTransaction(transaction,signers);
    return res;
  } catch(err) {
    console.log(err);
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

async function unstake(
  unstakeNft : any
  ){
  console.log("+ unstake")
  try {
    const stakeData = unstakeNft.stakeData;
    console.log(unstakeNft);
  
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl, programId, provider)
    let stakedNft = await program.account.stakeData.fetch(stakeData)
    let account = await conn.getAccountInfo(stakedNft.account)
    let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
    const destNftAccount = await getTokenWallet(wallet.publicKey, mint)

    let transaction = new Transaction()

    let destRewardAccount = await getTokenWallet(wallet.publicKey,pD.rewardMint)
    if((await conn.getAccountInfo(destRewardAccount)) == null) {
      transaction.add(createAssociatedTokenAccountInstruction(destRewardAccount,wallet.publicKey,wallet.publicKey,pD.rewardMint))
    }

    if(!destNftAccount) {
      transaction.add(
        createAssociatedTokenAccountInstruction(destNftAccount, wallet.publicKey, wallet.publicKey, mint)
      )
    }

    transaction.add(
      await program.instruction.unstake(
        new anchor.BN(unstakeNft.claim),
        {
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          stakeData : stakeData,
          sourceNftAccount : stakedNft.account,
          destNftAccount : destNftAccount,
          sourceRewardAccount : pD.rewardAccount,
          destRewardAccount : destRewardAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )
    const res = await sendTransaction(transaction,[]);
    return res;
  } catch (err){
    console.log(err)
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

async function claim( NftsToClaim : any[] ) {
  console.log("+ claim")
  try {
    if(wallet.publicKey === undefined || wallet.publicKey === null ) {
      notify('warning', 'Connect your wallet!');
      return 0;
    }
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)  
    let destRewardAccount = await getTokenWallet(wallet.publicKey,pD.rewardMint)
    let transaction = new Transaction()
    
    if((await conn.getAccountInfo(destRewardAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destRewardAccount,wallet.publicKey,wallet.publicKey,pD.rewardMint))

    NftsToClaim.map(async (nft) => {
      console.log(nft);
      transaction.add(
        await program.instruction.claim(
          new anchor.BN(nft.claim),
          {
          accounts:{
            owner : wallet.publicKey,
            pool : POOL,
            stakeData : nft.stakeData,
            sourceRewardAccount : pD.rewardAccount,
            destRewardAccount : destRewardAccount,
            tokenProgram : TOKEN_PROGRAM_ID,
            clock : SYSVAR_CLOCK_PUBKEY,
          }
        })
      )
    })
    const res = await sendTransaction(transaction,[])
    return res;
  } catch(err) {
    console.log(err);
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

async function getNftsForOwner(
  conn : any,
  owner : PublicKey
  ){
  if(!owner) {
    return [];
  }
  // console.log("+ getNftsForOwner")
  try {
    const allTokens: any = []
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID
    });

    for (let index = 0; index < tokenAccounts.value.length; index++) {
      const tokenAccount = tokenAccounts.value[index];
      const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

      if (tokenAmount.amount.toString() === "1" && tokenAmount.decimals.toString() === "0") {
        let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
        let [pda] = await anchor.web3.PublicKey.findProgramAddress([
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ], TOKEN_METADATA_PROGRAM_ID);
        const accountInfo: any = await conn.getParsedAccountInfo(pda);
        let metadata : any = new Metadata(owner.toString(), accountInfo.value);
        const { data }: any = await axios.get(metadata.data.data.uri)

        let creator : any;
        if(!metadata.data.data.creators) {
          creator = "No Creator";
        } else {
          creator = metadata.data.data.creators[0].address;
        }
        
        collections.map(collection => {
          if(collection.address ===  creator.toString()) {
            const entireData = {
              ...data, 
              id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]),
              collection: collection.address,
              claim: collection.claim,
              badge: collection.badge,
            }
            allTokens.push({address : nftMint, ...entireData })
          }
        })
      }
      allTokens.sort(function (a: any, b: any) {
        if (a.claim < b.claim) { return -1; }
        if (a.claim > b.claim) { return 1; }
        return 0;
      })
    }
    // console.log("NFTs for owner : ------------", allTokens);
    return allTokens;
  } catch(err) {
    console.log(err);
    return 0;
  }
}

async function getStakedNftsForOwner(
  conn : Connection,
  owner : PublicKey,
  ){
    if(!owner) {
      return [];
    }
  console.log("+ getStakedNftsForOwner")
  try {
    const wallet = new anchor.Wallet(Keypair.generate());
    const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
    const program = new anchor.Program(idl, programId, provider);
    const allTokens: any = []
    let resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: STAKEDATA_SIZE},
      ]
    })
    for(let nftAccount of resp){
      let stakedNft = await program.account.stakeData.fetch(nftAccount.pubkey)
      if(stakedNft.unstaked) continue;
      let account = await conn.getAccountInfo(stakedNft.account)
      let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
      let pda= await getMetadata(mint)
      const accountInfo: any = await conn.getParsedAccountInfo(pda);
      let metadata : any = new Metadata(owner.toString(), accountInfo.value);
      const { data }: any = await axios.get(metadata.data.data.uri)
      const creator : any = metadata.data.data.creators[0].address;
      collections.map(collection => {
        if(collection.address ===  creator.toString()) {
          const entireData = { 
            ...data, 
            id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0]),
            collection: collection.address,
            claim: collection.claim,
            badge: collection.badge,
          }
            if(stakedNft.owner.toBase58() === owner.toBase58()) {
              allTokens.push({
                withdrawnNumber : stakedNft.withdrawnNumber,
                stakeTime : stakedNft.stakeTime.toNumber(),
                stakeData : nftAccount.pubkey,
                address : mint,
                ...entireData,
              })
            }
          // }
        }
      })
    }
    // console.log(allTokens)
    return allTokens
  } catch(err) {
    console.log(err);
    return ;
  }
}

let pD : any ;
let nfts : any[] = [];
let stakedNfts : any[] = [];



// For testing
// const collections : any[] = [
//   { 
//     address : 'KSGoVXMEmfSACCJgF8XbZBPk3GMCcFk2mUD4BJx6UzG',
//     badge : "Bronze",
//     claim : 0
//   },
//   { 
//     address : 'HDMb2PrzgK1dVLGSC9L196Z2Gao8mKLSFrW2TKqjo924',
//     badge : "Silver",
//     claim : 1
//   },
//   { 
//     address : 'F4oMpLJ3YmaXJoWA8ipQbbPxeyEJSrwCDLCuvM8sf5nN',
//     badge : "Gold",
//     claim : 2
//   },
//   { 
//     address : '2MWmD39kmrrCFfcQkwohBuTP2gAd9UTNfrXr8cqNLKg3',
//     badge : "Platinum",
//     claim : 3
//   },
// ];


async function getPoolData(
  callback : any
	){
  if(!wallet.publicKey) return 0;
  try { 
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    const program = new anchor.Program(idl,programId,provider)
    let poolData = await program.account.pool.fetch(POOL)
    
    pD = {
      rewardMint : poolData.rewardMint,
      rewardAccount : poolData.rewardAccount,
      rewardAmount : poolData.rewardAmount,
      period : poolData.period,
      totalStaked : poolData.totalStaked,
    }
    
    // console.log("Pool data from contract", pD);

    if(callback != null) callback();
  } catch(err) {
    console.log(err);
  }
}



async function getNfts(callback : any){
	if(wallet.publicKey === undefined || wallet.publicKey === null || !wallet.publicKey ) {
    nfts = [];
    stakedNfts = [];
    return ;
  }
  if(nfts.length) {
  	nfts.splice(0,nfts.length)
  }
  
  if(stakedNfts.length) {
    stakedNfts.splice(0,stakedNfts.length)
  }
  await getPoolData(null)
	nfts = await getNftsForOwner(conn,wallet.publicKey)
  stakedNfts = await getStakedNftsForOwner(conn,wallet.publicKey)

  console.log("Number of NFTs ", nfts.length);
  // console.log(stakedNfts)
	if(callback != null) callback();
  return nfts.length;
}

async function getSplTokenBalance(tokenAddr : any, walletAddr : any) {
  const mintAccount = new PublicKey(tokenAddr);

  try {
    const ata = await getAssociateTokenAddress(mintAccount, walletAddr)
    const balance = await conn.getTokenAccountBalance(ata)
    // console.log(typeof balance.value.uiAmount);
    return parseInt(balance.value.amount) / (10**9);
  } catch(err) {
    console.log(err);
    return 0;
  }
}

async function tokenClaim() {
  console.log("+ Token Claim")
  try {
    if(wallet.publicKey === undefined || wallet.publicKey === null ) {
      notify('warning', 'Connect your wallet!');
      return 0;
    }
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl, programId, provider)  
    // let resp = await conn.getProgramAccounts(programId,{
    //   dataSlice: {length: 0, offset: 0},
    //   filters: [{dataSize: STAKEDATA_SIZE},{memcmp:{offset:9,bytes:wallet.publicKey!.toBase58()}},{memcmp:{offset:41,bytes:POOL.toBase58()}}]
    // });
    // await getPoolData(null)

    const mintAccount = new PublicKey(REWARD_TOKEN);
    const destTokenAccount = await getAssociateTokenAddress(mintAccount, wallet.publicKey)
    const sourceTokenAccount = await getAssociateTokenAddress(mintAccount, POOL)
    let transaction = new Transaction()
    
    const resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: TOKENDATA_SIZE},
      ]
    });
    if(!resp.length) {
      notify("error", "No Token was staked");
      return 0;
    }

    let tokenData : any;

    for(let resps of resp) {
      const tokendatas = await program.account.tokenData.fetch(resps.pubkey);
      // console.log("token data owner",tokendatas.owner.toBase58());
      if(tokendatas.owner.toBase58() == wallet.publicKey.toBase58()) {
        tokenData = resps.pubkey;
        console.log("Token data exists");
        break;
      }
    }
    const tokenD = await program.account.tokenData.fetch(tokenData);
    const stakedAmount = tokenD.stakeAmount.toNumber();
    if(stakedAmount === 0) {
      notify('error', 'No Staked Token');
      return 0;
    }
    
    transaction.add(
      await program.instruction.tokenclaim(
        {
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          tokenData : tokenData,
          sourceRewardAccount : sourceTokenAccount,
          destRewardAccount : destTokenAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          clock : SYSVAR_CLOCK_PUBKEY,
        }
      })
    )
    const res = await sendTransaction(transaction,[])
    return res;
  } catch(err) {
    console.log(err);
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

async function tokenunstake() {
  console.log("+ Token unstake")
  try {
    if(wallet.publicKey === undefined || wallet.publicKey === null ) {
      notify('warning', 'Connect your wallet!');
      return 0;
    }
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl, programId, provider)  
    // let resp = await conn.getProgramAccounts(programId,{
    //   dataSlice: {length: 0, offset: 0},
    //   filters: [{dataSize: STAKEDATA_SIZE},{memcmp:{offset:9,bytes:wallet.publicKey!.toBase58()}},{memcmp:{offset:41,bytes:POOL.toBase58()}}]
    // });
    // await getPoolData(null)

    const mintAccount = new PublicKey(REWARD_TOKEN);
    const destTokenAccount = await getAssociateTokenAddress(mintAccount, wallet.publicKey)
    const sourceTokenAccount = await getAssociateTokenAddress(mintAccount, POOL)
    let transaction = new Transaction()
    
    const resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: TOKENDATA_SIZE},
      ]
    });
    if(!resp.length) {
      notify("error", "No Token was staked");
      return 0;
    }

    let tokenData : any;

    for(let resps of resp) {
      const tokendatas = await program.account.tokenData.fetch(resps.pubkey);
      // console.log("token data owner",tokendatas.owner.toBase58());
      if(tokendatas.owner.toBase58() == wallet.publicKey.toBase58()) {
        tokenData = resps.pubkey;
        console.log("Token data exists");
        break;
      }
    }
    
    const tokenD = await program.account.tokenData.fetch(tokenData);
    const stakedAmount = tokenD.stakeAmount.toNumber();
    if(stakedAmount === 0) {
      notify('error', 'No Staked Token');
      return 0;
    }
    // console.log("Created token data",tokenD);
    
    transaction.add(
      await program.instruction.tokenunstake(
        {
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          tokenData : tokenData,
          sourceTokenAccount : sourceTokenAccount,
          destTokenAccount : destTokenAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          clock : SYSVAR_CLOCK_PUBKEY,
        }
      })
    )
    const res = await sendTransaction(transaction,[])
    return res;
  } catch(err) {
    console.log(err);
    notify('error', 'Failed Instruction!');
    return 0;
  }
}

async function tokenStake(
	// nftMint : PublicKey,
  stakeAmount : number,
	){
	console.log("+ Token Stake")
  
  const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
  if(_balance === 0) 
  {
    console.log("No token for staking");
    notify('error', 'No token for staking!');
    return 0;
  }

  try {
    const provider = new anchor.Provider(conn, wallet as any, confirmOption)
    const program = new anchor.Program(idl,programId,provider);

    const resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: TOKENDATA_SIZE},
        // {memcmp:{offset:9,bytes:wallet.publicKey!.toBase58()}}
      ]
    })

    // console.log("token data array : ", resp);

    let transaction = new Transaction();
    let signers : Keypair[] = [];
    
    let tokenData : any;
    let exists = 0;
    if(!resp.length) {
      tokenData = Keypair.generate();
      // console.log("No token data")
      signers.push(tokenData);

      transaction.add(
        await program.instruction.inittokendata({
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            tokenData : tokenData.publicKey,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      );
    } else {
      // const tokenD = await program.account.tokenData.fetch(resp[0].pubkey);
      // console.log("Created token data",tokenD.owner.toBase58());
      // tokenData = resp[0].pubkey;

      // console.log('there are token datas')

      for(let resps of resp) {
        const tokendatas = await program.account.tokenData.fetch(resps.pubkey);
        // console.log("token data owner",tokendatas.owner.toBase58());
        if(tokendatas.owner.toBase58() == wallet.publicKey.toBase58()) {
          exists = 1;
          tokenData = resps.pubkey;
          console.log("Token data exists");
          break;
        }
      }
    }

    if(!exists) {
      console.log("Token data does not exists")
      const tokenKey = Keypair.generate();
      signers.push(tokenKey);
      tokenData = tokenKey.publicKey;

      transaction.add(
        await program.instruction.inittokendata({
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            tokenData : tokenData,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      );
    }


    const mintAccount = new PublicKey(REWARD_TOKEN);
    const sourceTokenAccount = await getAssociateTokenAddress(mintAccount, wallet.publicKey)
    const destTokenAccount = await getAssociateTokenAddress(mintAccount, POOL)
    // console.log("Token Address");
    // console.log(sourceTokenAccount.toString());
    // console.log(destTokenAccount.toString());
    

    transaction.add(
      await program.instruction.tokenstake(
        new anchor.BN(stakeAmount),
        {
        accounts: {
          owner : wallet.publicKey,
          pool : POOL,
          tokenData : tokenData,
          sourceTokenAccount : sourceTokenAccount,
          destTokenAccount : destTokenAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    );
    const res = await sendTransaction(transaction, signers);
    // console.log("New token data publickey : ", tokenData.publicKey.toString());

    return res;
    
  } catch(err) {
    console.log(err);
    notify('error', 'Failed Instruction!');
    return 0;
  }
}


async function stakedAmount() {
  console.log("+ Token Claim")
  try {
    if(wallet.publicKey === undefined || wallet.publicKey === null ) {
      notify('warning', 'Connect your wallet!');
      return 0;
    }
    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl, programId, provider);

    const resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: TOKENDATA_SIZE},
      ]
    });
    if(!resp.length) {
      notify("error", "No Token was staked");
      return 0;
    }

    let tokenData : any;

    for(let resps of resp) {
      const tokendatas = await program.account.tokenData.fetch(resps.pubkey);
      // console.log("token data owner",tokendatas.owner.toBase58());
      if(tokendatas.owner.toBase58() == wallet.publicKey.toBase58()) {
        tokenData = resps.pubkey;
        console.log("Token data exists");
        break;
      }
    }
    const tokenD = await program.account.tokenData.fetch(tokenData);
    const stakedAmount = tokenD.stakeAmount.toNumber();
    if(stakedAmount === 0) {
      notify('error', 'No Staked Token');
      return 0;
    } else {
      return stakedAmount;
    }
  } catch(err) {
    console.log(err);
    notify('error', 'Error!');
    return 0;
  }
}

let init = true;
export default function Stake() {
	wallet = useWallet();
	notify = useNotify();
  const [ stakePage, setStakePage ] = useState(false);
  const [ showStaked, setShowStaked ] = useState(false);
  const [ tokenToStake, setTokenToStake ] = useState(0);
  const [ inProgress, setInProgress ] = useState(0);
  const [ splTokenBalance, setSplTokenBalance ] = useState(0);
  const [ splStakedBalance, setSplStakedBalance ] = useState(0);
  const [ totalStakedNFTs, setTotalStakedNFTs ] = useState(0);

  const [ pageCountPerCollection, setPageCountPerCollection ] = useState(0);
  const [ SpageCountPerCollection, setSPageCountPerCollection ] = useState(0);

	const [changed, setChange] = useState(true);
	// const [period, setPeriod] = useState(10);
	// const [withdrawable, setWithdrawable] = useState(7)
	// const [collectionName, setCollectionName] = useState(COLLECTION_NAME);
	// const [rewardToken, setRewardToken] = useState(REWARD_TOKEN);
  const [showCollection, setShowCollection] = useState("All");

  const [itemOffset, setItemOffset] = useState(0);
  const [stakeditemOffset, setStakedItemOffset] = useState(0);

  // const [ itemsPerPage, setItemsPerPage ] = useState(5);
  const itemsPerPage = 5;

  const [ pageCount, setPageCount ] = useState(Math.ceil(nfts.length / itemsPerPage));
  const [ stakedpageCount, setStakedPageCount ] = useState(Math.ceil(stakedNfts.length / itemsPerPage));


	const render = () => {
		setChange(!changed)
	}


  const onTokenInputChange = (e: any) => {
    let input = e.currentTarget.value;
    if(input === "" || typeof input ==="undefined" || input == null) {
      input = "0";
    }
    setTokenToStake(parseInt(input));
  }


  // Invoke when user click to request another page.
  const handlePageClick = (event : any) => {
    const newOffset = (event.selected * itemsPerPage) % nfts.length;
    setItemOffset(newOffset);
  };
  const stakedhandlePageClick = (event : any) => {
    const newOffset = (event.selected * itemsPerPage) % stakedNfts.length;
    setStakedItemOffset(newOffset);
  };
  

  const endOffset = itemOffset + itemsPerPage;
  const stakedendOffset = stakeditemOffset + itemsPerPage;
  let currentItems : any = [];
  let currentStakedItems : any = [];
  if(wallet.publicKey) {
    if(showCollection !== "All") {
      if(nfts.length)
      {
        currentItems = nfts.filter(f => f.badge === showCollection).slice(itemOffset, endOffset);
      } else {
        currentItems = [];
      }
      if(stakedNfts.length) {
        currentStakedItems = stakedNfts.filter(f => f.badge === showCollection).slice(stakeditemOffset, stakedendOffset);
      } else {
        currentStakedItems = []
      }
    } else {
      if(nfts.length)
      {
        currentItems = nfts.slice(itemOffset, endOffset);
      } else {
        currentItems = [];
      }
      if(stakedNfts.length) {
        currentStakedItems = stakedNfts.slice(stakeditemOffset, stakedendOffset);
      } else {
        currentStakedItems = []
      }
    }
  }

  useEffect(() => {
    setItemOffset(0);
    setStakedItemOffset(0);
    if(showCollection !== "All") {
      currentItems = nfts.filter(f => f.badge === showCollection).slice(itemOffset, endOffset);
      currentStakedItems = stakedNfts.filter(f => f.badge === showCollection).slice(stakeditemOffset, stakedendOffset);
    } else {
      currentItems = nfts.slice(0, endOffset);
      currentStakedItems = stakedNfts.slice(0, stakedendOffset);
      setPageCountPerCollection(Math.ceil(currentItems / itemsPerPage));
      setSPageCountPerCollection(Math.ceil(currentStakedItems / itemsPerPage));
      
    }
  }, [showCollection])

  useEffect(() => {
    const walletChanged = async () => {
      setInProgress(1);
      setShowCollection("All");
      if(wallet.publicKey !== undefined || !wallet.publicKey || wallet.publicKey !== null && init) {
        await getNfts(render);
        setPageCount(Math.ceil(nfts.length / itemsPerPage));
        setStakedPageCount(Math.ceil(stakedNfts.length / itemsPerPage));

        const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
        setSplTokenBalance(_balance);
        // setSplStakedBalance(0);
        const stakedBalance = await stakedAmount();
        setSplStakedBalance(stakedBalance);
        
        if(pD) {
          setTotalStakedNFTs(parseInt(pD.totalStaked.toString()));
        } else {
          setTotalStakedNFTs(0);
        }

        init = false;
      }
      else {
          console.log("Disconnect---------");
          init = true;
          nfts = [];
          stakedNfts = [];
          setShowCollection("All");
      }
      setInProgress(0);
    }
    walletChanged();
  }, [wallet])

  useEffect(() => {
    const getPool = async () => {
      setInProgress(1);
      setShowCollection("All");
      try {
        await getPoolData(null);

        setPageCount(Math.ceil(nfts.length / itemsPerPage));
        setStakedPageCount(Math.ceil(stakedNfts.length / itemsPerPage));
        
        const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
        setSplTokenBalance(_balance);
        if(pD) {
          setTotalStakedNFTs(parseInt(pD.totalStaked.toString()));
        } else {
          setTotalStakedNFTs(0);
        }
        // console.log("PDpdpdpdpdpdpdpdpdp", pD);
        // console.log("staked nfts from pool",totalStakedNFTs);
        
        setInProgress(0);
        return 1;
      } catch(err) {
        setInProgress(0);
        return err;
      }
    };
    getPool().then((err) => {
      if(!err) {
        console.log("no error")    ;
      }
    });
    setInProgress(0);

  }, []);

  const onOptionChangeHandler = (event : any) => {
    setShowCollection(event.target.value);
    if(event.target.value === "All") {
      setPageCount(Math.ceil(nfts.length / itemsPerPage));
      setStakedPageCount(Math.ceil(stakedNfts.length / itemsPerPage));
    } else {
      let setcount = 0;
      nfts.map((nft) => {
        if(nft.badge === event.target.value) {
          setcount++;
        }
      });
      setPageCount(Math.ceil(setcount / itemsPerPage));
      setPageCountPerCollection(Math.ceil(setcount / itemsPerPage));
      let setstakedCount = 0;
      stakedNfts.map((nft) => {
        if(nft.badge === event.target.value) {
          setstakedCount++;
        }
      });
      setStakedPageCount(Math.ceil(setstakedCount / itemsPerPage));
      setSPageCountPerCollection(Math.ceil(setstakedCount / itemsPerPage));
      currentItems = 0;
      currentStakedItems = 0;
    }
		setChange(!changed);
  }

  const getNFTData = async () => {
    setInProgress(1);
    const res = await getNfts(render);
    if(pD) {
      setTotalStakedNFTs(parseInt(pD.totalStaked.toString()));
    } else {
      setTotalStakedNFTs(0);
    }
    setInProgress(0);
    return res;
  }

  const stakeNFT = async (
    nftMint : PublicKey,
    collection : any,
  ) => {
    setInProgress(1);
    const res = await stake(
      nftMint, 
      // collection
    );

    if(pD) {
      setTotalStakedNFTs(parseInt(pD.totalStaked.toString()));
    } else {
      setTotalStakedNFTs(0);
    }
    
    setInProgress(0);
    return res;
  }

  const UnstakeNFT = async (
    unstakeNft : any
  ) => {
    setInProgress(1);
    const res = await unstake(unstakeNft);
    
    if(pD) {
      setTotalStakedNFTs(parseInt(pD.totalStaked.toString()));
    } else {
      setTotalStakedNFTs(0);
    }

    setInProgress(0);
    return res;
  }

  const ClaimForToken = async (
    NftsToClaim : any[]
  ) => {
    setInProgress(1);
    const res = await claim(NftsToClaim);
    setInProgress(0);
    return res;
  }

  const onClickMax = () => {
    setTokenToStake(splTokenBalance);
  }

  const onTokenStake = async (
    stakeAmount : number,
  ) => {
    setInProgress(1);
    let res : any;
    if(stakeAmount > splTokenBalance) {
      res = 0;
      notify('error', 'Exceeded max token balance!');
    } else {
      res = await tokenStake(stakeAmount);
    }
    if(res === 1) {
      const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
      setSplTokenBalance(_balance);
      const stakedBalance = await stakedAmount();
      setSplStakedBalance(stakedBalance);
    }
    setInProgress(0);
    return res;
  }

  const onTokenClaim = async () => {
    setInProgress(1);
    const res = await tokenClaim();
    if(res === 1) {
      const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
      setSplTokenBalance(_balance);
    }
    setInProgress(0);
    return res;
  }

  const onTokenUnstake = async () => {
    setInProgress(1);
    const res = await tokenunstake();
    if(res === 1) {
      const _balance = await getSplTokenBalance(REWARD_TOKEN, wallet.publicKey);
      setSplTokenBalance(_balance);
      const stakedBalance = await stakedAmount();
      setSplStakedBalance(stakedBalance);
    }
    setInProgress(0);
    return res;
  }



  return (
    <div className="App flex flex-col bg-cover bg-center" style={{backgroundImage: `url(${process.env.PUBLIC_URL + './assets/bg.jpg'})`}} >
      {
        inProgress ? 
        <div className="grid justify-items-center items-center fixed w-full h-full bg-gray-900 z-50 bg-opacity-50 top-0">
          <div className="justify-self-center spinner" />
        </div>
        :
        ""
      }

      {/* Header */}
      <header className='py-7 sm:px-6 '>
        {/* <nav className='grid gap-y-5 md:grid-cols-3 '> */}
        <nav className='grid gap-y-5 md:flex gap-auto md:justify-between w-full'>

          <div className='justify-self-center md:justify-self-start' style={{width: "12rem"}}>
            <a href="https://ubik.capital">
              <img src={process.env.PUBLIC_URL + "./assets/logo.svg"}  style={{height: "65px"}}/>
            </a>
          </div>

          <div className='flex text-xl justify-self-center gap-10 sm:gap-16 text-gray-200 grid grid-cols-2 h-full align-middle'>
            <button onClick={() => setStakePage(false)} className='hover:text-rose-500 transition duration-150'
              style={!stakePage ? stakePageStyle : {}}
            >NFTs Staking</button>
            <button onClick={() => setStakePage(true)} className='hover:text-rose-500 transition duration-150'
              style={stakePage ? stakePageStyle : {}}
            >Token Staking</button>
          </div>

          <div className='justify-self-center grid justify-items-center md:justify-self-end' style={{width: "12rem"}}>
            <WalletConnect />
          </div>
        </nav>
      </header>

      {/* StakePage */}
      <main className='w-full flex-1 grid py-8 px-3 md:px-5 '>
        {
          !stakePage?
          <div className='stake-status justify-self-center w-full'>
            {/* Staking status */}
            <div className='grid text-left md:flex md:justify-between pb-5'>

              <div className='board-purple rounded-xl py-5 px-6 md:w-full mx-4 sm:mx-10 md:mx-20 my-4'>
                <p className=' text-neutral-400 text-sm font-bold '>
                  Total Ubik Capital Staked
                </p>
                <p className='py-1 text-gray-200 text-4xl font-bold'>
                  {
                    totalStakedNFTs === 0 ?
                    0
                    :
                    ((totalStakedNFTs * 100)/totalNFTs).toFixed(2)
                  }%
                </p>
                <div className="w-full bg-red-300 rounded-full dark:bg-gray-700 my-2">
                  <div className="bg-rose-600 progress-bar font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
                    style={{width: 
                      // stakeProgress
                      
                      totalStakedNFTs === 0 ?
                      0
                      :
                      ((totalStakedNFTs * 100)/totalNFTs).toFixed(2)
                      +
                      "%"
                    }}>
                  </div>
                </div>
              </div>

              <div className='board-purple rounded-xl py-5 px-6 md:w-full mx-4 sm:mx-10 md:mx-20 my-4'>
                <p className='text-neutral-400 text-sm font-bold'>My Staked Ubik Capital</p>
                <p className='py-2 text-gray-200 text-4xl font-bold'>{stakedNfts.length}</p>
              </div>

            </div>

            {/* Staked & Unstaked */}
            <div className='flex justify-between mb-2 text-12px text-gray-200'>
              <div className=''>
                <button onClick={() => setShowStaked(false)} className={!showStaked? "stake-button mx-2" : "stake-button-before mx-2"} >Unstaked</button>
                <button onClick={() => setShowStaked(true)} className={showStaked? "stake-button" : "stake-button-before"} >Staked</button>
              </div>
              <div className=''>
                <button type="button" className="stake-button mx-2" style={{ background: "#eb2b63"}}
                  onClick={async ()=>{ await ClaimForToken(stakedNfts).then((res) => { if(res === 1) console.log("Claiming All Success!")})}}>Claim All</button>
              </div>
            </div>
            <hr />
            <div className="px-10 w-full grid justify-items-stretch">
              <div className="justify-self-center w-full">
                <div className="justify-self-center">
                  <div style={{height: "0px"}}>
                    {
                      changed ? "" : <></>
                    }
                  </div>

                  {
                    !showStaked ?
                    <div className="w-full flex flex-wrap justify-center">
                      {
                        currentItems.map((nft : any, idx : any) => {
                          if(showCollection === "All") {
                            return (
                              <div className="card board-purple my-3 mx-4 w-full justify-self-stretch" key={idx} style={{width : "150px"}}>
                                <div style={{height : "150px"}}>
                                  <img className="card-img-top image-disable" src={nft.image} alt="Image Error" />
                                </div>
                                {/* <div className="w-full text-center bottom-0">{nft.badge}</div> */}
                                <div className="w-full text-center bottom-0">{nft.badge}</div>
                                <div className="w-full text-center bottom-0">{nft.name}</div>
                                <div className="grid justify-items-left my-2">
                                  <button type="button" className="mx-1 px-5 pb-2 pt-1 button-bg text-gray-200 rounded-lg transition duration-150" onClick={async ()=>{
                                    await stakeNFT(nft.address, nft.collection).then(async (res) => {
                                      if(res === 1 ) await getNFTData();
                                    })
                                  }}>Stake</button>
                                </div>
                              </div>
                            )
                          } else {
                            if(nft.badge === showCollection) {
                              return (
                                <div className="card board-purple my-3 mx-4 w-full justify-self-stretch" key={idx} style={{width : "150px"}}>
                                  <div style={{height : "150px"}}>
                                    <img className="card-img-top image-disable" src={nft.image} alt="Image Error" />
                                  </div>
                                  {/* <div className="w-full text-center bottom-0">{nft.badge}</div> */}
                                  <div className="w-full text-center bottom-0">{nft.badge}</div>
                                  <div className="w-full text-center bottom-0">{nft.name}</div>
                                  <div className="grid justify-items-left my-2">
                                    <button type="button" className="mx-1 px-5 pb-2 pt-1 button-bg text-gray-200 rounded-lg transition duration-150" onClick={async ()=>{
                                      await stakeNFT(nft.address, nft.collection).then(async (res) => {
                                        if(res === 1 ) await getNFTData();
                                      })
                                    }}>Stake</button>
                                  </div>
                                </div>
                              )
                            }
                          }
                        })
                      }
                      <div className='w-full grid justify-items-stretch custom-font text-12px'>
                        <div className="flex justify-self-end">
                          <div className="grid justify-items-stretch mx-4">
                          {
                            showCollection !== 'All' ?
                            <div className='CollectionPage'>
                              <ReactPaginate
                                breakLabel="..."
                                nextLabel="Next >"
                                onPageChange={handlePageClick}
                                pageRangeDisplayed={3}
                                pageCount={pageCountPerCollection}
                                previousLabel="< Prev"
                                marginPagesDisplayed={1}
                                containerClassName={"pagination"}
                                activeClassName={"active"}
                                breakClassName={"break-me"}
                                // subContainerClassName={"pages pagination"}
                                // renderOnZeroPageCount=""
                              />
                            </div>
                            :
                            <ReactPaginate
                              breakLabel="..."
                              nextLabel="Next >"
                              onPageChange={handlePageClick}
                              pageRangeDisplayed={3}
                              pageCount={pageCount}
                              previousLabel="< Prev"
                              marginPagesDisplayed={1}
                              containerClassName={"pagination"}
                              activeClassName={"active"}
                              breakClassName={"break-me"}
                              // subContainerClassName={"pages pagination"}
                              // renderOnZeroPageCount=""
                            />
                          }
                          </div>
                          
                          <select onChange={onOptionChangeHandler} 
                            className="text-gray-100 text-center back-red rounded-md shadow-sm outline-none h-8 my-2 text-12px" >
                            <option >All</option>
                            {
                              collections.map((collection, indx) => 
                                <option key={indx} >{collection.badge}</option>
                              )
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                    :
                    <div className="w-full flex flex-wrap justify-center">
                      {
                        
                        currentStakedItems.map((nft : any ,idx : any)=>
                        {
                          return (
                            <div className="card board-purple my-3 mx-4 w-full justify-self-stretch" key={idx} style={{width : "150px"}}>
                              <div style={{height : "150px"}}>
                                <img className="card-img-top image-disable" src={nft.image} alt="Image Error" />
                              </div>
                              {/* <div className="w-full text-center bottom-0">{nft.badge}</div> */}
                              <div className="w-full text-center bottom-0">{nft.badge}</div>
                              <div className="w-full text-center bottom-0">{nft.name}</div>
                              <div className="grid justify-items-center my-2">
                                <div className='flex'>
                                  <button type="button" className="mx-1 px-2 pb-2 pt-1 button-bg text-gray-200 rounded-lg transition duration-150" onClick={async ()=>{
                                    await UnstakeNFT(nft).then(async (res) => {
                                      if(res === 1) await getNFTData();
                                    })
                                  }}>Unstake</button>
                                  <button type="button" className="mx-1 px-2 pb-2 pt-1 button-bg text-gray-200 rounded-lg transition duration-150" onClick={async ()=>{
                                    await ClaimForToken([nft]).then((res) => { if(res === 1) console.log("Claimming success!") })
                                  }}>Claim</button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      }
                      
                      <div className="w-full grid justify-items-stretch flex custom-font text-12px">
                        <div className="flex justify-self-end">
                          <div className="grid justify-items-stretch mx-4">
                            {
                              showCollection !== 'All' ?
                              <ReactPaginate
                                breakLabel="..."
                                nextLabel="Next >"
                                onPageChange={e => stakedhandlePageClick(e)}
                                pageRangeDisplayed={3}
                                pageCount={SpageCountPerCollection}
                                previousLabel="< Prev"
                                marginPagesDisplayed={1}
                                containerClassName={"pagination"}
                                activeClassName={"active"}
                                breakClassName={"break-me"}
                                // subContainerClassName={"pages pagination"}
                                // renderOnZeroPageCount=""
                              />
                              :
                              <ReactPaginate
                                breakLabel="..."
                                nextLabel="Next >"
                                onPageChange={e => stakedhandlePageClick(e)}
                                pageRangeDisplayed={3}
                                pageCount={stakedpageCount}
                                previousLabel="< Prev"
                                marginPagesDisplayed={1}
                                containerClassName={"pagination"}
                                activeClassName={"active"}
                                breakClassName={"break-me"}
                                // subContainerClassName={"pages pagination"}
                                // renderOnZeroPageCount=""
                              />
                            }
                          </div>

                          <select onChange={onOptionChangeHandler} 
                            className="text-gray-100 text-center back-red rounded-md shadow-sm outline-none h-8 my-2" >
                            <option >All</option>
                            {
                              collections.map((collection, indx) => 
                                // <option key={indx}>{collection.badge}</option>
                                <option key={indx} value={collections[indx].badge}>{collections[indx].badge}</option>
                              )
                            }
                          </select>
                        </div>
                          
                      </div>
                    </div>
                  }

                  </div>
                  {                         
                  // <button type="button" className="btn btn-warning m-1" onClick={async () =>{
                  //   await initPool(new PublicKey(REWARD_TOKEN));
                  //   render()
                  // }}>Create Staking Pool</button>

                  // :
                  // <>staking</>
                }
                    
              </div>
            </div>
          </div>

          :

          <div className='stake-status justify-self-center w-full'>
            <hr />
            
            <div className='grid sm:px-20 px-5 pt-5'>

              <div className='text-gray-100 text-2xl'>
                Current Ubik Token Balance : &nbsp;
                <span className='text-rose-500'>{splTokenBalance}</span>
              </div>
              <div className='text-gray-100 text-2xl'>
                Your Staked Ubik Token Balance : &nbsp;
                <span className='text-rose-500'>{splStakedBalance}</span>
              </div>

              <div className='board-purple rounded-xl py-5 md:w-full my-8 grid justify-items-center text-xs'>
                <div className='pb-5'>
                  <img src={process.env.PUBLIC_URL + "./assets/token_logo.png"} style={{height:"20vh"}} alt="token logo" />
                </div>

                <div className='flex font-bold text-gray-200 mx-2'>
                  <input type="text" value={tokenToStake} className="rounded-lg text-center input-size w-44 mx-auto input-bg" onChange={onTokenInputChange} />
                  <button onClick={() => onClickMax()}
                    className='mx-2 bg-purple-600 hover:bg-purple-700 p-2 rounded-lg transition duration-150'>
                    MAX
                  </button>
                </div>
                <button onClick={() => onTokenStake(tokenToStake)}
                  className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150'>
                  STAKE
                </button>
                <div className='flex'>
                  <button onClick={() => onTokenClaim()}
                    className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150'>
                    Claim
                  </button>
                  <button onClick={() => onTokenUnstake()}
                    className='mx-2 mt-10 px-10 py-2 button-bg text-gray-100 rounded-lg transition duration-150'>
                    Unstake
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </main>

      <footer className='bottom-0  insert-x-0 w-full'>
        <div className='grid justify-items-center'>
          <a href="https://ubik.capital/" className='flex text-neutral-400 text-sm' style={footerStyle}>
            <span className='text-gray-100 inline-block align-text-bottom font-bold' >Powered by</span>
            &nbsp;
            Ubik Capital
          </a>
        </div>
      </footer>

      {/* </div> */}

    </div>
  );
}