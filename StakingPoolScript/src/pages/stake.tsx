import { Fragment, useRef, useState, useEffect } from 'react';
import useNotify from './notify'
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,Token,ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { programs } from '@metaplex/js'
import moment from 'moment';
import {
  Connection,
  Keypair,
  Signer,
  PublicKey,
  Transaction,
  TransactionSignature,
  ConfirmOptions,
  sendAndConfirmRawTransaction,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  Commitment,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  clusterApiUrl
} from "@solana/web3.js";
import axios from "axios"

import {
  programId, 
  REWARD_TOKEN
} from './address';

let wallet : any
let conn = new Connection(clusterApiUrl('devnet'))
let notify : any
const { metadata: { Metadata } } = programs
const COLLECTION_NAME = "UBIK"
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
)

const idl = require('./solana_anchor.json');

const confirmOption : ConfirmOptions = {
    commitment : 'finalized',
    preflightCommitment : 'finalized',
    skipPreflight : false
}

// let POOL = new PublicKey('4F711h78UKj5TkaTPdWjW6WKYQnNN8dAUecccF8etRFH')
let POOL : any;

const STAKEDATA_SIZE = 8 + 1 + 32 + 32 + 32 +8 + 1;
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
  try{
    transaction.feePayer = wallet.publicKey
    transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
    await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
    if(signers.length != 0)
      await transaction.partialSign(...signers)
    const signedTransaction = await wallet.signTransaction(transaction);
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

async function initPool(
  rewardMint : PublicKey,
  ){
  console.log("+ initPool")
  let provider = new anchor.Provider(conn, wallet as any, confirmOption)
  let program = new anchor.Program(idl,programId,provider)
  let randomPubkey = Keypair.generate().publicKey
  let [pool,bump] = await PublicKey.findProgramAddress([randomPubkey.toBuffer()],programId)
  let rewardAccount = await getTokenWallet(pool,rewardMint)
  let transaction = new Transaction()
  let signers : Keypair[] = []
  transaction.add(createAssociatedTokenAccountInstruction(rewardAccount,wallet.publicKey,pool,rewardMint))
  transaction.add(
    await program.instruction.initPool(
      new anchor.BN(bump),
      {
        accounts:{
          owner : wallet.publicKey,
          pool : pool,
          rand : randomPubkey,
          rewardMint : rewardMint,
          rewardAccount : rewardAccount,
          systemProgram : anchor.web3.SystemProgram.programId,
        }
      }
    )
  )
  const res = await sendTransaction(transaction,[])
  if(res == 1) {
    console.log("Pool Address : ",pool.toBase58());
    init = false;
    return pool;
  } else {
    console.log("Pool Account was not created");
    return "";
  }
}

let init = true;
export default function Stake(){
	wallet = useWallet()
	notify = useNotify()
	const [changed, setChange] = useState(true)
	const [contractAddress, setContractAddress] = useState(programId.toString());
	const [rewardToken, setRewardToken] = useState(REWARD_TOKEN);
	const render = () => {
		setChange(!changed)
	}
	return <div className="container-fluid mt-4">
		<div className="row mb-3">
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">Contract Address</span>
        </div>
        <input name="collectionName"  type="text" className="form-control" onChange={(event)=>{setContractAddress(event.target.value)}} value={contractAddress} disabled/>
      </div>
		</div>
    
		<div className="row mb-3">
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">Reward Token</span>
        </div>
        <input name="rewardToken"  type="text" className="form-control" onChange={(event)=>{setRewardToken(event.target.value)}} value={rewardToken} disabled/>
      </div>
		</div>

    <div className="col-lg-4">
      <button type="button" className="btn btn-warning m-1" onClick={async () =>{
        POOL = await initPool(new PublicKey(rewardToken))
        render()
      }}>Create Staking Pool</button>
    </div>
    <div className="col-lg-4">
      Pool Account : 
      {POOL ? 
        POOL.toBase58() 
        : 
        init ?
          "Create your Pool Account" 
          :
          "Pool Account was not created"
      }
    </div>

		<hr/>
	</div>
}