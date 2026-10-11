const AVATARS = GameNightAvatar.emojis;

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const THEME_KEY = "tongitsTrackerTheme";

let setupPlayerCount = 3;
let setupPlayerData = [];

let avatarEditingPlayer = null;
let editingExistingGame = false;

// Modern multi-select state (no checkboxes)
let quickPayReceiverIndex = null;
let quickPaySelectedPayers = [];
let fightSelectedPlayers = [];
let fightAmounts = {};
let sunogSelectedPlayers = [];


/* =========================================
   HTML
========================================= */

function escapeHtml(value) {
    const div =
        document.createElement("div");

    div.textContent =
        String(value);

    return div.innerHTML;
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* =========================================
   AVATAR
========================================= */

function createEmojiAvatar(emoji) {
    return {
        type: "emoji",
        value: emoji
    };
}

function avatarContent(avatar) {
    if (typeof avatar === "string") {
        return escapeHtml(avatar);
    }

    if (
        avatar &&
        avatar.type === "photo"
    ) {
        return `
            <img
                src="${escapeAttribute(
                    avatar.value
                )}"
                alt="Player photo"
            >
        `;
    }

    return escapeHtml(
        avatar?.value || "😎"
    );
}


/* =========================================
   THEME
========================================= */

function loadTheme() {
    const saved =
        localStorage.getItem(
            THEME_KEY
        );

    applyTheme(
        saved === "light"
            ? "light"
            : "dark"
    );
}

function applyTheme(theme) {
    const safeTheme =
        theme === "light"
            ? "light"
            : "dark";

    document.body.dataset.theme =
        safeTheme;

    localStorage.setItem(
        THEME_KEY,
        safeTheme
    );

    const meta =
        document.querySelector(
            'meta[name="theme-color"]'
        );

    if (meta) {
        meta.setAttribute(
            "content",
            safeTheme === "light"
                ? "#f4f5f7"
                : "#0f1115"
        );
    }

    updateThemeButtons();
}

function updateThemeButtons() {
    const dark =
        document.getElementById(
            "darkThemeButton"
        );

    const light =
        document.getElementById(
            "lightThemeButton"
        );

    if (!dark || !light) return;

    const theme =
        document.body.dataset.theme;

    dark.classList.toggle(
        "active",
        theme === "dark"
    );

    light.classList.toggle(
        "active",
        theme === "light"
    );
}


/* =========================================
   OVERLAY
========================================= */

function openOverlay(id) {
    document
        .getElementById(id)
        .classList
        .remove("hidden");
}

function closeOverlay(id) {
    document
        .getElementById(id)
        .classList
        .add("hidden");
}

function showMessage(title, text) {
    document.getElementById(
        "messageTitle"
    ).textContent = title;

    document.getElementById(
        "messageText"
    ).textContent = text;

    openOverlay("messageOverlay");
}


/* =========================================
   SETUP
========================================= */

function initializeSetupData() {
    setupPlayerData = [];

    for (
        let i = 0;
        i < MAX_PLAYERS;
        i++
    ) {
        setupPlayerData.push({
            name: `Player ${i + 1}`,
            money: 100,

            avatar:
                createEmojiAvatar(
                    AVATARS[
                        i % AVATARS.length
                    ]
                )
        });
    }

    setupPlayerCount = 3;
}

function loadCurrentGameIntoSetup() {
    if (!game) return;

    setupPlayerCount =
        game.players.length;

    setupPlayerData = [];

    for (
        let i = 0;
        i < MAX_PLAYERS;
        i++
    ) {
        if (i < game.players.length) {
            const player =
                game.players[i];

            setupPlayerData.push({
                name:
                    player.name,

                money:
                    player.startingBalance,

                avatar:
                    clone(player.avatar)
            });

        } else {
            setupPlayerData.push({
                name:
                    `Player ${i + 1}`,

                money: 100,

                avatar:
                    createEmojiAvatar(
                        AVATARS[
                            i % AVATARS.length
                        ]
                    )
            });
        }
    }

    document.getElementById(
        "initialPot"
    ).value = game.initialPot;

    document.getElementById(
        "roundPot"
    ).value = game.rules.roundPot;

    document.getElementById(
        "currency"
    ).value = game.currency;

    renderSetupPlayers();
}

function captureSetupInputs() {
    for (
        let i = 0;
        i < setupPlayerCount;
        i++
    ) {
        const name =
            document.getElementById(
                `setupName${i}`
            );

        const moneyInput =
            document.getElementById(
                `setupMoney${i}`
            );

        if (name) {
            setupPlayerData[i].name =
                name.value;
        }

        if (moneyInput) {
            setupPlayerData[i].money =
                moneyInput.value;
        }
    }
}

function renderSetupPlayers() {
    const container =
        document.getElementById(
            "setupPlayers"
        );

    document.getElementById(
        "playerCountDisplay"
    ).textContent =
        setupPlayerCount;

    container.innerHTML = "";

    for (
        let i = 0;
        i < setupPlayerCount;
        i++
    ) {
        const player =
            setupPlayerData[i];

        const card =
            document.createElement("div");

        card.className =
            "setup-card";

        card.innerHTML = `
            <div class="setup-player-header">

                <div class="setup-avatar-wrapper">

                    <button
                        type="button"
                        class="setup-avatar-button"
                        data-avatar-player="${i}"
                    >
                        ${avatarContent(
                            player.avatar
                        )}
                    </button>

                    <div class="avatar-edit-badge">
                        📷
                    </div>

                </div>

                <h3>
                    Player ${i + 1}
                </h3>

            </div>

            <div class="field">

                <label>Name</label>

                <input
                    id="setupName${i}"
                    value="${escapeAttribute(
                        player.name
                    )}"
                    autocomplete="off"
                >

            </div>

        `;

        container.appendChild(card);
    }

    document
        .querySelectorAll(
            "[data-avatar-player]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    captureSetupInputs();

                    openAvatarPicker(
                        Number(
                            this.dataset
                                .avatarPlayer
                        )
                    );
                }
            );
        });

    activateSelectOnFocus();
}

