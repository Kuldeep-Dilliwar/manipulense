import { createServerFn } from "@tanstack/react-start";
import {
  AnalyzeInputSchema,
  InoculateInputSchema,
  analyzeContent,
  inoculateContent,
} from "./analyze.server";

export const analyzeManipulation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeInputSchema.parse(input))
  .handler(async ({ data }) => analyzeContent(data));

export const inoculateManipulation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InoculateInputSchema.parse(input))
  .handler(async ({ data }) => inoculateContent(data));
