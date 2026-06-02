import json
import os
import urllib.request
import urllib.parse

API_KEY = os.environ["GOOGLE_PLACES_API_KEY"]

# Trouver le Place ID via le nom + coordonnées extraites de la fiche Google Maps
find_url = (
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    f"?input={urllib.parse.quote('Ben&bat')}"
    "&inputtype=textquery"
    "&fields=place_id"
    "&locationbias=point:48.8698258,2.3020488"
    f"&key={API_KEY}"
)

with urllib.request.urlopen(find_url) as r:
    find_data = json.loads(r.read())

candidates = find_data.get("candidates", [])
if not candidates:
    print("Aucune fiche trouvée.")
    raise SystemExit(1)

place_id = candidates[0]["place_id"]
print(f"Place ID : {place_id}")

# Récupérer les détails et les avis (langue française)
details_url = (
    "https://maps.googleapis.com/maps/api/place/details/json"
    f"?place_id={place_id}"
    "&fields=name,rating,user_ratings_total,reviews"
    "&language=fr"
    f"&key={API_KEY}"
)

with urllib.request.urlopen(details_url) as r:
    details_data = json.loads(r.read())

result = details_data.get("result", {})
reviews = result.get("reviews", [])

output = {
    "rating": result.get("rating", 5),
    "total": result.get("user_ratings_total", 0),
    "reviews": [
        {
            "author": rev["author_name"],
            "rating": rev["rating"],
            "text": rev["text"],
            "time": rev["relative_time_description"],
        }
        for rev in reviews
        if rev.get("text", "").strip()
    ],
}

with open("reviews.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"{len(output['reviews'])} avis récupérés — note : {output['rating']}")