function changePlayerCount(change) {
    captureSetupInputs();

    setupPlayerCount =
        Math.max(
            MIN_PLAYERS,
            Math.min(
                MAX_PLAYERS,
                setupPlayerCount + change
            )
        );

    renderSetupPlayers();
}


/* =========================================
   SELECT INPUT
========================================= */

function activateSelectOnFocus() {
    document
        .querySelectorAll(
            ".select-on-focus"
        )
        .forEach(input => {

            if (
                input.dataset
                    .selectReady === "1"
            ) {
                return;
            }

            input.dataset.selectReady =
                "1";

            input.addEventListener(
                "focus",
                function () {

                    const element = this;

                    setTimeout(
                        () => {
                            try {
                                element.select();
                            } catch {}
                        },
                        0
                    );
                }
            );

            input.addEventListener(
                "click",
                function () {
                    try {
                        this.select();
                    } catch {}
                }
            );
        });
}


/* =========================================
   AVATAR PICKER
========================================= */

function openAvatarPicker(playerIndex) {
    avatarEditingPlayer = playerIndex;
    GameNightAvatar.renderChoices(
        document.getElementById('avatarChoices'),
        setupPlayerData[playerIndex].avatar,
        avatar => {
            setupPlayerData[playerIndex].avatar = avatar;
            closeOverlay('avatarOverlay');
            avatarEditingPlayer = null;
            renderSetupPlayers();
        }
    );
    openOverlay('avatarOverlay');
}

function resizePlayerPhoto(file) { return GameNightAvatar.resizePhoto(file); }


/* =========================================
   NAVIGATION
========================================= */

function showGame() {
    editingExistingGame = false;

    document
        .getElementById("setupScreen")
        .classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.remove("hidden");

    renderGame();
}

function showFreshSetup() {
    editingExistingGame = false;

    document.getElementById(
        "setupTitle"
    ).textContent = "New Game";

    document.getElementById(
        "setupSubtitle"
    ).textContent =
        "Set your players and starting money.";

    document.getElementById(
        "startGameButton"
    ).textContent = "START GAME";

    document.getElementById(
        "backToGameButton"
    ).classList.add("hidden");

    document
        .getElementById("gameScreen")
        .classList.add("hidden");

    document
        .getElementById("setupScreen")
        .classList.remove("hidden");

    renderSetupPlayers();
}

function showEditPlayersSetup() {
    if (!game) return;

    editingExistingGame = true;

    loadCurrentGameIntoSetup();

    document.getElementById(
        "setupTitle"
    ).textContent =
        "New Game / Edit Players";

    document.getElementById(
        "setupSubtitle"
    ).textContent =
        "Change players, pictures or starting money. Your current game stays safe until you start the new game.";

    document.getElementById(
        "startGameButton"
    ).textContent =
        "START NEW GAME";

    document.getElementById(
        "backToGameButton"
    ).classList.remove("hidden");

    document
        .getElementById("gameScreen")
        .classList.add("hidden");

    document
        .getElementById("setupScreen")
        .classList.remove("hidden");
}


/* =========================================
   POT
========================================= */

function calculatePotLevel() {
    if (!game) return 0;

    const initial =
        game.initialPot *
        game.players.length;

    const oneRound =
        game.rules.roundPot *
        game.players.length;

    const visualMaximum =
        Math.max(
            initial + oneRound * 8,
            1
        );

    if (game.pot <= 0 && !(false)) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(
            5,
            (
                (game.pot) /
                visualMaximum
            ) * 100
        )
    );
}

function renderPot() {
    if (!game) return;

    const level =
        calculatePotLevel();

    const pending =
        getPendingPotTotal();

    document.getElementById(
        "potDisplay"
    ).textContent =
        money(game.pot);

    document.getElementById(
        "potMeterFill"
    ).style.width =
        `${level}%`;

    // The jackpot artwork follows the same visual level as the progress meter.
    // Keep a bounded number of DOM nodes; never create perpetual particle timers.
    const visual = document.getElementById("jackpotVisual");
    if (visual) {
        const previousPot = Number(visual.dataset.pot || 0);
        const currentPot = Number(game.pot || 0);
        visual.style.setProperty("--jackpot-level", `${level}%`);
        visual.dataset.stage = level >= 90 ? "overflow" : level >= 65 ? "full" : level >= 35 ? "growing" : "low";
        visual.dataset.pot = String(currentPot);
        if (visual.dataset.ready === "yes" && currentPot > previousPot && !game.finished) {
            visual.classList.remove("jackpot-added");
            void visual.offsetWidth;
            visual.classList.add("jackpot-added");
            clearTimeout(visual._jackpotTimer);
            visual._jackpotTimer = setTimeout(() => visual.classList.remove("jackpot-added"), 950);
        }
        visual.dataset.ready = "yes";
    }

    let status =
        "POT STARTED";

    if (game.finished) {
        status =
            "🏁 GAME FINISHED";
    }

    else if (level >= 90) {
        status =
            "🔥 POT IS HUGE";
    }

    else if (level >= 65) {
        status =
            "🔥 POT GETTING BIG";
    }

    else if (level >= 35) {
        status =
            "POT GROWING";
    }

    if (
        !game.finished &&
        pending > 0
    ) {
        status +=
            ` • +${money(
                pending
            )} PENDING`;
    }

    document.getElementById(
        "potStatus"
    ).textContent =
        status;
}


/* =========================================
   VIRTUAL SCORE BREAKDOWN
========================================= */

