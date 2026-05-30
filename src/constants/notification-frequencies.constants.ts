/**
 * Notification frequencies available in the application
 * Using enum for better type safety and autocompletion
 */

// - 1 time
// - 1 time + Next day
// - 1 time + Next week
// - 1 time + Every month

export enum NotificationFrequency {
  ONE_TIME = "one_time",
  ONE_TIME_NEXT_DAY = "one_time_next_day",
  ONE_TIME_NEXT_WEEK = "one_time_next_week",
  ONE_TIME_EVERY_MONTH = "one_time_every_month",
}

export const NotificationFrequencyIds = {
  ONE_TIME: 1,
  ONE_TIME_NEXT_DAY: 2,
  ONE_TIME_NEXT_WEEK: 3,
  ONE_TIME_EVERY_MONTH: 4,
} as const;

/**
 * Provides descriptions for notification frequencies
 */
export const NOTIFICATION_FREQUENCY_DESCRIPTIONS: Record<
  NotificationFrequency,
  string
> = {
  [NotificationFrequency.ONE_TIME]: "One Time",
  [NotificationFrequency.ONE_TIME_NEXT_DAY]: "One Time + Next Day",
  [NotificationFrequency.ONE_TIME_NEXT_WEEK]: "One Time + Next Week",
  [NotificationFrequency.ONE_TIME_EVERY_MONTH]: "One Time + Every Month",
};
