export enum GroupCriteriaType {
  MOQ = "MOQ",
  NUMBER_PER_SERIES = "Number per Series",
}

export const GroupCriteriaTypeIds = {
  MOQ: 1,
  NUMBER_PER_SERIES: 2,
} as const;

export const GROUP_CRITERIA_TYPE_DESCRIPTIONS: Record<GroupCriteriaType, string> = {
  [GroupCriteriaType.MOQ]: "Minimum order quantity required to place a group order",
  [GroupCriteriaType.NUMBER_PER_SERIES]:
    "Total units per series or bundle required to qualify the group",
};