// Reconstruct the virtual movement of money from completed, non-undone events.
// The current pot is a separate holding account, not a debt to another player.
function playerVirtualBreakdown(index) {
    const names = game.players.map(p => p.name);
    const between = names.map(() => 0);
    const gameBetween = names.map(() => 0);
    const potBetween = names.map(() => 0);
    const contributedBy = names.map(() => 0);
    let contributed = 0, potsWon = 0;
    let currentContributed = 0;
    const active = (game.history || []).filter(e => !e.undone && !e.isUndone);
    const addContribution = (from, amount) => {
        if (from < 0 || from >= names.length) return;
        const n = roundMoney(Number(amount) || 0);
        contributedBy[from] = roundMoney(contributedBy[from] + n);
        if (from === index) { contributed += n; currentContributed += n; }
    };
    // Initial contributions precede history; new cycles have explicit entries.
    names.forEach((_, i) => addContribution(i, Math.max(0, Number(game.initialPot) || 0)));
    for (const e of active) {
        if (e.eventType === 'potCycleStart') {
            contributedBy.fill(0);
            currentContributed = 0;
        }
        const receiver = Number.isInteger(e.receiverIndex) ? e.receiverIndex : names.indexOf(e.winner);
        for (const payment of e.payments || []) {
            const from = Number.isInteger(payment.fromIndex) ? payment.fromIndex :
                Number.isInteger(payment.from) ? payment.from : names.indexOf(payment.from);
            const to = Number.isInteger(payment.toIndex) ? payment.toIndex :
                Number.isInteger(payment.to) ? payment.to : receiver;
            const amount = roundMoney(Number(payment.amount) || 0);
            if (from === index && to >= 0 && to !== index) { between[to] -= amount; gameBetween[to] -= amount; }
            if (to === index && from >= 0 && from !== index) { between[from] += amount; gameBetween[from] += amount; }
        }
        for (const c of e.contributions || []) {
            const from = Number.isInteger(c.playerIndex) ? c.playerIndex :
                Number.isInteger(c.fromIndex) ? c.fromIndex : names.indexOf(c.from);
            addContribution(from, c.amount);
        }
        if (e.potWon && receiver >= 0) {
            // Attribute each awarded pot to its contributors, excluding the winner's own share.
            // This makes the per-opponent net balance include earlier pot wins.
            names.forEach((_, from) => {
                if (from === receiver) return;
                const amount = contributedBy[from];
                if (index === from) { between[receiver] -= amount; potBetween[receiver] -= amount; }
                if (index === receiver) { between[from] += amount; potBetween[from] += amount; }
            });
            if (receiver === index) potsWon += Number(e.potWon) || 0;
            contributedBy.fill(0);
            currentContributed = 0;
        }
    }
    return {between, gameBetween, potBetween, contributed, potsWon,
        currentPot: game.finished ? 0 : currentContributed};
}
function playerDebtHtml(player) {
    const index = game.players.indexOf(player);
    const breakdown = playerVirtualBreakdown(index);
    const positions = breakdown.between.map((amount, i) => ({amount:roundMoney(amount),i}))
        .filter(item => item.i !== index && Math.abs(item.amount) >= 0.005);
    const currentPot = roundMoney(breakdown.currentPot);
    const summaryRows = positions.map(item => `<div class="pending-row"><span class="pending-label">${item.amount < 0 ? 'Owes' : 'Owed by'} ${escapeHtml(game.players[item.i].name)}</span><span class="pending-amount">${item.amount < 0 ? '−' : '+'}${money(Math.abs(item.amount))}</span></div>`).join('');
    const netWithPlayers = roundMoney(positions.reduce((sum,item) => sum + item.amount,0));
    const summary = `<div class="player-pending"><div class="pending-title">NET POSITION</div>
        ${summaryRows || '<div class="pending-row"><span class="pending-label">No player balances yet</span></div>'}
        ${!game.finished ? `<div class="pending-row"><span class="pending-label">Current pot contribution</span><span class="pending-amount">−${money(currentPot)}</span></div>` : ''}
        <div class="pending-row"><strong>Net score</strong><strong>${money(roundMoney(netWithPlayers-currentPot))}</strong></div>
    </div>`;
    const details = positions.map(item => {
        const gameAmount = roundMoney(breakdown.gameBetween[item.i]);
        const potAmount = roundMoney(breakdown.potBetween[item.i]);
        return `<div class="player-ledger-divider"></div><div class="pending-title">${escapeHtml(game.players[item.i].name)}</div>
            <div class="pending-row"><span class="pending-label">Game results (net)</span><span class="pending-amount">${gameAmount < 0 ? '−' : '+'}${money(Math.abs(gameAmount))}</span></div>
            <div class="pending-row"><span class="pending-label">Previous pots (net)</span><span class="pending-amount">${potAmount < 0 ? '−' : '+'}${money(Math.abs(potAmount))}</span></div>`;
    }).join('');
    const rows = `<div class="pending-row"><span class="pending-label">Total contributed to pots</span><span class="pending-amount">−${money(breakdown.contributed)}</span></div>
        ${!game.finished ? `<div class="pending-row"><span class="pending-label">My share in current pot</span><span class="pending-amount">${money(currentPot)}</span></div>` : ''}
        <div class="pending-row"><span class="pending-label">Pot prizes won</span><span class="pending-amount">+${money(breakdown.potsWon)}</span></div>
        ${details || '<div class="pending-row"><span class="pending-label">No player-to-player results yet</span></div>'}
        <div class="player-ledger-divider"></div>
        <div class="pending-row"><strong>Net score</strong><strong>${money(player.balance)}</strong></div>`;
    return `${summary}<div class="player-ledger" data-player-ledger="${index}" hidden><div class="player-ledger-body"><div class="pending-title">VIRTUAL SCORE BREAKDOWN · ALL POT CYCLES</div>${rows}<p class="player-ledger-note">Previous pot wins are attributed to their contributors and netted against game results. The current pot is unawarded and kept separate.</p></div></div>`;
}

/* =========================================
   FINISHED BANNER
========================================= */

