/* ============================================================
   URJITA — SITE SETTINGS
   ------------------------------------------------------------
   This is the ONLY file you need to edit to change a phone
   number, email, WhatsApp number, map link or store link.
   Every page reads from here.

   Rules when editing:
     - Keep the quote marks '...' around every value.
     - Keep the comma at the end of each line.
     - WhatsApp numbers: country code + number, digits only,
       no + and no spaces. 91 = India.  e.g. '918446339272'
     - Phone numbers: write them the way you want them shown.
   ============================================================ */

window.URJITA_CONFIG = {

  /* ---------- general contact ---------- */
  email: 'urjitapranichealing@gmail.com',

  instagram: {
    handle: 'urjitapranichealing',                     // without the @
    url:    'https://instagram.com/urjitapranichealing',
  },

  /* The floating WhatsApp button and every "Ask on WhatsApp" button use this number. */
  whatsapp: '918446339272',

  /* ---------- the two centres ---------- */
  branches: {
    badlapur: {
      phone:    '+91 84463 39272',
      whatsapp: '918446339272',     // contact-form enquiries for Badlapur go here
      maps:     'https://maps.app.goo.gl/MmKMw3pCk4TK1EzW7',
    },
    dombivli: {
      phone:    '+91 99671 21519',
      whatsapp: '919967121519',     // contact-form enquiries for Dombivli go here
      maps:     'https://www.google.com/maps/search/?api=1&query=Dattanagar+Dombivli+East',
    },
  },

  /* ---------- online store (Razorpay) ---------- */
  shop: {
    /* The main store. Any category below left as '' uses this link. */
    store: 'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv',

    /* Paste a category page link between the quotes to send that button straight to it. */
    categories: {
      'bath-salts':        'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv?categories=bath_salts',
      'aura-sprays':       'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv?categories=cleansing_sprays',
      'vastu-sprays':      'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv?categories=cleansing_sprays',
      'crystal-jewellery': 'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv?categories=wearing_crystals',
      'festive-offers':    'https://pages.razorpay.com/stores/st_TapC3XQKg05fDv?categories=diwali_hampers',
    },
  },
};
