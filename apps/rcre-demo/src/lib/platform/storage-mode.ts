/** Local SQLite is not durable enough for production brokerage state. */
export function isLocalStoreAllowed(nodeEnv: string | undefined, nextPhase: string | undefined): boolean {
  return nodeEnv !== 'production' || nextPhase === 'phase-production-build'
}
