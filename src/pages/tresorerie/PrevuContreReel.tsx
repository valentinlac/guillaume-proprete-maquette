import { useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { prevuContreReel } from '../../tresorerie/budget'
import { LIBELLES_CATEGORIE } from '../../tresorerie/categories'
import type { Recurrent } from '../../tresorerie/recurrents'
import { Carte } from '../../ui/Carte'
import { annee, formatDate, mois, nomMois, premierDuMois } from '../../utils/dates'
import { formatEurosArrondis } from '../../utils/format'

/** Prévu contre réel par catégorie, pour le mois en cours ou le précédent. */
export function PrevuContreReel({ recurrents }: { recurrents: Recurrent[] }) {
  const { donnees, dateDuJour } = useEtatDemo()
  const courant = dateDuJour.slice(0, 7)
  const precedent = premierDuMois(annee(dateDuJour), mois(dateDuJour) - 1).slice(0, 7)
  const [periode, setPeriode] = useState(courant)
  const lignes = prevuContreReel(donnees.mouvements, recurrents, periode, dateDuJour)
    .sort((a, b) => b.prevu - a.prevu)
  const libellePeriode = (p: string) => nomMois(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1)
  const enCours = periode === courant
  const totalPrevu = lignes.reduce((s, l) => s + l.prevu, 0)
  const totalRealise = lignes.reduce((s, l) => s + l.realise, 0)
  // La phrase à retenir : l'écart global et le poste qui pèse le plus.
  const ecartTotal = totalRealise - totalPrevu
  const pire = [...lignes].sort((a, b) => a.ecart - b.ecart)[0]
  const phrase = `${enCours ? `Au ${formatDate(dateDuJour).slice(0, 5)}, le` : 'Sur le mois, le'} compte a ${formatEurosArrondis(Math.abs(ecartTotal))} de ${
    ecartTotal >= 0 ? 'plus' : 'moins'
  } que prévu.${pire && pire.ecart < -Math.abs(ecartTotal) * 0.2 && ecartTotal < 0 ? ` Principal écart : ${LIBELLES_CATEGORIE[pire.categorie].toLowerCase()} (${formatEurosArrondis(pire.ecart)}).` : ''}`

  return (
    <Carte
      sansMarge
      titre="Le mois : prévu et réel"
      action={
        <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="rounded-md border border-filet-fort bg-surface px-2 py-1 text-xs">
          <option value={courant}>{libellePeriode(courant)} (en cours, au {formatDate(dateDuJour).slice(0, 5)})</option>
          <option value={precedent}>{libellePeriode(precedent)}</option>
        </select>
      }
    >
      <p className="border-b border-filet px-5 py-3 text-encre-2">{phrase}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-filet bg-papier text-xs font-medium text-sourdine">
            <tr>
              <th className="px-5 py-2 text-left">Catégorie</th>
              <th className="px-3 py-2 text-right">{enCours ? `Prévu au ${formatDate(dateDuJour).slice(0, 5)}` : 'Prévu'}</th>
              <th className="px-3 py-2 text-right">Réalisé</th>
              <th className="px-3 py-2 text-right">Écart</th>
              <th className="w-40 px-5 py-2 text-left">Réalisé / prévu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-filet">
            {lignes.map((l) => {
              const part = l.prevu !== 0 ? Math.max(0, l.realise / l.prevu) : 0
              // Couleur seulement pour un écart notable (plus de 10 % du prévu).
              const notable = Math.abs(l.ecart) > Math.abs(l.prevu) * 0.1
              return (
                <tr key={l.categorie}>
                  <td className="px-5 py-2 text-encre">{LIBELLES_CATEGORIE[l.categorie]}</td>
                  <td className="px-3 py-2 text-right text-encre-2 tabular-nums">{formatEurosArrondis(l.prevu)}</td>
                  <td className="px-3 py-2 text-right text-encre tabular-nums">{formatEurosArrondis(l.realise)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${!notable ? 'text-encre-2' : l.ecart >= 0 ? 'text-ok' : 'text-alerte'}`}>
                    {l.ecart > 0 ? '+' : ''}{formatEurosArrondis(l.ecart)}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-survol">
                        <div
                          className="h-full rounded-full bg-encre-2/60"
                          style={{ width: `${Math.min(100, part * 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-sourdine tabular-nums">{Math.round(part * 100)} %</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-filet bg-papier font-medium">
            <tr>
              <td className="px-5 py-2 text-encre">Solde du mois</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatEurosArrondis(totalPrevu)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatEurosArrondis(totalRealise)}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${totalRealise - totalPrevu >= 0 ? 'text-ok' : 'text-alerte'}`}>
                {totalRealise - totalPrevu > 0 ? '+' : ''}{formatEurosArrondis(totalRealise - totalPrevu)}
              </td>
              <td className="px-5 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="border-t border-filet px-5 py-3 text-xs text-sourdine">
        Prévu : dépenses et rentrées fixes confirmées, plus la moyenne des dépenses courantes{enCours ? ', jusqu’à hier' : ''}. Écarts de plus de 10 % en couleur.
      </p>
    </Carte>
  )
}
