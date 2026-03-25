'use strict';

/// <reference types="nakama-runtime" />
var OpCodes = {
    MOVE: 1,
    FORFEIT: 2,
    STATE_UPDATE: 3,
    MATCH_END: 4,
};
var TICK_RATE = 5;
var TURN_TIMEOUT_SEC = 30;
function getWinningMark(board) {
    var winLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6] // diagonals
    ];
    for (var _i = 0, winLines_1 = winLines; _i < winLines_1.length; _i++) {
        var line = winLines_1[_i];
        if (board[line[0]] !== 0 && board[line[0]] === board[line[1]] && board[line[1]] === board[line[2]]) {
            return board[line[0]];
        }
    }
    return null;
}
var matchInit = function (ctx, logger, nk, params) {
    var mode = (params.mode === 'classic') ? 'classic' : 'timed';
    var state = {
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        players: [],
        activePlayerUserId: null,
        deadline: 0,
        matchStatus: 'waiting',
        winner: null,
        mode: mode,
    };
    return {
        state: state,
        tickRate: TICK_RATE,
        label: mode === 'classic' ? "tic-tac-toe-classic" : "tic-tac-toe-timed"
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    if (state.players.length >= 2) {
        return { state: state, accept: false, rejectReason: 'Match is full' };
    }
    if (state.players.find(function (p) { return p.userId === presence.userId; })) {
        return { state: state, accept: false, rejectReason: 'Already joined' };
    }
    return { state: state, accept: true };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    for (var _i = 0, presences_1 = presences; _i < presences_1.length; _i++) {
        var presence = presences_1[_i];
        var mark = state.players.length === 0 ? 1 : 2; // X or O
        state.players.push({
            userId: presence.userId,
            sessionId: presence.sessionId,
            username: presence.username,
            mark: mark,
        });
    }
    if (state.players.length === 2 && state.matchStatus === 'waiting') {
        state.matchStatus = 'playing';
        state.activePlayerUserId = state.players[0].userId;
        if (state.mode === 'timed') {
            state.deadline = Date.now() / 1000 + TURN_TIMEOUT_SEC;
        }
        var payload = JSON.stringify({ state: state });
        dispatcher.broadcastMessage(OpCodes.STATE_UPDATE, payload);
    }
    return { state: state };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    var _loop_1 = function (presence) {
        state.players = state.players.filter(function (p) { return p.userId !== presence.userId; });
    };
    for (var _i = 0, presences_2 = presences; _i < presences_2.length; _i++) {
        var presence = presences_2[_i];
        _loop_1(presence);
    }
    // If game is playing and someone leaves, they forfeit
    if (state.matchStatus === 'playing') {
        var leavingUserId_1 = presences[0].userId; // handle first leaver
        var remainingPlayer = state.players.find(function (p) { return p.userId !== leavingUserId_1; });
        state.matchStatus = 'ended';
        state.winner = remainingPlayer ? remainingPlayer.userId : 'draw';
        dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state: state }));
    }
    // If match ended and everyone left, return null to terminate
    if (state.players.length === 0) {
        return null;
    }
    return { state: state };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    if (state.matchStatus === 'ended') {
        return state.players.length > 0 ? { state: state } : null;
    }
    if (state.matchStatus === 'playing') {
        var now = Date.now() / 1000;
        // Handle Timeouts
        if (state.mode === 'timed' && now >= state.deadline) {
            state.matchStatus = 'ended';
            var winningPlayer = state.players.find(function (p) { return p.userId !== state.activePlayerUserId; });
            state.winner = winningPlayer ? winningPlayer.userId : 'draw';
            if (state.winner !== 'draw') {
                try {
                    nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner, winningPlayer.username, 1);
                }
                catch (e) { }
            }
            dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state: state }));
            return { state: state };
        }
        var _loop_2 = function (message) {
            if (message.opCode === OpCodes.MOVE) {
                if (message.sender.userId !== state.activePlayerUserId)
                    return "continue";
                var payload = JSON.parse(nk.binaryToString(message.data));
                var index = payload.position;
                if (index >= 0 && index <= 8 && state.board[index] === 0) {
                    var player = state.players.find(function (p) { return p.userId === message.sender.userId; });
                    if (player) {
                        state.board[index] = player.mark;
                        var winningMark = getWinningMark(state.board);
                        if (winningMark) {
                            state.matchStatus = 'ended';
                            state.winner = player.userId;
                            try {
                                nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner, player.username, 1);
                            }
                            catch (e) { }
                            dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state: state }));
                        }
                        else if (!state.board.includes(0)) {
                            state.matchStatus = 'ended';
                            state.winner = 'draw';
                            dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state: state }));
                        }
                        else {
                            var nextPlayer = state.players.find(function (p) { return p.userId !== state.activePlayerUserId; });
                            state.activePlayerUserId = nextPlayer ? nextPlayer.userId : null;
                            if (state.mode === 'timed') {
                                state.deadline = now + TURN_TIMEOUT_SEC;
                            }
                            dispatcher.broadcastMessage(OpCodes.STATE_UPDATE, JSON.stringify({ state: state }));
                        }
                    }
                }
            }
            else if (message.opCode === OpCodes.FORFEIT) {
                if (state.players.some(function (p) { return p.userId === message.sender.userId; })) {
                    state.matchStatus = 'ended';
                    var winnerPlayer = state.players.find(function (p) { return p.userId !== message.sender.userId; });
                    state.winner = winnerPlayer ? winnerPlayer.userId : 'draw';
                    if (state.winner !== 'draw') {
                        try {
                            nk.leaderboardRecordWrite('tic_tac_toe_global', state.winner, winnerPlayer.username, 1);
                        }
                        catch (e) { }
                    }
                    dispatcher.broadcastMessage(OpCodes.MATCH_END, JSON.stringify({ state: state }));
                }
            }
        };
        // Process incoming Messages
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var message = messages_1[_i];
            _loop_2(message);
        }
    }
    return { state: state };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
    return { state: state, data: "" };
};

/// <reference types="nakama-runtime" />
function rpcFindMatch(ctx, logger, nk, payload) {
    var mode = "timed";
    try {
        var data = payload ? JSON.parse(payload) : {};
        if (data.mode === "classic") {
            mode = "classic";
        }
    }
    catch (e) { }
    var label = mode === "classic" ? "tic-tac-toe-classic" : "tic-tac-toe-timed";
    var matches = nk.matchList(10, true, label, 0, 1);
    if (matches.length > 0) {
        return JSON.stringify({ matchId: matches[0].matchId });
    }
    var matchId = nk.matchCreate("tic_tac_toe_match", { mode: mode });
    return JSON.stringify({ matchId: matchId });
}
var InitModule = function (ctx, logger, nk, initializer) {
    logger.info("Tic-Tac-Toe module loaded.");
    try {
        nk.leaderboardCreate('tic_tac_toe_global', false, "descending" /* nkruntime.SortOrder.DESCENDING */, "increment" /* nkruntime.Operator.INCREMENTAL */);
    }
    catch (e) {
        logger.error("Error creating leaderboard: ".concat(e));
    }
    initializer.registerMatch("tic_tac_toe_match", {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal,
    });
    initializer.registerRpc("find_match", rpcFindMatch);
};
!InitModule && InitModule.bind(null);
