const tablero=document.getElementById("tablero");
const girar=document.getElementById("girar");
const ruleta=document.getElementById("ruleta");
const resultado=document.getElementById("resultado");
const menu=document.getElementById("menu");
const game=document.getElementById("game");
const startButton=document.getElementById("startButton");
const toggleMusicButton=document.getElementById("toggleMusic");
const backgroundMusic=document.getElementById("backgroundMusic");
// restart button removed
const player1Card=document.getElementById("player1Card");
const player2Card=document.getElementById("player2Card");
const player1Score=document.getElementById("player1Score");
const player2Score=document.getElementById("player2Score");
// multiplayer UI removed: no onlineStatus or friendsList
const slot1=document.getElementById("slot1");
const slot2=document.getElementById("slot2");
const slot3=document.getElementById("slot3");
const menuCard = document.querySelector('.menu-card');
const panel = document.getElementById('panel');
const gameContent = document.getElementById('gameContent');

let turno="negro";
let gameOver=false;
let puntuacion={negro:0, blanco:0};
let contadorTurnos=0;
let habilidad="";
let seleccionada=null;
let jugadorDobleMovimiento="";
let dobleMovimientoUsado=false;
let movimientosExtra=0;
let tripleMovimientoActivo=false;
let tripleMovimientoCoords=null;
let escudoBlanco=false;
let escudoNegro=false;
let esperaMovimiento=false;
let allowedPieceTypes=[];
// multiplayer state removed

const fichas=["♟","♜","♞","♝","♛","♚","7"];

const inicial=[
    ["♖","♘","♗","♕","♔","♗","♘","♖"],
    ["♙","♙","♙","♙","♙","♙","♙","♙"],
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["","","","","","","",""] ,
    ["♟","♟","♟","♟","♟","♟","♟","♟"],
    ["♜","♞","♝","♛","♚","♝","♞","♜"]
];

let tableroEstado=[];

// ability and bonus state
const bonusCapturePoints = {negro:0, blanco:0};
const skipNextTurn = {negro:false, blanco:false};

const abilities = [
    {id:'promo', name:'Promoción real', desc:'Promociona un peón a reina', weight:1, apply:function(player){
        const pawn = player==='negro'? '♟' : '♙';
        const queen = player==='negro'? '♛' : '♕';
        const coords = [];
        for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(tableroEstado[r][c]===pawn) coords.push([r,c]);
        if(coords.length===0){ resultado.innerHTML = 'No hay peones disponibles para promocionar.'; return; }
        const [r,c] = coords[Math.floor(Math.random()*coords.length)];
        tableroEstado[r][c] = queen;
        resultado.innerHTML = 'Promoción: un peón se convierte en reina.';
        actualizarTablero();
    }},
    {id:'eliminar', name:'Eliminar ficha', desc:'Elimina una ficha enemiga aleatoria', weight:2, apply:function(player){
        const opp = player==='negro'?'blanco':'negro';
        const coords=[];
        for(let r=0;r<8;r++) for(let c=0;c<8;c++){
            const f = tableroEstado[r][c];
            if(f && colorDeFicha(f)===opp && f!=='♚' && f!=='♔') coords.push([r,c]);
        }
        if(coords.length===0){ resultado.innerHTML='No hay fichas enemigas válidas.'; return; }
        const [r,c]=coords[Math.floor(Math.random()*coords.length)];
        tableroEstado[r][c] = "";
        resultado.innerHTML='Has eliminado una ficha enemiga.';
        actualizarTablero();
    }},
    {id:'robar', name:'Robar puntos', desc:'Roba 2 puntos al rival', weight:2, apply:function(player){
        const opp = player==='negro'?'blanco':'negro';
        const steal = Math.min(2, puntuacion[opp]);
        puntuacion[opp]-=steal; puntuacion[player]+=steal;
        actualizarMarcador(); resultado.innerHTML='Has robado '+steal+' punto(s).';
    }},
    {id:'saltar', name:'Saltar turno', desc:'Salta el siguiente turno del rival', weight:2, apply:function(player){
        const opp = player==='negro'?'blanco':'negro'; skipNextTurn[opp]=true; resultado.innerHTML='El siguiente turno del rival será saltado.';
    }},
    {id:'dobleMovimiento', name:'Doble movimiento', desc:'Puedes mover dos veces seguidas', weight:4, apply:function(player){
        jugadorDobleMovimiento = player; dobleMovimientoUsado = false; resultado.innerHTML='Doble movimiento activado.';
    }},
    {id:'moverLibre', name:'Mover libre', desc:'Mueve una ficha adicional sin cambiar turno', weight:4, apply:function(player){
        jugadorDobleMovimiento = player; dobleMovimientoUsado = false; resultado.innerHTML='Puedes mover otra ficha gratis.';
    }},
    {id:'doblePuntos', name:'Doble puntos', desc:'Ganas 2 puntos inmediatamente', weight:5, apply:function(player){
        puntuacion[player]+=2; actualizarMarcador(); resultado.innerHTML='Has recibido +2 puntos.';
    }},
    {id:'escudo', name:'Escudo', desc:'Bloquea el siguiente ataque contra ti', weight:6, apply:function(player){
        if(player==='negro') escudoNegro=true; else escudoBlanco=true; resultado.innerHTML='Escudo activado.';
    }},
    {id:'puntos', name:'Bono leve', desc:'Ganas 1 punto', weight:8, apply:function(player){
        puntuacion[player] += 1; actualizarMarcador(); resultado.innerHTML='Has recibido +1 punto.';
    }},
    {id:'sorpresa', name:'Sorpresa', desc:'Pequeña posibilidad de gran efecto', weight:3, apply:function(player){
        const r=Math.random();
        if(r<0.18){ // raro
            // eliminar ficha enemiga
            const opp = player==='negro'?'blanco':'negro';
            const coords=[]; for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++){ const f=tableroEstado[rr][cc]; if(f && colorDeFicha(f)===opp && f!=='♚' && f!=='♔') coords.push([rr,cc]); }
            if(coords.length>0){ const [rr,cc]=coords[Math.floor(Math.random()*coords.length)]; tableroEstado[rr][cc]=""; actualizarTablero(); resultado.innerHTML='¡Sorpresa! Eliminaste una ficha enemiga.'; return; }
        }
        puntuacion[player] += 1; actualizarMarcador(); resultado.innerHTML='Sorpresa: +1 punto.';
    }}
];

