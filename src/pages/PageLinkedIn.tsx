import { useState } from 'react'
import { Bouton } from '../ui/Bouton'
import { Carte } from '../ui/Carte'
import { Onglets } from '../ui/Onglets'

/**
 * Maquette LinkedIn : un compte par personne, une photo et une idée, un post
 * écrit dans le style de la personne. Tout est simulé (posts préécrits).
 */

interface Compte {
  id: string
  nom: string
  role: string
  type: 'personnel' | 'entreprise'
  style: string[]
  posts: string[]
}

const COMPTES: Compte[] = [
  {
    id: 'kevin',
    nom: 'Kevin',
    role: 'Dirigeant',
    type: 'personnel',
    style: [
      'Phrases courtes, ton direct, tutoiement de la communauté',
      'Commence par un chiffre ou un fait du terrain',
      'Met l’équipe en avant plutôt que lui-même',
      'Termine par une question ouverte',
      '2 ou 3 hashtags maximum, pas d’émoji',
    ],
    posts: [
      `7 h 45, parking d’une résidence à Valence. Il fait 4 degrés.\n\nJulien sort la perche, Sofiane prépare l’eau pure. À 11 h, 240 m² de vitres sont nettes, sans une trace.\n\nCe métier ne se voit que quand il est mal fait. Alors je le dis : merci à l’équipe.\n\nEt chez vous, qui fait le travail que personne ne remarque ?\n\n#propreté #vitrerie #Drôme`,
      `On a revu nos tournées ce mois-ci.\n\nRésultat : 40 minutes de route en moins par agent et par jour. C’est 40 minutes de plus chez nos clients, ou 40 minutes plus tôt à la maison.\n\nLe vrai luxe dans notre métier, ce n’est pas la machine. C’est l’organisation.\n\nVous mesurez quoi, vous, pour savoir si une journée était bonne ?\n\n#organisation #PME`,
      `Il a plu mardi. Huit passages à décaler.\n\nAvant, c’était une matinée au téléphone. Cette fois, tout le monde a reçu son nouveau créneau avant 9 h.\n\nLes clients ne se souviennent pas de la pluie. Ils se souviennent qu’on les a prévenus.\n\n#relationclient #vitrerie`,
    ],
  },
  {
    id: 'damien',
    nom: 'Damien',
    role: 'Associé, développement',
    type: 'personnel',
    style: [
      'Ton posé, un peu pédagogue',
      'Structure en 3 points numérotés',
      'Parle chiffres et résultats clients',
      'Termine par une invitation à échanger',
      'Utilise « nous » pour parler de l’entreprise',
    ],
    posts: [
      `Pourquoi une vitrine propre fait vendre ?\n\nTrois choses que nos clients commerçants nous disent :\n\n1. Le regard s’arrête plus longtemps sur la vitrine.\n2. Le magasin paraît plus lumineux, donc plus accueillant.\n3. Le client fait confiance avant même d’entrer.\n\nNous passons tous les quinze jours chez la plupart d’entre eux. Ce n’est pas un coût, c’est de la visibilité.\n\nSi vous êtes commerçant dans la Drôme, parlons-en.\n\n#commerce #vitrerie #Valence`,
      `Nettoyer en hauteur, ça ne s’improvise pas.\n\nChez nous, trois règles :\n\n1. Perche à eau pure dès que possible : on reste au sol.\n2. Nacelle quand la façade l’impose, avec un agent formé.\n3. Jamais seul sur un chantier à risque.\n\nLa sécurité de l’équipe passe avant le planning. Toujours.\n\nVous gérez des bâtiments en hauteur ? Je serais ravi d’échanger.\n\n#sécurité #propreté`,
      `Un an de franchise à Montélimar.\n\nCe que nous avons appris :\n\n1. Les clients veulent un interlocuteur local.\n2. Le planning doit être le même partout, les habitudes aussi.\n3. Un bon agent vaut plus qu’une bonne machine.\n\nMerci à toute l’équipe sur place. La suite s’écrit ensemble.\n\n#franchise #entrepreneuriat`,
    ],
  },
  {
    id: 'secteur',
    nom: 'Thomas',
    role: 'Responsable de secteur Valence',
    type: 'personnel',
    style: [
      'Ton chaleureux, récit du terrain',
      'Raconte une anecdote de chantier',
      'Cite les agents par leur prénom',
      'Une ou deux phrases de conclusion, pas de question',
      'Émojis discrets autorisés (1 maximum)',
    ],
    posts: [
      `Ce matin, Mme Faure de la boulangerie des Cordeliers nous attendait avec des croissants.\n\nSofiane passe chez elle tous les quinze jours depuis deux ans. Il connaît la vitrine par cœur, jusqu’au coin qui prend la buée l’hiver.\n\nC’est ça, notre métier : la régularité, et les gens. 🥐\n\n#proximité #Valence`,
      `Fin de chantier au Marché Frais de Livron : 120 minutes prévues, 115 réalisées, bon signé sur la tablette.\n\nJulien a même signalé une gouttière qui fuit au-dessus de l’entrée. Le client a appelé son couvreur dans la foulée.\n\nUn agent attentif, c’est un client tranquille.\n\n#terrain #vitrerie`,
      `Première semaine pour Inès dans l’équipe de Romans.\n\nPerche, eau pure, sécurité, relation client : elle a tout suivi avec Lucas, chantier par chantier.\n\nBienvenue Inès, contents de t’avoir avec nous.\n\n#recrutement #équipe`,
    ],
  },
  {
    id: 'entreprise',
    nom: 'Guillaume Propreté',
    role: 'Page entreprise',
    type: 'entreprise',
    style: [
      'Ton institutionnel mais simple',
      'Met en avant un service ou une réalisation',
      'Mentionne la zone d’intervention (Drôme, Ardèche)',
      'Appel à l’action vers le devis',
    ],
    posts: [
      `Vitrerie, bureaux, commerces, résidences : nos équipes interviennent dans toute la Drôme et l’Ardèche.\n\nPassages réguliers, horaires adaptés à votre activité, bon d’intervention signé à chaque passage.\n\nDevis gratuit sur simple demande.\n\n#vitrerie #propreté #Drôme #Ardèche`,
      `Nouveau : chaque passage est désormais suivi en direct.\n\nNos agents démarrent et clôturent leur intervention sur téléphone, le client signe à l’écran, et le bon arrive dans la foulée.\n\nPlus de transparence, moins de papier.\n\n#innovation #propreté`,
    ],
  },
]

