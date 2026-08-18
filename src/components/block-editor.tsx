"use client";

import dynamic from "next/dynamic";

import type { PageLinkOption } from "@/lib/db/pages";

const BlockEditorInner = dynamic(() => import("./block-editor-inner"), {
  ssr: false,
  loading: () => <div className="space-y-3 py-4"><div className="h-5 w-3/4 animate-pulse rounded bg-stone-100" /><div className="h-5 w-full animate-pulse rounded bg-stone-100" /><div className="h-5 w-2/3 animate-pulse rounded bg-stone-100" /></div>,
});

export function BlockEditor(props: { initialContent: unknown[]; editable: boolean; onChange?: (blocks: unknown[]) => void; linkablePages?: PageLinkOption[] }) {
  return <BlockEditorInner {...props} />;
}
