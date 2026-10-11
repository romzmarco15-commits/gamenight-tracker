const DEFAULT_RULES = {
    drawPayment: 2,
    tongitsPayment: 4,
    bonusAmount: 2,
    bonusReason: "Quadra",
    roundPot: 2,
    potWinStreak: 3,
    sunogExtra: 2,
    bonusTypes: [{id:"quadra",name:"Quadra",amount:2},{id:"sunog",name:"Sunog",amount:2}]
};

let game = null;
let selectedWinner = null;
let pendingRound = null;


/* =========================================
   BASIC HELPERS
========================================= */

function num(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
    return window.GameNightLedger.round(value);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function money(value) {
    const amount = roundMoney(value);

    const formatted = Number.isInteger(amount)
        ? amount.toString()
        : amount.toFixed(2);

    return `${game?.currency || "S$"}${formatted}`;
}


/* =========================================
   VIRTUAL SCORE LEDGER
   Each transfer is applied immediately to virtual scores.
   No cash, unpaid cash, or payment collection is tracked.
========================================= */
function playerNetBalance(player) { return roundMoney(player.balance); }
function refreshPlayerBalance(player) { player.balance = roundMoney(player.balance); }
function refreshAllBalances() { if (game?.players) game.players.forEach(refreshPlayerBalance); }
function ensureScoreGameState() {
    if (!game) return;
    game.rules ||= clone(DEFAULT_RULES);
    for (const [key, value] of Object.entries(DEFAULT_RULES)) {
        if (game.rules[key] === undefined) game.rules[key] = clone(value);
    }
    game.history ||= [];
    game.undoStack ||= [];
    game.finished ??= false;
    game.finishedBy ??= null;
    game.finishedPot ??= 0;
    game.mode = 'score';
    for (const player of game.players) {
        player.balance = roundMoney(player.balance);
        player.startingBalance = 0;
        delete player.cash;
        delete player.debts;
    }
}
function getPendingPotTotal() { return 0; }
function payPlayer(fromIndex, toIndex, amount, reason) {
    const required = Math.max(0, roundMoney(amount));
    if (fromIndex === toIndex || !game.players[fromIndex] || !game.players[toIndex]) return null;
    return {...window.GameNightLedger.transfer(game.players, fromIndex, toIndex, required), reason};
}
function contributeToPot(playerIndex, amount) {
    const required = Math.max(0, roundMoney(amount));
    game.pot = window.GameNightLedger.contribute(game.players, game.pot, playerIndex, required);
    return {playerIndex, amount:required};
}

/* =========================================
   CREATE GAME
========================================= */

function createGame(
    setupPlayers,
    initialPot,
    roundPot,
    currency,

) {
    const initial = Math.max(
        0,
        roundMoney(initialPot)
    );

    game = {
        currency: currency || "S$",
        mode: "score",
        ledgerVersion: 2,

        initialPot: initial,

        pot: 0,
        round: 1,

        finished: false,
        finishedBy: null,
        finishedPot: 0,

        players: setupPlayers.map(
            (player, index) => {

                const startingBalance = 0;

                return {
                    name:
                        String(
                            player.name ||
                            `Player ${index + 1}`
                        ),

                    avatar:
                        clone(player.avatar),

                    startingBalance,

                    balance: startingBalance,

                    streak: 0
                };
            }
        ),

        rules: {
            ...DEFAULT_RULES,

            roundPot:
                Math.max(
                    0,
                    roundMoney(roundPot)
                )
        },

        history: [],
        undoStack: [],

        lastWinner: null
    };

    game.players.forEach(
        (player, index) => {
            contributeToPot(
                index,
                initial
            );
        }
    );

    refreshAllBalances();
    saveGame();
}


/* =========================================
   SNAPSHOT
========================================= */

function createRoundSnapshot() {
    return clone({
        currency: game.currency,
        initialPot: game.initialPot,
        pot: game.pot,
        round: game.round,

        players: game.players.map(p => { const { avatar, ...rest } = p; return rest; }),
        rules: game.rules,

        lastWinner: game.lastWinner,

        finished: game.finished,
        finishedBy: game.finishedBy,
        finishedPot: game.finishedPot
    });
}


/* =========================================
   NORMAL ROUND
========================================= */

function prepareNormalRound(type) {
    if (
        selectedWinner === null ||
        selectedWinner === undefined ||
        game.finished
    ) {
        return;
    }

    let paymentAmount = 0;

    if (type === "Tongits") {
        paymentAmount =
            game.rules.tongitsPayment;
    } else {
        paymentAmount =
            game.rules.drawPayment;
    }

    const payments = [];

    game.players.forEach(
        (player, index) => {

            if (index === selectedWinner) {
                return;
            }

            payments.push({
                from: index,
                to: selectedWinner,
                amount: paymentAmount,
                baseAmount: paymentAmount,
                bonusAmount: 0,
                reason: type
            });
        }
    );

    pendingRound = {
        type,
        winner: selectedWinner,
        bonusEnabled: false,
        payments
    };
}


/* =========================================
   BONUS
========================================= */

function setPendingRoundBonuses(bonuses) {
    if (!pendingRound) return;
    pendingRound.bonuses = bonuses.map(b => ({
        id: String(b.id), name: String(b.name), amount: Math.max(0, roundMoney(b.amount)),
        targets: [...b.targets]
    }));
    pendingRound.bonusEnabled = pendingRound.bonuses.length > 0;
    pendingRound.bonusReason = pendingRound.bonuses.map(b => b.name).join(", ");
    pendingRound.bonusAmount = 0;
    pendingRound.payments.forEach(payment => {
        payment.baseAmount = roundMoney(payment.baseAmount ?? payment.amount);
        payment.appliedBonuses = pendingRound.bonuses.filter(b => b.targets.includes(payment.from))
            .map(b => ({name:b.name, amount:b.amount}));
        payment.bonusAmount = roundMoney(payment.appliedBonuses.reduce((sum,b)=>sum+b.amount,0));
        payment.amount = roundMoney(payment.baseAmount + payment.bonusAmount);
    });
}

/* =========================================
   BEGIN ROUND SETTLEMENT
========================================= */

function beginRoundSettlement() {
    ensureScoreGameState();

    if (
        !pendingRound ||
        game.finished
    ) {
        return false;
    }

    pendingRound.beforeState =
        createRoundSnapshot();

    pendingRound.potBefore =
        roundMoney(game.pot);

    pendingRound.potPendingBefore =
        getPendingPotTotal();

    pendingRound.historyPayments = [];

    pendingRound.payments.forEach(
        payment => {

            const result =
                payPlayer(
                    payment.from,
                    payment.to,
                    payment.amount,
                    payment.reason
                );

            pendingRound
                .historyPayments
                .push({
                    from:
                        game.players[
                            payment.from
                        ].name,

                    fromIndex:
                        payment.from,

                    amount:
                        result.amount,

                    baseAmount:
                        payment.baseAmount ??
                        payment.amount,

                    bonusAmount:
                        payment.bonusAmount || 0,

                    reason:
                        payment.reason
                });
        }
    );

    const winner =
        pendingRound.winner;

    if (game.lastWinner === winner) {
        game.players[winner].streak += 1;
    } else {
        game.players.forEach(
            player => player.streak = 0
        );

        game.players[winner].streak = 1;
    }

    game.lastWinner = winner;

    refreshAllBalances();

    return (
        game.players[winner].streak >=
        game.rules.potWinStreak
    );
}


/* =========================================
   QUICK PAY
========================================= */

function processQuickPay(
    receiverIndex,
    payerIndexes,
    amount,
    reason
) {
    if (
        !game ||
        game.finished
    ) {
        return null;
    }

    const receiver =
        game.players[receiverIndex];

    if (!receiver) {
        return null;
    }

    const paymentAmount =
        Math.max(
            0,
            roundMoney(amount)
        );

    if (
        paymentAmount <= 0 ||
        !Array.isArray(payerIndexes) ||
        payerIndexes.length === 0
    ) {
        return null;
    }

    const beforeState =
        createRoundSnapshot();

    const payments = [];

    payerIndexes.forEach(payerIndex => {

        if (payerIndex === receiverIndex) {
            return;
        }

        if (!game.players[payerIndex]) {
            return;
        }

        const result =
            payPlayer(
                payerIndex,
                receiverIndex,
                paymentAmount,
                reason || "Quick Pay"
            );

        payments.push({
            from:
                game.players[
                    payerIndex
                ].name,

            fromIndex:
                payerIndex,

            amount:
                result.amount,

        });
    });

    if (payments.length === 0) {
        return null;
    }

    const historyEntry = {
        eventType: "quickPay",

        round: game.round,

        type: "Quick Pay",

        reason:
            String(
                reason || "Quick Pay"
            ),

        winner:
            receiver.name,

        receiverIndex,

        winnerAvatar:
            clone(receiver.avatar),

        amountPerPlayer:
            paymentAmount,

        payments,

        gameFinished: false
    };

    game.history.push(historyEntry);

    game.undoStack.push(beforeState);

    refreshAllBalances();
    saveGame();

    return {
        receiverIndex,
        receiverName: receiver.name,
        amountPerPlayer: paymentAmount,
        reason:
            String(
                reason || "Quick Pay"
            ),
        payments
    };
}


/* =========================================
   FINISH ROUND
========================================= */

function finishRound(takeExistingPot) {
    if (!pendingRound) {
        return null;
    }

    const winnerIndex =
        pendingRound.winner;

    const winner =
        game.players[winnerIndex];

    let potWon = 0;
    let transferredPendingPot = 0;

    const potDecisionRequired =
        winner.streak >=
        game.rules.potWinStreak;


    /* =====================================
       POT TAKEN = GAME FINISHED
    ===================================== */

    if (takeExistingPot) {

        potWon =
            roundMoney(
                pendingRound.potBefore
            );

        transferredPendingPot =
            roundMoney(
                pendingRound
                    .potPendingBefore || 0
            );

        winner.balance = roundMoney(winner.balance + game.pot);

        game.pot = 0;


        game.players.forEach(
            player => player.streak = 0
        );

        game.lastWinner = null;

        game.finished = true;
        game.finishedBy = winnerIndex;
        game.finishedPot = potWon;

        const historyEntry = {
            eventType: "round",

            round: game.round,

            type:
                pendingRound.type,

            winner:
                winner.name,

            winnerAvatar:
                clone(winner.avatar),

            bonuses: clone(pendingRound.bonuses || []),
            bonusEnabled: Boolean(pendingRound.bonusEnabled),

            bonusReason: pendingRound.bonusReason || game.rules.bonusReason || "Bonus",

            bonusAmount: pendingRound.bonusEnabled ? pendingRound.bonusAmount : 0,

            payments:
                clone(
                    pendingRound
                        .historyPayments
                ),

            contributions: [],

            roundPot:
                game.rules.roundPot,

            potBefore:
                pendingRound.potBefore,

            potPendingBefore:
                pendingRound
                    .potPendingBefore || 0,

            potDecisionRequired: true,

            potWon,

            pendingPotTransferred:
                transferredPendingPot,

            potKept: false,

            potAfter: 0,

            potPendingAfter: 0,

            gameFinished: true
        };

        game.history.push(
            historyEntry
        );

        game.undoStack.push(
            pendingRound.beforeState
        );

        const result = {
            winnerName:
                winner.name,

            winnerIndex,

            potWon,

            potAfter: 0,

            potPendingAfter: 0,

            gameFinished: true
        };

        pendingRound = null;
        selectedWinner = null;

        refreshAllBalances();
        saveGame();

        return result;
    }


    /* =====================================
       NORMAL CONTINUE / POT KEPT
    ===================================== */

    const contributions = [];

    game.players.forEach(
        (player, index) => {

            contributions.push(
                contributeToPot(
                    index,
                    game.rules.roundPot
                )
            );
        }
    );

    refreshAllBalances();

    const historyEntry = {
        eventType: "round",

        round:
            game.round,

        type:
            pendingRound.type,

        winner:
            winner.name,

        winnerAvatar:
            clone(winner.avatar),

        bonuses: clone(pendingRound.bonuses || []),
            bonusEnabled: Boolean(pendingRound.bonusEnabled),

        bonusReason: pendingRound.bonusReason || game.rules.bonusReason || "Bonus",

        bonusAmount: pendingRound.bonusEnabled ? pendingRound.bonusAmount : 0,

        payments:
            clone(
                pendingRound
                    .historyPayments
            ),

        contributions:
            clone(contributions),

        roundPot:
            game.rules.roundPot,

        potBefore:
            pendingRound.potBefore,

        potPendingBefore:
            pendingRound
                .potPendingBefore || 0,

        potDecisionRequired,

        potWon: 0,

        pendingPotTransferred: 0,

        potKept:
            potDecisionRequired,

        potAfter:
            roundMoney(game.pot),

        potPendingAfter:
            getPendingPotTotal(),

        gameFinished: false
    };

    game.history.push(
        historyEntry
    );

    game.undoStack.push(
        pendingRound.beforeState
    );

    game.round += 1;

    const result = {
        winnerName:
            winner.name,

        winnerIndex,

        potWon: 0,

        potAfter:
            game.pot,

        potPendingAfter:
            getPendingPotTotal(),

        gameFinished: false
    };

    pendingRound = null;
    selectedWinner = null;

    saveGame();

    return result;
}


/* =========================================
   UNDO
========================================= */

function undoLastRound() {
    if (
        !game.undoStack ||
        game.undoStack.length === 0
    ) {
        return false;
    }

    const snapshot =
        game.undoStack.pop();

    const remainingUndoStack =
        game.undoStack;

    game.currency =
        snapshot.currency;

    game.initialPot =
        snapshot.initialPot;

    game.pot =
        snapshot.pot;

    game.round =
        snapshot.round;

    const preservedAvatars = game.players.map(p => p.avatar);
    game.players = snapshot.players.map((p,i) => ({ ...p, avatar: p.avatar || preservedAvatars[i] }));

    game.rules =
        snapshot.rules;

    // Keep the audit trail. Undo reverses the game state, but the
    // original history record remains visible and is marked UNDONE.
    const auditHistory = Array.isArray(game.history)
        ? game.history
        : [];

    for (let i = auditHistory.length - 1; i >= 0; i--) {
        if (!auditHistory[i].undone) {
            auditHistory[i].undone = true;
            auditHistory[i].undoneAt = Date.now();
            break;
        }
    }

    game.history = auditHistory;

    game.lastWinner =
        snapshot.lastWinner;

    game.finished =
        snapshot.finished || false;

    game.finishedBy =
        snapshot.finishedBy ?? null;

    game.finishedPot =
        snapshot.finishedPot || 0;

    game.undoStack =
        remainingUndoStack;

    pendingRound = null;
    selectedWinner = null;

    ensureScoreGameState();
    refreshAllBalances();

    saveGame();

    return true;
}


/* =========================================
   SETTINGS
========================================= */

function updateGameSettings(settings) {
    game.rules.drawPayment =
        Math.max(
            0,
            roundMoney(
                settings.drawPayment
            )
        );

    game.rules.tongitsPayment =
        Math.max(
            0,
            roundMoney(
                settings.tongitsPayment
            )
        );

    game.rules.bonusAmount =
        Math.max(
            0,
            roundMoney(
                settings.bonusAmount
            )
        );

    game.rules.bonusReason = String(settings.bonusReason || "Bonus").trim() || "Bonus";
    if (Array.isArray(settings.bonusTypes)) game.rules.bonusTypes = clone(settings.bonusTypes);

    game.rules.roundPot =
        Math.max(
            0,
            roundMoney(
                settings.roundPot
            )
        );

    game.rules.potWinStreak =
        Math.max(
            1,
            Math.floor(
                num(
                    settings.potWinStreak
                )
            )
        );

    game.initialPot =
        Math.max(
            0,
            roundMoney(
                settings.initialPot
            )
        );

    saveGame();
}


/* Continue virtual scores and history into the next pot cycle. */
function continuePotCycle() {
    if (!game || !game.finished) return false;
    ensureScoreGameState();
    const nextCycle = Math.max(1, Number(game.potCycle || 1) + 1);
    game.potCycle = nextCycle;
    game.pot = 0;
    game.round = 1;
    game.lastWinner = null;
    game.finished = false;
    game.finishedBy = null;
    game.finishedPot = 0;
    game.players.forEach(player => { player.streak = 0; });
    const contributions = game.players.map((player, index) => {
        const contribution = contributeToPot(index, game.initialPot);
        return { fromIndex: index, from: player.name, ...contribution };
    });
    game.history.push({
        eventType: "potCycleStart",
        type: "New Pot Cycle",
        round: 0,
        potCycle: nextCycle,
        contributions,
        potAfter: game.pot,
        createdAt: Date.now()
    });
    // Do not allow Undo to cross a pot-cycle boundary and revert a prior pot win.
    game.undoStack = [];
    pendingRound = null;
    selectedWinner = null;
    refreshAllBalances();
    saveGame();
    return true;
}

/* =========================================
   RESTART RESET MONEY
========================================= */

function restartResetMoney() {
    if (!game) return;
    game.players.forEach(player => {
        player.startingBalance = 0;
        player.balance = 0;
        player.streak = 0;
    });
    game.pot = 0;
    game.round = 1;
    game.history = [];
    game.undoStack = [];
    game.lastWinner = null;
    game.finished = false;
    game.finishedBy = null;
    game.finishedPot = 0;
    game.potCycle = 1;
    game.players.forEach((player,index) => contributeToPot(index,game.initialPot));
    saveGame();
}
