import { useId } from 'react'
import { Label } from './label'

/**
 * Champ de formulaire : libellé + contrôle, correctement associés.
 *
 * Le couple libellé/saisie existait en six définitions divergentes réparties
 * dans les pages (trois hauteurs, trois rayons, deux couleurs de libellé), et
 * aucune n'associait le `<label>` à son champ — un lecteur d'écran annonçait
 * « zone de saisie » sans dire laquelle.
 *
 * `children` reçoit l'identifiant à poser sur le contrôle :
 *
 *   <Field label="Numéro">
 *     {id => <Input id={id} … />}
 *   </Field>
 */
export function Field({ label, hint, children, className }) {
  const id = useId()
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {typeof children === 'function' ? children(id) : children}
      {hint && (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 5, lineHeight: 1.45 }}>
          {hint}
        </p>
      )}
    </div>
  )
}
