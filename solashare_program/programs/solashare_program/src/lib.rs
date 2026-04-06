use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token_interface::{TokenAccount, Mint, TokenInterface};
use anchor_spl::token::{self, Transfer};

declare_id!("DtRpAZKe3D38mYFyLgGHsSs8gFDFtB4WKPsR1yz6gD5S");

/// SolaShare On-Chain Program
/// 
/// Implements core RWA investment platform logic:
/// - Asset management
/// - Share purchases (buy_shares)
/// - Revenue posting (post_revenue)
/// - Yield claiming (claim_yield)

#[program]
pub mod solashare_program {
    use super::*;

    /// Initialize a new asset with sale parameters
    pub fn create_asset(
        ctx: Context<CreateAsset>,
        asset_id: String,
        metadata_uri: String,
        total_shares: u64,
        price_per_share: u64,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.issuer = ctx.accounts.issuer.key();
        asset.asset_id = asset_id.clone();
        asset.metadata_uri = metadata_uri;
        asset.status = AssetStatus::Draft as u8;
        asset.share_mint = ctx.accounts.share_mint.key();
        asset.vault = ctx.accounts.vault.key();
        asset.total_shares = total_shares;
        asset.shares_sold = 0;
        asset.price_per_share = price_per_share;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.bump = ctx.bumps.asset;

        msg!("Asset created: {}", asset_id);
        Ok(())
    }

    /// Activate asset for sale
    pub fn activate_sale(ctx: Context<ActivateSale>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Draft as u8, SolashareError::InvalidAssetStatus);
        asset.status = AssetStatus::ActiveSale as u8;
        msg!("Sale activated for asset: {}", asset.asset_id);
        Ok(())
    }

    /// Buy shares in an active offering
    pub fn buy_shares(
        ctx: Context<BuyShares>,
        amount_usdc: u64,
        shares_to_receive: u64,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        
        // Validate asset is in active sale
        require!(asset.status == AssetStatus::ActiveSale as u8, SolashareError::SaleNotActive);
        
        // Validate shares available
        let shares_remaining = asset.total_shares.saturating_sub(asset.shares_sold);
        require!(shares_to_receive <= shares_remaining, SolashareError::InsufficientShares);
        
        // Validate price (basic check)
        let expected_cost = shares_to_receive.checked_mul(asset.price_per_share).unwrap();
        require!(amount_usdc >= expected_cost, SolashareError::InsufficientPayment);

        // Transfer USDC from investor to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.investor_usdc_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.investor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount_usdc)?;

        // Update shares sold
        asset.shares_sold = asset.shares_sold.checked_add(shares_to_receive).unwrap();

        // Check if fully funded
        if asset.shares_sold >= asset.total_shares {
            asset.status = AssetStatus::Funded as u8;
            msg!("Asset fully funded: {}", asset.asset_id);
        }

        msg!(
            "Shares purchased: {} shares for {} USDC by {}",
            shares_to_receive,
            amount_usdc,
            ctx.accounts.investor.key()
        );

        Ok(())
    }

    /// Post revenue for a new epoch
    pub fn post_revenue(
        ctx: Context<PostRevenue>,
        epoch_number: u64,
        amount: u64,
        report_hash: [u8; 32],
    ) -> Result<()> {
        let asset = &ctx.accounts.asset;
        
        // Only issuer can post revenue
        require!(asset.issuer == ctx.accounts.issuer.key(), SolashareError::Unauthorized);
        
        // Asset must be funded or later
        require!(
            asset.status >= AssetStatus::Funded as u8,
            SolashareError::AssetNotFunded
        );

        let revenue_epoch = &mut ctx.accounts.revenue_epoch;
        revenue_epoch.asset = ctx.accounts.asset.key();
        revenue_epoch.epoch_number = epoch_number;
        revenue_epoch.amount = amount;
        revenue_epoch.report_hash = report_hash;
        revenue_epoch.claimed_so_far = 0;
        revenue_epoch.posted_at = Clock::get()?.unix_timestamp;
        revenue_epoch.status = RevenueStatus::Posted as u8;
        revenue_epoch.bump = ctx.bumps.revenue_epoch;

        msg!(
            "Revenue posted: epoch {} amount {} for asset {}",
            epoch_number,
            amount,
            asset.asset_id
        );

        Ok(())
    }

    /// Claim yield for a specific epoch
    pub fn claim_yield(
        ctx: Context<ClaimYield>,
        _epoch_number: u64,
        claim_amount: u64,
    ) -> Result<()> {
        let asset = &ctx.accounts.asset;
        let revenue_epoch = &mut ctx.accounts.revenue_epoch;
        let claim_record = &mut ctx.accounts.claim_record;

        // Store revenue epoch key before mutable operations
        let revenue_epoch_key = revenue_epoch.key();
        let epoch_number = revenue_epoch.epoch_number;

        // Verify revenue epoch is claimable
        require!(
            revenue_epoch.status == RevenueStatus::Posted as u8,
            SolashareError::EpochNotClaimable
        );

        // Verify claim hasn't been made
        require!(claim_record.amount_claimed == 0, SolashareError::AlreadyClaimed);

        // Verify claimant owns shares (simplified - in production check token balance)
        // For MVP, we trust the backend calculation

        // Verify claim doesn't exceed remaining
        let remaining = revenue_epoch.amount.saturating_sub(revenue_epoch.claimed_so_far);
        require!(claim_amount <= remaining, SolashareError::InsufficientRevenue);

        // Transfer from vault to claimant
        let asset_id_bytes = asset.asset_id.as_bytes();
        let seeds = &[
            b"vault",
            asset_id_bytes,
            &[ctx.accounts.vault.to_account_info().data.borrow()[8]], // vault bump
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.claimant_usdc_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, claim_amount)?;

        // Update claim record
        claim_record.user = ctx.accounts.claimant.key();
        claim_record.asset = asset.key();
        claim_record.epoch = revenue_epoch_key;
        claim_record.amount_claimed = claim_amount;
        claim_record.claimed_at = Clock::get()?.unix_timestamp;
        claim_record.bump = ctx.bumps.claim_record;

        // Update epoch totals
        revenue_epoch.claimed_so_far = revenue_epoch.claimed_so_far.checked_add(claim_amount).unwrap();

        // Check if fully settled
        if revenue_epoch.claimed_so_far >= revenue_epoch.amount {
            revenue_epoch.status = RevenueStatus::Settled as u8;
        }

        msg!(
            "Yield claimed: {} USDC by {} for epoch {}",
            claim_amount,
            ctx.accounts.claimant.key(),
            epoch_number
        );

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
#[derive(Default)]
pub struct AssetAccount {
    pub issuer: Pubkey,
    pub asset_id: String,        // max 64 chars
    pub metadata_uri: String,    // max 200 chars
    pub status: u8,
    pub share_mint: Pubkey,
    pub vault: Pubkey,
    pub total_shares: u64,
    pub shares_sold: u64,
    pub price_per_share: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct RevenueEpochAccount {
    pub asset: Pubkey,
    pub epoch_number: u64,
    pub amount: u64,
    pub report_hash: [u8; 32],
    pub claimed_so_far: u64,
    pub posted_at: i64,
    pub status: u8,
    pub bump: u8,
}

#[account]
#[derive(Default)]
pub struct ClaimRecord {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub epoch: Pubkey,
    pub amount_claimed: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        init,
        payer = issuer,
        space = 8 + 32 + 68 + 204 + 1 + 32 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"asset", asset_id.as_bytes()],
        bump
    )]
    pub asset: Account<'info, AssetAccount>,

    pub share_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Vault PDA
    #[account(
        seeds = [b"vault", asset_id.as_bytes()],
        bump
    )]
    pub vault: AccountInfo<'info>,

    pub system_program: Program<'info, system_program::System>,
}

