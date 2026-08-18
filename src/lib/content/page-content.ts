import { z } from "zod";

const blockTypeSchema = z.enum([
  "audio",
  "bulletListItem",
  "checkListItem",
  "codeBlock",
  "divider",
  "file",
  "heading",
  "image",
  "numberedListItem",
  "paragraph",
  "quote",
  "table",
  "toggleListItem",
  "video",
]);

type PageBlock = {
  id?: string;
  type: z.infer<typeof blockTypeSchema>;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: PageBlock[];
};

const styledTextSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(100_000),
  styles: z.record(z.string(), z.unknown()),
}).passthrough();

const linkSchema = z.object({
  type: z.literal("link"),
  href: z.string().max(2_000),
  content: z.union([z.string().max(100_000), z.array(styledTextSchema).max(2_000)]),
}).passthrough();

const inlineContentSchema = z.union([
  z.string().max(100_000),
  z.array(z.union([styledTextSchema, linkSchema])).max(2_000),
]);

const plainContentSchema = z.union([
  z.string().max(100_000),
  z.array(z.union([z.string().max(100_000), styledTextSchema])).max(2_000),
]);

const tableCellSchema = z.object({
  type: z.literal("tableCell"),
  props: z.record(z.string(), z.unknown()).optional(),
  content: inlineContentSchema.optional(),
}).passthrough();

const tableContentSchema = z.object({
  type: z.literal("tableContent"),
  columnWidths: z.array(z.number().positive().nullable()).max(100).optional(),
  headerRows: z.number().int().min(0).max(100).optional(),
  headerCols: z.number().int().min(0).max(100).optional(),
  rows: z.array(z.object({
    cells: z.array(z.union([inlineContentSchema, tableCellSchema])).max(100),
  }).passthrough()).max(1_000),
}).passthrough();

const inlineBlockTypes = new Set([
  "bulletListItem",
  "checkListItem",
  "heading",
  "numberedListItem",
  "paragraph",
  "quote",
  "toggleListItem",
]);

const pageBlockSchema: z.ZodType<PageBlock> = z.lazy(() => z.object({
  id: z.string().min(1).max(200).optional(),
  type: blockTypeSchema,
  props: z.record(z.string(), z.unknown()).optional(),
  content: z.unknown().optional(),
  children: z.array(pageBlockSchema).max(100).optional(),
}).passthrough().superRefine((block, context) => {
  let validContent = block.content === undefined;
  if (inlineBlockTypes.has(block.type)) {
    validContent = inlineContentSchema.safeParse(block.content).success;
  } else if (block.type === "codeBlock") {
    validContent = plainContentSchema.safeParse(block.content).success;
  } else if (block.type === "table") {
    validContent = tableContentSchema.safeParse(block.content).success;
  }
  if (!validContent) {
    context.addIssue({ code: "custom", path: ["content"], message: "지원하지 않는 블록 내용입니다." });
  }
}));

export const pageContentSchema = z.array(pageBlockSchema).max(500);

export function parseStoredPageContent(serializedContent: string): unknown[] {
  try {
    const parsed = pageContentSchema.safeParse(JSON.parse(serializedContent));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
