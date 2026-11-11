"use strict";

// ---------- Utilidades de seguridad ----------
// Todo texto del usuario se escribe con textContent (nunca innerHTML) para evitar XSS.
const $ = (id) => document.getElementById(id);

// Limitador simple anti-spam: ignora acciones repetidas en menos de `ms`.
function limiter(ms) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < ms) return false;
    last = now;
    return true;
  };
}

// Limpia texto: solo letras, números y espacios, con longitud máxima.
const limpiar = (texto, max) => texto.replace(/[^\p{L}\p{N} ]/gu, "").trim().slice(0, max);

// ---------- Datos de contacto ofuscados (anti-scraping) ----------
// Se arman con JS: los bots que solo leen el HTML no encuentran el correo ni el teléfono.
(function contacto() {
  const mail = $("mail");
  if (mail) {
    const correo = `${mail.dataset.u}@${mail.dataset.d}`;
    mail.href = `mailto:${correo}`;
    mail.textContent = correo;
  }
  const tel = $("tel");
  if (tel) tel.textContent = tel.dataset.t;
})();

// Año del footer
$("year").textContent = new Date().getFullYear();

// Reloj de Bogotá en la barra superior
(function reloj() {
  const el = $("reloj");
  if (!el) return;
  const fmt = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false });
  const pintar = () => { el.textContent = fmt.format(new Date()); };
  pintar();
  setInterval(pintar, 30000);
})();

// ---------- Filtro de estados (demo de garantías) ----------
document.querySelectorAll("[data-filter]").forEach((sel) => {
  sel.addEventListener("change", () => {
    const value = sel.value;
    sel.closest(".demo").querySelectorAll("tbody tr").forEach((row) => {
      row.classList.toggle("hide", value !== "all" && row.dataset.status !== value);
    });
  });
});

// ---------- Wizard por pasos (garantía y C.O.D.) ----------
document.querySelectorAll(".wizard").forEach((wiz) => {
  const steps = wiz.querySelectorAll(".step");
  const total = steps.length;
  let current = 0;

  const render = () => {
    steps.forEach((s, i) => (s.hidden = i !== current));
    wiz.querySelector(".bar").style.width = `${((current + 1) / total) * 100}%`;
    wiz.querySelector(".cur").textContent = current + 1;
    wiz.querySelector("[data-prev]").disabled = current === 0;
    wiz.querySelector("[data-next]").textContent = current === total - 1 ? "Enviar (demo)" : "Siguiente";
  };

  wiz.querySelector("[data-next]").addEventListener("click", () => {
    if (current < total - 1) {
      current++;
      render();
    } else {
      wiz.querySelector(".summary").textContent = "¡Listo! En la demo no se envía nada. En el sistema real se genera el PDF y se envía por correo.";
    }
  });
  wiz.querySelector("[data-prev]").addEventListener("click", () => {
    if (current > 0) current--;
    render();
  });
  render();
});

// ---------- Consulta de garantía por serial (demo) ----------
const lookupBtn = $("lookup-btn");
if (lookupBtn) {
  const puedo = limiter(600);
  lookupBtn.addEventListener("click", () => {
    if (!puedo()) return;
    const serial = limpiar($("serial").value, 20).toUpperCase();
    $("lookup-result").textContent = serial.length >= 6
      ? `Serial ${serial}: garantía vigente hasta 2035 (dato ficticio).`
      : "Escribe un número de serie de al menos 6 caracteres.";
  });
}

// ---------- Chat de la app de piezas (demo) ----------
const chatForm = $("chat-form");
if (chatForm) {
  const chat = $("chat");
  const puedo = limiter(1200);                       // anti-spam: 1 mensaje cada 1,2 s
  const replies = [
    "Lo revisamos y te confirmo disponibilidad.",
    "Sí, la pieza está en nuestra tienda Sur.",
    "Te envío la cotización en un momento.",
  ];
  let n = 0;
  const add = (cls, msg) => {
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    div.textContent = msg;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  };
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("chat-input");
    const text = limpiar(input.value, 200);
    if (!text || !puedo()) return;
    add("me", text);
    input.value = "";
    setTimeout(() => add("them", replies[n++ % replies.length]), 700);
  });
}

// ---------- Demo: parqueadero de motos ----------
// Reglas del cobro (mismas del sistema real, ver pruebas/logica.test.js)
const TARIFA = {
  minuto: 80,        // $ por minuto de día
  noche: 50,         // $ por minuto de noche
  nocheDesde: 20 * 60,
  nocheHasta: 6 * 60,
  gracia: 5,         // minutos sin cobro
  tope: 10000,       // máximo por cada 24 horas
  redondeo: 100,     // siempre hacia abajo
};
const CAPACIDAD = 12;

