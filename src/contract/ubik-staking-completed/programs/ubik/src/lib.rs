pub mod utils;
// use borsh::{BorshDeserialize,BorshSerialize};

// use anchor_lang::accounts::program_account::{
//   ProgramAccount, 
//   Account
// };

use {
    crate::utils::*,
    anchor_lang::{
        prelude::*,
        AnchorDeserialize,
        AnchorSerialize,
        Key,
        solana_program::{
            program_pack::Pack,
            sysvar::{clock::Clock},
            msg
        }      
    },
    spl_token::state,
    metaplex_token_metadata::{
        state::{
            MAX_SYMBOL_LENGTH,
        }
    }
};
declare_id!("9UCp5r3MrCHmUrS3QXfwB1U7YdPQJsaaDi3DHs3JUztW");

#[program]
pub mod solana_anchor {
    use super::*;

    // let colletions:[str] = [
    //   "KSGoVXMEmfSACCJgF8XbZBPk3GMCcFk2mUD4BJx6UzG",
    //   "EUanG7nVAXnH43mQFTgfyxMYeEdTjNiZFtFswBJmXzki",
    //   "F4oMpLJ3YmaXJoWA8ipQbbPxeyEJSrwCDLCuvM8sf5nN",
    //   "2BNfaT3k8qbXdiYcnu7KzAs7T7ZLsEHzqb7QewbrkhpL",
    //   "HDMb2PrzgK1dVLGSC9L196Z2Gao8mKLSFrW2TKqjo924",
    //   "Arh3vy5oLTBUxhEtmJsmZrr4vb9hFvofEfM67nrjYSRv",
    // ];

    // let tokenAddress = "H2jXcXLXhuLdhac2DxNAqQ4yxLvRHbtMgMB2o2fyHjCf";

