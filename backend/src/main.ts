/// <reference types="nakama-runtime" />
import { matchInit, matchJoinAttempt, matchJoin, matchLeave, matchLoop, matchTerminate, matchSignal } from './match_handler';

function rpcFindMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
    let mode = "timed";
    try {
        const data = payload ? JSON.parse(payload) : {};
        if (data.mode === "classic") {
            mode = "classic";
        }
    } catch(e) {}
    
    const label = mode === "classic" ? "tic-tac-toe-classic" : "tic-tac-toe-timed";
    const matches = nk.matchList(10, true, label, 0, 1);
    
    if (matches.length > 0) {
        return JSON.stringify({ matchId: matches[0].matchId });
    }
    
    const matchId = nk.matchCreate("tic_tac_toe_match", { mode });
    return JSON.stringify({ matchId });
}

let InitModule: nkruntime.InitModule =
  function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info("Tic-Tac-Toe module loaded.");
    
    try {
        nk.leaderboardCreate('tic_tac_toe_global', false, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL);
    } catch(e) {
        logger.error(`Error creating leaderboard: ${e}`);
    }

    initializer.registerMatch("tic_tac_toe_match", {
      matchInit,
      matchJoinAttempt,
      matchJoin,
      matchLeave,
      matchLoop,
      matchTerminate,
      matchSignal,
    });
    
    initializer.registerRpc("find_match", rpcFindMatch);
};
!(InitModule as any) && (InitModule as any).bind(null);
