
import { 
  PublicKey,
  Connection,
} from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";

import * as anchor from "@project-serum/anchor";

export const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const conn = new Connection(clusterApiUrl('devnet'));
// export const solanaNetwork = new Connection("https://api.devnet.solana.com");

// export const programId = new PublicKey('5tMHnMKwZJBeCoEThs6AyNmqTS4f966gEi1xMHzoov1f');
// export const POOL = new PublicKey('DtFfYVZAfLA8wRwBjHKg1AfBs2Zs9PUaiKqBri1hGGbY');
export const programId = new PublicKey('9UCp5r3MrCHmUrS3QXfwB1U7YdPQJsaaDi3DHs3JUztW');
export const POOL = new PublicKey('5YXndMhLr24PvrhEkZtnWZSsmrPJKqRXPXctkfyL9jWZ');
export const REWARD_TOKEN = 'H2jXcXLXhuLdhac2DxNAqQ4yxLvRHbtMgMB2o2fyHjCf';

export const totalNFTs = 1000 * 5;

// staking Bronze badge will generate 0.003 UBIK pe day
// staking Silver badge will generate 0.03 UBIK pe day
// staking Gold badge will generate 0.3 UBIK pe day
// staking Platinum badge will generate 3 UBIK pe day
// staking Diamond badge will generate 30 UBIK pe day

// people will get 0.3 UBIK for each 1000 staked per day
// export const badges : any[] = [
//   { 
//     address : '3YBdSzx6PbFytGCB6B6V4vPEcffYXrbBzeJ32imSZM8X',
//     badge : "Bronze",
//     claim : 0
//   },
//   { 
//     address : 'GvkyobXVuQysTHFHp5TfGjNr1fcjYKZbviEW5RfSrHrF',
//     badge : "Silver",
//     claim : 1
//   },
//   { 
//     address : '8VG4sGuEeWK9bxKUDdfSFRCCggc339mWgcR1hpJ24ASs',
//     badge : "Gold",
//     claim : 2
//   },
//   { 
//     address : 'A1SsJVezX7214m26m8stU8KS2goEUhRFheiLQu7VCrdu',
//     badge : "Platinum",
//     claim : 3
//   },
//   { 
//     address : '4sFheFkruEk6XN8cEnkfmj2jZbY7wB57PB5TeFwWy9k6',
//     badge : "Diamond",
//     claim : 4
//   },
// ];


// This is for testing
export const collections = [
  { 
    address : 'KSGoVXMEmfSACCJgF8XbZBPk3GMCcFk2mUD4BJx6UzG',
    badge : "Bronze",
    claim : 0
  },
  { 
    address : 'EUanG7nVAXnH43mQFTgfyxMYeEdTjNiZFtFswBJmXzki',
    badge : "Silver",
    claim : 1
  },
  { 
    address : 'F4oMpLJ3YmaXJoWA8ipQbbPxeyEJSrwCDLCuvM8sf5nN',
    badge : "Gold",
    claim : 2
  },
  { 
    address : '2BNfaT3k8qbXdiYcnu7KzAs7T7ZLsEHzqb7QewbrkhpL',
    badge : "Platinum",
    claim : 3
  },
  { 
    address : 'HDMb2PrzgK1dVLGSC9L196Z2Gao8mKLSFrW2TKqjo924',
    badge : "Diamond",
    claim : 4
  },
  { 
    address : 'Arh3vy5oLTBUxhEtmJsmZrr4vb9hFvofEfM67nrjYSRv',
    badge : "Ruby",
    claim : 5
  },
];