    pub fn init_pool(
      ctx : Context<InitPool>,
      bump : u8,
        // _period : i64,
        // _withdrawable : u8,
        // _stake_collection : String,
        ) -> Result<()> {
        msg!("Init Pool");
        let pool = &mut ctx.accounts.pool;
        let reward_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.reward_account.data.borrow())?;
        if reward_account.owner != pool.key() {
            return Err(PoolError::InvalidTokenAccount.into());
        }
        if reward_account.mint != *ctx.accounts.reward_mint.key {
            return Err(PoolError::InvalidTokenAccount.into());
        }
        // if _period == 0 {
        //     return Err(PoolError::InvalidPeriod.into());
        // }
        pool.owner = ctx.accounts.owner.key();
        pool.rand = *ctx.accounts.rand.key;
        pool.reward_mint = *ctx.accounts.reward_mint.key;
        pool.reward_account = *ctx.accounts.reward_account.key;
        // pool.reward_amount = _reward_amount;
        // pool.period = _period;
        pool.reward_amount = 3;
        pool.period = 20;
        // pool.withdrawable = _withdrawable;
        // pool.stake_collection = _stake_collection;
        pool.total_staked = 0;
        pool.bump = bump;
        Ok(())
    }

    // NFT Staking

    pub fn stake(
        ctx : Context<Stake>,
        // collectionAddr : str,
        ) -> Result<()> {
        msg!("Stake");
        let pool = &mut ctx.accounts.pool;

        // for value in collections.iter() {
        //   if value != collectionAddr {
        //     return Err(PoolError::InvalidCollection.into());
        //   }
        // }
        
        let clock = Clock::from_account_info(&ctx.accounts.clock)?;
        // let source_nft_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_nft_account.data.borrow())?;
        // let dest_nft_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_nft_account.data.borrow())?;
        // let nft_mint : state::Mint = state::Mint::unpack_from_slice(&ctx.accounts.nft_mint.data.borrow())?;
        // let metadata : metaplex_token_metadata::state::Metadata =  metaplex_token_metadata::state::Metadata::from_account_info(&ctx.accounts.metadata)?;

        spl_token_transfer_without_seed(
            TokenTransferParamsWithoutSeed{
                source : ctx.accounts.source_nft_account.clone(),
                destination : ctx.accounts.dest_nft_account.clone(),
                authority : ctx.accounts.owner.to_account_info().clone(),
                token_program : ctx.accounts.token_program.clone(),
                amount : 1,
            }
        )?;

        let stake_data = &mut ctx.accounts.stake_data;
        stake_data.owner = ctx.accounts.owner.key();
        stake_data.pool = pool.key();
        stake_data.account = *ctx.accounts.dest_nft_account.key;
        stake_data.stake_time = clock.unix_timestamp;
        stake_data.withdrawn_number = 0;
        stake_data.unstaked = false;

        pool.total_staked += 1;
        Ok(())
    }

    pub fn unstake(
        ctx : Context<Unstake>,
        _badge : u64,
        ) -> Result<()> {
        msg!("Unstake");
        let pool = &mut ctx.accounts.pool;
        let stake_data = &mut ctx.accounts.stake_data;
        let clock = Clock::from_account_info(&ctx.accounts.clock)?;

        if stake_data.unstaked {
            return Err(PoolError::AlreadyUnstaked.into());
        }
        if clock.unix_timestamp < stake_data.stake_time as i64 {
            return Err(PoolError::InvalidTime.into());
        }
        if stake_data.owner != ctx.accounts.owner.key() {
            return Err(PoolError::InvalidStakeData.into());
        }
        if stake_data.pool != pool.key() {
            return Err(PoolError::InvalidStakeData.into());
        }
        if stake_data.account != *ctx.accounts.source_nft_account.key {
            return Err(PoolError::InvalidTokenAccount.into());
        }
        if stake_data.account == *ctx.accounts.dest_nft_account.key {
            return Err(PoolError::InvalidTokenAccount.into());
        }

        let number = ((clock.unix_timestamp - stake_data.stake_time) / pool.period) as u8;

        let mut amount = 3 * number as u64;
        if _badge == 0 {
          amount *= 1000000;
          // amount *= 1000000000;
        }
        if _badge == 1 {
          amount *= 10000000;
          // amount *= 2000000000;
        }
        if _badge == 2 {
          amount *= 100000000;
          // amount *= 3000000000;
        }
        if _badge == 3 {
          amount *= 1000000000;
          // amount *= 4000000000;
        }
        if _badge == 4 {
          amount *= 10000000000;
          // amount *= 5000000000;
        } else {
          amount *= 1;
        }

        let pool_seeds = &[
            pool.rand.as_ref(),
            &[pool.bump],
        ];        
        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_nft_account.clone(),
                destination : ctx.accounts.dest_nft_account.clone(),
                authority : pool.to_account_info().clone(),
                authority_signer_seeds : pool_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : 1,
            }
        )?;

        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_reward_account.clone(),
                destination : ctx.accounts.dest_reward_account.clone(),
                authority : pool.to_account_info().clone(),
                authority_signer_seeds : pool_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : amount,
            }
        )?;

        stake_data.unstaked = true;
        if pool.total_staked > 0 {
          pool.total_staked -= 1;
        }
        
        Ok(())
    }

    pub fn claim(
        ctx : Context<Claim>,
        _badge : u64,
        ) -> Result<()> {
        let pool = &ctx.accounts.pool;
        let stake_data = &mut ctx.accounts.stake_data;
        let clock = Clock::from_account_info(&ctx.accounts.clock)?;
        if stake_data.owner != ctx.accounts.owner.key() {
            msg!("Not match owner");
            return Err(PoolError::InvalidStakeData.into());
        }
        if stake_data.pool != pool.key() {
            msg!("Not match pool");
            return Err(PoolError::InvalidStakeData.into());
        }
        // if stake_data.withdrawn_number >= pool.withdrawable {
        //     msg!("already withdrawn all");
        //     return Err(PoolError::InvalidTime.into());
        // }
        if pool.reward_account != *ctx.accounts.source_reward_account.key {
            msg!("Source reward account must be pool's reward account");
            return Err(PoolError::InvalidTokenAccount.into());
        }
        if pool.reward_account == *ctx.accounts.dest_reward_account.key {
            msg!("Dest reward account is not allowed to be pool's reward account");
            return Err(PoolError::InvalidTokenAccount.into());
        }

        let number = ((clock.unix_timestamp - stake_data.stake_time) / pool.period) as u8;

        let mut amount = 3 * number as u64;
        if _badge == 0 {
          amount *= 1000000;
          // amount *= 1000000000;
        }
        if _badge == 1 {
          amount *= 10000000;
          // amount *= 2000000000;
        }
        if _badge == 2 {
          amount *= 100000000;
          // amount *= 3000000000;
        }
        if _badge == 3 {
          amount *= 1000000000;
          // amount *= 4000000000;
        }
        if _badge == 4 {
          amount *= 10000000000;
          // amount *= 5000000000;
        } else {
          amount *= 1;
        }

        let pool_seeds = &[
            pool.rand.as_ref(),
            &[pool.bump],
        ];

        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_reward_account.clone(),
                destination : ctx.accounts.dest_reward_account.clone(),
                authority : pool.to_account_info().clone(),
                authority_signer_seeds : pool_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : amount,
            }
        )?;

        stake_data.stake_time = clock.unix_timestamp;
        stake_data.withdrawn_number = number;

        Ok(())
    }

    // Token Staking
    

    pub fn inittokendata(
      ctx : Context<InitTokenData>,
      ) -> Result<()> {
      msg!("Init Token Data");
      
      let token_data = &mut ctx.accounts.token_data;
      
      let pool = &ctx.accounts.pool;
      
      token_data.owner = ctx.accounts.owner.key();
      token_data.pool = pool.key();
      token_data.stake_time = 0;
      token_data.stake_amount = 0;
      token_data.pending_amount = 0;
      token_data.first_stake = true;
      Ok(())
  }

    pub fn tokenstake(
      ctx : Context<TokenStake>,
      stake_amount : i64,
      ) -> Result<()> {
      msg!("Token Stake");
      let clock = Clock::from_account_info(&ctx.accounts.clock)?;
      // let source_nft_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.source_nft_account.data.borrow())?;
      // let dest_nft_account : state::Account = state::Account::unpack_from_slice(&ctx.accounts.dest_nft_account.data.borrow())?;
      // let nft_mint : state::Mint = state::Mint::unpack_from_slice(&ctx.accounts.nft_mint.data.borrow())?;
      // let metadata : metaplex_token_metadata::state::Metadata =  metaplex_token_metadata::state::Metadata::from_account_info(&ctx.accounts.metadata)?;

      let token_data = &mut ctx.accounts.token_data;

      if token_data.owner != ctx.accounts.owner.key() {
          msg!("Not match owner");
          return Err(PoolError::InvalidStakeData.into());
      }
      
      if token_data.first_stake == true {
        let pending = 0;
        token_data.pending_amount += pending;
      } else {
        // pending = (clock.unix_timestamp - token_data.stake_time) / (3600 * 24) * token_data.stake_amount;
        let pending = 3 * (clock.unix_timestamp - token_data.stake_time) / (20) * (token_data.stake_amount / 100);
        token_data.pending_amount += pending;
      }
      
      spl_token_transfer_without_seed(
        TokenTransferParamsWithoutSeed{
            source : ctx.accounts.source_token_account.clone(),
            destination : ctx.accounts.dest_token_account.clone(),
            authority : ctx.accounts.owner.to_account_info().clone(),
            token_program : ctx.accounts.token_program.clone(),
            amount : (stake_amount * 1000000000) as u64,
        }
      )?;

      token_data.stake_time = clock.unix_timestamp;
      token_data.stake_amount += stake_amount;
      token_data.first_stake = false;

      Ok(())
  }

  pub fn tokenunstake(
      ctx : Context<TokenUnstake>,
      ) -> Result<()> {
      msg!("Token Unstake");
      let pool = &ctx.accounts.pool;
      let token_data = &mut ctx.accounts.token_data;
      let clock = Clock::from_account_info(&ctx.accounts.clock)?;

      if clock.unix_timestamp < token_data.stake_time as i64 {
          return Err(PoolError::InvalidTime.into());
      }
      if token_data.owner != ctx.accounts.owner.key() {
          msg!("Not match owner");
          return Err(PoolError::InvalidStakeData.into());
      }
      if token_data.pool != pool.key() {
          return Err(PoolError::InvalidStakeData.into());
      }

      let pending = 3 * (clock.unix_timestamp - token_data.stake_time) / (20) * (token_data.stake_amount / 100);
      token_data.pending_amount += pending;

      let pool_seeds = &[
          pool.rand.as_ref(),
          &[pool.bump],
      ];

      spl_token_transfer(
          TokenTransferParams{
              source : ctx.accounts.source_token_account.clone(),
              destination : ctx.accounts.dest_token_account.clone(),
              authority : pool.to_account_info().clone(),
              authority_signer_seeds : pool_seeds,
              token_program : ctx.accounts.token_program.clone(),
              amount : ((token_data.pending_amount + token_data.stake_amount) * 1000000000) as u64,
          }
      )?;

      token_data.stake_time = 0;
      token_data.stake_amount = 0;
      token_data.pending_amount = 0;
      token_data.first_stake = true;

      Ok(())
  }

  pub fn tokenclaim(
      ctx : Context<TokenClaim>,
      ) -> Result<()> {
        msg!("Token Claim");
        let pool = &ctx.accounts.pool;
        let token_data = &mut ctx.accounts.token_data;
        let clock = Clock::from_account_info(&ctx.accounts.clock)?;
  
        if clock.unix_timestamp < token_data.stake_time as i64 {
            return Err(PoolError::InvalidTime.into());
        }
        if token_data.owner != ctx.accounts.owner.key() {
            msg!("Not match owner");
            return Err(PoolError::InvalidStakeData.into());
        }
        if token_data.pool != pool.key() {
            return Err(PoolError::InvalidStakeData.into());
        }
  
        let pending = 3 * (clock.unix_timestamp - token_data.stake_time) / (20) * (token_data.stake_amount / 100);
        token_data.pending_amount += pending;
  
        let pool_seeds = &[
            pool.rand.as_ref(),
            &[pool.bump],
        ];
  
        spl_token_transfer(
            TokenTransferParams{
                source : ctx.accounts.source_reward_account.clone(),
                destination : ctx.accounts.dest_reward_account.clone(),
                authority : pool.to_account_info().clone(),
                authority_signer_seeds : pool_seeds,
                token_program : ctx.accounts.token_program.clone(),
                amount : (token_data.pending_amount * 1000000000) as u64,
            }
        )?;
  
        token_data.stake_time = clock.unix_timestamp;
        token_data.pending_amount = 0;

        Ok(())
  }
}