function weightedSample(n){
    const pool=[]; abilities.forEach(a=>{ for(let i=0;i<a.weight;i++) pool.push(a); });
    const picked=[];
    for(let k=0;k<n && pool.length>0;k++){
        const idx = Math.floor(Math.random()*pool.length);
        const a = pool[idx];
        picked.push(a);
        // remove all copies of selected to avoid repeats
        for(let i=pool.length-1;i>=0;i--) if(pool[i].id===a.id) pool.splice(i,1);
    }
    return picked;
}

function tipoFichaCanonica(ficha){
    if(["♖","♜"].includes(ficha)) return "♖";
    if(["♘","♞"].includes(ficha)) return "♘";
    if(["♗","♝"].includes(ficha)) return "♗";
    if(["♕","♛"].includes(ficha)) return "♕";
    if(["♔","♚"].includes(ficha)) return "♔";
    if(["♙","♟"].includes(ficha)) return "♙";
    if(ficha=== '7') return '7';
    return ficha;
}

let iaEjecutandoMovimiento = false;

function esTurnoIA(){
    return turno === "blanco";
}

function obtenerMovimientosValidos(jugador){
    const movimientos = [];
    for(let f=0; f<8; f++){
        for(let c=0; c<8; c++){
            const ficha = tableroEstado[f][c];
            if(!ficha || colorDeFicha(ficha)!==jugador) continue;
            const tipoCanonico = tipoFichaCanonica(ficha);
            if(allowedPieceTypes.length > 0 && !allowedPieceTypes.includes(tipoCanonico)) continue;
            if(tripleMovimientoActivo && tripleMovimientoCoords && !(tripleMovimientoCoords.f===f && tripleMovimientoCoords.c===c)) continue;
            for(let dr=0; dr<8; dr++){
                for(let dc=0; dc<8; dc++){
                    if(esMovimientoValido(ficha, f, c, dr, dc)){
                        movimientos.push({sr:f, sc:c, dr, dc});
                    }
                }
            }
        }
    }
    return movimientos;
}

function esCasillaAmenazada(dr, dc, defensor){
    const atacante = defensor === 'negro' ? 'blanco' : 'negro';
    for(let f=0; f<8; f++){
        for(let c=0; c<8; c++){
            const ficha = tableroEstado[f][c];
            if(!ficha || colorDeFicha(ficha)!==atacante) continue;
            if(esMovimientoValido(ficha, f, c, dr, dc)) return true;
        }
    }
    return false;
}

function valorFicha(ficha){
    switch(ficha){
        case '♚': case '♔': return 1000;
        case '♛': case '♕': return 9;
        case '♜': case '♖': return 5;
        case '♝': case '♗': return 3.2;
        case '♞': case '♘': return 3;
        case '♟': case '♙': return 1;
    }
    return 0;
}

