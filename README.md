# HusHelt – oppsett (tar ca. 20 minutter, koster 0 kr)

HusHelt er en ren nettside (PWA) uten byggesteg. Den trenger bare:
1. et **eget** Firebase-prosjekt (gratisplanen Spark) til innlogging og lagring
2. GitHub Pages til å vise nettsiden

Villspor-prosjektet ditt blir ikke berørt. Kvoter og fakturering gjelder per prosjekt.

## 0. Prøv først uten Firebase
Åpne siden slik den er. Så lenge `config.js` har «DIN-API-KEY» kjører appen i **demo-modus**. Alt lagres bare i den nettleseren, og med knappen «Vis som barn/forelder» kan du se begge sider. Bra for at andre kan teste.

## 1. Lag et nytt Firebase-prosjekt
1. Gå til https://console.firebase.google.com og trykk **Add project**.
2. Navn: `hushelt` (eller noe annet). Skru **av** Google Analytics. Du trenger det ikke.
3. Ikke oppgrader til Blaze. Bli på **Spark**. Da kan du ikke bli fakturert.

## 2. Skru på innlogging
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
Ikke bruk telefon-innlogging (SMS koster penger).

## 3. Lag databasen og legg inn reglene
1. **Build → Firestore Database → Create database.**
2. Velg en europeisk region (for eksempel `eur3` eller `europe-west1`) og **Production mode**.
3. Gå til fanen **Rules**, slett alt og lim inn innholdet i `firestore.rules`. Trykk **Publish**.

## 4. Koble appen til prosjektet
1. **Project settings (tannhjulet) → General → Your apps → `</>` (Web)**. Gi den et navn og registrer. Ikke huk av for Firebase Hosting.
2. Du får et `firebaseConfig`-objekt. Kopier verdiene inn i `config.js`.
3. **Authentication → Settings → Authorized domains → Add domain**, og skriv `BRUKERNAVN.github.io` (ditt GitHub-brukernavn).
   Uten dette får du feilen «unauthorized-domain» ved innlogging.

## 5. Legg ut på GitHub Pages
1. Last opp **alle** filene i denne mappen til roten av repoet `hushelten` (ikke i en undermappe).
2. **Settings → Pages → Deploy from a branch → main → / (root) → Save.**
3. Etter ett til to minutter ligger appen på `https://BRUKERNAVN.github.io/hushelten/`.
4. Etter at du har endret filer: skriv `?v=2` bak adressen, eller lukk og åpne appen to ganger, så henter den ny versjon.

## 6. Første gangs bruk
1. Åpne appen og trykk **Opprett konto** (e-post + passord). Velg «Opprett familie».
2. **Familie-fanen → Legg til barn.** Du får en kode (XXXX-XXXX) per barn.
3. Barnet åpner appen, lager konto og velger «Bli med med kode». Barnets kode gir barnevisning.
4. Den andre forelderen gjør det samme med **Voksen-koden** (finnes under Familie).
5. **Delt bosted** er valgfritt: skru det på under Familie, velg hvem som har første uke, og gi hjemmene navn. Tjent beløp føres på hjemmet som har uka. Hver forelder ser og betaler ut sitt. Bruk «Bytt uke» hvis rytmen forskyves. Familier uten delt bosted lar det stå av.
6. Systerens familie lager en **egen** familie. Dere deler ikke data.

## 7. Legg på hjemskjermen
- **iPhone (Safari):** Del-ikonet → *Legg til på Hjem-skjerm*.
- **Android (Chrome):** menyen → *Installer app*.

## Langtidsmål (for eksempel sydentur)
Under **Familie → barnets kort → Lag langtidsmål** setter du navn, belønning, XP som kreves og eventuelt en frist. Barnet ser en fremdriftsbar med prosent og merker ved 25, 50 og 75 %. Foreldre ser hvor mange XP per uke som trengs for å nå målet i tide, og hva barnet ville fått hvis alle quests ble gjort hver uke. Bruk det til å sette målet så høyt at det krever mye. XP teller fra startdatoen, og «Angre» på en godkjenning trekker også tilbake målet. Når målet er nådd, får foreldrene et varsel, og du trykker «Belønning gitt, fjern målet» når reisen er avtalt. Barnet kan ikke endre målet selv.

## Varsler
Varslene ligger inne i appen: bjelle, rød teller og tall i fanetittelen. De oppdateres i sanntid mens appen er åpen, og vises neste gang appen åpnes ellers. Push til lukket app er ikke med, siden det krever betalt Firebase-plan eller en ekstra tjeneste.

## Gratisgrenser (Spark)
50 000 lesinger og 20 000 skrivinger per dag, 1 GiB lagring. En familie bruker en brøkdel av dette.

## Feilsøking
- **Tom side / ingenting skjer:** åpne utviklerverktøy (F12 → Console) og se etter røde feil.
- **`permission-denied`:** reglene er ikke publisert, eller de er kopiert feil (steg 3).
- **`unauthorized-domain`:** legg til github.io-domenet (steg 4.3).
- **`auth/operation-not-allowed`:** Email/Password er ikke skrudd på (steg 2).

## Ærlige forbehold
- Appen er testet i demo-modus og logikken er enhetstestet, men **ikke mot et ekte Firebase-prosjekt**. Regn med at det kan dukke opp småfeil første gang. Send meg konsollfeilen, så fikser vi den.
- Belønninger regnes ut i appen når en voksen godkjenner. Det finnes ingen server som kontrollerer. Barnet kan i teorien endre egne utseende-ting (avatar, mynter) ved å tukle med nettleseren, men ikke penger eller XP.
- Alle i familien kan lese familiens data. Regnskapet kan bare voksne lese.
- Penger flyttes aldri av appen. Dere betaler selv (Vipps) og markerer «Utbetalt».
