import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import { userSubscriptions } from "./db/schema";
import { eq } from "drizzle-orm";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const checkSubscription = async () => {
  const { userId } =  await auth();

  if (!userId) {
    return false;
  }

  const subscriptions = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!subscriptions[0]) {
    return false;
  }

  const sub = subscriptions[0];

  if (!sub.stripePriceId || !sub.stripeCurrentPeriodEnd) {
    return false;
  }

  const isValid = sub.stripeCurrentPeriodEnd.getTime() + DAY_IN_MS > Date.now();

  return isValid;
};
