import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '../../lib/utils'
import { buttonVariants } from './button'

const AlertDialog        = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal  = AlertDialogPrimitive.Portal

function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
        'bg-anim-overlay',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({ className, ...props }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50',
          'w-full max-w-[400px] bg-anim-modal',
          className
        )}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-hi)',
          borderRadius: 10,
          padding: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
        }}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-2', className)} style={{ marginBottom: 18 }} {...props} />
}

function AlertDialogTitle({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Title
      className={cn(className)}
      style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.015em' }}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Description
      className={cn(className)}
      style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.55, marginTop: 4 }}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }) {
  return <div className={cn('flex items-center justify-end gap-2', className)} style={{ marginTop: 22 }} {...props} />
}

function AlertDialogAction({ className, ...props }) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant: 'primary' }), className)} {...props} />
}

function AlertDialogCancel({ className, ...props }) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'default' }), className)} {...props} />
}

export {
  AlertDialog, AlertDialogTrigger, AlertDialogPortal,
  AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
}
