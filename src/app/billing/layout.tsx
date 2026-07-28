import PosShell from '@/components/layout/PosShell'

export const dynamic = 'force-dynamic'

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <PosShell>{children}</PosShell>
}