// Calcula el cobro de `minutos` que empiezan a `horaInicio` (minutos desde medianoche).
function cobrar(minutos, horaInicio) {
  if (minutos <= TARIFA.gracia) return { total: 0, dia: 0, noche: 0 };
  let total = 0, dia = 0, noche = 0;
  for (let inicio = 0; inicio < minutos; inicio += 1440) {
    const bloque = Math.min(1440, minutos - inicio);
    let costoBloque = 0;
    for (let k = 0; k < bloque; k++) {
      const reloj = (horaInicio + inicio + k) % 1440;
      const esNoche = reloj >= TARIFA.nocheDesde || reloj < TARIFA.nocheHasta;
      if (esNoche) { noche++; costoBloque += TARIFA.noche; }
      else { dia++; costoBloque += TARIFA.minuto; }
    }
    total += Math.min(costoBloque, TARIFA.tope);   // tope por cada 24 h
  }
  total = Math.floor(total / TARIFA.redondeo) * TARIFA.redondeo; // redondeo hacia abajo
  return { total, dia, noche };
}

const money = (n) => "$" + Math.round(n).toLocaleString("es-CO");
const hora = (d) => d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const parking = $("park-in") ? {
  vehiculos: [],   // { placa, entrada: Date }
  msg: $("park-msg"),
  lista: $("park-list"),
  ticket: $("park-ticket"),
} : null;

if (parking) {
  const puedo = limiter(400);
  const mostrarMsg = (texto, tipo) => {
    parking.msg.textContent = texto;
    parking.msg.dataset.tipo = tipo;
  };

  const pintar = () => {
    const ocupados = parking.vehiculos.length;
    $("park-cap").textContent = `${ocupados} / ${CAPACIDAD} puestos`;
    $("park-bar").style.width = `${(ocupados / CAPACIDAD) * 100}%`;
    parking.lista.textContent = "";
    if (!ocupados) {
      const li = document.createElement("li");
      li.className = "vacio";
      li.textContent = "Sin motos en el parqueadero.";
      parking.lista.appendChild(li);
    }
    parking.vehiculos.forEach((v) => {
      const li = document.createElement("li");
      const txt = document.createElement("span");
      txt.textContent = `${v.placa} · entró ${hora(v.entrada)}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sm";
      btn.textContent = "Cobrar salida";
      btn.addEventListener("click", () => cobrarSalida(v.placa));
      li.append(txt, btn);
      parking.lista.appendChild(li);
    });
  };

  const cobrarSalida = (placa) => {
    if (!puedo()) return;
    const v = parking.vehiculos.find((x) => x.placa === placa);
    if (!v) return;
    const minutos = Math.min(10080, Math.max(0, Math.floor(Number($("park-min").value) || 0)));
    const salida = new Date(v.entrada.getTime() + minutos * 60000);
    const horaInicio = v.entrada.getHours() * 60 + v.entrada.getMinutes();
    const c = cobrar(minutos, horaInicio);

    parking.vehiculos = parking.vehiculos.filter((x) => x !== v);
    pintar();

    const t = parking.ticket;
    t.textContent = "";
    const titulo = document.createElement("strong");
    titulo.textContent = `Comprobante · ${placa}`;
    const detalle = document.createElement("p");
    detalle.textContent = `Entrada ${hora(v.entrada)} · Salida ${hora(salida)} · ${minutos} min` +
      ` (día ${c.dia} min, noche ${c.noche} min)`;
    const total = document.createElement("p");
    total.className = "total";
    total.textContent = `Total: ${money(c.total)}`;
    t.append(titulo, detalle, total);
    t.hidden = false;
    mostrarMsg("Salida registrada y cobrada (demo).", "ok");
  };

  $("park-in").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!puedo()) return;
    const placa = $("park-plate").value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
    $("park-plate").value = placa;
    if (!(/^[A-Z]{3}\d{2}[A-Z0-9]$|^[A-Z]{3}\d{3}$/).test(placa)) {
      return mostrarMsg("Placa no válida. Ejemplos: ABC12D o ABC123.", "error");
    }
    if (parking.vehiculos.some((v) => v.placa === placa)) {
      return mostrarMsg(`La placa ${placa} ya está adentro.`, "error");
    }
    if (parking.vehiculos.length >= CAPACIDAD) {
      return mostrarMsg("No hay puestos disponibles.", "error");
    }
    parking.vehiculos.push({ placa, entrada: new Date() });
    $("park-plate").value = "";
    parking.ticket.hidden = true;
    mostrarMsg(`Entrada registrada: ${placa}.`, "ok");
    pintar();
  });

  pintar();
}
