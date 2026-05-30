import type { ZodSchema } from "@/lib/types";

const jsonContent = <T extends ZodSchema>(
  schema: T,
  description: string = "No description provided",
) => {
  return {
    content: {
      "application/json": {
        schema,
      },
    },
    description: schema.description ?? description,
  };
};

export default jsonContent;
