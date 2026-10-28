import { useEtatDemo } from '../../donnees/EtatDemo'
import { changementsParAgent, nombreDeChangements } from '../../planning/meteo'
import type { Changement } from '../../planning/meteo'
import { Bouton } from '../../ui/Bouton'
import { PastilleAgent } from '../../ui/statuts'
import { Tiroir } from '../../ui/Tiroir'
import { formatDate, nomJour } from '../../utils/dates'
import { formatHeure } from '../../utils/format'

const LIBELLES: Record<Changement['type'], { texte: string; classe: string }> = {
  ajout: { texte: 'Ajouté', classe: 'text-ok' },
  retrait: { texte: 'Retiré', classe: 'text-alerte' },
  horaire: { texte: 'Nouvel horaire', classe: 'text-accent' },
}

/** Récapitulatif de ce que chaque agent va recevoir, puis envoi simulé. */
export function ModaleEnvoiAgents({ onFermer, onEnvoye }: { onFermer: () => void; onEnvoye: (texte: string) => void }) {
  const { donnees, modifier, dateDuJour } = useEtatDemo()
  const clients = new Map(donnees.clients.map((c) => [c.id, c]))
  const changements = changementsParAgent(donnees.interventionsEnvoyees, donnees.interventions, donnees.agents, dateDuJour)
  const total = nombreDeChangements(changements)
  const concernes = donnees.agents.filter((a) => changements.get(a.id)!.length > 0)

  const envoyer = () => {
    modifier((jeu) => ({ ...jeu, interventionsEnvoyees: jeu.interventions }))
    onEnvoye(`Planning envoyé à ${concernes.map((a) => a.nom).join(' et ')} (simulation : aucun envoi réel).`)
  }

  return (
    <Tiroir
      titre="Envoyer le planning aux agents"
      sousTitre="Changements depuis le dernier envoi, transmis à l’outil de pointage des agents (simulé)."
      onFermer={onFermer}
      largeur="max-w-2xl"
      pied={
        <>
          <span className="flex-1" />
          <Bouton variante="discret" onClick={onFermer}>Fermer</Bouton>
          <Bouton variante="principal" onClick={envoyer} disabled={total === 0}>Envoyer aux agents</Bouton>
        </>
      }
    >
      {total === 0 && <p className="mt-10 text-center text-sm text-sourdine">Aucun changement : les agents ont déjà le planning à jour.</p>}
      <div className="space-y-6">
        {concernes.map((agent) => (
          <div key={agent.id}>
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <PastilleAgent couleur={agent.couleur} />
              {agent.nom}
              <span className="text-[13px] font-normal text-sourdine">{changements.get(agent.id)!.length} changement{changements.get(agent.id)!.length > 1 ? 's' : ''}</span>
            </div>
            <ul className="overflow-hidden rounded-lg border border-filet bg-surface text-sm">
              {changements.get(agent.id)!.map((c) => {
                const client = clients.get(c.intervention.clientId)!
                const libelle = LIBELLES[c.type]
                return (
                  <li key={`${c.type}-${c.intervention.id}`} className="grid grid-cols-[6.5rem_7.5rem_1fr] items-baseline gap-3 border-b border-filet px-4 py-2 last:border-b-0">
                    <span className={`text-xs font-medium ${libelle.classe}`}>{libelle.texte}</span>
                    <span className="text-encre-2 tabular-nums">
                      {nomJour(c.intervention.date).slice(0, 3)}. {formatDate(c.intervention.date).slice(0, 5)}
                      {c.type !== 'retrait' && ` · ${formatHeure(c.intervention.debutMin)}`}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{client.nom}</span>
                      <span className="block text-xs text-sourdine">
                        {c.type === 'ajout' && (c.intervention.dateOrigine ? `replacé, était prévu le ${formatDate(c.intervention.dateOrigine).slice(0, 5)}` : 'nouveau passage')}
                        {c.type === 'retrait' && c.motif}
                        {c.type === 'horaire' && `avant ${formatHeure(c.ancienDebutMin!)}`}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </Tiroir>
  )
}