// NFT Staking

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    owner : Signer<'info>,

    pool : Account<'info,Pool>,

    #[account(mut)]
    stake_data : Account<'info,StakeData>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: source spl-token account
    source_reward_account : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: dest spl-token account
    dest_reward_account : AccountInfo<'info>,

    #[account(address=spl_token::id())]
    /// CHECK: token program account
    token_program : AccountInfo<'info>,

    /// CHECK: clock!
    clock : AccountInfo<'info>,     
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    owner : Signer<'info>,   

    #[account(mut)]
    pool : Account<'info,Pool>,

    #[account(mut)]
    stake_data : Account<'info,StakeData>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: source nft account
    source_nft_account : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: dest nft account
    dest_nft_account : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: source spl-token account
    source_reward_account : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: dest spl-token account
    dest_reward_account : AccountInfo<'info>,

    #[account(address=spl_token::id())]
    /// CHECK: token program account
    token_program : AccountInfo<'info>,

    /// CHECK: clock!
    clock : AccountInfo<'info>,             
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    owner : Signer<'info>, 

    #[account(mut)]
    pool : Account<'info,Pool>,

    #[account(init, payer=owner, space=8+STAKEDATA_SIZE)]
    stake_data : Account<'info,StakeData>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: nft mint account
    nft_mint : AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: metadata account
    metadata : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: account is safe now?
    source_nft_account : AccountInfo<'info>,

    #[account(mut,owner=spl_token::id())]
    /// CHECK: account is safe now?
    dest_nft_account : AccountInfo<'info>,

    #[account(address=spl_token::id())]
    /// CHECK: token program account
    token_program : AccountInfo<'info>,

    system_program : Program<'info,System>,

    /// CHECK: clock!
    clock : AccountInfo<'info>,    
}


