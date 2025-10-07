import { hashNonce } from '@/auth/wallet/client-helpers';
import { generateReferralCode } from '@/lib/generateRefCode';
import DiscordProvider from "next-auth/providers/discord";
import prisma from '@/lib/prisma';
import {
  MiniAppWalletAuthSuccessPayload,
  MiniKit,
  verifySiweMessage,
} from '@worldcoin/minikit-js';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { ENV_VARIABLES } from '@/constants/env_variables';
import { awardPoints } from '@/lib/points';

// Auth configuration for Wallet Auth based sessions
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: ENV_VARIABLES.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    // Existing World App provider
    Credentials({
      id: 'world-app',
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
        inviteCode: { label: 'Invite Code', type: 'text' },
      },
      authorize: async (credentials) => {
        const { nonce, signedNonce, finalPayloadJson, inviteCode } = credentials as {
          nonce: string;
          signedNonce: string;
          finalPayloadJson: string;
          inviteCode: string;
        };

        const expectedSignedNonce = hashNonce({ nonce });

        if (signedNonce !== expectedSignedNonce) {
          return null;
        }
        const finalPayload: MiniAppWalletAuthSuccessPayload =
          JSON.parse(finalPayloadJson);
        const result = await verifySiweMessage(finalPayload, nonce);

        if (!result.isValid || !result.siweMessageData.address) {
          return null;
        }

        try {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { walletAddress: finalPayload.address }
          });

          // inside authorize for "world-app"
          if (existingUser) {
            const userInfo = await MiniKit.getUserInfo(finalPayload.address);

            return {
              id: existingUser.id,
              walletAddress: existingUser.walletAddress,
              username: existingUser.username || userInfo.username || `User ${finalPayload.address.slice(0, 6)}`,
              profilePicture: userInfo.profilePictureUrl || existingUser.profilePicture || '',
              twitterUsername: existingUser.twitterUsername || '',
              discordUsername: existingUser.discordUsername || '',
              isAdmin: Boolean(existingUser.isAdmin),
              createdAt: existingUser.createdAt.toISOString(),
              updatedAt: existingUser.updatedAt.toISOString(),
            };
          } else {

            const userInfo = await MiniKit.getUserInfo(finalPayload.address);
            const fallbackUsername = userInfo.username || `User ${finalPayload.address.slice(0, 6)}`;

            // If inviteCode provided, fetch it (no "used" check)
            let inviteRecord: Awaited<ReturnType<typeof prisma.inviteCode.findUnique>> = null;
            if (inviteCode) {
              inviteRecord = await prisma.inviteCode.findUnique({
                where: { code: inviteCode },
              });

              if (!inviteRecord) {
                inviteRecord = null;
              } else if (inviteRecord.expiresAt <= new Date()) {
                inviteRecord = null;
              }
            }

            // Create new user and a new invite code for them
            const createdUser = await prisma.user.create({
              data: {
                username: fallbackUsername,
                twitterUsername: '',
                discordUsername: '',
                walletAddress: finalPayload.address,
                profilePicture: userInfo.profilePictureUrl || '',
                isAdmin: false,
                inviteCode: {
                  create: {
                    code: generateReferralCode(),
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // expires in 30 days
                  },
                },
              },
              include: { inviteCode: true },
            });

            // If a valid invite code was provided, create a Referral and set referredById
            if (inviteRecord) {
              try {
                const referral = await prisma.referral.create({
                  data: {
                    referrerId: inviteRecord.userId,
                    referred: { connect: { id: createdUser.id } },
                  },
                });

                await prisma.user.update({
                  where: { id: createdUser.id },
                  data: { referredById: referral.id },
                });

                await awardPoints(
                  inviteRecord.userId,
                  `INVITE`, // ensures per-referree idempotency
                  50 // choose your value
                );

                // 2) Optionally credit the new user for joining with a valid referral
                await awardPoints(
                  createdUser.id,
                  'INVITED',
                  50,
                  { once: true } // only once per user
                );

              } catch (referralError) {
              }
            }

            return {
              id: createdUser.id,
              walletAddress: createdUser.walletAddress,
              username: createdUser.username!,
              profilePicture: createdUser.profilePicture || '',
              twitterUsername: createdUser.twitterUsername || '',
              discordUsername: createdUser.discordUsername || '',
              isAdmin: Boolean(createdUser.isAdmin),
              createdAt: createdUser.createdAt.toISOString(),
              updatedAt: createdUser.updatedAt.toISOString(),
            };
          }


        } catch (error) {

          // Fallback: If database fails, still allow authentication with MiniKit data
          try {
            const userInfo = await MiniKit.getUserInfo(finalPayload.address);
            const fallbackUsername = userInfo.username || `User ${finalPayload.address.slice(0, 6)}`;

            return {
              id: finalPayload.address,
              walletAddress: finalPayload.address,
              username: fallbackUsername,
              profilePicture: userInfo.profilePictureUrl || '',
              twitterUsername: '',
              discordUsername: '',
              isAdmin: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          } catch (miniKitError) {
            return null;
          }
        }
      },
    }),
    DiscordProvider({
      clientId: ENV_VARIABLES.DISCORD_CLIENT_ID!,
      clientSecret: ENV_VARIABLES.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: { scope: "identify" }, // add "guilds" if you need server info
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // When coming back from Discord OAuth, capture username and id
      if (account?.provider === "discord" && profile) {
        const p = profile as any;
        token.discordId = p.id; // <-- add this
        token.discordUsername =
          p.username + ((p.discriminator ?? "0") !== "0" ? `#${p.discriminator}` : "");
      }

      // Persist user-derived fields if available
      if (user) {
        token.id = user.id;
        token.walletAddress = (user as any).walletAddress;
        token.username = (user as any).username;
        token.profilePicture = (user as any).profilePicture;
        token.twitterUsername = (user as any).twitterUsername;
        token.discordUsername = (user as any).discordUsername || token.discordUsername;
        token.discordId = (user as any).discordId || token.discordId; // <-- add this
        token.userId = user.id;
        token.isAdmin = (user as any).isAdmin ?? false;
        token.createdAt = (user as any).createdAt;
        token.updatedAt = (user as any).updatedAt;
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure session has the fields the UI needs
      session.user = {
        ...(session.user || {}),
        id: token.id as string,
        walletAddress: token.walletAddress as string,
        username: token.username as string,
        profilePicture: token.profilePicture as string,
        twitterUsername: token.twitterUsername as string,
        discordUsername: token.discordUsername as string | undefined,
        discordId: token.discordId as string | undefined, // <-- add this
        isAdmin: Boolean(token.isAdmin),
        createdAt: token.createdAt as string | undefined,
        updatedAt: token.updatedAt as string | undefined,
      } as any;
      return session;
    },
  },
});