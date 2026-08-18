"use client";

import { LoaderCircle, MessageCircle, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { UserRole } from "@/lib/auth/access";
import type { CommentItem } from "@/lib/db/comments";

function commentDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function CommentsSection({
  pageId,
  comments,
  currentUser,
}: {
  pageId: string;
  comments: CommentItem[];
  currentUser: { studentId: string; role: UserRole };
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) {
        setMessage(result.message ?? "댓글을 등록하지 못했습니다.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  async function remove(commentId: number) {
    if (deletingId !== null) return;
    setDeletingId(commentId);
    setMessage("");
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { message?: string };
        setMessage(result.message ?? "댓글을 삭제하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("네트워크 연결을 확인해 주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-labelledby="comments-title" className="mt-12 border-t border-[#dfe2de] pt-8">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-[#315c50]" />
        <h2 id="comments-title" className="text-lg font-semibold">질문과 댓글 <span className="tabular-nums text-[#626863]">{comments.length}</span></h2>
      </div>
      <p className="mt-2 text-sm text-[#626863]">이해되지 않는 부분이나 함께 이야기할 내용을 남겨주세요.</p>

      <form onSubmit={submit} className="mt-5 border border-[#dfe2de] bg-white p-4">
        <label htmlFor="comment-body" className="text-xs font-semibold text-[#4f5550]">질문 또는 댓글</label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1_000}
          rows={4}
          placeholder="내용을 입력하세요."
          className="mt-2 block w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-[#6f746f]"
        />
        <div className="mt-3 flex items-center justify-between border-t border-[#eceeeb] pt-3">
          <span className="text-[11px] tabular-nums text-[#626863]">{body.length} / 1,000</span>
          <button type="submit" disabled={pending || body.trim().length === 0} className="inline-flex h-8 items-center gap-2 bg-[#315c50] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={13} />}댓글 등록
          </button>
        </div>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-[#8a3f39]">{message}</p>}

      <div className="mt-6 divide-y divide-[#e7e9e6] border-y border-[#dfe2de]">
        {comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#626863]">아직 댓글이 없습니다. 첫 질문을 남겨보세요.</p>
        ) : comments.map((comment) => {
          const canDelete = currentUser.role === "admin" || currentUser.studentId === comment.authorId;
          return (
            <article key={comment.id} aria-label={`${comment.authorName}의 댓글`} className="flex gap-3 bg-white px-3 py-4">
              <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center bg-[#e8eeeb] text-xs font-semibold text-[#315c50]">{comment.authorName.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-[13px] font-semibold">{comment.authorName}</strong><time dateTime={comment.createdAt} className="text-[11px] text-[#626863]">{commentDate(comment.createdAt)}</time></div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#343a35]">{comment.body}</p>
              </div>
              {canDelete && <button type="button" onClick={() => remove(comment.id)} disabled={deletingId === comment.id} aria-label="댓글 삭제" className="grid h-8 w-8 shrink-0 place-items-center text-[#737873] hover:bg-[#f0f2ef] hover:text-[#8a3f39]"><Trash2 size={14} /></button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
