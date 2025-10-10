import { ethers } from 'ethers';
import prisma from './prisma';
import FlickShareContractABI from '@/abi/FlickShareContract.json';
import { ENV_VARIABLES } from '@/constants/env_variables';

// Types for event data
interface ReviewAddedEvent {
  reviewer: string;
  movieId: bigint;
  reviewId: bigint;
  reviewText: string;
  timestamp: bigint;
  rating: number;
}

interface SupportedEvent {
  reviewId: bigint;
  supporter: string;
  amount: bigint;
  feePercent: bigint;
  devFee: bigint;
  reviewerAmount: bigint;
}

interface ReviewLikedEvent {
  reviewId: bigint;
  liker: string;
  newLikeCount: bigint;
}

interface CheckinSuccessfulEvent {
  user: string;
}

export class ContractEventListener {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private isListening = false;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(ENV_VARIABLES.ETHEREUM_RPC_URL);
    
    // Initialize contract
    this.contract = new ethers.Contract(
      ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS,
      FlickShareContractABI,
      this.provider
    );
  }

  async startListening() {
    if (this.isListening) {
      console.log('Contract event listener is already running');
      return;
    }

    console.log('Starting contract event listener...');
    this.isListening = true;

    try {
      // Listen for ReviewAdded events
      this.contract.on('ReviewAdded', async (
        reviewer: string,
        movieId: bigint,
        reviewId: bigint,
        reviewText: string,
        timestamp: bigint,
        rating: number,
        event: any
      ) => {
        await this.handleReviewAdded({
          reviewer,
          movieId,
          reviewId,
          reviewText,
          timestamp,
          rating
        }, event);
      });

      // Listen for Supported events
      this.contract.on('Supported', async (
        reviewId: bigint,
        supporter: string,
        amount: bigint,
        feePercent: bigint,
        devFee: bigint,
        reviewerAmount: bigint,
        event: any
      ) => {
        await this.handleSupported({
          reviewId,
          supporter,
          amount,
          feePercent,
          devFee,
          reviewerAmount
        }, event);
      });

      // Listen for ReviewLiked events
      this.contract.on('ReviewLiked', async (
        reviewId: bigint,
        liker: string,
        newLikeCount: bigint,
        event: any
      ) => {
        await this.handleReviewLiked({
          reviewId,
          liker,
          newLikeCount
        }, event);
      });

      // Listen for CheckinSuccessful events
      this.contract.on('CheckinSuccessful', async (
        user: string,
        event: any
      ) => {
        await this.handleCheckinSuccessful({
          user
        }, event);
      });

      console.log('Contract event listener started successfully');
    } catch (error) {
      console.error('Error starting contract event listener:', error);
      this.isListening = false;
    }
  }

  async stopListening() {
    if (!this.isListening) return;

    console.log('Stopping contract event listener...');
    this.contract.removeAllListeners();
    this.isListening = false;
    console.log('Contract event listener stopped');
  }

  private async handleReviewAdded(eventData: ReviewAddedEvent, event: any) {
    try {
      console.log('ReviewAdded event received:', eventData);

      // Find or create user
      let user = await prisma.user.findFirst({
        where: { walletAddress: eventData.reviewer.toLowerCase() }
      });

      if (!user) {
        // Create user if doesn't exist
        user = await prisma.user.create({
          data: {
            walletAddress: eventData.reviewer.toLowerCase(),
            username: `user_${eventData.reviewer.substring(2, 8).toLowerCase()}`,
            profilePicture: '/placeholder.jpeg'
          }
        });
      }

      // Find or create movie
      const movie = await prisma.movie.findUnique({
        where: { tmdbId: Number(eventData.movieId) }
      });

      if (!movie) {
        console.warn(`Movie with TMDB ID ${eventData.movieId} not found in database`);
        return;
      }

      // Check if review already exists
      const existingReview = await prisma.review.findFirst({
        where: { 
          numericId: Number(eventData.reviewId),
          reviewerId: user.id 
        }
      });

      if (existingReview) {
        console.log(`Review ${eventData.reviewId} already exists in database`);
        return;
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          numericId: Number(eventData.reviewId),
          reviewerId: user.id,
          movieId: movie.id,
          comment: eventData.reviewText,
          rating: eventData.rating,
          createdAt: new Date(Number(eventData.timestamp) * 1000),
          txHash: event.transactionHash
        }
      });

      console.log(`Review ${eventData.reviewId} created in database:`, review.id);
    } catch (error) {
      console.error('Error handling ReviewAdded event:', error);
    }
  }

  private async handleSupported(eventData: SupportedEvent, event: any) {
    try {
      console.log('Supported event received:', eventData);

      // Find supporter user
      let supporter = await prisma.user.findFirst({
        where: { walletAddress: eventData.supporter.toLowerCase() }
      });

      if (!supporter) {
        // Create user if doesn't exist
        supporter = await prisma.user.create({
          data: {
            walletAddress: eventData.supporter.toLowerCase(),
            username: `user_${eventData.supporter.substring(2, 8).toLowerCase()}`,
            profilePicture: '/placeholder.jpeg'
          }
        });
      }

      // Find review by numericId
      const review = await prisma.review.findFirst({
        where: { numericId: Number(eventData.reviewId) }
      });

      if (!review) {
        console.warn(`Review with numericId ${eventData.reviewId} not found`);
        return;
      }

      // Check if support already exists
      const existingSupport = await prisma.support.findFirst({
        where: {
          txHash: event.transactionHash
        }
      });

      if (existingSupport) {
        console.log(`Support with txHash ${event.transactionHash} already exists`);
        return;
      }

      // Create support record
      const support = await prisma.support.create({
        data: {
          userId: supporter.id,
          reviewId: review.id,
          amount: Number(eventData.amount),
          txHash: event.transactionHash,
          createdAt: new Date()
        }
      });

      // Create notification for review owner
      if (review.reviewerId && review.reviewerId !== supporter.id) {
        await prisma.notification.create({
          data: {
            recipientId: review.reviewerId,
            triggeredById: supporter.id,
            type: "SUPPORT",
            message: `supported your review with ${Number(eventData.amount)} WLD`,
            entityId: review.numericId?.toString(),
          },
        });
      }

      console.log(`Support ${support.id} created for review ${eventData.reviewId}`);
    } catch (error) {
      console.error('Error handling Supported event:', error);
    }
  }

  private async handleReviewLiked(eventData: ReviewLikedEvent, event: any) {
    try {
      console.log('ReviewLiked event received:', eventData);

      // Find liker user
      let liker = await prisma.user.findFirst({
        where: { walletAddress: eventData.liker.toLowerCase() }
      });

      if (!liker) {
        // Create user if doesn't exist
        liker = await prisma.user.create({
          data: {
            walletAddress: eventData.liker.toLowerCase(),
            username: `user_${eventData.liker.substring(2, 8).toLowerCase()}`,
            profilePicture: '/placeholder.jpeg'
          }
        });
      }

      // Find review by numericId
      const review = await prisma.review.findFirst({
        where: { numericId: Number(eventData.reviewId) },
        include: { movie: { select: { title: true } } }
      });

      if (!review) {
        console.warn(`Review with numericId ${eventData.reviewId} not found`);
        return;
      }

      // Check if like already exists
      const existingLike = await prisma.reviewLike.findFirst({
        where: {
          reviewId: review.id,
          userId: liker.id
        }
      });

      if (existingLike) {
        console.log(`Like already exists for review ${eventData.reviewId} by user ${liker.id}`);
        return;
      }

      // Create like record
      const like = await prisma.reviewLike.create({
        data: {
          reviewId: review.id,
          userId: liker.id,
          txHash: event.transactionHash
        }
      });

      // Create notification for review owner
      if (review.reviewerId && review.reviewerId !== liker.id) {
        await prisma.notification.create({
          data: {
            recipientId: review.reviewerId,
            triggeredById: liker.id,
            type: "LIKE",
            message: `liked your review for ${review.movie.title}`,
            entityId: review.numericId?.toString(),
          },
        });
      }

      console.log(`Like ${like.id} created for review ${eventData.reviewId}`);
    } catch (error) {
      console.error('Error handling ReviewLiked event:', error);
    }
  }

  private async handleCheckinSuccessful(eventData: CheckinSuccessfulEvent, event: any) {
    try {
      console.log('CheckinSuccessful event received:', eventData);

      // Find user
      let user = await prisma.user.findFirst({
        where: { walletAddress: eventData.user.toLowerCase() }
      });

      if (!user) {
        // Create user if doesn't exist
        user = await prisma.user.create({
          data: {
            walletAddress: eventData.user.toLowerCase(),
            username: `user_${eventData.user.substring(2, 8).toLowerCase()}`,
            profilePicture: '/placeholder.jpeg'
          }
        });
      }

      // Create check-in record (you might want to create a CheckIn model)
      // For now, we'll just log it
      console.log(`Check-in successful for user ${user.id} (${eventData.user})`);

      // Optionally, you could create a daily check-in table or update user stats
    } catch (error) {
      console.error('Error handling CheckinSuccessful event:', error);
    }
  }

  // Method to catch up on missed events from a specific block
  async syncEventsFromBlock(fromBlock: number) {
    try {
      console.log(`Syncing events from block ${fromBlock}...`);

      // Get ReviewAdded events
      const reviewAddedFilter = this.contract.filters.ReviewAdded();
      const reviewAddedEvents = await this.contract.queryFilter(reviewAddedFilter, fromBlock);

      for (const event of reviewAddedEvents) {
        if ('args' in event && event.args) {
          await this.handleReviewAdded({
            reviewer: event.args[0],
            movieId: event.args[1],
            reviewId: event.args[2],
            reviewText: event.args[3],
            timestamp: event.args[4],
            rating: event.args[5]
          }, event);
        }
      }

      // Get Supported events
      const supportedFilter = this.contract.filters.Supported();
      const supportedEvents = await this.contract.queryFilter(supportedFilter, fromBlock);

      for (const event of supportedEvents) {
        if ('args' in event && event.args) {
          await this.handleSupported({
            reviewId: event.args[0],
            supporter: event.args[1],
            amount: event.args[2],
            feePercent: event.args[3],
            devFee: event.args[4],
            reviewerAmount: event.args[5]
          }, event);
        }
      }

      // Get ReviewLiked events
      const reviewLikedFilter = this.contract.filters.ReviewLiked();
      const reviewLikedEvents = await this.contract.queryFilter(reviewLikedFilter, fromBlock);

      for (const event of reviewLikedEvents) {
        if ('args' in event && event.args) {
          await this.handleReviewLiked({
            reviewId: event.args[0],
            liker: event.args[1],
            newLikeCount: event.args[2]
          }, event);
        }
      }

      // Get CheckinSuccessful events
      const checkinFilter = this.contract.filters.CheckinSuccessful();
      const checkinEvents = await this.contract.queryFilter(checkinFilter, fromBlock);

      for (const event of checkinEvents) {
        if ('args' in event && event.args) {
          await this.handleCheckinSuccessful({
            user: event.args[0]
          }, event);
        }
      }

      console.log(`Event sync completed from block ${fromBlock}`);
    } catch (error) {
      console.error('Error syncing events:', error);
    }
  }
}

// Singleton instance
export const contractEventListener = new ContractEventListener();