#!/usr/bin/env bash
# Guarded write/update of ONE Firestore document in the kdc-apps project.
# Same auth as firestore-read.sh (gcloud user OAuth token; IAM bypasses rules).
# Upsert: creates the document if it does not exist, or updates it.
# Alleen de opgegeven velden veranderen (updateMask); andere velden blijven staan.
#
# Usage:
#   firestore-write.sh <collection> <docId> veld=waarde [veld=waarde ...]         # DRY RUN
#   firestore-write.sh <collection> <docId> veld=waarde [...] --yes               # voert ECHT uit
#
# Type-inferentie per waarde:
#   geheel getal   -> integerValue      (bv.  count=81)
#   kommagetal     -> doubleValue       (bv.  bedrag=184.00)
#   true / false   -> booleanValue
#   null           -> nullValue
#   anders         -> stringValue
# Forceer expliciet met een prefix:  s:  (string)   d:  (double)   i:  (integer)
#   bv.  bedrag=s:184,00   |   koers=d:0.92   |   jaar=i:2026
#
# HITL-guardrail: without --yes nothing happens; the agent shows the payload first.
set -euo pipefail
PROJECT="${FIRESTORE_PROJECT:-kdc-apps}"
COLL="${1:?Usage: firestore-write.sh <collection> <docId> veld=waarde ... [--yes]}"; shift
DOCID="${1:?Usage: firestore-write.sh <collection> <docId> veld=waarde ... [--yes]}"; shift

PAIRS=(); CONFIRM=""
for a in "$@"; do
  if [[ "$a" == "--yes" ]]; then CONFIRM="--yes"; else PAIRS+=("$a"); fi
done
[[ ${#PAIRS[@]} -gt 0 ]] || { echo "No field=value pairs provided." >&2; exit 1; }

BASE="https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents"
TOKEN="$(gcloud auth print-access-token)"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

MASK="$(python3 - "$TMP" "${PAIRS[@]}" <<'PY'
import json,sys
tmp=sys.argv[1]; pairs=sys.argv[2:]
fields={}; masks=[]
for p in pairs:
    if "=" not in p: sys.exit("Invalid pair (no '='): "+p)
    k,v=p.split("=",1); masks.append(k)
    if   v.startswith("s:"): fields[k]={"stringValue": v[2:]}
    elif v.startswith("d:"): fields[k]={"doubleValue": float(v[2:])}
    elif v.startswith("i:"): fields[k]={"integerValue": str(int(v[2:]))}
    elif v=="null":          fields[k]={"nullValue": None}
    elif v in ("true","false"): fields[k]={"booleanValue": v=="true"}
    elif v.lstrip("-").isdigit(): fields[k]={"integerValue": v}
    else:
        try: fields[k]={"doubleValue": float(v)}
        except ValueError: fields[k]={"stringValue": v}
json.dump({"fields":fields}, open(tmp,"w"))
print("&".join("updateMask.fieldPaths=%s" % m for m in masks))
PY
)"

URL="${BASE}/${COLL}/${DOCID}?${MASK}"

echo "== Doeldocument: ${PROJECT}/${COLL}/${DOCID} =="
echo "== Payload (alleen deze velden worden gezet) =="
python3 -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["fields"], indent=2, ensure_ascii=False))' "$TMP"

if [[ "$CONFIRM" != "--yes" ]]; then
  echo
  echo ">> DRY RUN — er is NIETS geschreven."
  echo ">> Uitvoeren door dezelfde regel te herhalen met  --yes  erachter."
  exit 0
fi

echo
echo ">> SCHRIJVEN..."
RESP="$(curl -s -w '\n%{http_code}' -X PATCH \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  --data @"$TMP" "$URL")"
CODE="$(printf '%s' "$RESP" | tail -n1)"
BODY="$(printf '%s' "$RESP" | sed '$d')"
if [[ "$CODE" == "200" ]]; then
  echo ">> OK: document geschreven (HTTP ${CODE})."
else
  echo ">> FOUT (HTTP ${CODE}): ${BODY}"
  exit 1
fi