function renderFinishedBanner() {
    const banner =
        document.getElementById(
            "gameFinishedBanner"
        );

    if (!banner) return;

    if (!game.finished) {
        banner.classList.add("hidden");
        return;
    }

    const winner =
        game.players[
            game.finishedBy
        ];

    document.getElementById(
        "finishedWinnerAvatar"
    ).innerHTML =
        avatarContent(winner.avatar);

    document.getElementById(
        "finishedWinnerName"
    ).textContent =
        `${winner.name} won the pot`;

    document.getElementById(
        "finishedPotAmount"
    ).textContent =
        money(game.finishedPot);

    banner.classList.remove("hidden");
    renderFinalSettlement();
}


/* =========================================
   GAME
========================================= */

const expandedPlayerDetails = new Set();

function renderGame() {
    if (!game) return;

    ensureScoreGameState();

    document.getElementById(
        "roundDisplay"
    ).textContent =
        game.round;

    renderPot();
    renderFinishedBanner();

    const quickPayButton =
        document.getElementById(
            "quickPayButton"
        );

    if (quickPayButton) {
        quickPayButton.classList.toggle(
            "hidden",
            game.finished
        );
    }

    const container =
        document.getElementById(
            "playersContainer"
        );

    // Remember which players had their breakdown expanded before redrawing the cards.
    // The entire card is recreated after every round, so native <details> state was lost.
    const expandedPlayers = new Set(
        [...container.querySelectorAll('[data-player-ledger]:not([hidden])')]
            .map(el => Number(el.dataset.playerLedger))
    );
    container.innerHTML = "";

    game.players.forEach(
        (player, index) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className = "player";

            card.dataset.playerCard =
                index;

            if (player.streak > 0) {
                card.classList.add(
                    "current-streak"
                );
            }

            const scoreBalance = player.balance;

            if (scoreBalance < 0) {
                card.classList.add(
                    "player-negative"
                );
            }

            const streak =
                player.streak > 0
                    ? `
                        <div class="streak">
                            🔥 ${player.streak}
                        </div>
                    `
                    : "";


            // Show the creditor breakdown directly on the player card, even when details are collapsed.
            const debtHtml = playerDebtHtml(player);

            card.innerHTML = `
                <button class="player-ledger-toggle" type="button" data-ledger-toggle="${index}" aria-label="Toggle ${escapeHtml(player.name)} score breakdown" aria-expanded="${expandedPlayers.has(index)}" title="Score breakdown">▤ <span class="player-ledger-chevron">${expandedPlayers.has(index) ? '⌃' : '⌄'}</span></button>
                <div class="player-top">

                    <div class="player-avatar ${typeof funMode !== 'undefined' && funMode.enabled ? 'fun-avatar-active' : ''}" data-fun-avatar="${index}" role="button" tabindex="0" aria-label="Open ${escapeHtml(player.name)} soundboard">
                        ${avatarContent(
                            player.avatar
                        )}
                    </div>

                    <div class="player-info">

                        <div class="player-name">
                            ${escapeHtml(
                                player.name
                            )}
                        </div>

                        ${streak}

                    </div>

                </div>

                <div class="
                    balance
                    ${
                        scoreBalance < 0
                            ? "negative-balance"
                            : ""
                    }
                ">
                    ${money(
                        scoreBalance
                    )}
                </div>

                ${debtHtml}

                ${
                    game.finished
                        ? `
                            <div class="game-over-player-label">
                                FINAL BALANCE
                            </div>
                        `
                        : `
                            <button
                                class="win-button"
                                type="button"
                                data-win-player="${index}"
                            >
                                🏆 WIN
                            </button>
                        `
                }
            `;

            container.appendChild(card);
            const ledger = card.querySelector('[data-player-ledger]');
            if (ledger) ledger.hidden = !expandedPlayers.has(index);
            const toggle = card.querySelector('[data-ledger-toggle]');
            if (toggle && ledger) toggle.addEventListener('click', () => {
                ledger.hidden = !ledger.hidden;
                toggle.setAttribute('aria-expanded', String(!ledger.hidden));
                toggle.querySelector('.player-ledger-chevron').textContent = ledger.hidden ? '⌄' : '⌃';
            });
        }
    );

    if (!game.finished) {
        document
            .querySelectorAll(
                "[data-win-player]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        chooseWinner(
                            Number(
                                this.dataset
                                    .winPlayer
                            )
                        );
                    }
                );
            });
    }

    document.getElementById(
        "undoButton"
    ).disabled =
        !game.undoStack ||
        game.undoStack.length === 0;

    if (typeof runPostRenderEasterEggs === "function") {
        setTimeout(runPostRenderEasterEggs, 0);
    }
}


/* =========================================
   WINNER
========================================= */

function chooseWinner(index) {
    if (game.finished) return;

    selectedWinner = index;
    pendingRound = null;

    const player =
        game.players[index];

    document.getElementById(
        "winnerAvatar"
    ).innerHTML =
        avatarContent(
            player.avatar
        );

    document.getElementById(
        "winnerTitle"
    ).textContent =
        `${player.name} Won`;

    openOverlay("winOverlay");
}


/* =========================================
   ROUND CONFIRMATION
========================================= */

function showRoundConfirmation() {
    const winner =
        game.players[
            pendingRound.winner
        ];

    document.getElementById(
        "confirmRoundTitle"
    ).textContent =
        `${winner.name} — ${pendingRound.type}`;

    selectedRoundBonuses = (pendingRound.bonuses || []).map(b=>({...b,targets:[...b.targets]}));
    updateRoundBonusUI();

    renderRoundSummary();

    openOverlay(
        "confirmRoundOverlay"
    );
    // The same multi-bonus selector is available after Fight, Draw and Tongits.
    const roundModal = document.querySelector("#confirmRoundOverlay .modal");
    if (roundModal) roundModal.scrollTop = 0;
}