function calcularPuntajeMovimiento(movimiento){
    const ficha = tableroEstado[movimiento.sr][movimiento.sc];
    const destino = tableroEstado[movimiento.dr][movimiento.dc];
    let score = 0;
    if(destino){
        score += valorFicha(destino) * 4;
        if(destino === '♚') score += 250;
    }
    if(movimiento.dr >= 2 && movimiento.dr <= 5 && movimiento.dc >= 2 && movimiento.dc <= 5){
        score += 1.1;
    }
    if(ficha === '♙'){
        score += movimiento.dr * 0.18;
    }
    if(esCasillaAmenazada(movimiento.dr, movimiento.dc, 'blanco')){
        score += 0.5;
    }
    if(esCasillaAmenazada(movimiento.sr, movimiento.sc, 'blanco')){
        score -= 0.9;
    }
    const captura = destino ? valorFicha(destino) : 0;
    score += captura * 0.2;
    score += Math.random() * 0.45;
    return score;
}

function seleccionarHabilidadIA(picks){
    const ranked = picks.map(a => {
        let bonus = a.weight;
        if(a.id==='eliminar') bonus += 4;
        if(a.id==='dobleMovimiento') bonus += 2;
        if(a.id==='moverLibre') bonus += 1.8;
        if(a.id==='escudo') bonus += 1.2;
        if(a.id==='doblePuntos') bonus += 1.3;
        if(a.id==='puntos') bonus -= 0.8;
        return {ability:a, score: bonus};
    });
    ranked.sort((a,b)=>b.score-a.score);
    const top = ranked.slice(0, Math.max(1, Math.min(ranked.length, 2)));
    return top[Math.floor(Math.random()*top.length)].ability;
}

function moverMovimientoIA(){
    const movimientos = obtenerMovimientosValidos(turno);
    if(movimientos.length===0) return;
    const scored = movimientos.map(m => ({...m, score: calcularPuntajeMovimiento(m)}));
    scored.sort((a,b) => b.score - a.score);
    const topCount = Math.max(1, Math.min(scored.length, Math.ceil(scored.length * 0.35)));
    const mejores = scored.slice(0, topCount);
    const movimiento = mejores[Math.floor(Math.random()*mejores.length)];
    seleccionada = {f: movimiento.sr, c: movimiento.sc};
    actualizarTablero();
    const destino = tablero.querySelector(`[data-fila="${movimiento.dr}"][data-columna="${movimiento.dc}"]`);
    if(destino){
        iaEjecutandoMovimiento = true;
        clickCasilla.call(destino);
        iaEjecutandoMovimiento = false;
        if(esperaMovimiento && esTurnoIA()){
            setTimeout(()=>{ moverMovimientoIA(); }, 450);
        }
    }
}

function piezasPermitidasTexto(){
    if(allowedPieceTypes.length===0) return "cualquier pieza";
    return [...new Set(allowedPieceTypes)].join(', ');
}

function setAllowedPieces(types){
    const specialAll = ["♖","♘","♗","♕","♔","♙"];
    if(types.length===3 && types.every(t=>t==='7')){
        allowedPieceTypes = specialAll;
    } else {
        allowedPieceTypes = types
            .map(tipoFichaCanonica)
            .filter(t=>t !== undefined && t !== null && t !== "" && t !== '7');
    }
}

function puedeMoverTipo(ficha){
    if(!esperaMovimiento) return false;
    const tipo = tipoFichaCanonica(ficha);
    return allowedPieceTypes.length===0 || allowedPieceTypes.includes(tipo);
}

function hayMovimientoParaTipo(tipo, jugador){
    if(tipo==='7') return false;
    for(let f=0; f<8; f++){
        for(let c=0; c<8; c++){
            const ficha = tableroEstado[f][c];
            if(ficha && colorDeFicha(ficha)===jugador && tipoFichaCanonica(ficha)===tipo){
                for(let dr=0; dr<8; dr++){
                    for(let dc=0; dc<8; dc++){
                        if(esMovimientoValido(ficha, f, c, dr, dc)) return true;
                    }
                }
            }
        }
    }
    return false;
}

function resetSlotWarnings(){
    [slot1, slot2, slot3].forEach(slot=>{
        slot.classList.remove('slot-no-move');
        slot.classList.remove('slot-unique');
    });
}

function marcarSlotsInmovibles(tipos){
    resetSlotWarnings();
    tipos.forEach((tipo, idx)=>{
        const tipoCanonico = tipoFichaCanonica(tipo);
        const slot = [slot1, slot2, slot3][idx];
        if(tipoCanonico !== '7' && !hayMovimientoParaTipo(tipoCanonico, turno)){
            slot.classList.add('slot-no-move');
        }
    });
}

