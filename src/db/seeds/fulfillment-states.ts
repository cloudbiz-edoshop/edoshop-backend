import type { Database } from "@/db";

import {
  FULFILLMENT_STATES,
  FULFILLMENT_STATES_DESCRIPTIONS,
  FULFILLMENT_STATES_STEPS,
} from "@/constants";

import { fulfillmentStates as fulfillmentStatesTable } from "../models";

const CHUNK_SIZE = 50;

export default async function seed(db: Database) {
  const states = Object.values(FULFILLMENT_STATES) as FULFILLMENT_STATES[];

  for (let i = 0; i < states.length; i += CHUNK_SIZE) {
    const chunk = states.slice(i, i + CHUNK_SIZE).map((state) => ({
      name: state,
      stepOrder: FULFILLMENT_STATES_STEPS[state],
      description: FULFILLMENT_STATES_DESCRIPTIONS[state],
      createdBy: 1,
      updatedBy: 1,
    }));

    await db.insert(fulfillmentStatesTable).values(chunk);
  }
}
