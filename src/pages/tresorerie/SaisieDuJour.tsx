import { useState } from 'react'
import type { FormEvent } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import type { Categorie, Mouvement } from '../../donnees/types'
import { suggestionPourTiers } from '../../tresorerie/calculs'
import { CATEGORIES, LIBELLES_CATEGORIE } from '../../tresorerie/categories'
import { cleRecurrent } from '../../tresorerie/recurrents'
import type { Recurrent } from '../../tresorerie/recurrents'
import { Carte } from '../../ui/Carte'
import { formatDate, lireDate } from '../../utils/dates'
import { formatEuros, lireMontant } from '../../utils/format'

const champ = 'h-9 rounded-md border border-filet-fort bg-surface px-2.5 text-sm'

/** Saisie du jour : une ligne par mouvement, pré-remplie d'après l'historique. */
export function SaisieDuJour({ attendus }: { attendus: Recurrent[] }) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const [date, setDate] = useState(formatDate(dateDuJour))
  const [sens, setSens] = useState<'sortie' | 'entree'>('sortie')
  const [montant, setMontant] = useState('')
  const [categorie, setCategorie] = useState<Categorie>('carburant')
  const [tiers, setTiers] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)

  const tiersConnus = [...new Set(donnees.mouvements.map((m) => m.tiers))].sort((a, b) => a.localeCompare(b))

  const ajouter = (m: Omit<Mouvement, 'id' | 'recurrent'>) => {
    const recurrent = donnees.decisionsRecurrents[cleRecurrent(m.tiers, m.montant)]?.statut === 'confirme'
    modifier((jeu) => ({
      ...jeu,
      mouvements: [...jeu.mouvements, { ...m, id: `${jeu.entite.id}-saisie-${jeu.mouvements.length + 1}`, recurrent }].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    }))
    setDernier(`${formatEuros(m.montant)} · ${LIBELLES_CATEGORIE[m.categorie]} · ${m.tiers} (${formatDate(m.date)})`)
  }

  // Fournisseur connu : on reprend sa catégorie, son sens et son dernier montant.
  const choisirTiers = (valeur: string) => {
    setTiers(valeur)
    const s = suggestionPourTiers(donnees.mouvements, valeur)
    if (!s) return
    setCategorie(s.categorie)
    setSens(s.montant >= 0 ? 'entree' : 'sortie')
    if (!montant) setMontant(String(Math.abs(s.montant)).replace('.', ','))
  }

  const valider = (e: FormEvent) => {
    e.preventDefault()
    const d = lireDate(date)
    const m = lireMontant(montant)
    if (!d) return setErreur('Date invalide (format jj/mm/aaaa).')
    if (d > dateDuJour) return setErreur('La saisie concerne des mouvements passés ou du jour ; les mouvements futurs vont dans la prévision.')
    if (m === null || m <= 0) return setErreur('Montant invalide (ex. 120,50).')
    if (!tiers.trim()) return setErreur('Indiquez le fournisseur ou le client.')
    setErreur(null)
    ajouter({ date: d, montant: sens === 'sortie' ? -m : m, categorie, tiers: tiers.trim() })
    setMontant('')
    setTiers('')
  }

  return (
    <Carte titre="Ajouter un mouvement à la main">
      {attendus.length > 0 && (
        <div className="mb-4 rounded-lg border border-filet p-3 text-sm">
          <div className="mb-1.5 text-[13px] text-sourdine">Attendu ce mois-ci, pas encore saisi</div>
          <ul className="space-y-1">
            {attendus.map((r) => (
              <li key={r.cle} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  {r.tiers} : {formatEuros(r.montant)} <span className="text-sourdine">· le {r.jour} du mois</span>
                </span>
                <button
                  onClick={() => ajouter({ date: dateDuJour, montant: r.montant, categorie: r.categorie, tiers: r.tiers })}
                  className="text-[13px] font-medium text-accent hover:underline"
                >
                  Saisir d’un clic
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={valider} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="jj/mm/aaaa" aria-label="Date" className={`${champ} col-span-1 sm:col-span-3`} />
        <div className="col-span-1 flex h-9 rounded-md border border-filet-fort bg-surface p-0.5 text-sm sm:col-span-4" role="radiogroup" aria-label="Sens">
          {(['sortie', 'entree'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSens(s)}
              className={`flex-1 rounded px-2 font-medium ${sens === s ? 'bg-encre text-white' : 'text-encre-2 hover:text-encre'}`}
            >
              {s === 'sortie' ? 'Dépense' : 'Entrée'}
            </button>
          ))}
        </div>
        <input
          list="tiers-connus"
          value={tiers}
          onChange={(e) => choisirTiers(e.target.value)}
          placeholder="Fournisseur ou client"
          aria-label="Fournisseur ou client"
          className={`${champ} col-span-2 sm:col-span-7 sm:row-start-2`}
        />
        <datalist id="tiers-connus">{tiersConnus.map((t) => <option key={t} value={t} />)}</datalist>
        <select value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)} aria-label="Catégorie" className={`${champ} col-span-1 sm:col-span-5 sm:row-start-2`}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{LIBELLES_CATEGORIE[c]}</option>)}
        </select>
        <input value={montant} onChange={(e) => setMontant(e.target.value)} inputMode="decimal" placeholder="Montant €" aria-label="Montant" className={`${champ} col-span-1 text-right sm:col-span-5 sm:col-start-8 sm:row-start-1`} />
        <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-12">
          <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-fonce">
            Ajouter le mouvement
          </button>
          {erreur && <span className="text-sm text-alerte">{erreur}</span>}
          {!erreur && dernier && <span className="text-sm text-accent">✓ Ajouté : {dernier}</span>}
        </div>
      </form>
      <p className="mt-2 text-xs text-sourdine">Un fournisseur déjà connu reprend automatiquement sa catégorie et son dernier montant.</p>
    </Carte>
  )
}
