interface HomeScreenProps {
  canContinue: boolean
  resumeSummary: string | null
  onContinue: () => void
  onNewGame: () => void
  onSinglePlayer: () => void
  onRules: () => void
  onSettings: () => void
}

const QUICK_START_STEPS = [
  'Yeni oyunda once baskentini sen secersin. Komsu sayisi yuksek sehir hizli yayilir, kenar sehir daha kolay savunulur.',
  'Baskent 6 ordu, Sur 1 ve tur basina 2 Altin ile acilir. Normal sehirler 1 Altin uretir.',
  'Turunde istedigin kendi sehrini sec. Altin bitene kadar farkli sehirlere YeniCeri Yaz +1 ve Sur Yukselt uygulayabilirsin.',
  'Her tur yalnizca 1 bos sehir ilhak edebilirsin. Yeni yazilan birlikler bu tur yurumez; once garnizonda bekler.',
  'Hazir ordulari komsu sehirlere yurut: dosta destek, notrde ilhak, dusmanda kusatma baskisi kur. Rakibin baskentini ele gecir ya da 12 sehre ulas.',
]

export function HomeScreen({
  canContinue,
  resumeSummary,
  onContinue,
  onNewGame,
  onSinglePlayer,
  onRules,
  onSettings,
}: HomeScreenProps) {
  return (
    <main className="home-screen">
      <section className="home-hero">
        <p className="home-hero__eyebrow">Kale ve Kusatma Surumu</p>
        <h1>Anadolu Stratejisi</h1>
        <p className="home-hero__copy">
          Baskentini sec, vergini topla, garnizonunu buyut ve ordunu cepheye akit. Acilis artik bir anda haritayi boyayan
          bir yaris degil; yavas ama gerilimli bir ilerleme savasi.
        </p>
        <div className="home-hero__flow" aria-label="Temel oyun dongusu">
          <span>Baskent Sec</span>
          <span>Altin Topla</span>
          <span>YeniCeri Yaz</span>
          <span>Sur Kur</span>
          <span>Kusat ve Fethet</span>
        </div>
        <div className="home-hero__guide">
          <strong>Hizli Baslangic</strong>
          <ol className="home-guide__list">
            {QUICK_START_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="home-guide__example">
            Ornek acilis: Mavi Ankara ile merkezde vergi-tempo oyunu kurabilir; Kirmizi Istanbul ile savunmali bir ticaret
            ekseni secip ilk bos sehir ilhakini daha gec ama guclu kullanabilir.
          </p>
        </div>
      </section>

      <section className="home-actions">
        {canContinue ? (
          <>
            <div className="home-note">
              <strong>Kayitli Mac Bulundu</strong>
              <p>{resumeSummary ?? 'Gecerli bir kayit var. Istersen kaldigin yerden devam et ya da sifirdan yeni bir savas kur.'}</p>
            </div>
            <button className="button button--primary button--big button--spotlight" onClick={onContinue}>
              Devam Et
            </button>
          </>
        ) : null}
        <button className="button button--primary button--big button--spotlight" onClick={onNewGame}>
          Yeni Oyun
        </button>
        <button className="button button--secondary button--big" onClick={onSinglePlayer}>
          Tek Oyuncu
        </button>
        <button className="button button--ghost button--big" onClick={onRules}>
          Kurallar
        </button>
        <button className="button button--ghost button--big" onClick={onSettings}>
          Ayarlar
        </button>
      </section>

      <section className="home-notes">
        <div className="home-note">
          <strong>Stratejik Baskent</strong>
          <p>Baskent secimi artik oyunun ilk buyuk karari. 6 baslangic ordusu ve sur bonusu nereye akacak, sen belirlersin.</p>
        </div>
        <div className="home-note">
          <strong>Gorunur Ordu</strong>
          <p>Haritadaki her ordu icin bir yeniCeri piyonu gorursun. Sehir gucu goz karariyla da okunur.</p>
        </div>
        <div className="home-note">
          <strong>Sur Savunmasi</strong>
          <p>Her sur seviyesi savunmaya +1 yazar. Kusatma gucunu surlar ve baskent mevzisiyle dengeleyebilirsin.</p>
        </div>
        <div className="home-note">
          <strong>Sade Tur Akisi</strong>
          <p>Sec, vergini harca, ordunu bir kez yurut ve tek bos ilhak hakkini kullan. Sistem derin ama akis artik daha kontrollu.</p>
        </div>
      </section>
    </main>
  )
}