function resaltarSlotUnico(tipos){
    const movibles = tipos.map((tipo, idx)=>{
        const tipoCanonico = tipoFichaCanonica(tipo);
        if(tipoCanonico==='7') return false;
        return hayMovimientoParaTipo(tipoCanonico, turno);
    });
    const count = movibles.filter(Boolean).length;
    if(count===1){
        const idx = movibles.findIndex(Boolean);
        [slot1, slot2, slot3][idx].classList.add('slot-unique');
    }
}

function mostrarTiposPermitidos(){
    if(allowedPieceTypes.length===0) return '';
    return ' Solo puedes mover: ' + piezasPermitidasTexto() + '.';
}

function showAbilitiesForPlayer(player, onCompleted){
    if(gameOver){ if(onCompleted) onCompleted(); return; }
    if(player==='blanco'){
        const picks = weightedSample(3);
        const choice = picks[Math.floor(Math.random()*picks.length)];
        setTimeout(()=>{
            choice.apply(player);
            resultado.innerHTML = `IA ha elegido ${choice.name}.`;
            if(onCompleted) onCompleted();
        }, 450);
        return;
    }
    const cartasDiv = document.getElementById('cartas');
    const cartasList = document.getElementById('cartasList');
    const titulo = document.getElementById('cartasTitulo');
    titulo.textContent = '🃏 Jugador '+(player==='negro'? '1 (Negro)' : '2 (Magenta)') +', elige una carta';
    cartasList.innerHTML = '';
    const picks = weightedSample(3);
    picks.forEach(a=>{
        const btn = document.createElement('button'); btn.className='carta';
        btn.innerHTML = '<strong>'+a.name+'</strong><div style="font-size:12px;color:#e8d9c7">'+a.desc+'</div>';
        btn.onmouseenter = ()=>{
            const selected = document.getElementById('selectedCard');
            if(!selected.classList.contains('pinned')){
                selected.textContent = a.name + '\n\n' + a.desc;
                selected.classList.add('visible');
                selected.dataset.desc = a.desc;
            }
        };
        btn.onmouseleave = ()=>{
            const selected = document.getElementById('selectedCard');
            if(!selected.classList.contains('pinned')) selected.classList.remove('visible');
        };
        btn.onclick = ()=>{ 
            const selected = document.getElementById('selectedCard');
            selected.classList.add('visible','pinned');
            selected.textContent = a.name + '\n\n' + a.desc;
            selected.dataset.desc = a.desc;
            cartasList.querySelectorAll('.carta').forEach(other=>{
                if(other !== btn) other.classList.add('faded');
            });
            btn.classList.add('selected');
            btn.classList.remove('faded');
            setTimeout(()=>{
                a.apply(player);
                cartasDiv.classList.add('oculto');
                cartasList.querySelectorAll('.carta').forEach(other=>other.classList.remove('selected','faded'));
                selected.classList.remove('visible','pinned');
                selected.textContent = '';
                selected.dataset.desc = '';
                if(onCompleted) onCompleted();
            }, 450);
        };
        cartasList.appendChild(btn);
    });
    cartasDiv.classList.remove('oculto');
}

function crearTablero(){
    tablero.innerHTML="";
    tableroEstado = inicial.map(fila=>fila.slice());

    for(let f=0;f<8;f++){
        for(let c=0;c<8;c++){
            const casilla=document.createElement("div");
            casilla.className="casilla";
            if((f+c)%2==0) casilla.classList.add("blanca");
            else casilla.classList.add("negra");
            casilla.dataset.fila=f;
            casilla.dataset.columna=c;
            casilla.onclick=clickCasilla;
            tablero.appendChild(casilla);
        }
    }
    actualizarTablero();
}

function limpiarDestacados(){
    const casillas=tablero.querySelectorAll(".casilla");
    casillas.forEach(casilla=>{
        casilla.classList.remove("posible-movimiento");
    });
}

function destacarMovimientos(ficha, sr, sc){
    const casillas=tablero.querySelectorAll(".casilla");
    casillas.forEach(casilla=>{
        const f=parseInt(casilla.dataset.fila);
        const c=parseInt(casilla.dataset.columna);
        if(esMovimientoValido(ficha, sr, sc, f, c)){
            casilla.classList.add("posible-movimiento");
        }
    });
}

function actualizarTablero(){
    const casillas=tablero.querySelectorAll(".casilla");
    limpiarDestacados();
    casillas.forEach(casilla=>{
        const f=parseInt(casilla.dataset.fila);
        const c=parseInt(casilla.dataset.columna);
        const ficha = tableroEstado[f][c] || "";
        casilla.textContent = ficha;
        casilla.style.outline="";
        casilla.classList.remove("magenta-piece","negro-piece");
        if(ficha){
            const color = colorDeFicha(ficha);
            if(color==="blanco") casilla.classList.add("magenta-piece");
            if(color==="negro") casilla.classList.add("negro-piece");
        }
        if(seleccionada && seleccionada.f===f && seleccionada.c===c){
            casilla.style.outline="4px solid #00e3ff";
            if(tableroEstado[f][c]){
                destacarMovimientos(tableroEstado[f][c], f, c);
            }
        }
    });
    actualizarTurnoTexto();
}

