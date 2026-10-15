/* =========================================
   TONGITS VISUAL ANIMATIONS

   IMPORTANT:
   These animations never change game data.
   game.js remains the source of truth.
========================================= */


function wait(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


function elementCenter(element) {
    if (!element) {
        return {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };
    }

    const rect =
        element.getBoundingClientRect();

    return {
        x:
            rect.left +
            rect.width / 2,

        y:
            rect.top +
            rect.height / 2
    };
}


function playerCard(index) {
    return document.querySelector(
        `[data-player-card="${index}"]`
    );
}


function potElement() {
    return document.getElementById(
        "potArea"
    );
}


function createFlyingMoney(
    text,
    start,
    end,
    extraClass = ""
) {
    const layer =
        document.getElementById(
            "animationLayer"
        );

    if (!layer) {
        return;
    }


    const item =
        document.createElement(
            "div"
        );

    item.className =
        `flying-money ${extraClass}`;

    item.textContent =
        text;


    item.style.left =
        `${start.x}px`;

    item.style.top =
        `${start.y}px`;


    layer.appendChild(
        item
    );


    requestAnimationFrame(
        () => {

            requestAnimationFrame(
                () => {

                    item.style.left =
                        `${end.x}px`;

                    item.style.top =
                        `${end.y}px`;

                    item.style.opacity =
                        "0.15";

                    item.style.transform =
                        "translate(-50%, -50%) scale(0.75)";
                }
            );
        }
    );


    setTimeout(
        () => item.remove(),
        700
    );
}


function pulsePot() {
    const pot =
        potElement();

    if (!pot) return;


    pot.classList.remove(
        "pot-pulse"
    );


    void pot.offsetWidth;


    pot.classList.add(
        "pot-pulse"
    );


    setTimeout(
        () =>
            pot.classList.remove(
                "pot-pulse"
            ),
        650
    );
}


function flashWinner(index) {
    const card =
        playerCard(index);

    if (!card) return;


    card.classList.remove(
        "winner-flash"
    );


    void card.offsetWidth;


    card.classList.add(
        "winner-flash"
    );


    setTimeout(
        () =>
            card.classList.remove(
                "winner-flash"
            ),
        800
    );
}


/*
    LOSERS -> WINNER
*/

async function animateWinnerPayments(
    payments,
    winnerIndex
) {
    if (
        !payments ||
        payments.length === 0
    ) {
        return;
    }


    const winner =
        playerCard(
            winnerIndex
        );

    const winnerPosition =
        elementCenter(
            winner
        );


    payments.forEach(
        (payment, order) => {

            const loser =
                playerCard(
                    payment.from
                );


            const start =
                elementCenter(
                    loser
                );


            setTimeout(
                () => {
                    if (typeof playSoundEffect === "function") playSoundEffect("coin");

                    createFlyingMoney(
                        `+${money(
                            payment.amount
                        )}`,
                        start,
                        winnerPosition
                    );
                },
                order * 90
            );
        }
    );


    await wait(
        600 +
        payments.length * 90
    );


    flashWinner(
        winnerIndex
    );
    if (typeof playSoundEffect === "function") playSoundEffect("win");
}


/*
    EVERY PLAYER -> POT
*/

async function animateRoundPotContribution() {
    if (!game) return;


    const potPosition =
        elementCenter(
            potElement()
        );


    game.players.forEach(
        (player, index) => {

            const card =
                playerCard(index);


            const start =
                elementCenter(
                    card
                );


            setTimeout(
                () => {
                    if (typeof playSoundEffect === "function") playSoundEffect("coin");

                    createFlyingMoney(
                        `+${money(
                            game.rules.roundPot
                        )}`,
                        start,
                        potPosition,
                        "to-pot"
                    );
                },
                index * 70
            );
        }
    );


    await wait(
        580 +
        game.players.length * 70
    );


    pulsePot();
}


/*
    POT -> WINNER
*/

async function animatePotToWinner(winnerIndex, amount) {
    const pot = document.getElementById('jackpotVisual') || potElement();
    const card = playerCard(winnerIndex);
    if (!pot || !card) { await wait(450); return; }
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = elementCenter(pot), end = elementCenter(card);
    if (reduceMotion) {
        createFlyingMoney(`+${money(amount)}`,start,end,'big-pot');
        await wait(650); flashWinner(winnerIndex); return;
    }
    const design = window.GameNightPotDesign?.get?.() || 'pot';
    const isCash = design === 'cash';
    const isVault = design === 'vault';
    const particleType = isCash ? 'cash' : isVault ? 'bar' : 'coin';
    const layer = document.createElement('div');
    layer.className = 'gn-grand-transfer';
    layer.setAttribute('aria-hidden','true');
    document.body.appendChild(layer);
    const glow = document.createElement('div');
    glow.className='gn-grand-burst';
    glow.style.left = start.x+'px';glow.style.top=start.y+'px';
    layer.appendChild(glow);
    const label = document.createElement('div');
    label.className='gn-grand-amount';label.textContent=money(amount);
    label.style.left=start.x+'px';label.style.top=(start.y-36)+'px';
    layer.appendChild(label);
    pot.classList.add('gn-grand-pot-active');
    if(typeof playSoundEffect==='function') playSoundEffect('coin');
    const count=36;
    for(let i=0;i<count;i++){
        const piece=document.createElement('span');
        piece.className='gn-grand-piece'+(isCash?' gn-grand-cash':'');
        piece.classList.add('gn-particle-'+particleType);
        const angle=i*2.39996;
        const radius=14+Math.sqrt(i/count)*65;
        const ox=Math.cos(angle)*radius, oy=Math.sin(angle)*radius*.7;
        const delay=210+i*28;
        const duration=900+(i%6)*55;
        piece.style.left=start.x+'px';piece.style.top=start.y+'px';
        piece.style.setProperty('--burst-x',ox+'px');piece.style.setProperty('--burst-y',oy+'px');
        piece.style.setProperty('--fly-x',(end.x-start.x)+'px');
        piece.style.setProperty('--fly-y',(end.y-start.y)+'px');
        piece.style.setProperty('--twist',((i%2?1:-1)*(90+i*27))+'deg');
        piece.style.animationDelay=delay+'ms';piece.style.animationDuration=duration+'ms';
        layer.appendChild(piece);
    }
    await wait(1650);
    card.classList.add('gn-grand-winner-glow');
    if(typeof playSoundEffect==='function')playSoundEffect('coin');
    await wait(350);
    flashWinner(winnerIndex);
    pot.classList.remove('gn-grand-pot-active');
    layer.remove();
    setTimeout(()=>card.classList.remove('gn-grand-winner-glow'),1600);
}
/* Quick Pay: payer cards send money to the receiver; no balance mutations. */
async function animateQuickPayTransfers(payments, receiverIndex) {
    if (!Array.isArray(payments) || !payments.length) return;
    const target = playerCard(receiverIndex);
    if (!target) return;
    const end = elementCenter(target);
    payments.forEach((payment, i) => {
        const origin = playerCard(payment.from);
        if (!origin) return;
        const start = elementCenter(origin);
        setTimeout(() => {
            createFlyingMoney(`+${money(payment.amount)}`, start, end);
            if (typeof playSoundEffect === 'function') playSoundEffect('coin');
        }, i * 150);
    });
    await wait(750 + Math.max(0, payments.length - 1) * 150);
    flashWinner(receiverIndex);
}
