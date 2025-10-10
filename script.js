// ===== CONFIGURACIÓN GLOBAL =====
const CONFIG = {
  SUMINISTROS: {
    BIN_ID: "68e5b7b6ae596e708f09e533",
    API_KEY: "$2a$10$tl9rjwJzegQiXiU0QzSbm.A0IjnWDmhKKCLiFDciLB3bdhowrXdZy",
  },
  INVENTARIO: {
    BIN_ID: "68e5c137d0ea881f409923a5",
    API_KEY: "$2a$10$tl9rjwJzegQiXiU0QzSbm.A0IjnWDmhKKCLiFDciLB3bdhowrXdZy",
  },
  BODEGUITA: {
    BIN_ID : "68e83994d0ea881f409bb2fe",
    API_KEY: "$2a$10$tl9rjwJzegQiXiU0QzSbm.A0IjnWDmhKKCLiFDciLB3bdhowrXdZy",
  }
};

const crearURL = (id) => `https://api.jsonbin.io/v3/b/${id}`;
const { SUMINISTROS, INVENTARIO, BODEGUITA } = CONFIG;

// ===== FUNCIONES GENERALES =====
const fetchJSONBin = async (url, key, method = "GET", data = null) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": key,
      "X-Bin-Private": false,
    },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Error ${method} en JSONBin`);
  return res.json();
};

// ===== TOAST =====
function mostrarToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

// ===== TEMAS =====
const temas = ["claro", "oscuro", "gradiente"];
let indiceTema = temas.indexOf(localStorage.getItem("tema")) >= 0 
    ? temas.indexOf(localStorage.getItem("tema")) 
    : 0;

const botonTema = document.getElementById("botonTema");

// Función para aplicar un tema
function aplicarTema(tema) {
    // Limpiar cualquier clase anterior
    document.body.className = "";
    // Aplicar la nueva
    document.body.classList.add(tema);
    // Guardar en localStorage
    localStorage.setItem("tema", tema);

    // Cambiar emoji según el tema
    if (botonTema) {
        let emoji = tema === "claro" ? "☀️" :
                    tema === "oscuro" ? "🌙" :
                    "🎨"; // gradient
        botonTema.textContent = `${emoji} Cambiar tema`;
    }
}

// Aplicar tema guardado al cargar
aplicarTema(temas[indiceTema]);

// Función para cambiar tema al hacer click
function cambiarTema() {
    indiceTema = (indiceTema + 1) % temas.length;
    aplicarTema(temas[indiceTema]);
}

// Evento click
if (botonTema) botonTema.addEventListener("click", cambiarTema);

//subrayado de opcion del menu 
const items = document.querySelectorAll('.menu a');

items.forEach(item => {
  item.addEventListener('click', () => {
    items.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ===== MENÚ Y VISTAS =====
function toggleMenu() {
  const menu = document.getElementById("menu");
  if (menu) menu.classList.toggle("open");
}

function mostrarVista(vista) {
  document.querySelectorAll(".vista").forEach(v => v.classList.remove("activa"));
  const v = document.getElementById(`vista-${vista}`);
  if (v) v.classList.add("activa");

  const menu = document.getElementById("menu");
  if (menu && menu.classList.contains("open")) menu.classList.remove("open");

  if (vista === "historial") mostrarHistorial();
}

// ===== SUMINISTROS =====
let historial = [];
let pendientes = []; // registros que no se pudieron subir
const URL_SUMINISTROS = crearURL(SUMINISTROS.BIN_ID);

async function cargarHistorial() {
  try {
    const data = await fetchJSONBin(`${URL_SUMINISTROS}/latest`, SUMINISTROS.API_KEY);
    historial = data.record || [];

    // Adaptar registros antiguos al nuevo formato si es necesario
    historial = historial.map(r => {
      if (!Array.isArray(r.suministros)) {
        r.suministros = r.suministro
          ? [{ nombreSuministro: r.suministro, cantidad: r.cantidad || 1 }]
          : [];
        delete r.suministro;
        delete r.cantidad;
      }
      return r;
    });

    // Sincronizar pendientes si hay
    if (pendientes.length > 0) {
      historial.push(...pendientes);
      await guardarHistorial();
      pendientes = [];
      localStorage.setItem("pendientes", JSON.stringify([]));
    }

    localStorage.setItem("historial", JSON.stringify(historial));
    mostrarHistorial();

    // ✅ Mensaje de éxito al cargar desde el servidor
    mostrarToast("✅ Historial cargado desde el servidor");
    console.log("✅ Historial cargado del servidor");
  } catch {
    historial = JSON.parse(localStorage.getItem("historial")) || [];
    pendientes = JSON.parse(localStorage.getItem("pendientes")) || [];
    mostrarToast("⚠️ Usando datos locales");
    mostrarHistorial();
  }
}

async function guardarHistorial() {
  try {
    await fetchJSONBin(URL_SUMINISTROS, SUMINISTROS.API_KEY, "PUT", historial);
    console.log("✅ Historial guardado en línea");
  } catch {
    // Guardar pendientes si no se pudo subir
    pendientes = historial.slice();
    localStorage.setItem("pendientes", JSON.stringify(pendientes));
    mostrarToast("⚠️ No se pudo guardar en línea, datos guardados localmente");
  }
}

// Función para agregar un registro (uno o varios suministros)
async function agregarRegistro(registro) {
  historial.push(registro);
  localStorage.setItem("historial", JSON.stringify(historial));
  mostrarHistorial();

  try {
    await guardarHistorial();
  } catch {
    mostrarToast("⚠️ Registro pendiente de sincronización");
  }
}

function mostrarHistorial(filtro = "") {
  const resultado = document.getElementById("resultado");
  const contador = document.getElementById("contador");
  if (!resultado || !contador) return;
  resultado.innerHTML = "";

  // Filtrar registros
  const filtrados = historial.filter(r =>
    r.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    r.suministros.some(s => s.nombreSuministro.toLowerCase().includes(filtro.toLowerCase()))
  );

  contador.textContent = `Movimientos: ${filtrados.length}`;

  // Agrupar por fecha
  const gruposPorFecha = {};
  filtrados.forEach(r => {
    let fechaSolo;
    let horaSolo;

    // Si la fecha está en ISO, parseamos normalmente
    if (r.fechaISO) {
      const d = new Date(r.fechaISO);
      fechaSolo = d.toLocaleDateString();
      horaSolo = d.toLocaleTimeString();
    } else {
      // Si es formato antiguo "9/10/2025, 6:38:53 p.m."
      const partes = r.fecha.split(",");
      fechaSolo = partes[0]?.trim() || "";
      horaSolo = partes[1]?.trim() || "";
    }

    r._fechaSolo = fechaSolo; // guardar temporal para ordenar
    r._horaSolo = horaSolo;

    if (!gruposPorFecha[fechaSolo]) gruposPorFecha[fechaSolo] = [];
    gruposPorFecha[fechaSolo].push(r);
  });

  // Generar HTML
  resultado.innerHTML = Object.keys(gruposPorFecha)
    .sort((a, b) => new Date(b) - new Date(a)) // ordenar fechas descendente
    .map(fecha => {
      const registros = gruposPorFecha[fecha];
      return `
        <div class="fecha-grupo">
          <h3>${fecha}</h3>
          ${registros.map(r => `
            <div class="card">
              <strong>👤 ${r.nombre}</strong>
              <p>📦 ${r.suministros.map(s => `${s.nombreSuministro} (${s.cantidad})`).join(", ")}</p>
              <small>🕒 ${r._horaSolo}</small>
              <button onclick="eliminarRegistro(${historial.indexOf(r)})">❌</button>
            </div>
          `).join("")}
        </div>
      `;
    }).join("");
}

// Eliminar un registro específico
async function eliminarRegistro(index) {
  historial.splice(index, 1);
  localStorage.setItem("historial", JSON.stringify(historial));
  await guardarHistorial();
  mostrarHistorial();
  mostrarToast("🗑 Registro eliminado");
}

// Limpiar todo el historial
async function limpiarHistorial() {
  if (confirm("¿Deseas borrar todo el historial?")) {
    historial = [];
    pendientes = [];
    localStorage.setItem("historial", JSON.stringify([]));
    localStorage.setItem("pendientes", JSON.stringify([]));
    await guardarHistorial(); // esto borra todos los registros también del JSONBin
    mostrarHistorial();
    mostrarToast("🗑 Historial limpio");
  }
}

// Detectar cuando vuelve la conexión y sincronizar pendientes
window.addEventListener("online", async () => {
  if (pendientes.length > 0) {
    historial.push(...pendientes);
    await guardarHistorial();
    pendientes = [];
    localStorage.setItem("pendientes", JSON.stringify([]));
    mostrarToast("✅ Datos pendientes sincronizados");
    mostrarHistorial();
  }
});

// ===== REGISTRAR CON CHECKBOXES =====
const formSuministros = document.getElementById("formSuministros");
if (formSuministros) formSuministros.addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = document.getElementById("nombrePersona").value.trim();
  
  const suministrosSeleccionados = [];

  inventario.forEach(item => {
    const checkbox = document.getElementById(`cb-${item.nombre}`);
    const cantidadInput = document.querySelector(`.cantidad-suministro[data-suministro="${item.nombre}"]`);
    const cantidad = parseInt(cantidadInput?.value);

    if (checkbox?.checked && cantidad > 0) {
      suministrosSeleccionados.push({
        nombreSuministro: item.nombre,
        cantidad
      });
    }
  });

  if (suministrosSeleccionados.length === 0) {
    return mostrarToast("⚠️ Marca al menos un suministro con cantidad");
  }

  // Creamos un solo registro con todos los suministros seleccionados
  const registro = {
    nombre,
    fecha: new Date().toLocaleString(),
    suministros: suministrosSeleccionados
  };

  historial.push(registro);
  localStorage.setItem("historial", JSON.stringify(historial));
  await guardarHistorial();
  mostrarToast("✅ Registro guardado en el sevidor");

  e.target.reset();
  actualizarCheckboxes(); // refresca los checkboxes
  mostrarHistorial();
});

// ===== INVENTARIO =====
let inventario = [];
const URL_INVENTARIO = crearURL(INVENTARIO.BIN_ID);

async function cargarInventario() {
  try {
    const data = await fetchJSONBin(`${URL_INVENTARIO}/latest`, INVENTARIO.API_KEY);
    inventario = data.record || [];
    localStorage.setItem("inventario", JSON.stringify(inventario));
  } catch {
    inventario = JSON.parse(localStorage.getItem("inventario")) || [];
    mostrarToast("⚠️ Usando inventario local");
  }
  actualizarCheckboxes(); // <-- genera los checkboxes al cargar
}

async function guardarInventario() {
  try {
    await fetchJSONBin(URL_INVENTARIO, INVENTARIO.API_KEY, "PUT", inventario);
    console.log("✅ Inventario actualizado");
  } catch {
    mostrarToast("⚠️ No se pudo guardar inventario");
  }
}

function agregarSuministro() {
  const nuevoInput = document.getElementById("nuevoSuministro");
  if (!nuevoInput) return;
  const nuevo = nuevoInput.value.trim();
  if (!nuevo) return;
  inventario.push({ nombre: nuevo, fecha: new Date().toLocaleString() });
  localStorage.setItem("inventario", JSON.stringify(inventario));
  guardarInventario();
  actualizarCheckboxes(); // <-- refresca los checkboxes al agregar
  nuevoInput.value = "";
  mostrarToast(`"${nuevo}" agregado ✅`);
}

// ===== FUNCION PARA ACTUALIZAR CHECKBOXES =====
function actualizarCheckboxes() {
  const contenedor = document.getElementById("suministrosCheckboxes");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  inventario.forEach(item => {
    const div = document.createElement("div");
    div.className = "checkbox-cantidad";
    div.style.marginBottom = "8px";
    div.innerHTML = `
      <input type="checkbox" id="cb-${item.nombre}" value="${item.nombre}">
      <label for="cb-${item.nombre}">${item.nombre}</label>
      <input type="number" min="1" value="1" class="cantidad-suministro" data-suministro="${item.nombre}" style="width:60px; margin-left:8px;">
    `;
    contenedor.appendChild(div);
  });
}

// ===== BODEGUITA =====
let inventarioBodeguita = [];
const URL_BODEGUITA = crearURL(BODEGUITA.BIN_ID);

async function cargarInventarioBodeguita() {
  try {
    const data = await fetchJSONBin(`${URL_BODEGUITA}/latest`, BODEGUITA.API_KEY);
    inventarioBodeguita = data.record || [];
    localStorage.setItem(BODEGUITA.BIN_ID, JSON.stringify(inventarioBodeguita));
  } catch {
    inventarioBodeguita = JSON.parse(localStorage.getItem(BODEGUITA.BIN_ID)) || [];
    mostrarToast("⚠️ Usando inventario Bodeguita local");
  }
  mostrarInventarioBodeguita();
}

async function guardarInventarioBodeguita() {
  try {
    await fetchJSONBin(URL_BODEGUITA, BODEGUITA.API_KEY, "PUT", inventarioBodeguita);
    console.log("✅ Inventario Bodeguita actualizado");
  } catch {
    localStorage.setItem(BODEGUITA.BIN_ID, JSON.stringify(inventarioBodeguita));
    mostrarToast("⚠️ No se pudo guardar Bodeguita en línea, se guardó localmente");
  }
}

function mostrarInventarioBodeguita(filtro = "") {
  const contenedor = document.getElementById("resultadoInventarioBodeguita");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const filtroLower = filtro.toLowerCase();
  const filtrados = inventarioBodeguita.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(filtroLower)) ||
    (p.sku && p.sku.toLowerCase().includes(filtroLower))
  );

  filtrados.forEach(p => {
    const card = document.createElement("div");
    card.className = "card-inventario";
    card.innerHTML = `
      <img src="${p.imagen || 'img/default.png'}" alt="${p.nombre}">
      <h4>${p.nombre}</h4>
      <p><strong>SKU:</strong> ${p.sku}</p>
      <p><strong>Cantidad:</strong> ${p.cantidad}</p>
      <p><strong>Ubicación:</strong> ${p.ubicacion}</p>
      <small>🕒 ${p.fecha}</small>
    `;
    contenedor.appendChild(card);
  });
}

// Búsqueda Bodeguita
const busquedaBInput = document.getElementById("busquedaInventarioBodeguita");
if (busquedaBInput) busquedaBInput.addEventListener("input", e => {
  mostrarInventarioBodeguita(e.target.value);
});

// ===== INICIO =====
document.addEventListener("DOMContentLoaded", () => {
  cargarHistorial();
  cargarInventario();
  cargarInventarioBodeguita();
});