function actualizarMarcador(){
    player1Score.textContent = puntuacion.negro;
    player2Score.textContent = puntuacion.blanco;
}

function actualizarTurnoTexto(){
    const textoTurno = turno==="negro" ? "Turno: Jugador 1 (Negro)" : "Turno: Jugador 2 (Magenta)";
    document.getElementById("turno").textContent = textoTurno;
    player1Card.classList.toggle("activo", turno==="negro");
    player2Card.classList.toggle("activo", turno==="blanco");
}

function declararVictoria(mensaje){
    resultado.innerHTML = mensaje + "<br>Partida terminada.";
    girar.disabled = true;
    gameOver = true;
    // panel end animation
    if(panel){
        panel.classList.add('game-end');
        setTimeout(()=> panel.classList.remove('game-end'), 1400);
    }
    // victory sound cue
    try{
        playTone(440,0.18,audioContext.currentTime,'sawtooth');
        playTone(660,0.18,audioContext.currentTime+0.18,'sawtooth');
        playHat(audioContext.currentTime+0.36);
    }catch(e){}
}

function resetGame(){
    turno="negro";
    gameOver=false;
    contadorTurnos=0;
    habilidad="";
    seleccionada=null;
    jugadorDobleMovimiento="";
    dobleMovimientoUsado=false;
    movimientosExtra=0;
    tripleMovimientoActivo=false;
    tripleMovimientoCoords=null;
    escudoBlanco=false;
    escudoNegro=false;
    const selected = document.getElementById('selectedCard');
    selected.classList.remove('visible','pinned');
    selected.textContent = '';
    document.getElementById("cartas").classList.add("oculto");
    resultado.innerHTML="Pulsa la ruleta para empezar.";
    girar.disabled=false;
    crearTablero();
    actualizarTurnoTexto();
    actualizarMarcador();
}

function iniciarPartida(){
    // local play
    // Animar salida del menú antes de mostrar el juego
    if(menuCard){
        menu.classList.add('menu-starting');
        menu.classList.add('menu-starting-overlay');
        const onAnimEnd = function(){
            menu.classList.add('oculto');
            menu.classList.remove('menu-starting');
            menu.classList.remove('menu-starting-overlay');
            menuCard.removeEventListener('animationend', onAnimEnd);
            game.classList.remove('oculto');
            gameContent.classList.add('showing');
            game.classList.add('game-showing');
            startButton.disabled = true;
            resetGame();
            if(panel){
                panel.classList.add('game-start');
                panel.addEventListener('animationend', function onEnd(){
                    panel.classList.remove('game-start');
                    panel.removeEventListener('animationend', onEnd);
                });
            }
            setTimeout(() => {
                if(menu && menu.parentNode){
                    menu.parentNode.removeChild(menu);
                }
            }, 50);
            try{ playTone(880,0.12,audioContext.currentTime,'sine'); playTone(1100,0.12,audioContext.currentTime+0.12,'sine'); }catch(e){}
        };
        menuCard.addEventListener('animationend', onAnimEnd);
        // fallback por si no llega el evento
        setTimeout(()=>{
            if(!menu.classList.contains('oculto')) onAnimEnd();
        }, 1000);
    } else {
        startButton.disabled = true;
        menu.classList.add('oculto');
        game.classList.remove('oculto');
        gameContent.classList.add('showing');
        game.classList.add('game-showing');
        resetGame();
        if(panel){
            panel.classList.add('game-start');
            setTimeout(()=> panel.classList.remove('game-start'), 800);
        }
        try{ playTone(880,0.12,audioContext.currentTime,'sine'); playTone(1100,0.12,audioContext.currentTime+0.12,'sine'); }catch(e){}
    }
}

startButton.addEventListener("click", iniciarPartida);
if(toggleMusicButton){
    toggleMusicButton.addEventListener("click", toggleBackgroundMusic);
}

// reiniciarPartida removed; use `resetGame()` from devtools or reopen menu to restart session

function colorDeFicha(ficha){
    if(["♙","♖","♘","♗","♕","♔"].includes(ficha)) return "blanco";
    if(["♟","♜","♞","♝","♛","♚"].includes(ficha)) return "negro";
    return "";
}