function renderRoundSummary() {
    if (!pendingRound) return;

    const winner =
        game.players[
            pendingRound.winner
        ];

    let html = `
        <div class="summary-title">
            Payments to
            ${escapeHtml(
                winner.name
            )}
        </div>
    `;

    pendingRound.payments.forEach(
        payment => {

            const loser =
                game.players[
                    payment.from
                ];

            html += `
                <div class="summary-row">

                    <div class="summary-label">
                        ${escapeHtml(
                            loser.name
                        )}
                    </div>

                    <div class="summary-value">
                        ${money(
                            payment.amount
                        )}
                    </div>

                </div>
            `;

            if (
                pendingRound.bonusEnabled &&
                payment.bonusAmount > 0
            ) {
                html += `
                    <div class="summary-sub-row">
                        ${money(
                            payment.baseAmount
                        )}
                        base
                        +
                        ${money(
                            payment.bonusAmount
                        )}
                        ${escapeHtml((payment.appliedBonuses || []).map(b=>b.name).join(" + ") || pendingRound.bonusReason || "Bonus")}
                    </div>
                `;
            }
        }
    );

    if (pendingRound.bonusEnabled) {
        html += `<div class="bonus-summary">🎁 ${pendingRound.bonuses.map(b=>`${escapeHtml(b.name)}: ${money(b.amount)} / affected player`).join(' · ')}</div>`;
    }

    html += `
        <div class="summary-row">

            <div class="summary-label">
                Next Round Pot
            </div>

            <div class="summary-value">
                ${money(
                    game.rules.roundPot
                )}
                ×
                ${game.players.length}
            </div>

        </div>
    `;

    document.getElementById(
        "roundSummary"
    ).innerHTML = html;
}


/* =========================================
   POT CONFIRMATION
========================================= */

function showPotConfirmation() {
    const winner =
        game.players[
            pendingRound.winner
        ];

    document.getElementById(
        "potWinTitle"
    ).textContent =
        `${winner.streak} Consecutive Wins!`;

    document.getElementById(
        "potWinAvatar"
    ).innerHTML =
        avatarContent(
            winner.avatar
        );

    document.getElementById(
        "potWinPlayerName"
    ).textContent =
        winner.name;

    document.getElementById(
        "potClaimAmount"
    ).textContent =
        money(
            pendingRound.potBefore
        );

    openOverlay("potWinOverlay");
}


/* =========================================
   GAME FINISHED
========================================= */

function showGameFinished(result) {
    const winner =
        game.players[
            result.winnerIndex
        ];

    document.getElementById(
        "gameFinishedAvatar"
    ).innerHTML =
        avatarContent(
            winner.avatar
        );

    document.getElementById(
        "gameFinishedTitle"
    ).textContent =
        `Congratulations, ${winner.name}! You Won the Pot!`;

    document.getElementById(
        "gameFinishedPot"
    ).textContent =
        money(result.potWon);

    renderFinalSettlement();
    openOverlay(
        "gameFinishedOverlay"
    );
    launchPotVictoryCelebration();

    if (game.easterPrediction) {
        const predicted = game.easterPrediction.playerIndex;
        setTimeout(() => {
            if (predicted === result.winnerIndex) {
                if (typeof eggToast === "function") eggToast("🔮 THE PROPHECY WAS FULFILLED!", 3500);
                if (typeof playSoundEffect === "function") playSoundEffect("potwin");
            } else {
                if (typeof eggToast === "function") eggToast("🔮 The prophecy was wrong. We never speak of this again.", 3800);
                if (typeof playSoundEffect === "function") playSoundEffect("magic");
            }
        }, 450);
    }
}


/* =========================================
   FIGHT
========================================= */

function buildFight() {
    fightSelectedPlayers = [];
    fightAmounts = {};
    sunogSelectedPlayers = [];
    renderFightPlayers();
}

function renderFightPlayers() {
    const container = document.getElementById("fightPlayers");
    const opponents = game.players
        .map((player, index) => ({ player, index }))
        .filter(item => item.index !== selectedWinner);

    container.innerHTML = `
        <div class="quick-pay-section-title">WHO FOUGHT?</div>
        <div class="player-select-grid fight-select-grid">
            ${opponents.map(({ player, index }) => `
                <button type="button" class="player-select-button ${fightSelectedPlayers.includes(index) ? "selected" : ""}"
                    data-fight-player="${index}" aria-pressed="${fightSelectedPlayers.includes(index)}">
                    <span class="player-select-avatar">${avatarContent(player.avatar)}</span>
                    <span class="player-select-name">${escapeHtml(player.name)}</span>
                </button>`).join("")}
        </div>
        <div class="fight-payment-list">
            ${opponents.map(({ player, index }) => fightSelectedPlayers.includes(index) ? `
                <div class="ios-list-row fight-amount-row">
                    <div><strong>${escapeHtml(player.name)}</strong><div class="ios-row-note">Fight payment</div></div>
                    <input id="fightAmount${index}" class="select-on-focus fight-inline-input" type="number" inputmode="decimal" min="0" step="1" placeholder="Amount" value="${escapeAttribute(fightAmounts[index] ?? "")}">
                </div>` : `
                <div class="ios-list-row fight-default-row">
                    <div><strong>${escapeHtml(player.name)}</strong><div class="ios-row-note">Did not fight</div></div>
                    <strong>${money(game.rules.drawPayment)}</strong>
                </div>`).join("")}
        </div>`;

    container.querySelectorAll("[data-fight-player]").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".fight-inline-input").forEach(input => {
                const idx = Number(input.id.replace("fightAmount", ""));
                fightAmounts[idx] = input.value;
            });
            const index = Number(button.dataset.fightPlayer);
            if (fightSelectedPlayers.includes(index)) {
                fightSelectedPlayers = fightSelectedPlayers.filter(i => i !== index);
            } else {
                fightSelectedPlayers.push(index);
            }
            renderFightPlayers();
        });
    });

    container.querySelectorAll(".fight-inline-input").forEach(input => {
        input.addEventListener("input", () => {
            const idx = Number(input.id.replace("fightAmount", ""));
            fightAmounts[idx] = input.value;
        });
    });
    activateSelectOnFocus();
}


