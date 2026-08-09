'use client'

import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
}

export interface FaqCategory {
  id: string
  name: string
}

/**
 * The only interactive part of the FAQ page, so the page itself stays a server
 * component.
 *
 * Open state is keyed by a stable item id rather than array index. Keying by
 * index meant filtering the list opened whichever question happened to land in
 * that slot -- so searching could expand an unrelated answer.
 */
export function FaqAccordion({
  items,
  categories,
}: {
  items: FaqItem[]
  categories: FaqCategory[]
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const term = query.trim().toLowerCase()
  const filtered = items.filter(item => {
    const matchesCategory = category === 'all' || item.category === category
    const matchesQuery =
      !term ||
      item.question.toLowerCase().includes(term) ||
      item.answer.toLowerCase().includes(term)
    return matchesCategory && matchesQuery
  })

  return (
    <>
      <div className="mb-6">
        <Input
          label="Search questions"
          placeholder="Delivery, returns, warranty…"
          leftIcon={<Search className="h-4 w-4" />}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        {[{ id: 'all', name: 'All' }, ...categories].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            aria-pressed={category === item.id}
            className={cn(
              'rounded-full px-4 py-2 text-ui font-medium transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              category === item.id
                ? 'bg-action text-bark-50'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No questions match that"
          description={`Nothing found for “${query}”. Try a different word, or ask us directly.`}
        />
      ) : (
        <ul className="divide-y divide-border-subtle border-y border-border-subtle">
          {filtered.map(item => {
            const open = openId === item.id
            return (
              <li key={item.id}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    aria-expanded={open}
                    aria-controls={`answer-${item.id}`}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-body font-medium text-text-primary">
                      {item.question}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'h-5 w-5 shrink-0 text-text-tertiary transition-transform duration-base ease-standard',
                        open && 'rotate-180'
                      )}
                    />
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`answer-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-prose pb-5 text-body text-text-secondary">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export default FaqAccordion