// Token Staking

#[derive(Accounts)]
pub struct TokenStake<'info> {
  #[account(mut)]
  owner : Signer<'info>, 

  pool : Account<'info,Pool>,

  #[account(mut)]
  /// CHECK: token data account
  token_data : Account<'info,TokenData>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  source_token_account : AccountInfo<'info>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  dest_token_account : AccountInfo<'info>,

  #[account(address=spl_token::id())]
  /// CHECK: token program account
  token_program : AccountInfo<'info>,

    /// CHECK: clock
  clock : AccountInfo<'info>,    
}

#[derive(Accounts)]
pub struct TokenClaim<'info> {
  #[account(mut)]
  owner : Signer<'info>,   

  pool : Account<'info,Pool>,

  #[account(mut)]
  /// CHECK: token data account
  token_data : Account<'info,TokenData>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  source_reward_account : AccountInfo<'info>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  dest_reward_account : AccountInfo<'info>,

  #[account(address=spl_token::id())]
  /// CHECK: token program account
  token_program : AccountInfo<'info>,

    /// CHECK: clock
  clock : AccountInfo<'info>,     
}

#[derive(Accounts)]
pub struct TokenUnstake<'info> {
  #[account(mut)]
  owner : Signer<'info>,   

  pool : Account<'info,Pool>,

  #[account(mut)]
  /// CHECK: token data account
  token_data : Account<'info,TokenData>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  source_token_account : AccountInfo<'info>,

  #[account(mut,owner=spl_token::id())]
  /// CHECK: account is safe now?
  dest_token_account : AccountInfo<'info>,

  #[account(address=spl_token::id())]
  /// CHECK: token program account
  token_program : AccountInfo<'info>,

    /// CHECK: clock!
  clock : AccountInfo<'info>,             
}