function esCantidadLibre(sr, sc, dr, dc){
    const dFila = Math.sign(dr-sr);
    const dCol = Math.sign(dc-sc);
    let r=sr+dFila;
    let c=sc+dCol;
    while(r!==dr || c!==dc){
        if(tableroEstado[r][c] !== "") return false;
        r += dFila;
        c += dCol;
    }
    return true;
}

function esMovimientoValido(ficha, sr, sc, dr, dc){
    if(sr===dr && sc===dc) return false;
    const destino = tableroEstado[dr][dc];
    const colorOrigen = colorDeFicha(ficha);
    const colorDestino = colorDeFicha(destino);
    if(colorDestino && colorDestino===colorOrigen) return false;

    const df = dr - sr;
    const dcDiff = dc - sc;
    const abf = Math.abs(df);
    const abc = Math.abs(dcDiff);

    switch(ficha){
        case "♙":
            if(dcDiff===0 && df===1 && !destino) return true;
            if(dcDiff===0 && df===2 && sr===1 && !destino && !tableroEstado[sr+1][sc]) return true;
            if(abc===1 && df===1 && destino && colorDestino==="negro") return true;
            return false;
        case "♟":
            if(dcDiff===0 && df===-1 && !destino) return true;
            if(dcDiff===0 && df===-2 && sr===6 && !destino && !tableroEstado[sr-1][sc]) return true;
            if(abc===1 && df===-1 && destino && colorDestino==="blanco") return true;
            return false;
        case "♖":
        case "♜":
            if((df===0 || dcDiff===0) && esCantidadLibre(sr, sc, dr, dc)) return true;
            return false;
        case "♗":
        case "♝":
            if(abf===abc && esCantidadLibre(sr, sc, dr, dc)) return true;
            return false;
        case "♕":
        case "♛":
            if((abf===abc || df===0 || dcDiff===0) && esCantidadLibre(sr, sc, dr, dc)) return true;
            return false;
        case "♘":
        case "♞":
            return (abf===2 && abc===1) || (abf===1 && abc===2);
        case "♔":
        case "♚":
            return Math.max(abf, abc)===1;
    }
    return false;
}

function clickCasilla(){
    const f=parseInt(this.dataset.fila);
    const c=parseInt(this.dataset.columna);
    const pieza = tableroEstado[f][c];

    if(gameOver) return;

    if(!esperaMovimiento){
        resultado.innerHTML = "Debes girar la ruleta antes de mover.";
        return;
    }
    if(seleccionada){
        const sr = seleccionada.f;
        const sc = seleccionada.c;
        if(sr===f && sc===c){
            seleccionada = null;
            actualizarTablero();
            return;
        }
        const piezaOrigen = tableroEstado[sr][sc];
        if(esMovimientoValido(piezaOrigen, sr, sc, f, c)){
            const destino = tableroEstado[f][c];
            const colorDestino = colorDeFicha(destino);
            const colorOrigen = colorDeFicha(piezaOrigen);

            if(destino && colorDestino==="blanco" && escudoBlanco && colorOrigen==="negro"){
                resultado.innerHTML = "🛡 Escudo bloqueado: tu ataque fue rechazado.";
                escudoBlanco = false;
                seleccionada = null;
                actualizarTablero();
                return;
            }
            if(destino && colorDestino==="negro" && escudoNegro && colorOrigen==="blanco"){
                resultado.innerHTML = "🛡 Escudo bloqueado: tu ataque fue rechazado.";
                escudoNegro = false;
                seleccionada = null;
                actualizarTablero();
                return;
            }

            tableroEstado[f][c] = piezaOrigen;
            tableroEstado[sr][sc] = "";
            if(comprobarVictoria()) return;
            contadorTurnos++;
            allowedPieceTypes = [];

            if(tripleMovimientoActivo){
                movimientosExtra--;
                if(movimientosExtra>0){
                    tripleMovimientoCoords = {f,c};
                    resultado.innerHTML = `🎰 777: mueve la misma ficha ${movimientosExtra+1} veces más.`;
                    seleccionada = null;
                    actualizarTablero();
                    esperaMovimiento = true;
                    girar.disabled = true;
                    return;
                }
                tripleMovimientoActivo = false;
                tripleMovimientoCoords = null;
            }

            if(jugadorDobleMovimiento===turno && !dobleMovimientoUsado){
                dobleMovimientoUsado = true;
                resultado.innerHTML = "🎯 Doble movimiento activo: mueve otra vez.";
                seleccionada = null;
                actualizarTablero();
                esperaMovimiento = true;
                girar.disabled = true;
                return;
            }
            esperaMovimiento = false;

            if(jugadorDobleMovimiento===turno && dobleMovimientoUsado){
                jugadorDobleMovimiento = "";
                dobleMovimientoUsado = false;
            }

            turno = turno==="blanco"?"negro":"blanco";
            actualizarTurnoTexto();
            if(contadorTurnos%5===0){
                if(skipNextTurn[turno]){
                    skipNextTurn[turno]=false;
                    resultado.innerHTML = 'Turno saltado para '+(turno==='negro'? 'Jugador 1':'Jugador 2')+'.';
                    turno = turno==="blanco"?"negro":"blanco";
                    actualizarTurnoTexto();
                }
                const continuarJuego = ()=>{
                    seleccionada = null;
                    actualizarTablero();
                    lanzarRuleta();
                };
                showAbilitiesForPlayer(turno, continuarJuego);
                return;
            }
            seleccionada = null;
            actualizarTablero();
            lanzarRuleta();
            return;
        }
        if(pieza && colorDeFicha(pieza)===turno){
            seleccionada={f,c};
        } else {
            resultado.innerHTML = (pieza && colorDeFicha(pieza)!==turno) ? "No es tu turno." : "Movimiento inválido.";
            seleccionada = null;
        }
        actualizarTablero();
        return;
    }

    if(pieza){
        if(colorDeFicha(pieza)===turno){
            if(esperaMovimiento && !puedeMoverTipo(pieza)){
                resultado.innerHTML = "Solo puedes mover: " + piezasPermitidasTexto() + ".";
                return;
            }
            if(tripleMovimientoActivo && tripleMovimientoCoords && !(tripleMovimientoCoords.f===f && tripleMovimientoCoords.c===c)){
                resultado.innerHTML = "🎰 Debes seguir moviendo la misma ficha 777.";
                return;
            }
            if(esTurnoIA()){
                return;
            }
            seleccionada={f,c};
            this.style.outline="4px solid #00e3ff";
        } else {
            resultado.innerHTML = "No es tu turno.";
        }
    }
}


