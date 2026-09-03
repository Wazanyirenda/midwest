"use client"

import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import {
  createFaqItem,
  deleteFaqItem,
  setFaqItemPublished,
  swapFaqItems,
  updateFaqItem,
} from "@/app/actions/admin-faq"
import type { FaqItem } from "@/lib/faq"

const inputCls =
  "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 " +
  "placeholder:text-sand-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"

export function FaqManager({ items }: { items: FaqItem[] }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <EntryCard
            key={item.id}
            item={item}
            first={index === 0}
            last={index === items.length - 1}
            pending={pending}
            onMove={(dir) => {
              const other = items[index + dir]
              if (other) run(() => swapFaqItems(item.id, other.id))
            }}
            onTogglePublished={() =>
              run(() => setFaqItemPublished(item.id, !item.published))
            }
            onDelete={() => run(() => deleteFaqItem(item.id))}
            onSave={(formData) => run(() => updateFaqItem(item.id, formData))}
          />
        ))}

        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-sand-300 p-6 text-center text-sm text-sand-600">
            No entries yet. Add the first question below.
          </p>
        )}
      </div>

      {adding ? (
        <form
          action={(formData) => {
            run(async () => {
              const result = await createFaqItem(formData)
              if (!result?.error) setAdding(false)
              return result
            })
          }}
          className="space-y-2 rounded-xl border border-sand-200 bg-white p-4"
        >
          <input
            name="question"
            required
            maxLength={300}
            placeholder="Question"
            className={inputCls}
          />
          <textarea
            name="answer"
            required
            maxLength={4000}
            rows={4}
            placeholder="Answer"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              {pending ? "Saving…" : "Add entry"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-lg border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 transition-colors hover:bg-sand-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-sand-300 px-4 py-2.5 text-sm font-medium text-sand-700 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Plus size={15} strokeWidth={2} />
          Add question
        </button>
      )}
    </div>
  )
}

function EntryCard({
  item,
  first,
  last,
  pending,
  onMove,
  onTogglePublished,
  onDelete,
  onSave,
}: {
  item: FaqItem
  first: boolean
  last: boolean
  pending: boolean
  onMove: (direction: -1 | 1) => void
  onTogglePublished: () => void
  onDelete: () => void
  onSave: (formData: FormData) => void
}) {
  const [question, setQuestion] = useState(item.question)
  const [answer, setAnswer] = useState(item.answer)

  const dirty = question !== item.question || answer !== item.answer

  return (
    <form
      action={onSave}
      className="rounded-xl border border-sand-200 bg-white p-4"
    >
      <div className="mb-2 flex items-start gap-2">
        <input
          name="question"
          value={question}
          maxLength={300}
          onChange={(e) => setQuestion(e.target.value)}
          className={inputCls}
        />
        <div className="flex shrink-0 gap-1">
          <IconButton
            label="Move up"
            disabled={first || pending}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={14} strokeWidth={2} />
          </IconButton>
          <IconButton
            label="Move down"
            disabled={last || pending}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={14} strokeWidth={2} />
          </IconButton>
          <IconButton label="Delete" disabled={pending} onClick={onDelete} danger>
            <Trash2 size={14} strokeWidth={2} />
          </IconButton>
        </div>
      </div>

      <textarea
        name="answer"
        value={answer}
        rows={4}
        maxLength={4000}
        onChange={(e) => setAnswer(e.target.value)}
        className={inputCls}
      />

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onTogglePublished}
          disabled={pending}
          className={`rounded-full px-2.5 py-1 text-2xs font-medium transition-colors ${
            item.published
              ? "bg-brand-50 text-brand-800 hover:bg-brand-100"
              : "bg-sand-100 text-sand-700 hover:bg-sand-200"
          }`}
        >
          {item.published ? "Published" : "Hidden"}
        </button>
        <button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  danger,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border border-sand-200 p-2 transition-colors disabled:opacity-30 ${
        danger
          ? "text-sand-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          : "text-sand-600 hover:bg-sand-50"
      }`}
    >
      {children}
    </button>
  )
}
