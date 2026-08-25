import { toast } from 'sonner'

export async function safeAction(fn, successMsg = null, errorMsg = null) {
  try {
    const result = await fn()
    if (successMsg) toast.success(successMsg)
    return { ok: true, result }
  } catch (err) {
    const msg = errorMsg ?? (err?.message ? `Erreur : ${err.message}` : 'Erreur inattendue')
    toast.error(msg)
    return { ok: false, err }
  }
}
