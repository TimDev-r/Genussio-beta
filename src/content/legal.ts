// Legal texts. Format: blank line = new paragraph, "## " = heading, "- " = list item, **bold**.
// The German text is binding in every language; en/it/es users see the English version with a note.
//
// BEFORE GOING LIVE: replace every [PLACEHOLDER] in square brackets, then have both texts
// checked once (WKO Gründerservice or a lawyer), as planned in the concept doc.

export const legalTexts: Record<"impressum" | "datenschutz", { de: string; en: string }> = {
  impressum: {
    de: `
## Angaben gemäß § 5 E-Commerce-Gesetz und § 25 Mediengesetz

**Genussio**
Timur Ibragimov und Egor Skliarov
[GESELLSCHAFT BÜRGERLICHEN RECHTS ODER EINZELUNTERNEHMEN]
Mengerstrasse 23
4040 Linz, Österreich

E-Mail: hallo@genussio.at
Website: https://genussio.at

## Unternehmensangaben

Unternehmensgegenstand: Entwicklung und Betrieb einer Web-App zur Essens- und Einkaufsplanung
Gewerbe: [GEWERBEWORTLAUT, z. B. Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik]
Gewerbebehörde: [ZUSTÄNDIGES MAGISTRATISCHES BEZIRKSAMT, WIEN]
Mitglied der Wirtschaftskammer Wien
Anwendbare Rechtsvorschriften: Gewerbeordnung (GewO), abrufbar unter https://www.ris.bka.gv.at
Umsatzsteuerbefreit – Kleinunternehmer gemäß § 6 Abs. 1 Z 27 UStG

## Offenlegung gemäß § 25 Mediengesetz

Medieninhaber: Timur Ibragimov und Egor Skliarov, Mengerstrasse 23
4040 Linz, Österreich
Grundlegende Richtung: Information über die Web-App Genussio und ihr Angebot.

## Online-Streitbeilegung

Verbraucherinnen und Verbraucher können sich bei Problemen an die Internet-Ombudsstelle (https://www.ombudsstelle.at) wenden. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

## Hinweis zur Beta

Genussio befindet sich in einer kostenlosen Testphase. Preise und Angebote der Supermärkte werden sorgfältig übernommen, aber ohne Gewähr. Genussio ist nicht mit Spar, Billa, Hofer oder Lidl verbunden. Alle Marken gehören ihren jeweiligen Inhabern.
`,
    en: `
## Information according to § 5 Austrian E-Commerce Act and § 25 Media Act

**Genussio**
Timur Ibragimov and Egor Skliarov
[CIVIL LAW PARTNERSHIP (GesbR) OR SOLE PROPRIETORSHIP]
Mengerstrasse 23
4040 Linz, Austria

Email: hallo@genussio.at
Website: https://genussio.at

## Business details

Business purpose: development and operation of a web app for meal and shopping planning
Trade licence: [TRADE AS REGISTERED]
Trade authority: [RESPONSIBLE MUNICIPAL DISTRICT OFFICE, VIENNA]
Member of the Vienna Chamber of Commerce (Wirtschaftskammer Wien)
Applicable regulations: Austrian Trade Regulation Act (GewO), available at https://www.ris.bka.gv.at
VAT exempt – small business according to § 6 (1) 27 Austrian VAT Act

## Disclosure according to § 25 Media Act

Media owner: Timur Ibragimov and Egor Skliarov, Mengerstrasse 23
4040 Linz, Austria
Basic orientation: information about the Genussio web app and its offer.

## Dispute resolution

Consumers can contact the Austrian Internet Ombudsman (https://www.ombudsstelle.at) with complaints. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.

## About the beta

Genussio is in a free test phase. Supermarket prices and deals are entered carefully but without guarantee. Genussio is not affiliated with Spar, Billa, Hofer or Lidl. All trademarks belong to their respective owners.
`,
  },
  datenschutz: {
    de: `
Stand: 15.11.2026

Wir nehmen den Schutz deiner Daten ernst. Hier erklären wir, welche Daten Genussio verarbeitet, wofür und auf welcher Rechtsgrundlage, an wen sie gehen und welche Rechte du hast.

## 1. Verantwortlich


Timur Ibragimov und Egor Skliarov, Genussio
Mengerstrasse 23, 4040 Linz, Österreich
E-Mail: hallo@genussio.at

## 2. Welche Daten wir verarbeiten und wofür

**Konto und Anmeldung.** E-Mail-Adresse, bei Anmeldung mit Google zusätzlich dein Name aus deinem Google-Konto, Spracheinstellung, Zeitpunkt der Anmeldung. Wir brauchen diese Daten, um dir ein Konto bereitzustellen (Art. 6 Abs. 1 lit. b DSGVO, Vertrag).

**Haushalt.** Name des Haushalts, gewählte Supermärkte, Budget, Anzahl der Abendessen, maximale Kochzeit, Mitglieder (Anzeigename, Kind ja/nein), Ernährungsweise (alles, vegetarisch, vegan) und Abneigungen. Damit erstellen wir eure Rezeptvorschläge, den Wochenplan und die Einkaufsliste (Art. 6 Abs. 1 lit. b DSGVO).

**Allergien und Unverträglichkeiten.** Wenn du für dich oder ein Kind Allergien angibst, sind das Gesundheitsdaten. Wir verarbeiten sie nur, damit wir keine Rezepte mit diesen Allergenen vorschlagen, und nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO). Du kannst die Angaben jederzeit im Haushalt-Tab löschen und damit die Einwilligung widerrufen. Bitte beachte: Die Allergen-Angaben in den Rezepten werden sorgfältig gepflegt, ersetzen aber nicht den Blick auf die Packung.

**Nutzung der App.** Deine Bewertungen der Rezepte (Swipes), Matches, Wochenpläne, gekochte Gerichte, die Einkaufsliste und wer welchen Artikel abgehakt hat. Diese Daten sind die App selbst (Art. 6 Abs. 1 lit. b DSGVO). Alle Mitglieder deines Haushalts sehen sie.

**Beta-Auswertung.** Wir speichern in unserer eigenen Datenbank, welche Funktionen genutzt werden (z. B. „Wochenplan erstellt“, „Liste geöffnet“), sowie freiwilliges Feedback und Antworten auf den Wochen-Check-in. Außerdem speichern wir, über welchen Beta-Code oder welche Kampagne (utm-Angaben) du zu uns gekommen bist. Damit prüfen wir, ob Genussio funktioniert und weiterentwickelt werden soll (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an der Verbesserung des Angebots). Diese Daten geben wir nicht an Dritte weiter.

**Gründerpreis.** Wenn du den Gründerpreis vormerkst oder bezahlst, speichern wir den Status (vorgemerkt, geklickt, bezahlt, erstattet) und deine E-Mail-Adresse (Art. 6 Abs. 1 lit. b DSGVO). Die Zahlung selbst wickelt Stripe ab; wir erhalten keine Kartendaten.

**E-Mails.** Anmeldecodes und Bestätigungen schicken wir über unseren E-Mail-Dienst (Art. 6 Abs. 1 lit. b DSGVO).

## 3. Empfänger und Auftragsverarbeiter

Wir setzen folgende Dienstleister ein, die Daten nur in unserem Auftrag verarbeiten:

- **Supabase** (Supabase Inc., USA) – Datenbank, Anmeldung und Bildspeicher. Die Daten liegen in einem Rechenzentrum in Frankfurt am Main (EU). Für einen möglichen Zugriff aus den USA gelten EU-Standardvertragsklauseln.
- **[HOSTING-ANBIETER DER WEBSITE, z. B. Lovable bzw. Cloudflare, Inc.]** – Auslieferung der Website. Dabei werden technisch notwendige Daten wie IP-Adresse und Zeitpunkt des Aufrufs verarbeitet, auch zum Schutz vor Angriffen. [ANGABE ZU DATENÜBERMITTLUNG/STANDARDVERTRAGSKLAUSELN DES ANBIETERS]
- **Brevo** (Sendinblue SAS, Paris, Frankreich) – Versand der Anmelde-E-Mails.
- **Google** (Google Ireland Limited, Dublin, Irland) – nur wenn du „Mit Google anmelden“ wählst. Google erfährt dabei, dass du dich bei Genussio anmeldest.
- **Stripe** (Stripe Payments Europe, Limited, Dublin, Irland) – Zahlungsabwicklung für den Gründerpreis. Stripe verarbeitet deine Zahlungsdaten als eigener Verantwortlicher; es gilt die Datenschutzerklärung von Stripe: https://stripe.com/at/privacy
- **Meta** (Meta Platforms Ireland Limited, Dublin, Irland) – nur nach deiner Einwilligung, siehe Punkt 5.

## 4. Cookies und Speicher im Browser

Genussio speichert im Browser nur, was für die App nötig ist: deine Anmeldung (damit du angemeldet bleibst), deine Sprache (Cookie „genussio_locale“), deine Cookie-Auswahl und kleine Anzeige-Einstellungen (z. B. „Erledigte ausblenden“). Unser Hosting-Anbieter setzt ein technisch notwendiges Cookie zum Schutz vor automatisierten Angriffen. Für diese notwendigen Speicherungen brauchen wir keine Einwilligung (§ 165 Abs. 3 TKG 2021).

## 5. Meta Pixel (nur mit Einwilligung)

Wenn du im Cookie-Banner „Alle akzeptieren“ wählst, laden wir das Meta Pixel. Es meldet an Meta, dass du unsere Seite aufgerufen, dich angemeldet oder einen Haushalt erstellt hast. So sehen wir, ob unsere Werbung auf Facebook und Instagram wirkt. Meta kann diese Daten mit deinem Meta-Konto verknüpfen und auch in die USA übermitteln (Meta ist nach dem EU-US Data Privacy Framework zertifiziert). Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 165 Abs. 3 TKG 2021). Du kannst sie jederzeit über „Cookie-Einstellungen“ unten auf jeder Seite widerrufen. Ohne Einwilligung wird nichts von Meta geladen.

## 6. Speicherdauer

Wir speichern deine Daten, solange du ein Konto hast. Wenn du dein Konto löschst (Haushalt-Tab, „Konto löschen“), löschen wir dein Profil, deine Nutzungs- und Feedbackdaten sofort; als letzte erwachsene Person im Haushalt auch den ganzen Haushalt. Daten zu bezahlten Gründerpreisen bewahren wir aus steuerrechtlichen Gründen sieben Jahre auf (§ 132 BAO). Am Ende der Beta informieren wir dich, was mit deinem Konto passiert.

## 7. Deine Rechte

Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen. Schreib uns dafür an hallo@genussio.at.

Wenn du meinst, dass wir deine Daten nicht richtig verarbeiten, kannst du dich bei der Österreichischen Datenschutzbehörde beschweren: Barichgasse 40–42, 1030 Wien, dsb@dsb.gv.at, https://www.dsb.gv.at
`,
    en: `
Last updated: 15.11.2026

We take the protection of your data seriously. This page explains which data Genussio processes, why and on which legal basis, who receives it and what rights you have.

## 1. Controller

Timur Ibragimov and Egor Skliarov, Genussio
Mengerstrasse 23, 4040 Linz, Austria
Email: hallo@genussio.at

## 2. What we process and why

**Account and sign-in.** Email address, your name from your Google account if you sign in with Google, language setting, time of sign-up. We need this to provide your account (Art. 6(1)(b) GDPR, contract).

**Household.** Household name, chosen supermarkets, budget, number of dinners, maximum cooking time, members (display name, kid yes/no), diet (everything, vegetarian, vegan) and dislikes. We use this to build your recipe suggestions, weekly plan and shopping list (Art. 6(1)(b) GDPR).

**Allergies and intolerances.** If you enter allergies for yourself or a child, this is health data. We process it only to avoid suggesting recipes with these allergens, and only with your explicit consent (Art. 9(2)(a) GDPR). You can delete it any time in the Household tab, which withdraws your consent. Please note: allergen information in the recipes is maintained carefully but does not replace checking the packaging.

**Using the app.** Your recipe votes (swipes), matches, weekly plans, cooked dishes, the shopping list and who ticked which item. This data is the app itself (Art. 6(1)(b) GDPR). All members of your household can see it.

**Beta analysis.** In our own database we store which features are used (e.g. "plan created", "list opened"), voluntary feedback and weekly check-in answers, and which beta code or campaign (utm parameters) brought you to us. We use this to check whether Genussio works and should be developed further (Art. 6(1)(f) GDPR, legitimate interest in improving the service). We do not share this data with third parties.

**Founders' price.** If you reserve or pay the founders' price, we store its status (reserved, clicked, paid, refunded) and your email address (Art. 6(1)(b) GDPR). Stripe handles the payment itself; we never receive card details.

**Emails.** We send sign-in codes and confirmations through our email provider (Art. 6(1)(b) GDPR).

## 3. Recipients and processors

We use these service providers, who process data only on our behalf:

- **Supabase** (Supabase Inc., USA) – database, sign-in and image storage. The data is stored in a data centre in Frankfurt am Main (EU). EU Standard Contractual Clauses cover any access from the USA.
- **[WEBSITE HOSTING PROVIDER, e.g. Lovable or Cloudflare, Inc.]** – delivering the website, which involves technically necessary data such as IP address and time of access, also to protect against attacks. [PROVIDER'S DATA TRANSFER SAFEGUARDS]
- **Brevo** (Sendinblue SAS, Paris, France) – sending sign-in emails.
- **Google** (Google Ireland Limited, Dublin, Ireland) – only if you choose "Sign in with Google". Google then learns that you are signing in to Genussio.
- **Stripe** (Stripe Payments Europe, Limited, Dublin, Ireland) – payment processing for the founders' price. Stripe processes your payment data as an independent controller under its own privacy policy: https://stripe.com/at/privacy
- **Meta** (Meta Platforms Ireland Limited, Dublin, Ireland) – only with your consent, see section 5.

## 4. Cookies and browser storage

Genussio only stores what the app needs in your browser: your sign-in (so you stay signed in), your language (cookie "genussio_locale"), your cookie choice and small display settings (e.g. "hide done"). Our hosting provider sets a technically necessary cookie to protect against automated attacks. These necessary items do not require consent (§ 165 (3) Austrian Telecommunications Act 2021).

## 5. Meta Pixel (only with consent)

If you choose "Accept all" in the cookie banner, we load the Meta Pixel. It tells Meta that you visited our site, signed up or created a household, so we can see whether our ads on Facebook and Instagram work. Meta may link this data to your Meta account and transfer it to the USA (Meta is certified under the EU-US Data Privacy Framework). The legal basis is your consent (Art. 6(1)(a) GDPR, § 165 (3) Austrian Telecommunications Act 2021). You can withdraw it any time via "Cookie settings" at the bottom of every page. Without consent, nothing from Meta is loaded.

## 6. How long we keep data

We keep your data as long as you have an account. When you delete your account (Household tab, "Delete account"), we immediately delete your profile, usage and feedback data, and if you are the last adult in the household, the whole household. Records of paid founders' prices are kept for seven years for tax reasons (§ 132 Austrian Federal Fiscal Code). At the end of the beta we will tell you what happens to your account.

## 7. Your rights

You have the right to access, rectification, erasure, restriction of processing, data portability and objection, and the right to withdraw consent at any time with effect for the future. Just write to hallo@genussio.at.

If you think we are not processing your data correctly, you can complain to the Austrian Data Protection Authority: Barichgasse 40–42, 1030 Vienna, dsb@dsb.gv.at, https://www.dsb.gv.at
`,
  },
};
