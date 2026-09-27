"""Récupère la note et les avis Google de la fiche Ben&Bat dans reviews.json.

Utilise l'API Places (New). Il faut un secret GitHub GOOGLE_PLACES_API_KEY
(clé Google Cloud avec « Places API (New) » activée) et, idéalement, le secret
GOOGLE_PLACE_ID de la fiche pour éviter la recherche par nom.

Sans clé, le script s'arrête proprement : reviews.json n'est pas modifié et le
site continue d'afficher les témoignages écrits dans les pages.
"""
import json
import os
import sys
import urllib.error
import urllib.request

API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
PLACE_ID = os.environ.get("GOOGLE_PLACE_ID", "").strip()

if not API_KEY:
    print("::warning::Secret GOOGLE_PLACES_API_KEY absent : synchronisation ignorée.")
    sys.exit(0)


def call(url, body=None, field_mask=""):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        method="POST" if body else "GET",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": field_mask,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"::error::API Places {e.code} : {e.read().decode()[:500]}")
        sys.exit(1)


# 1. Identifier la fiche (repère Google Maps près du 60 rue François 1er)
if not PLACE_ID:
    found = call(
        "https://places.googleapis.com/v1/places:searchText",
        body={
            "textQuery": "Ben&Bat rénovation Paris",
            "languageCode": "fr",
            "locationBias": {"circle": {
                "center": {"latitude": 48.8698258, "longitude": 2.3020488},
                "radius": 2000.0,
            }},
        },
        field_mask="places.id,places.displayName",
    )
    places = found.get("places", [])
    if not places:
        print("::error::Aucune fiche Google trouvée pour Ben&Bat.")
        sys.exit(1)
    PLACE_ID = places[0]["id"]
    print(f"Fiche trouvée : {places[0]['displayName']['text']} ({PLACE_ID})")

# 2. Note, nombre d'avis et 5 derniers avis en français
details = call(
    f"https://places.googleapis.com/v1/places/{PLACE_ID}?languageCode=fr",
    field_mask="displayName,rating,userRatingCount,reviews",
)

output = {
    "rating": details.get("rating", 0),
    "total": details.get("userRatingCount", 0),
    "reviews": [
        {
            "author": rev.get("authorAttribution", {}).get("displayName", "Client Google"),
            "rating": rev.get("rating", 5),
            "text": rev.get("text", {}).get("text", ""),
            "time": rev.get("relativePublishTimeDescription", ""),
        }
        for rev in details.get("reviews", [])
        if rev.get("text", {}).get("text", "").strip()
    ],
}

with open("reviews.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"{len(output['reviews'])} avis récupérés — note {output['rating']} sur {output['total']} avis")