/* =========================================
   QUICK PAY
========================================= */

function openQuickPay() {
    if (!game || game.finished) return;
    quickPayReceiverIndex = null;
    quickPaySelectedPayers = [];
    document.getElementById("quickPayAmount").value = 1;
    document.getElementById("quickPayReason").value = "Sagasa";
    renderQuickPaySelectors();
    openOverlay("quickPayOverlay");
    activateSelectOnFocus();
}

function renderQuickPaySelectors() {
    const receivers = document.getElementById("quickPayReceivers");
    const payers = document.getElementById("quickPayPayers");

    receivers.innerHTML = game.players.map((player, index) => `
        <button type="button" class="player-select-button ${quickPayReceiverIndex === index ? "selected receiver-selected" : ""}"
            data-quick-receiver="${index}" aria-pressed="${quickPayReceiverIndex === index}">
            <span class="player-select-avatar">${avatarContent(player.avatar)}</span>
            <span class="player-select-name">${escapeHtml(player.name)}</span>
        </button>`).join("");

    if (quickPayReceiverIndex === null) {
        payers.innerHTML = '<div class="selection-hint">Choose who receives first.</div>';
    } else {
        payers.innerHTML = `<div class="player-select-grid">${game.players.map((player, index) => {
            if (index === quickPayReceiverIndex) return "";
            const selected = quickPaySelectedPayers.includes(index);
            return `<button type="button" class="player-select-button ${selected ? "selected" : ""}" data-quick-payer="${index}" aria-pressed="${selected}">
                <span class="player-select-avatar">${avatarContent(player.avatar)}</span>
                <span class="player-select-name">${escapeHtml(player.name)}</span>
            </button>`;
        }).join("")}</div>`;
    }

    receivers.querySelectorAll("[data-quick-receiver]").forEach(button => {
        button.addEventListener("click", () => {
            quickPayReceiverIndex = Number(button.dataset.quickReceiver);
            quickPaySelectedPayers = game.players.map((_, i) => i).filter(i => i !== quickPayReceiverIndex);
            renderQuickPaySelectors();
        });
    });

    payers.querySelectorAll("[data-quick-payer]").forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.quickPayer);
            if (quickPaySelectedPayers.includes(index)) {
                quickPaySelectedPayers = quickPaySelectedPayers.filter(i => i !== index);
            } else {
                quickPaySelectedPayers.push(index);
            }
            renderQuickPaySelectors();
        });
    });
}


/* =========================================
   RULES
========================================= */

function openRules() {
    const r = game.rules;

    document.getElementById(
        "rulesList"
    ).innerHTML = `

        <div class="rule-card">
            <div class="rule-title">
                Draw
            </div>

            <div class="rule-description">
                Each loser pays
                ${money(r.drawPayment)}.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Tongits
            </div>

            <div class="rule-description">
                Each loser pays
                ${money(r.tongitsPayment)}.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Fight
            </div>

            <div class="rule-description">
                Fighters pay the manually entered amount.
                Non-fighters pay
                ${money(r.drawPayment)}.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Bonus
            </div>

            <div class="rule-description">
                Default reason: ${escapeHtml(r.bonusReason || "Bonus")}.
                Default amount: ${money(r.bonusAmount)} per opponent.
                Both can be changed for an individual round before confirming it.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Quick Pay / Sagasa
            </div>

            <div class="rule-description">
                Quick Pay can transfer a custom
                amount from selected players to
                another player without ending the
                round or changing the streak.
                Sagasa defaults to ${money(1)}
                per selected player.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Initial Pot
            </div>

            <div class="rule-description">
                ${money(game.initialPot)}
                per player.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Round Pot
            </div>

            <div class="rule-description">
                ${money(r.roundPot)}
                per player after every completed
                round while the game continues.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Pending Payments
            </div>

            <div class="rule-description">
                If a player cannot fully pay,
                the unpaid amount remains pending.
                Future money received automatically
                settles pending amounts first.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Pot Streak
            </div>

            <div class="rule-description">
                At ${r.potWinStreak}
                consecutive wins, the app asks
                whether the winner takes the pot.
            </div>
        </div>

        <div class="rule-card">
            <div class="rule-title">
                Winning the Pot
            </div>

            <div class="rule-description">
                Taking the pot ends the game.
                No new round contribution is collected.
            </div>
        </div>
    `;

    openOverlay("rulesOverlay");
}


/* =========================================
   SETTINGS
========================================= */

function openSettings() {
    document.getElementById(
        "settingDrawPayment"
    ).value =
        game.rules.drawPayment;

    document.getElementById(
        "settingTongitsPayment"
    ).value =
        game.rules.tongitsPayment;

    editedBonusTypes = JSON.parse(JSON.stringify(game.rules.bonusTypes || []));
    renderBonusTypeSettings();



    document.getElementById(
        "settingInitialPot"
    ).value =
        game.initialPot;

    document.getElementById(
        "settingRoundPot"
    ).value =
        game.rules.roundPot;

    document.getElementById(
        "settingPotStreak"
    ).value =
        game.rules.potWinStreak;

    const sunog = document.getElementById("settingSunogExtra");

    updateThemeButtons();
    if (typeof updateSoundSettingButtons === "function") updateSoundSettingButtons();

    openOverlay("settingsOverlay");
    const status=document.getElementById("storageStatus");
    if(status) {
        status.textContent=lastSaveOK ? "Last save: successful" : "⚠️ Last save failed";
        if(navigator.storage?.estimate) navigator.storage.estimate().then(e=>{status.textContent += ` · Device site storage: ${(e.usage/1048576).toFixed(1)} MB used`;}).catch(()=>{});
    }
    activateSelectOnFocus();
}


/* =========================================
   HISTORY
========================================= */

let historyViewEntries = [];
let historyViewOffset = 0;
const HISTORY_PAGE_SIZE = 40;

