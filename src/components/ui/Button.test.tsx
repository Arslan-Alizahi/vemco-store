import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('calls its handler when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Add to cart</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is reachable and operable by keyboard alone', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Add to cart</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Add to cart' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does nothing when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Add to cart
      </Button>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('blocks a second press while it is working', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} isLoading>
        Pay now
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  /**
   * asChild renders the child rather than wrapping it. Without it the app put
   * a <button> inside an <a>, which is invalid, and which browsers and screen
   * readers each resolve differently.
   */
  it('renders a link as a link, not a button inside one', () => {
    render(
      <Button asChild>
        <a href="/products">Browse</a>
      </Button>
    )

    expect(screen.getByRole('link', { name: 'Browse' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  /**
   * The regression that shipped every primary button at 3.49:1: cva emits the
   * variant before the size, and tailwind-merge dropped the colour that came
   * first. Asserted on the rendered element, not on cn() alone.
   */
  it('keeps its text colour when a role-named size is applied', () => {
    render(
      <Button variant="primary" size="lg">
        Add to cart
      </Button>
    )

    const className = screen.getByRole('button').className
    expect(className).toContain('text-white')
    expect(className).toContain('text-body')
  })
})
