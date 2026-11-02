"""Starter benefits for the parlour's seeded services, shown on each service's page.

Admins edit them per service (website or app). They are only filled in where a service has
none yet, so an admin's own wording is never overwritten.
"""

DEFAULT_BENEFITS: dict[str, list[str]] = {
    "svc_straightening": [
        "Sleek, straight hair that stays smooth for months",
        "Heat-protecting treatment guards against damage",
        "Cuts daily styling time; no more ironing every morning",
        "Adds a glossy, salon-finished shine",
    ],
    "svc_hair_protein": [
        "Repairs damage from colour, heat and pollution",
        "Strengthens strands and reduces breakage",
        "Restores softness, bounce and natural shine",
        "Makes hair easier to comb and manage",
    ],
    "svc_hair_botox": [
        "Deep conditioning that fills in rough, damaged areas",
        "Visibly softer, shinier hair after one session",
        "Tames frizz while keeping your natural volume",
        "Great before a wedding or special event",
    ],
    "svc_hair_color": [
        "Even, rich colour with professional salon products",
        "Covers greys completely",
        "Shade chosen to suit your skin tone and style",
        "Finished with a machine wash for a clean, lasting result",
    ],
    "svc_smoothing": [
        "Controls frizz, even in humid monsoon weather",
        "Keeps natural movement; softer than straightening",
        "Hair feels lighter, silkier and easier to style",
        "Long-lasting results with simple aftercare",
    ],
    "svc_nanoplastia": [
        "Formaldehyde-free: gentler on hair and scalp",
        "Smooth, straight, healthy-looking hair",
        "Suitable for chemically treated or coloured hair",
        "Reduces frizz and drying time",
    ],
    "svc_cap_highlights": [
        "Soft, even streaks that brighten your look",
        "Adds depth and dimension without a full colour",
        "Quick one-hour service",
        "Budget-friendly way to try a new style",
    ],
    "svc_ani_facial": [
        "Deep-cleans pores and removes dull, dead skin",
        "Relaxing massage boosts circulation and glow",
        "Brand mask leaves skin soft, fresh and hydrated",
        "Ideal before a function or as monthly care",
    ],
    "svc_face_bleach": [
        "Lightens facial hair so it blends with your skin",
        "Gives an even, brighter-looking complexion",
        "Done in just 20 minutes",
        "Painless alternative to removing facial hair",
    ],
    "svc_deep_bleach": [
        "Stronger lightening for face and neck",
        "Evens out tan and patchy skin tone",
        "Soothing finish to calm the skin afterwards",
        "Perfect before an event or photoshoot",
    ],
    "svc_body_wax": [
        "Smooth skin on arms, legs, underarms and back",
        "Hair grows back slower and finer over time",
        "Results last much longer than shaving",
        "Hygienic, single-use wax strips",
    ],
    "svc_hand_leg_wax": [
        "Silky-smooth hands and legs for weeks",
        "Removes hair from the root; no stubble",
        "Gentle exfoliation leaves skin brighter",
        "Quick one-hour session",
    ],
    "svc_pedicure": [
        "Warm soak softens skin and relaxes tired feet",
        "Scrub removes cracked heels and dead skin",
        "Foot massage relieves stress and improves circulation",
        "Neatly shaped nails with a polish of your choice",
    ],
}