function comprobarVictoria(){
    let reyBlanco=false;
    let reyNegro=false;
    for(const fila of tableroEstado){
        for(const ficha of fila){
            if(ficha==="♔") reyBlanco=true;
            if(ficha==="♚") reyNegro=true;
        }
    }
    if(!reyBlanco){
        puntuacion.negro += 1;
        actualizarMarcador();
        declararVictoria("¡Victoria del Jugador 1 (Negro)! Has capturado al rey blanco.");
        return true;
    }
    if(!reyNegro){
        puntuacion.blanco += 1;
        actualizarMarcador();
        declararVictoria("¡Victoria del Jugador 2 (Magenta)! Has capturado al rey negro.");
        return true;
    }
    return false;
}

crearTablero();

const pesosRuleta={
    "♟":32,
    "♜":5,
    "♞":4,
    "♝":4,
    "♛":3,
    "♚":3,
    "7":1
};

function aleatorio(){
    const lista=[];
    for(const ficha of fichas){
        const peso = pesosRuleta[ficha] || 1;
        for(let i=0;i<peso;i++){
            lista.push(ficha);
        }
    }
    return lista[Math.floor(Math.random()*lista.length)];
}

let musicaIniciada = false;
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioContext.createGain();
masterGain.gain.value = 0.12;
masterGain.connect(audioContext.destination);

function playTone(freq, duration, time, type = "sine"){
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(masterGain);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration + 0.02);
}

function playHat(time){
    const bufferSize = audioContext.sampleRate * 0.03;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++){
        data[i] = (Math.random()*2-1) * Math.exp(-5 * i / bufferSize);
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const gain = audioContext.createGain();
    gain.gain.value = 0.12;
    noise.connect(gain);
    gain.connect(masterGain);
    noise.start(time);
    noise.stop(time + 0.04);
}

function playBackgroundMusic(){
    if(!backgroundMusic) return;
    if(backgroundMusic.paused){
        backgroundMusic.volume = 0.18;
        backgroundMusic.play().catch(()=>{
            // autoplay blocked; seguirá como música opcional
        });
        if(toggleMusicButton) toggleMusicButton.textContent = '🔊 Música ON';
    }
}

function pauseBackgroundMusic(){
    if(!backgroundMusic) return;
    if(!backgroundMusic.paused){
        backgroundMusic.pause();
    }
    if(toggleMusicButton) toggleMusicButton.textContent = '🔇 Música OFF';
}

function toggleBackgroundMusic(){
    if(!backgroundMusic) return;
    if(backgroundMusic.paused){
        playBackgroundMusic();
    } else {
        pauseBackgroundMusic();
    }
}

