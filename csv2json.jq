split("\n") | .[1:-1] | map(split(";")) | map({
  "lat": (.[1] | tonumber),
  "lon": (.[2] | tonumber),
  "title": .[3],
  "description": .[4],
  "location": .[5]
})