type Statut = 'brouillon' | 'valide' | 'programme'

export function PageLinkedIn() {
  const [compteId, setCompteId] = useState(COMPTES[0].id)
  const [onglet, setOnglet] = useState<'post' | 'style'>('post')
  const [photo, setPhoto] = useState<string | null>(null)
  const [idee, setIdee] = useState('')
  const [post, setPost] = useState<string | null>(null)
  const [tirage, setTirage] = useState(0)
  const [statut, setStatut] = useState<Statut>('brouillon')
  const [programmeLe, setProgrammeLe] = useState('2026-10-30T08:30')

  const compte = COMPTES.find((c) => c.id === compteId)!

  const changerCompte = (id: string) => {
    setCompteId(id)
    setPost(null)
    setStatut('brouillon')
  }

  const generer = () => {
    setPost(compte.posts[tirage % compte.posts.length])
    setTirage((t) => t + 1)
    setStatut('brouillon')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">LinkedIn</h1>
        <p className="text-[13px] text-sourdine">
          Une photo et une idée : l’outil écrit le post dans le style de chacun. Rien ne part sans validation.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {COMPTES.map((c) => (
          <button
            key={c.id}
            onClick={() => changerCompte(c.id)}
            className={`rounded-md border px-3 py-2 text-left text-sm ${c.id === compteId ? 'border-accent bg-accent-doux' : 'border-filet-fort bg-surface hover:bg-survol'}`}
          >
            <div className="font-medium">{c.nom}</div>
            <div className="text-xs text-sourdine">{c.role}</div>
          </button>
        ))}
      </div>

      <Onglets
        valeur={onglet}
        onChange={setOnglet}
        options={[
          { valeur: 'post', libelle: 'Nouveau post' },
          { valeur: 'style', libelle: 'Style d’écriture' },
        ]}
      />

      {onglet === 'style' ? (
        <Carte titre={`Ce que l’outil retient du style de ${compte.nom}`}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-encre-2">
            {compte.style.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <p className="mt-4 text-[13px] text-sourdine">
            Appris à partir des posts déjà publiés et des corrections faites avant validation. Chaque modification affine le style.
          </p>
        </Carte>
      ) : (
        <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-2">
          <Carte titre="Photo et idée">
            <label className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-filet-fort bg-papier text-sm text-sourdine hover:bg-survol">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : 'Ajouter une photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setPhoto(URL.createObjectURL(f))
                }}
              />
            </label>
            <label className="mt-4 block text-[13px] font-medium">
              L’idée en une phrase
              <input
                value={idee}
                onChange={(e) => setIdee(e.target.value)}
                placeholder="Ex. chantier en hauteur ce matin avec la nacelle"
                className="mt-1 block h-9 w-full rounded-md border border-filet-fort bg-surface px-3 text-sm font-normal"
              />
            </label>
            <div className="mt-4">
              <Bouton variante="principal" onClick={generer}>{post ? 'Proposer une autre version' : 'Générer le post'}</Bouton>
            </div>
          </Carte>

          <Carte titre={`Post de ${compte.nom}`}>
            {!post ? (
              <p className="py-10 text-center text-sm text-sourdine">Ajoutez une photo et une idée, puis « Générer le post ».</p>
            ) : (
              <>
                <div className="rounded-md border border-filet">
                  <div className="flex items-center gap-2.5 border-b border-filet px-3 py-2">
                    <span className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-white">{compte.nom[0]}</span>
                    <div>
                      <div className="text-sm font-medium">{compte.nom}</div>
                      <div className="text-xs text-sourdine">{compte.role}</div>
                    </div>
                  </div>
                  <textarea
                    value={post}
                    onChange={(e) => setPost(e.target.value)}
                    rows={12}
                    className="block w-full resize-y border-0 bg-surface px-3 py-2.5 text-sm leading-relaxed"
                  />
                  {photo && <img src={photo} alt="" className="max-h-64 w-full object-cover" />}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Bouton variante="principal" onClick={() => setStatut('valide')}>Valider</Bouton>
                  <input
                    type="datetime-local"
                    value={programmeLe}
                    onChange={(e) => setProgrammeLe(e.target.value)}
                    className="h-9 rounded-md border border-filet-fort bg-surface px-2 text-sm"
                  />
                  <Bouton onClick={() => setStatut('programme')}>Programmer</Bouton>
                </div>
                {statut !== 'brouillon' && (
                  <p className="mt-3 text-sm font-medium text-ok">
                    {compte.type === 'entreprise'
                      ? 'Validé : texte copié, à coller sur la page entreprise (simulation).'
                      : statut === 'valide'
                        ? `Validé : publié sur le compte de ${compte.nom} (simulation).`
                        : `Programmé le ${new Date(programmeLe).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} (simulation).`}
                  </p>
                )}
              </>
            )}
          </Carte>
        </div>
      )}

      <p className="text-[13px] text-sourdine">
        Compte entreprise : copier-coller (LinkedIn limite l’API). Comptes personnels : publication automatique après validation.
      </p>
    </div>
  )
}
