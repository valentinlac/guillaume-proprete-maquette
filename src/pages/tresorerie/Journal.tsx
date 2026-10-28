import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { journalParJour } from '../../tresorerie/calculs'
import { LIBELLES_CATEGORIE } from '../../tresorerie/categories'
import { Carte } from '../../ui/Carte'
import { ajouterJours, formatDate, nomJour } from '../../utils/dates'
import { formatEuros } from '../../utils/format'

/** Journal jour par jour, au format du tableur de Damien. */
export function Journal() {
  const { donnees, dateDuJour } = useEtatDemo()
  const [jours, setJours] = useState(14)
  const journal = journalParJour(donnees, ajouterJours(dateDuJour, -jours), dateDuJour).reverse()

  return (
    <Carte
      sansMarge
      titre="Journal de trésorerie"
      action={
        <select value={jours} onChange={(e) => setJours(Number(e.target.value))} className="rounded-md border border-filet-fort bg-surface px-2 py-1 text-xs">
          <option value={14}>14 derniers jours</option>
          <option value={31}>31 derniers jours</option>
          <option value={92}>3 derniers mois</option>
        </select>
      }
    >
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full text-sm">
          <tbody>
            {journal.map((j) => (
              <JourDeCaisse key={j.date} {...j} />
            ))}
          </tbody>
        </table>
        {journal.length === 0 && <p className="px-4 py-6 text-center text-sm text-sourdine">Aucun mouvement sur la période.</p>}
      </div>
    </Carte>
  )
}

function JourDeCaisse({ date, soldeVeille, entrees, sorties, solde, mouvements }: ReturnType<typeof journalParJour>[number]) {
  return (
    <>
      <tr className="sticky top-0 border-y border-filet bg-papier text-xs text-encre-2 first:border-t-0">
        <td className="px-5 py-1.5 font-semibold text-encre">
          <span className="capitalize">{nomJour(date).slice(0, 3)}.</span> {formatDate(date)}
        </td>
        <td className="hidden px-2 py-1.5 text-right tabular-nums sm:table-cell" colSpan={2}>
          veille {formatEuros(soldeVeille)} · <span className="text-ok">+{formatEuros(entrees)}</span> · <span className="text-alerte">{formatEuros(sorties)}</span>
        </td>
        <td className="px-2 py-1.5 sm:hidden" />
        <td className="px-5 py-1.5 text-right font-semibold whitespace-nowrap text-encre tabular-nums">{formatEuros(solde)}</td>
      </tr>
      {mouvements.map((m) => (
        <tr key={m.id} className="border-b border-filet last:border-0">
          <td className="px-5 py-1.5 text-encre">
            {m.tiers}
            {m.recurrent && <span className="ml-1.5 text-xs text-accent" title="Mouvement récurrent confirmé">↻</span>}
          </td>
          <td className="hidden px-2 py-1.5 text-xs text-sourdine sm:table-cell">{LIBELLES_CATEGORIE[m.categorie]}</td>
          <td className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${m.montant >= 0 ? 'text-ok' : 'text-encre'}`}>{formatEuros(m.montant)}</td>
          <td className="hidden sm:table-cell" />
        </tr>
      ))}
    </>
  )
}
