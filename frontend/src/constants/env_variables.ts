// src/constants/env_variables.ts

export const ENV_VARIABLES = {
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  // TMDB
  TMDB_API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY || '',
  TMDB_BASE_URL: process.env.NEXT_PUBLIC_TMDB_API_BASE || 'https://api.themoviedb.org/3',
  TMDB_IMAGE_BASE: process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500',

  // WorldCoin
  WORLD_MINIAPP_ID: process.env.NEXT_PUBLIC_WLD_MINIAPP_ID || '',

  // Auth
  AUTH_URL: process.env.NEXTAUTH_URL || '',
  AUTH_SECRET: process.env.AUTH_SECRET || '',
  HMAC_SECRET_KEY: process.env.HMAC_SECRET_KEY || '',

  // DB
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Discord
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',

  // Contracts
  FLICKSHARE_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_FLICKSHARE_CONTRACT_ADDRESS || '',
  WLD_TOKEN_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_WLD_TOKEN_CONTRACT_ADDRESS || '',
  NFT_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '',

  // Blockchain
  ETHEREUM_RPC_URL: 'https://worldchain-mainnet.g.alchemy.com/public',

  // External Services
  X_API_KEY: process.env.X_API_KEY || '',
};