#[derive(Accounts)]
#[instruction(bump : u8)]
pub struct InitPool<'info> {
    #[account(mut)]
    owner : Signer<'info>,

    // #[account(init, seeds=[(*rand.key).as_ref()], bump=_bump, payer=owner, space=8+POOL_SIZE)]
    #[account(init, seeds=[(*rand.key).as_ref()], bump, payer=owner, space=8+POOL_SIZE)]
    pool : Account<'info, Pool>,

    /// CHECK: random account
    rand : AccountInfo<'info>,

    #[account(owner=spl_token::id())]
    /// CHECK: reward mint account
    reward_mint : AccountInfo<'info>,

    #[account(owner=spl_token::id())]
    /// CHECK: reward account
    reward_account : AccountInfo<'info>,

    system_program : Program<'info,System>,
}

#[derive(Accounts)]
pub struct InitTokenData<'info> {
  #[account(mut)]
  owner : Signer<'info>, 

  pool : Account<'info,Pool>,

  #[account(init, payer=owner, space=8+TOKENDATA_SIZE)]
  /// CHECK: token data account
  token_data : Account<'info,TokenData>,

  system_program : Program<'info,System>,
}

pub const POOL_SIZE : usize = 32 + 32 + 32 + 32 + 8 + 8 + 1 + 4 + MAX_SYMBOL_LENGTH + 1;
pub const STAKEDATA_SIZE : usize = 1 + 32 + 32 + 32 + 8 + 1;
pub const TOKENDATA_SIZE : usize = 32 + 32 + 8 + 8 + 8 + 1;
pub const PERIOD : i64 = 24 * 60 * 60;

#[account]
pub struct Pool {
    pub owner : Pubkey,
    pub rand : Pubkey,
    pub reward_mint : Pubkey,
    pub reward_account : Pubkey,
    pub reward_amount : i64,
    pub period : i64,
    // pub withdrawable : u8,
    pub stake_collection : String,
    pub total_staked : i64,
    pub bump : u8,
}

#[account]
pub struct StakeData {
    pub unstaked : bool,
    pub owner : Pubkey,
    pub pool : Pubkey,
    pub account : Pubkey,
    pub stake_time : i64,
    pub withdrawn_number : u8,
}

#[account]
pub struct TokenData {
    pub owner : Pubkey,
    pub pool : Pubkey,
    pub stake_time : i64,
    pub stake_amount : i64,
    pub pending_amount : i64,
    pub first_stake : bool,
}

#[error_code]
pub enum PoolError {
    #[msg("Token mint to failed")]
    TokenMintToFailed,

    #[msg("Token set authority failed")]
    TokenSetAuthorityFailed,

    #[msg("Token transfer failed")]
    TokenTransferFailed,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Invalid metadata")]
    InvalidMetadata,

    #[msg("Invalid stakedata account")]
    InvalidStakeData,

    #[msg("Invalid time")]
    InvalidTime,

    #[msg("Invalid Period")]
    InvalidPeriod,

    #[msg("Already unstaked")]
    AlreadyUnstaked,

    #[msg("Invalid Collection")]
    InvalidCollection,

    #[msg("Invalid Token Address")]
    InvalidTokenAddress,
}