function openHistory() {
    const container =
        document.getElementById(
            "historyList"
        );

    container.innerHTML = "";

    if (
        !game.history ||
        game.history.length === 0
    ) {
        container.innerHTML = `
            <div class="history-empty">
                No activity yet.
            </div>
        `;

        openOverlay(
            "historyOverlay"
        );
        const more = document.getElementById("historyLoadMoreButton");
        if (more) more.hidden = true;
        return;
    }

    historyViewEntries = [...game.history].reverse();
    historyViewOffset = 0;
    openOverlay("historyOverlay");
    renderHistoryBatch();
}

function renderHistoryBatch() {
    const container = document.getElementById("historyList");
    const batch = historyViewEntries.slice(historyViewOffset, historyViewOffset + HISTORY_PAGE_SIZE);
    batch.forEach(entry => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                `history-item${entry.undone ? " undone" : ""}`;

            const undoneBadge = entry.undone
                ? `<div class="history-undone-badge">↶ UNDONE</div>`
                : "";


            if (entry.eventType === "potCycleStart") {
                const cycleContributions = (entry.contributions || []).map(c =>
                    `<div class="settlement-row"><span>${escapeHtml(c.from || game.players[c.fromIndex]?.name || "Player")}</span><strong>Contributed ${money(c.amount || 0)}</strong></div>`
                ).join("");
                item.innerHTML = `<div class="history-header"><strong>🔄 Pot Cycle ${Number(entry.potCycle) || 2} Started</strong></div><p class="ios-row-note">Continuing the same virtual scores and game history.</p>${cycleContributions}`;
                container.appendChild(item);
                return;
            }

            /* QUICK PAY */

            if (
                entry.eventType ===
                "quickPay"
            ) {
                const payments =
                    (entry.payments || [])
                        .map(payment => {

                            let text = `
                                ${escapeHtml(
                                    payment.from
                                )}
                                → ${money(
                                    payment.amount
                                )}
                            `;

                            return `
                                <div>
                                    ${text}
                                </div>
                            `;
                        })
                        .join("");

                item.innerHTML = `
                    ${undoneBadge}
                    <div class="history-header">

                        <div class="history-round">
                            Round ${entry.round}
                        </div>

                        <div class="history-type">
                            💸 QUICK PAY
                        </div>

                    </div>

                    <div class="history-winner">

                        <span class="history-avatar">
                            ${avatarContent(
                                entry.winnerAvatar
                            )}
                        </span>

                        ${escapeHtml(
                            entry.winner
                        )}

                    </div>

                    <div class="quick-pay-history-reason">
                        ${escapeHtml(
                            entry.reason ||
                            "Quick Pay"
                        )}
                    </div>

                    <div class="history-details">
                        ${payments}
                    </div>
                `;

                container.appendChild(
                    item
                );

                return;
            }


            /* NORMAL ROUND */

            const payments =
                (entry.payments || [])
                    .map(payment => {

                        let detail = `
                            ${escapeHtml(
                                payment.from
                            )}
                            owed
                            ${money(
                                payment.amount
                            )}
                        `;

                        if (
                            payment.bonusAmount > 0
                        ) {
                            detail += `
                                (${money(
                                    payment.baseAmount
                                )}
                                +
                                ${money(
                                    payment.bonusAmount
                                )}
                                ${escapeHtml(pendingRound.bonusReason || "Bonus")})
                            `;
                        }

                        return `
                            ${detail}
                            <br>
                        `;
                    })
                    .join("");

            let bonusText = "";

            if (entry.bonusEnabled) {
                bonusText = `
                    <div class="history-bonus">
                        🎁 ${Array.isArray(entry.bonuses) && entry.bonuses.length ? entry.bonuses.map(b=>`${escapeHtml(b.name)} +${money(b.amount)} (${b.targets.length} affected)`).join(" · ") : `${escapeHtml(entry.bonusReason || "Bonus")} +${money(entry.bonusAmount)} per opponent`}
                    </div>
                `;
            }

            let potText = "";

            if (entry.potWon > 0) {
                potText = `
                    <div class="history-pot-won">
                        🔥 Took funded pot:
                        ${money(
                            entry.potWon
                        )}
                    </div>
                `;

                if (
                    entry.pendingPotTransferred >
                    0
                ) {
                    potText += `
                        <div class="history-pot-won">
                            + ${money(
                                entry.pendingPotTransferred
                            )}
                            pending pot payments
                            transferred to winner
                        </div>
                    `;
                }

                potText += `
                    <div class="history-game-ended">
                        🏁 Game finished
                    </div>
                `;
            }

            else if (
                entry.potDecisionRequired
            ) {
                potText = `
                    <div class="history-pot-won">
                        🔥 Pot kept — game continued
                    </div>
                `;
            }

            let pendingPotText = "";

            if (
                entry.potPendingAfter > 0
            ) {
                pendingPotText = `
                    <br>
                    Pending to pot:
                    ${money(
                        entry.potPendingAfter
                    )}
                `;
            }

            const contributionText =
                entry.gameFinished
                    ? `
                        <br>
                        No next-round pot contribution.
                    `
                    : `
                        <br>
                        Round contribution:
                        ${money(
                            entry.roundPot
                        )}
                        per player.
                    `;

            item.innerHTML = `
                    ${undoneBadge}
                <div class="history-header">

                    <div class="history-round">
                        Round ${entry.round}
                    </div>

                    <div class="history-type">
                        ${escapeHtml(
                            entry.type
                        )}
                    </div>

                </div>

                <div class="history-winner">

                    <span class="history-avatar">
                        ${avatarContent(
                            entry.winnerAvatar
                        )}
                    </span>

                    🏆
                    ${escapeHtml(
                        entry.winner
                    )}

                </div>

                ${bonusText}

                <div class="history-details">

                    ${payments}

                    ${contributionText}

                    <br>

                    Funded pot after round:
                    ${money(
                        entry.potAfter
                    )}

                    ${pendingPotText}

                </div>

                ${potText}
            `;

            container.appendChild(
                item
            );
        });
    historyViewOffset += batch.length;
    const more = document.getElementById("historyLoadMoreButton");
    if (more) {
        const remaining = historyViewEntries.length - historyViewOffset;
        more.hidden = remaining <= 0;
        more.textContent = remaining > 0 ? `Load Older Entries (${remaining} remaining)` : "";
    }
}
/* Detailed game accounting (undone history is excluded). */
// Net all virtual game scores into the minimum required settlement transfers.
function computeNetTransfers() {
    const rows = game.players.map((p,index) => ({index, net:roundMoney(p.balance)}));
    const transfers = window.GameNightLedger.settlement(game.players).map(t => ({
        fromIndex:t.from, toIndex:t.to, amount:t.amount
    }));
    return {rows,transfers,unallocatedPot:roundMoney(game.pot)};
}
function computeSessionSettlement() { return computeNetTransfers(); }
function computeFinalSettlement() {
    const data = computeNetTransfers();
    return {
        rows:data.rows.map(row => ({...row,name:game.players[row.index].name})),
        transfers:data.transfers.map(item => ({...item,from:game.players[item.fromIndex].name,to:game.players[item.toIndex].name})),
        balanced:Math.abs(roundMoney(game.players.reduce((sum,p) => sum+p.balance,game.pot)))<0.01
    };
}
function renderFinalSettlement() {
    const el = document.getElementById('finalSettlementContent');
    const detailsEl = document.getElementById('finalSettlementDetailsContent');
    if (!el || !game?.finished) return;
    const data = computeFinalSettlement();
    el.innerHTML = '<h3>💸 Who Pays Whom</h3>' +
        (data.transfers.map(t => `<div class="settlement-row"><span>${escapeHtml(t.from)} → ${escapeHtml(t.to)}</span><strong>${money(t.amount)}</strong></div>`).join('') || '<p>Everyone is settled. No payments due.</p>') +
        (!data.balanced ? '<p class="settlement-loss">⚠️ Scores do not reconcile. Check game history before settling.</p>' : '');
    if (detailsEl) {
        const entries = (game.history || []).filter(e => !e.undone && !e.isUndone);
        const rounds = entries.filter(e => e.eventType === 'round');
        const potWins = rounds.filter(e => Number(e.potWon) > 0);
        const totalPrizes = roundMoney(potWins.reduce((sum,e) => sum + Number(e.potWon || 0), 0));
        const totalGameTransfers = roundMoney(entries.reduce((sum,e) => sum + (e.payments || []).reduce((n,p) => n + Number(p.amount || 0), 0), 0));
        const gameRows = data.rows.map(row => {
            const b = playerVirtualBreakdown(row.index);
            const gameNet = roundMoney(b.gameBetween.reduce((sum,n) => sum + n,0));
            const potNet = roundMoney(b.potsWon - b.contributed);
            return `<tr><th scope="row">${escapeHtml(row.name)}</th><td>${gameNet>0?'+':''}${money(gameNet)}</td><td>${potNet>0?'+':''}${money(potNet)}</td><td class="${row.net<0?'settlement-loss':'settlement-profit'}">${row.net>0?'+':''}${money(row.net)}</td></tr>`;
        }).join('');
        const potHistory = potWins.map((e,i) => `<div class="settlement-row"><span>Pot ${i+1} · ${escapeHtml(e.winner || 'Winner')} · Round ${Number(e.round)||'—'}</span><strong>${money(e.potWon)}</strong></div>`).join('');
        detailsEl.innerHTML = `<h3>📊 Game Summary</h3>
            <div class="final-summary-grid">
              <div><small>Rounds played</small><strong>${rounds.length}</strong></div>
              <div><small>Pot prizes awarded</small><strong>${potWins.length}</strong></div>
              <div><small>Total pot prizes</small><strong>${money(totalPrizes)}</strong></div>
              <div><small>Game transfers</small><strong>${money(totalGameTransfers)}</strong></div>
            </div>
            <h3>Player Breakdown</h3>
            <div class="final-breakdown-scroll"><table class="final-breakdown-table"><thead><tr><th>Player</th><th>Game</th><th>Pots</th><th>Net</th></tr></thead><tbody>${gameRows}</tbody></table></div>
            <p class="ios-row-note">Game includes round payments and bonuses. Pots = prizes won minus contributions. All amounts are virtual until settled.</p>
            <h3>🏆 Pot History</h3>${potHistory || '<p class="ios-row-note">No pots awarded yet.</p>'}`;
    }
    const details = document.getElementById('finalSettlementDetails');
    if (details) details.open = false;
}

