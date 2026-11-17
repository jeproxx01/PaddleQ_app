import { db } from '../../db/db';

/**
 * Applies (delta = 1) or reverses (delta = -1) a match's Win/Loss contribution
 * to the winning and losing players' records.
 */
export async function applyWinLoss(
  winningIds: string[],
  losingIds: string[],
  delta: 1 | -1
): Promise<void> {
  await db.players.where('id').anyOf(winningIds).modify((p) => {
    p.wins += delta;
  });
  await db.players.where('id').anyOf(losingIds).modify((p) => {
    p.losses += delta;
  });
}