function iniciarMusicaCasino(){
    if(backgroundMusic){
        playBackgroundMusic();
        return;
    }
    if(musicaIniciada) return;
    musicaIniciada = true;
    audioContext.resume();
    const notas=[261.63, 329.63, 392.00, 523.25];
    const secuencia=[0,2,0,3];
    function programarBarra(start){
        for(let i=0;i<4;i++){
            const nota = notas[secuencia[i]];
            playTone(nota, 0.28, start + i * 0.5, "triangle");
            playHat(start + i * 0.5);
        }
    }
    programarBarra(audioContext.currentTime + 0.1);
    setInterval(()=> programarBarra(audioContext.currentTime + 0.1), 2000);
}

function tirarRuleta(){
    const prob=Math.random();
    if(prob<0.001){
        return ["7","7","7"];
    }
    if(prob<0.15){
        return ["♔","♔","♔"];
    }
    if(prob<0.30){
        return ["♙","♘","♗"];
    }
    return [aleatorio(), aleatorio(), aleatorio()];
}

function lanzarRuleta(){
    if(gameOver) return;
    iniciarMusicaCasino();
    girar.disabled=true;
    resultado.innerHTML="🎰 Girando...";
    ruleta.classList.add("animando");

    setTimeout(function(){
        const [a,b,c]=tirarRuleta();

        slot1.textContent=a;
        slot2.textContent=b;
        slot3.textContent=c;

        const valores = [a,b,c];
        const count7 = valores.filter(x=>x==="7").length;
        const siguienteTurno = turno==="blanco" ? "negro" : "blanco";
        let mensaje="";
        const tipos=[];

        if(count7===3){
            mensaje = "🎰 777: mueve una ficha 3 veces seguidas.";
            tripleMovimientoActivo = true;
            movimientosExtra = 2;
            tripleMovimientoCoords = null;
            allowedPieceTypes = [];
            resetSlotWarnings();
            actualizarTurnoTexto();
            resultado.innerHTML = mensaje + " Selecciona la ficha que quieres mover.";
            ruleta.classList.remove("animando");
            esperaMovimiento = true;
            girar.disabled = true;
            return;
        }
        else if(count7===1 || count7===2){
            mensaje = "⚠️ Uno o dos 7: turno pasado.";
            turno = siguienteTurno;
            actualizarTurnoTexto();
            resultado.innerHTML = mensaje + "<br>Turno de jugador " + (turno=== 'negro' ? '1' : '2') + ".";
            ruleta.classList.remove("animando");
            esperaMovimiento = false;
            allowedPieceTypes = [];
            girar.disabled = true;
            setTimeout(()=>{ lanzarRuleta(); }, 700);
            return;
        }
        else if(a==="♔" && b==="♔" && c==="♔"){
            mensaje = "👑 Triple Rey. Pierdes un turno.";
            turno = siguienteTurno;
            actualizarTurnoTexto();
            resultado.innerHTML = mensaje + "<br>Turno de jugador " + (turno=== 'negro' ? '1' : '2') + ".";
            ruleta.classList.remove("animando");
            esperaMovimiento = false;
            allowedPieceTypes = [];
            resetSlotWarnings();
            setTimeout(()=>{ lanzarRuleta(); }, 700);
            return;
        }
        else if(a==="♙" && b==="♘" && c==="♗"){
            mensaje = "✨ Doble movimiento.";
            jugadorDobleMovimiento = turno;
            dobleMovimientoUsado = false;
            tipos.push('♙','♘','♗');
        }
        else{
            mensaje = "Sin premio.";
            tipos.push(a,b,c);
        }

        setAllowedPieces(tipos);
        marcarSlotsInmovibles(tipos);
        resaltarSlotUnico(tipos);

        const anyMovableAllowedType = allowedPieceTypes.some(tipo => hayMovimientoParaTipo(tipo, turno));
        if(!anyMovableAllowedType){
            mensaje = "⚠️ No puedes mover ninguna pieza permitida. Se pasa el turno y se vuelve a girar.";
            turno = siguienteTurno;
            actualizarTurnoTexto();
            resultado.innerHTML = mensaje + "<br>Turno de jugador " + (turno=== 'negro' ? '1' : '2') + ".";
            ruleta.classList.remove("animando");
            esperaMovimiento = false;
            allowedPieceTypes = [];
            resetSlotWarnings();
            setTimeout(()=>{ lanzarRuleta(); }, 700);
            return;
        }

        actualizarTurnoTexto();
        resultado.innerHTML = mensaje + "<br>Ahora mueve tus fichas." + mostrarTiposPermitidos();
        ruleta.classList.remove("animando");
        esperaMovimiento = true;
        girar.disabled = true;

        if(esTurnoIA()){
            setTimeout(()=>{
                moverMovimientoIA();
            }, 600);
        }
    }, 800);
}

girar.onclick = lanzarRuleta;

// dynamic ability buttons handled in showAbilitiesForPlayer/apply functions

// friends list removed for local-only mode
