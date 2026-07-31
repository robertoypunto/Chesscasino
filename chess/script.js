const tablero=document.getElementById("tablero");
const girar=document.getElementById("girar");
const resultado=document.getElementById("resultado");

let turno="🔴";
let contadorTurnos=0;
let habilidad="";
let seleccionada=null;

const fichas=["♙","♘","♗","♖","♕","♔"];

// Crear tablero
function crearTablero(){

    tablero.innerHTML="";

    for(let f=0;f<8;f++){

        for(let c=0;c<8;c++){

            let casilla=document.createElement("div");

            casilla.className="casilla";

            if((f+c)%2==0)
                casilla.classList.add("blanca");
            else
                casilla.classList.add("negra");

            casilla.dataset.fila=f;
            casilla.dataset.columna=c;

            if(f==0)
                casilla.textContent="🔵";

            if(f==7)
                casilla.textContent="🔴";

            casilla.onclick=clickCasilla;

            tablero.appendChild(casilla);

        }

    }

}

crearTablero();

function clickCasilla(){

    if(seleccionada==null){

        if(this.textContent==turno){

            seleccionada=this;
            this.style.outline="4px solid yellow";

        }

        return;

    }

    let origenFila=parseInt(seleccionada.dataset.fila);
    let origenCol=parseInt(seleccionada.dataset.columna);

    let destinoFila=parseInt(this.dataset.fila);
    let destinoCol=parseInt(this.dataset.columna);

    let distancia=Math.abs(origenFila-destinoFila)+Math.abs(origenCol-destinoCol);

    if(distancia==1){

        this.textContent=seleccionada.textContent;

        seleccionada.textContent="";

        seleccionada.style.outline="";

        seleccionada=null;

        turno=(turno=="🔴")?"🔵":"🔴";
document.getElementById("turno").textContent="Turno: "+turno;

contadorTurnos++;

if(contadorTurnos%4==0){

    document.getElementById("cartas").classList.remove("oculto");

}

    }else{

        seleccionada.style.outline="";
        seleccionada=null;

    }

}

// Ruleta
function aleatorio(){

    return fichas[Math.floor(Math.random()*fichas.length)];

}

girar.onclick=function(){

    let a=aleatorio();
    let b=aleatorio();
    let c=aleatorio();

    slot1.textContent=a;
    slot2.textContent=b;
    slot3.textContent=c;

    if(a=="♔" && b=="♔" && c=="♔"){

        resultado.innerHTML="👑 Triple Rey. Pierdes un turno.";

    }

    else if(a=="♙" && b=="♘" && c=="♗"){

        resultado.innerHTML="✨ Doble movimiento.";

    }

    else{

        resultado.innerHTML="Sin premio.";

    }

}
const cartas=document.querySelectorAll(".carta");

cartas.forEach(carta=>{

    carta.onclick=function(){

        habilidad=this.innerText;

        resultado.innerHTML="🃏 Habilidad elegida:<br><b>"+habilidad+"</b>";

        document.getElementById("cartas").classList.add("oculto");

    }

});