/* A one-shot, offline-friendly celebration for a confirmed pot winner. */
function launchPotVictoryCelebration() {
    const overlay = document.getElementById("gameFinishedOverlay");
    const confetti = document.getElementById("potConfetti");
    if (!overlay || !confetti) return;
    overlay.classList.remove("pot-celebrating");
    void overlay.offsetWidth;
    overlay.classList.add("pot-celebrating");
    confetti.replaceChildren();
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        const colors = ["#ffd54f", "#ff6b8b", "#6ad9ff", "#a98bff", "#7ef0b2", "#ffffff"];
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 100; i++) {
            const piece = document.createElement("i");
            piece.style.setProperty("--x", `${Math.random()*100}%`);
            piece.style.setProperty("--drift", `${(Math.random()-.5)*210}px`);
            piece.style.setProperty("--delay", `${Math.random()*.9}s`);
            piece.style.setProperty("--duration", `${2.4+Math.random()*2.2}s`);
            piece.style.backgroundColor = colors[i % colors.length];
            fragment.appendChild(piece);
        }
        confetti.appendChild(fragment);
    }
    if (typeof playSoundEffect === "function") playSoundEffect("yehey");
    window.setTimeout(() => { confetti.replaceChildren(); overlay.classList.remove("pot-celebrating"); }, 5500);
}
