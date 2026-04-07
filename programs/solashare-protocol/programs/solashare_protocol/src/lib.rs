use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};
use sha2::{Digest, Sha256};

declare_id!("BzuRAoQ72M1MzN8hfqde7J5KzgKC7KJ2VkEtxyLLBd6K");

const SHARE_SCALE: u64 = 1_000_000;
const SHARE_TOKEN_DECIMALS: u8 = 6;

#[program]
pub mod solashare_protocol {
    use super::*;

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
        asset.payment_mint = ctx.accounts.payment_mint.key();
        asset.total_shares = total_shares;
        asset.shares_sold = 0;
        asset.price_per_share = price_per_share;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.bump = ctx.bumps.asset;

        msg!("Asset created: {}", asset_id);
        Ok(())
    }

    pub fn activate_sale(ctx: Context<ActivateSale>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(
            asset.status == AssetStatus::Draft as u8,
            SolashareError::InvalidAssetStatus
        );
        asset.status = AssetStatus::ActiveSale as u8;
        msg!("Sale activated for asset: {}", asset.asset_id);
        Ok(())
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        amount_usdc: u64,
        shares_to_receive: u64,
    ) -> Result<()> {
        let asset = &mut ctx.accounts.asset;

        require!(
            asset.status == AssetStatus::ActiveSale as u8,
            SolashareError::SaleNotActive
        );
        require!(
            ctx.accounts.share_mint.key() == asset.share_mint,
            SolashareError::InvalidShareMint
        );
        require!(
            ctx.accounts.vault.key() == asset.vault,
            SolashareError::InvalidVault
        );
        require!(
            ctx.accounts.payment_mint.key() == asset.payment_mint,
            SolashareError::InvalidPaymentMint
        );

        let shares_remaining = asset.total_shares.saturating_sub(asset.shares_sold);
        require!(
            shares_to_receive <= shares_remaining,
            SolashareError::InsufficientShares
        );

        let expected_cost = shares_to_receive
            .checked_mul(asset.price_per_share)
            .and_then(div_ceil_share_scale)
            .ok_or(SolashareError::ArithmeticOverflow)?;
        require!(
            amount_usdc >= expected_cost,
            SolashareError::InsufficientPayment
        );

        let transfer_accounts = TransferChecked {
            from: ctx.accounts.investor_usdc_account.to_account_info(),
            mint: ctx.accounts.payment_mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.investor.to_account_info(),
        };
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
        );
        token_interface::transfer_checked(
            transfer_ctx,
            amount_usdc,
            ctx.accounts.payment_mint.decimals,
        )?;

        let asset_id_seed = asset.asset_id.to_asset_id_seed();
        let asset_bump = [asset.bump];
        let asset_account_info = asset.to_account_info();
        let signer_seeds = &[&[b"asset".as_ref(), asset_id_seed.as_ref(), &asset_bump][..]];

        let mint_accounts = MintTo {
            mint: ctx.accounts.share_mint.to_account_info(),
            to: ctx.accounts.investor_share_account.to_account_info(),
            authority: asset_account_info,
        };
        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            mint_accounts,
            signer_seeds,
        );
        token_interface::mint_to(mint_ctx, shares_to_receive)?;

        asset.shares_sold = asset
            .shares_sold
            .checked_add(shares_to_receive)
            .ok_or(SolashareError::ArithmeticOverflow)?;

        if asset.shares_sold >= asset.total_shares {
            asset.status = AssetStatus::Funded as u8;
            msg!("Asset fully funded: {}", asset.asset_id);
        }

        msg!(
            "Shares purchased: {} units for {} USDC units by {}",
            shares_to_receive,
            amount_usdc,
            ctx.accounts.investor.key()
        );

        Ok(())
    }

    pub fn post_revenue(
        ctx: Context<PostRevenue>,
        epoch_number: u64,
        amount: u64,
        report_hash: [u8; 32],
    ) -> Result<()> {
        let asset = &ctx.accounts.asset;

        require!(
            asset.issuer == ctx.accounts.issuer.key(),
            SolashareError::Unauthorized
        );
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

    pub fn claim_yield(
        ctx: Context<ClaimYield>,
        _epoch_number: u64,
        claim_amount: u64,
    ) -> Result<()> {
        let asset = &ctx.accounts.asset;
        let revenue_epoch = &mut ctx.accounts.revenue_epoch;
        let claim_record = &mut ctx.accounts.claim_record;

        let revenue_epoch_key = revenue_epoch.key();
        let epoch_number = revenue_epoch.epoch_number;

        require!(
            revenue_epoch.status == RevenueStatus::Posted as u8,
            SolashareError::EpochNotClaimable
        );
        require!(
            claim_record.amount_claimed == 0,
            SolashareError::AlreadyClaimed
        );

        let remaining = revenue_epoch
            .amount
            .saturating_sub(revenue_epoch.claimed_so_far);
        require!(
            claim_amount <= remaining,
            SolashareError::InsufficientRevenue
        );

        let asset_id_seed = asset.asset_id.to_asset_id_seed();
        let asset_bump = [asset.bump];
        let asset_account_info = ctx.accounts.asset.to_account_info();
        let signer_seeds = &[&[b"asset".as_ref(), asset_id_seed.as_ref(), &asset_bump][..]];

        let transfer_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.payment_mint.to_account_info(),
            to: ctx.accounts.claimant_usdc_account.to_account_info(),
            authority: asset_account_info,
        };
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );
        token_interface::transfer_checked(
            transfer_ctx,
            claim_amount,
            ctx.accounts.payment_mint.decimals,
        )?;

        claim_record.user = ctx.accounts.claimant.key();
        claim_record.asset = asset.key();
        claim_record.epoch = revenue_epoch_key;
        claim_record.amount_claimed = claim_amount;
        claim_record.claimed_at = Clock::get()?.unix_timestamp;
        claim_record.bump = ctx.bumps.claim_record;

        revenue_epoch.claimed_so_far = revenue_epoch
            .claimed_so_far
            .checked_add(claim_amount)
            .ok_or(SolashareError::ArithmeticOverflow)?;

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

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let asset = &ctx.accounts.asset;

        require!(
            amount >= 10_000_000, // $10 minimum (10 * 1_000_000)
            SolashareError::AmountTooSmall
        );

        let asset_id_seed = asset.asset_id.to_asset_id_seed();
        let asset_bump = [asset.bump];
        let asset_account_info = asset.to_account_info();
        let signer_seeds = &[&[b"asset".as_ref(), asset_id_seed.as_ref(), &asset_bump][..]];

        let transfer_accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.payment_mint.to_account_info(),
            to: ctx.accounts.issuer_usdc_account.to_account_info(),
            authority: asset_account_info,
        };
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );
        token_interface::transfer_checked(
            transfer_ctx,
            amount,
            ctx.accounts.payment_mint.decimals,
        )?;

        msg!(
            "Funds withdrawn: {} USDC by issuer {}",
            amount,
            ctx.accounts.issuer.key()
        );

        Ok(())
    }
}

