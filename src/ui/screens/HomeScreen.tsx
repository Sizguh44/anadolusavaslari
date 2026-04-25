import { audioManager } from '../../engine/audioManager'

interface HomeScreenProps {
  onStart: () => void
}

const HOW_TO_STEPS: Array<{ index: string; title: string; body: string }> = [
  {
    index: '01',
    title: 'Başkentini seç',
    body:
      'Haritada sahipsiz bir şehri başkent yap. Önce Mavi, sonra Kırmızı seçer; rakip başkentine komşu iller kapalıdır.',
  },
  {
    index: '02',
    title: 'Genişle ve hazırlan',
    body:
      'Komşu sahipsiz şehirleri ücretsiz ilhak et, dost şehirler arasında intikal ile cephe kur, vergiyle ordu ve sur bas.',
  },
  {
    index: '03',
    title: 'Rakip başkenti düşür',
    body:
      'Düşman şehrine yeterli güçle saldır, başkentini al ve savaşı bitir. Strateji kartlarıyla ritmi değiştirebilirsin.',
  },
]

const FEATURE_TILES: Array<{ icon: string; eyebrow: string; title: string; rows: string[] }> = [
  {
    icon: '⚒',
    eyebrow: 'Ekonomi',
    title: 'Vergi ve kasa',
    rows: [
      'Tur başında şehir vergileri kasana düşer.',
      'Başkent kalıcı 200 altın vergi verir.',
      'Ordu ve sur inşası birim başına 1000 altın.',
    ],
  },
  {
    icon: '⚔',
    eyebrow: 'Muharebe',
    title: 'Deterministik çözüm',
    rows: [
      'Saldırı gücü gönderilen birlik sayısıdır.',
      'Her 2 saldırı birimi hedefte 1 sur yıkar.',
      'Başkent savunmasına +1 ek avantaj.',
    ],
  },
  {
    icon: '◈',
    eyebrow: 'Kartlar',
    title: 'Dört strateji kartı',
    rows: [
      'Casus — rakip ordusunun 1/3\'ünü kilitler.',
      'Kundaklama — hedef şehri böler, sur düşer.',
      'Kudret — bu tur +1 saldırı hakkı.',
      'Yatırım — kendi şehrinin vergisini 2\'ye katlar.',
    ],
  },
  {
    icon: '⏱',
    eyebrow: 'Tur Akışı',
    title: 'Sıkı ritim',
    rows: [
      'Her tur tek büyük hamle: ya bir ilhak ya bir saldırı.',
      'Takviye + tur sonu her zaman elde.',
      'Oyun her hamlede otomatik kaydedilir.',
    ],
  },
]

export function HomeScreen({ onStart }: HomeScreenProps) {
  const handleStart = () => {
    audioManager.playContext()
    onStart()
  }

  return (
    <main className="home-shell">
      <section className="home-hero">
        <p className="section-eyebrow">Sıra Tabanlı Harp Oyunu · İki Komutan</p>
        <h1>Anadolu Savaşları</h1>
        <p className="home-hero__copy">
          Anadolu haritasında başkentini seç, vergiyle kasanı büyüt, ordu ve surlarla cepheyi genişlet.
          <strong> Rakip başkenti düşüren kazanır.</strong>
        </p>

        <ol className="home-hero__steps" aria-label="Üç adımda savaş">
          {HOW_TO_STEPS.map((step) => (
            <li key={step.index} className="home-hero__step">
              <span className="home-hero__step-index" aria-hidden>
                {step.index}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="home-hero__actions">
          <button className="button button--primary button--hero" onClick={handleStart}>
            Yeni Savaşa Başla
          </button>
          <span className="home-hero__meta">İki oyunculu · Aynı ekran · Otomatik kayıt</span>
        </div>
      </section>

      <section className="home-grid" aria-label="Detaylar">
        {FEATURE_TILES.map((tile) => (
          <article key={tile.title} className="home-tile">
            <span className="home-tile__icon" aria-hidden>
              {tile.icon}
            </span>
            <p className="section-eyebrow">{tile.eyebrow}</p>
            <h3>{tile.title}</h3>
            <ul className="home-tile__list">
              {tile.rows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  )
}
