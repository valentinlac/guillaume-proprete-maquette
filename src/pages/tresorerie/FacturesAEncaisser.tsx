import type { Facture } from '../../donnees/types'
import type { Scenario } from '../../tresorerie/prevision'
import { Carte } from '../../ui/Carte'
import { ajouterJours, formatDate } from '../../utils/dates'
import { formatEuros, formatEurosArrondis } from '../../utils/format'

/** Factures clients à encaisser, telles qu'elles viendront de Sellsy. */
export function FacturesAEncaisser({ factures, scenario }: { factures: Facture[]; scenario: Scenario | null }) {
  const triees = [...factures].sort((a, b) => a.echeance.localeCompare(b.echeance))
  const total = factures.reduce((s, f) => s + f.montant, 0)
  return (
    <Carte sansMarge titre="Factures à encaisser" action={<span className="text-xs text-sourdine">{factures.length} facture{factures.length > 1 ? 's' : ''} · {formatEurosArrondis(total)} · source Sellsy</span>}>
      <ul className="divide-y divide-filet text-sm">
        {triees.map((f) => {
          const retard = scenario?.retard?.client === f.client ? scenario.retard.jours : 0
          return (
            <li key={f.id} className="flex items-baseline gap-3 px-5 py-2">
              <span className="w-12 shrink-0 text-sourdine tabular-nums">{formatDate(f.echeance).slice(0, 5)}</span>
              <span className="min-w-0 flex-1 truncate text-encre">
                {f.client}
                {retard > 0 && <span className="ml-1.5 text-xs font-medium text-[#c2602a]">→ payée le {formatDate(ajouterJours(f.echeance, retard)).slice(0, 5)}</span>}
              </span>
              <span className="tabular-nums">{formatEuros(f.montant)}</span>
            </li>
          )
        })}
      </ul>
    </Carte>
  )
}