pub trait ToAssetIdSeed {
    fn to_asset_id_seed(&self) -> [u8; 32];
}

impl ToAssetIdSeed for String {
    fn to_asset_id_seed(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(self.as_bytes());
        hasher.finalize().into()
    }
}

fn div_ceil_share_scale(value: u64) -> Option<u64> {
    value
        .checked_add(SHARE_SCALE.checked_sub(1)?)
        .map(|v| v / SHARE_SCALE)
}

#[account]
#[derive(Default, InitSpace)]
pub struct AssetAccount {
    pub issuer: Pubkey,
    #[max_len(64)]
    pub asset_id: String,
    #[max_len(200)]
    pub metadata_uri: String,
    pub status: u8,
    pub share_mint: Pubkey,
    pub vault: Pubkey,
    pub payment_mint: Pubkey,
    pub total_shares: u64,
    pub shares_sold: u64,
    pub price_per_share: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(Default, InitSpace)]
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
#[derive(Default, InitSpace)]
pub struct ClaimRecord {
    pub user: Pubkey,
    pub asset: Pubkey,
    pub epoch: Pubkey,
    pub amount_claimed: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        init,
        payer = issuer,
        space = 8 + AssetAccount::INIT_SPACE,
        seeds = [b"asset".as_ref(), asset_id.to_asset_id_seed().as_ref()],
        bump
    )]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        init,
        payer = issuer,
        mint::decimals = SHARE_TOKEN_DECIMALS,
        mint::authority = asset,
        mint::freeze_authority = asset,
        seeds = [b"share_mint".as_ref(), asset_id.to_asset_id_seed().as_ref()],
        bump
    )]
    pub share_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = issuer,
        token::mint = payment_mint,
        token::authority = asset,
        seeds = [b"vault".as_ref(), asset_id.to_asset_id_seed().as_ref()],
        bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub payment_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, system_program::System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(mut, has_one = issuer)]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        mut,
        constraint = vault.key() == asset.vault @ SolashareError::InvalidVault,
        constraint = vault.owner == asset.key() @ SolashareError::InvalidVault,
        constraint = vault.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = issuer_usdc_account.owner == issuer.key() @ SolashareError::InvalidIssuerUsdcAccount,
        constraint = issuer_usdc_account.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub issuer_usdc_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = payment_mint.key() == asset.payment_mint @ SolashareError::InvalidPaymentMint
    )]
    pub payment_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ActivateSale<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(mut, has_one = issuer)]
    pub asset: Account<'info, AssetAccount>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(mut)]
    pub asset: Account<'info, AssetAccount>,

    #[account(
        mut,
        constraint = vault.key() == asset.vault @ SolashareError::InvalidVault,
        constraint = vault.owner == asset.key() @ SolashareError::InvalidVault,
        constraint = vault.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = share_mint.key() == asset.share_mint @ SolashareError::InvalidShareMint
    )]
    pub share_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = investor_share_account.owner == investor.key() @ SolashareError::InvalidInvestorShareAccount,
        constraint = investor_share_account.mint == share_mint.key() @ SolashareError::InvalidInvestorShareAccount
    )]
    pub investor_share_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = investor_usdc_account.owner == investor.key() @ SolashareError::InvalidInvestorUsdcAccount,
        constraint = investor_usdc_account.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub investor_usdc_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = payment_mint.key() == asset.payment_mint @ SolashareError::InvalidPaymentMint
    )]
    pub payment_mint: InterfaceAccount<'info, Mint>,

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
        space = 8 + RevenueEpochAccount::INIT_SPACE,
        seeds = [b"revenue".as_ref(), asset.asset_id.to_asset_id_seed().as_ref(), &epoch_number.to_le_bytes()],
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
        space = 8 + ClaimRecord::INIT_SPACE,
        seeds = [b"claim".as_ref(), asset.asset_id.to_asset_id_seed().as_ref(), claimant.key().as_ref(), &epoch_number.to_le_bytes()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(
        mut,
        constraint = vault.key() == asset.vault @ SolashareError::InvalidVault,
        constraint = vault.owner == asset.key() @ SolashareError::InvalidVault,
        constraint = vault.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = claimant_usdc_account.owner == claimant.key() @ SolashareError::InvalidInvestorUsdcAccount,
        constraint = claimant_usdc_account.mint == payment_mint.key() @ SolashareError::InvalidPaymentMint
    )]
    pub claimant_usdc_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = payment_mint.key() == asset.payment_mint @ SolashareError::InvalidPaymentMint
    )]
    pub payment_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, system_program::System>,
}

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
    #[msg("Provided share mint does not match asset configuration")]
    InvalidShareMint,
    #[msg("Provided vault does not match asset configuration")]
    InvalidVault,
    #[msg("Provided payment mint does not match asset configuration")]
    InvalidPaymentMint,
    #[msg("Investor share token account is invalid")]
    InvalidInvestorShareAccount,
    #[msg("Investor USDC token account is invalid")]
    InvalidInvestorUsdcAccount,
    #[msg("Issuer USDC token account is invalid")]
    InvalidIssuerUsdcAccount,
    #[msg("Withdrawal amount too small (minimum 10 USDC)")]
    AmountTooSmall,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