#[derive(Accounts)]
pub struct ActivateSale<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        mut,
        has_one = issuer,
    )]
    pub asset: Account<'info, AssetAccount>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(mut)]
    pub asset: Account<'info, AssetAccount>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub investor_usdc_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(epoch_number: u64)]
pub struct PostRevenue<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(mut)]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        init,
        payer = issuer,
        space = 8 + 32 + 8 + 8 + 32 + 8 + 8 + 1 + 1,
        seeds = [b"revenue", asset.asset_id.as_bytes(), &epoch_number.to_le_bytes()],
        bump
    )]
    pub revenue_epoch: Account<'info, RevenueEpochAccount>,

    pub system_program: Program<'info, system_program::System>,
}

#[derive(Accounts)]
#[instruction(epoch_number: u64)]
pub struct ClaimYield<'info> {
    #[account(mut)]
    pub claimant: Signer<'info>,

    pub asset: Account<'info, AssetAccount>,

    #[account(mut)]
    pub revenue_epoch: Account<'info, RevenueEpochAccount>,

    #[account(
        init,
        payer = claimant,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"claim", asset.asset_id.as_bytes(), claimant.key().as_ref(), &epoch_number.to_le_bytes()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub claimant_usdc_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, system_program::System>,
}

// ============================================================================
// Enums
// ============================================================================

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum AssetStatus {
    Draft = 0,
    Verified = 1,
    ActiveSale = 2,
    Funded = 3,
    Frozen = 4,
    Closed = 5,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum RevenueStatus {
    Posted = 0,
    Settled = 1,
    Flagged = 2,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum SolashareError {
    #[msg("Invalid asset status for this operation")]
    InvalidAssetStatus,
    #[msg("Sale is not active")]
    SaleNotActive,
    #[msg("Insufficient shares available")]
    InsufficientShares,
    #[msg("Insufficient payment")]
    InsufficientPayment,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Asset not funded yet")]
    AssetNotFunded,
    #[msg("Epoch not claimable")]
    EpochNotClaimable,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Insufficient revenue remaining")]
    InsufficientRevenue,
}
