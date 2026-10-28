import { useState } from 'react'

/**
 * État de la synchronisation Sellsy (simulé) : montre l'idée que factures et
 * encaissements viendront de Sellsy. Le bouton ne fait aucun appel réel.
 */
export function BandeauSellsy() {
  const [etat, setEtat] = useState<'ancienne' | 'en_cours' | 'fraiche'>('ancienne')

  const synchroniser = () => {
    setEtat('en_cours')
    window.setTimeout(() => setEtat('fraiche'), 1200)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-sourdine">
      <span>
        <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${etat === 'en_cours' ? 'animate-pulse bg-attention' : 'bg-ok'}`} aria-hidden />
        Factures et banque : Sellsy (simulé, pas de connexion réelle)
        {etat === 'en_cours' ? ' · mise à jour…' : etat === 'fraiche' ? ' · à jour' : ''}
      </span>
      <button onClick={synchroniser} disabled={etat === 'en_cours'} className="font-medium text-accent hover:underline disabled:opacity-50">
        Synchroniser
      </button>
    </div>
  )
}
