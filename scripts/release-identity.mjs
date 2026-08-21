export function assertEvidenceCommitMatchesTag(commitSet, tagCommit) {
  if (commitSet.size !== 1) throw new Error('Public release evidence has inconsistent commit identities');
  if (!commitSet.has(tagCommit)) throw new Error(`Public release evidence commit does not match resolved tag commit: ${tagCommit}`);
}
