// Starter wording for the public website. Each piece is shown only while the
// matching field in Settings → Public website is empty.
export const SITE_DEFAULTS = {
  tagline:
    "A Qur'an and Islamic studies school nurturing children in memorisation of the Qur'an, sound knowledge of the Deen, and good character.",
  aboutText: `We are an Islamiyyah school dedicated to teaching children the Book of Allah and the foundations of the Deen in a caring, disciplined environment.

Our teachers follow each child's progress closely, from learning the letters and correct recitation to memorising the Qur'an, and we work hand in hand with parents so that what is learnt in school is lived at home.`,
  principalMessage: `Assalamu alaikum wa rahmatullah.

It is our honour to welcome you to our school. Our aim is simple: to raise children who love the Qur'an, understand their Deen, and carry themselves with good manners wherever they go.

We thank every parent who entrusts their child to us, and we pray that Allah makes it a means of benefit in this world and the Hereafter.`,
  programmeText: `Every pupil follows a structured programme of Qur'an memorisation (hifz) with revision (muraja'ah), supported by Tajweed so that recitation is correct and beautiful.

Alongside the Qur'an, pupils learn Arabic, Fiqh, Hadith, Tawheed and Seerah at a level suited to their class. Progress in memorisation and academic subjects is recorded every term and shared with parents on the report card.`,
  admissionsText: `Admission is open to children of all ages, subject to available space in each class.

1. Visit the school office with your child during office hours.
2. Fill in the admission form and provide the child's date of birth and a parent's contact details.
3. Your child may be assessed briefly in reading and recitation so that we place them in the right class.
4. Once admitted, you will receive an admission number and, on request, a parent login to follow attendance, results and fees online.`,
  feesText: `School fees are paid per term. The amount depends on the child's class and is shared at admission.

Payments can be made at the school office (cash or POS) or by bank transfer. An official receipt is issued for every payment, and parents with a portal login can see their child's balance and receipts online.

For details, please contact the school office.`,
  officeHours: "Please call the school office to arrange a visit.",
} as const;

/** Photo row (ownerType "site") holding the proprietor's picture. */
export const PROPRIETOR_PHOTO_ID = 1;

export type SiteTextKey = keyof typeof SITE_DEFAULTS;

/** The admin's text if set, otherwise the starter wording. */
export const siteText = (settings: Partial<Record<SiteTextKey, string>> | null | undefined, key: SiteTextKey) =>
  settings?.[key]?.trim() || SITE_DEFAULTS[key];
