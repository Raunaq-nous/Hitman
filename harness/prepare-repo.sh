#!/usr/bin/env bash
# ALTER EGO · Prepare repository (run by the agent from the kit; works on macOS, Linux, Codespaces and Git Bash)
# 1) keeps a private backup bundle, 2) purges dev.db files and the UPI handle from ALL history,
# 3) commits the Phase 0 patches authored by the owner, 4) creates the overhaul branch.
set -euo pipefail
: "${TOKEN:?missing ALTER_EGO_TOKEN secret}" "${REPO:?}" "${OWNER:?}" "${OWNER_ID:?}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
AUTHOR_NAME="${OWNER}"; AUTHOR_EMAIL="${OWNER_ID}+${OWNER}@users.noreply.github.com"
REMOTE="${REMOTE_URL:-https://x-access-token:${TOKEN}@github.com/${REPO}.git}"
WORK="$(mktemp -d)"; SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
if git ls-remote --exit-code --heads "$REMOTE" overhaul >/dev/null 2>&1; then
  echo "The overhaul branch already exists, so preparation has already run. Nothing to do." | tee -a "$SUMMARY"; exit 0
fi
echo "::group::Mirror clone"; git clone --quiet --mirror "$REMOTE" "$WORK/mirror.git"; echo "::endgroup::"
cd "$WORK/mirror.git"
if [ "${PRIVATE:-false}" = "true" ] || [ -n "${BACKUP_DIR:-}" ]; then
  git bundle create "$WORK/pre-overhaul-backup.bundle" --all
  [ -n "${GITHUB_ENV:-}" ] && echo "BACKUP=$WORK/pre-overhaul-backup.bundle" >> "$GITHUB_ENV"
  if [ -n "${BACKUP_DIR:-}" ]; then mkdir -p "$BACKUP_DIR" && cp "$WORK/pre-overhaul-backup.bundle" "$BACKUP_DIR/pre-overhaul-$(date -u +%Y%m%dT%H%M%SZ).bundle" && echo "Backup saved in $BACKUP_DIR"; fi
fi
PY="$(command -v python3 || command -v python || command -v py)"; [ -n "$PY" ] || { echo "::error::Python 3 is required"; exit 1; }
"$PY" -m pip install --quiet --user git-filter-repo 2>/dev/null || "$PY" -m pip install --quiet git-filter-repo 2>/dev/null || "$PY" -m pip install --quiet --break-system-packages git-filter-repo
SUFFIX="okic""ici"   # written split so this file never matches its own search
HANDLE_RE="[a-z0-9._-]+@${SUFFIX}"
printf 'regex:(?i)%s==>[REDACTED-UPI]\n' "$HANDLE_RE" > "$WORK/replacements.txt"
echo "::group::Rewrite history"
"$PY" -m git_filter_repo --force --invert-paths --path dev.db --path prisma/dev.db --replace-text "$WORK/replacements.txt" --replace-message "$WORK/replacements.txt"
echo "::endgroup::"
# write history to files first: piping into grep -q under pipefail would hide matches
git log --all -p > "$WORK/history.txt"; git log --all --name-only --format= > "$WORK/paths.txt"
if grep -i -E -q "$HANDLE_RE" "$WORK/history.txt"; then echo "::error::UPI handle still present after rewrite"; exit 1; fi
if grep -E -q '(^|/)dev\.db$' "$WORK/paths.txt"; then echo "::error::dev.db still present after rewrite"; exit 1; fi
git remote add origin "$REMOTE" 2>/dev/null || git remote set-url origin "$REMOTE"
echo "::group::Push rewritten history"
git push --force origin 'refs/heads/*:refs/heads/*'
if [ -n "$(git tag -l)" ]; then git push --force origin 'refs/tags/*:refs/tags/*'; fi
echo "::endgroup::"
cd "$WORK"; git clone --quiet "$REMOTE" repo; cd repo
git config user.name "$AUTHOR_NAME"; git config user.email "$AUTHOR_EMAIL"
applied=0; failed=0
PATCH_DIR="${PATCH_DIR:-_incoming/phase0-patches}"
if [ -f "$PATCH_DIR/manifest.tsv" ]; then
  while IFS=$'\t' read -r file msg; do
    [ -z "$file" ] && continue
    p="$PATCH_DIR/$file"
    if git apply --3way --whitespace=nowarn "$p" 2>"$WORK/apply.err"; then
      git commit --quiet -m "$msg"; applied=$((applied+1)); echo "applied: $msg"
    else
      cat "$WORK/apply.err"; git reset --quiet --hard; mv "$p" "${p%.patch}.FAILED.patch"; failed=$((failed+1))
      echo "::warning::Could not apply $file; the first Jules session (F-H-01) will apply it."
    fi
  done < "$PATCH_DIR/manifest.tsv"
fi
if [ -d _incoming ]; then
  if [ "$failed" -eq 0 ]; then git rm -r --quiet _incoming; git commit --quiet -m "chore(kit): remove applied Phase 0 patches"
  else git rm --quiet --ignore-unmatch _incoming/phase0-patches/*.patch 2>/dev/null || true; git add -A _incoming; git commit --quiet -m "chore(kit): keep Phase 0 patches that need a manual merge" || true; fi
fi
git push --quiet origin "HEAD:${DEFAULT_BRANCH}"
git push --quiet origin "HEAD:refs/heads/overhaul"
{ echo "## ALTER EGO · Prepare repository"; echo "- History rewritten: dev.db and prisma/dev.db removed; UPI handle redacted in files and messages."; echo "- Phase 0 commits applied: $applied (failed: $failed), authored by $AUTHOR_NAME <$AUTHOR_EMAIL>."; echo "- Branch \`overhaul\` created. Next: copy the kit into the working copy and start the feature loop."; } >> "$SUMMARY"
