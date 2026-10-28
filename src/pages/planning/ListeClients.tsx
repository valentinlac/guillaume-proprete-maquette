import { useRef, useState } from 'react'
import { useEtatDemo } from '../../donnees/EtatDemo'
import { lireCsvClients } from '../../donnees/importCsv'
import type { ErreurImport } from '../../donnees/importCsv'
import type { Frequence } from '../../donnees/types'
import { integrerNouveauxClients } from '../../planning/integration'
import { Bouton } from '../../ui/Bouton'
import { BadgeFrequence, LIBELLES_FREQUENCE } from '../../ui/statuts'
import { mois as moisDe } from '../../utils/dates'
import { formatDuree, formatEuros } from '../../utils/format'

const INITIALES_MOIS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

interface CompteRendu {
  importes: string[]
  passagesPlaces: number
  passagesNonPlaces: number
  erreurs: ErreurImport[]
  source: string
}

export function ListeClients({ onPlanifier }: { onPlanifier: (clientId: string) => void }) {
  const { donnees, modifier, dateDuJour, entiteId } = useEtatDemo()
  const [recherche, setRecherche] = useState('')
  const [frequence, setFrequence] = useState<Frequence | ''>('')
  const [compteRendu, setCompteRendu] = useState<CompteRendu | null>(null)
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set())
  const champFichier = useRef<HTMLInputElement>(null)
  const moisCourant = moisDe(dateDuJour)

  const importer = (contenu: string, source: string) => {
    const { clients, erreurs } = lireCsvClients(contenu, donnees.clients)
    const integration = integrerNouveauxClients(donnees, clients, dateDuJour)
    if (clients.length) {
      modifier((jeu) => ({ ...jeu, clients: [...jeu.clients, ...clients], interventions: integration.interventions }))
      setNouveaux((ids) => new Set([...ids, ...clients.map((c) => c.id)]))
    }
    setCompteRendu({
      importes: clients.map((c) => c.nom),
      passagesPlaces: integration.places.length,
      passagesNonPlaces: integration.nonPlaces.length,
      erreurs,
      source,
    })
  }

  const ouvrirFichier = async (fichier: File | undefined) => {
    if (!fichier) return
    importer(await fichier.text(), fichier.name)
    if (champFichier.current) champFichier.current.value = ''
  }

  const chargerExemple = async () => {
    const nom = `exemple-clients-${entiteId}.csv`
    const reponse = await fetch(`${import.meta.env.BASE_URL}${nom}`)
    importer(await reponse.text(), nom)
  }

  const terme = recherche.trim().toLowerCase()
  const visibles = donnees.clients
    .filter(
      (c) =>
        (!frequence || c.frequence === frequence) &&
        (!terme || `${c.nom} ${c.adresse} ${c.ville} ${c.contact.nom}`.toLowerCase().includes(terme)),
    )
    // Les clients tout juste importés en tête de liste.
    .sort((a, b) => Number(nouveaux.has(b.id)) - Number(nouveaux.has(a.id)))

  const champ = 'h-9 rounded-md border border-filet-fort bg-surface px-2.5 text-sm text-encre'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un client, une ville…"
          className={`${champ} w-full sm:w-64`}
        />
        <select value={frequence} onChange={(e) => setFrequence(e.target.value as Frequence | '')} className={champ} aria-label="Fréquence">
          <option value="">Toutes les fréquences</option>
          {Object.entries(LIBELLES_FREQUENCE).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="text-[13px] text-sourdine">
          {visibles.length} client{visibles.length > 1 ? 's' : ''}
          {visibles.length !== donnees.clients.length && ` sur ${donnees.clients.length}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Bouton variante="discret" onClick={chargerExemple}>Charger le fichier d’exemple</Bouton>
          <Bouton onClick={() => champFichier.current?.click()}>Importer un fichier</Bouton>
          <input ref={champFichier} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => ouvrirFichier(e.target.files?.[0])} />
        </div>
      </div>

      {compteRendu && <BandeauImport compteRendu={compteRendu} onFermer={() => setCompteRendu(null)} />}

      <div className="overflow-x-auto rounded-lg border border-filet bg-surface">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-filet text-[13px] text-sourdine">
            <tr>
              <th className="px-4 py-2 font-normal">Client</th>
              <th className="px-3 py-2 font-normal">Adresse</th>
              <th className="px-3 py-2 text-right font-normal">Tarif HT</th>
              <th className="px-3 py-2 font-normal">Fréquence</th>
              <th className="px-3 py-2 text-right font-normal">Durée</th>
              <th className="px-3 py-2 font-normal">
                <span className="flex gap-1" aria-label="Mois dus, de janvier à décembre">
                  {INITIALES_MOIS.map((l, m) => (
                    <span key={m} className={`w-2 text-center text-[10px] ${m === moisCourant ? 'font-semibold text-encre' : ''}`}>{l}</span>
                  ))}
                </span>
              </th>
              <th className="px-4 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} className={`border-b border-filet last:border-b-0 ${nouveaux.has(c.id) ? 'bg-accent-doux' : 'hover:bg-survol'}`}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">
                    {c.nom}
                    {nouveaux.has(c.id) && <span className="ml-2 text-xs font-medium text-accent">nouveau</span>}
                  </div>
                  <div className="text-xs text-sourdine">{c.contact.nom} · {c.contact.telephone}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-encre-2">{c.adresse}</div>
                  <div className="text-xs text-sourdine">{c.ville}</div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatEuros(c.tarif)}</td>
                <td className="px-3 py-2.5"><BadgeFrequence frequence={c.frequence} /></td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{formatDuree(c.dureeMin)}</td>
                <td className="px-3 py-2.5">
                  <span className="flex gap-1">
                    {c.moisDus.map((du, m) => (
                      <span
                        key={m}
                        title={`${INITIALES_MOIS[m]} : ${du ? 'passage dû' : 'pas de passage'}`}
                        className={`size-2 rounded-sm ${du ? 'bg-encre-2' : 'bg-filet'} ${m === moisCourant ? 'outline outline-1 outline-offset-1 outline-encre' : ''}`}
                      />
                    ))}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => onPlanifier(c.id)} className="text-[13px] font-medium text-accent hover:underline">
                    Planifier
                  </button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sourdine">Aucun client ne correspond à la recherche.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BandeauImport({ compteRendu, onFermer }: { compteRendu: CompteRendu; onFermer: () => void }) {
  const { importes, passagesPlaces, passagesNonPlaces, erreurs, source } = compteRendu
  return (
    <div className="flex items-start gap-3 rounded-lg border border-filet bg-surface px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {importes.length
            ? `${importes.length} client${importes.length > 1 ? 's' : ''} importé${importes.length > 1 ? 's' : ''} depuis ${source}`
            : `Aucun nouveau client dans ${source}`}
        </p>
        {importes.length > 0 && (
          <p className="mt-0.5 text-encre-2">
            {passagesPlaces} passage{passagesPlaces > 1 ? 's' : ''} ajouté{passagesPlaces > 1 ? 's' : ''} au planning, dans les tournées les plus proches.
            {passagesNonPlaces > 0 && ` ${passagesNonPlaces} passage(s) sans créneau disponible.`}
          </p>
        )}
        {erreurs.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-attention">
            {erreurs.map((e) => (
              <li key={e.ligne}>Ligne {e.ligne} : {e.message}</li>
            ))}
          </ul>
        )}
      </div>
      <button onClick={onFermer} className="text-sourdine hover:text-encre" aria-label="Masquer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  )
}
