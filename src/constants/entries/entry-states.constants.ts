/**
 * Entry types available in the application
 * Using enum for better type safety and autocompletion
 */
export enum EntryState {
  NEW = "new",
  RETURNED = "returned",
}

export const EntryStateIds = {
  NEW: 1,
  RETURNED: 2,
} as const;

/**
 * Provides descriptions for entry types
 */
export const ENTRY_STATE_DESCRIPTIONS: Record<EntryState, string> = {
  [EntryState.NEW]: "New",
  [EntryState.RETURNED]: "Returned",
};
