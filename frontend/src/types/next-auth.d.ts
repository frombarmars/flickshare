import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      walletAddress?: string;
      username?: string;
      profilePicture?: string;
      twitterUsername?: string;
      discordUsername?: string;
      discordId?: string;
      isAdmin?: boolean;
      createdAt?: string;
      updatedAt?: string;
      profilePictureUrl?: string;
    };
  }

  interface User {
    id: string;
    walletAddress?: string;
    username: string;
    profilePicture?: string;
    twitterUsername?: string;
    discordUsername?: string;
    discordId?: string;
    isAdmin?: boolean;
    createdAt?: string;
    updatedAt?: string;
    profilePictureUrl?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    userId?: string;
    walletAddress?: string;
    username: string;
    profilePicture?: string;
    twitterUsername?: string;
    discordUsername?: string;
    discordId?: string;
    isAdmin?: boolean;
    createdAt?: string;
    updatedAt?: string;
    profilePictureUrl?: string;
  }
}