const globe = Globe()
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .pointOfView({ lat: 0, lng: 0, altitude: 1 }, 0)
  (document.getElementById('globeViz'));

const satellites = {};
let sitios = {}
let arcsdata = [];
let showingRings = false;
let warnings = true;
let update = true;

document.getElementById("disableWarningsBtn").onclick = function() {
  warnings = !warnings;
};
document.getElementById("disableupdate").onclick = function() {
  update = !update;
};

const antenas = [
    {
        name: "Goldstone",
        lat: 35.42667,
        lng: -116.89000,
        altitude: 0.05,   
    },
    {
        name: "Madrid",
        lat: 40.43139,
        lng: -4.24806,
        altitude: 0.05,  
    },
    {
        name: "Canberra",
        lat: -35.40139,
        lng: 148.98167,
        altitude: 0.05,  
    }
];

const antenaparticles = antenas.map(antena => ({
    lat: antena.lat,
    lng: antena.lng,
    altitude: antena.altitude,
    name: antena.name,
    color: "red",  
}));


globe.pointsData(antenaparticles);  
globe.pointLabel(p => p.name);       
globe.pointAltitude(p => p.altitude);
globe.pointColor(p => p.color);      


// Actualizar globo con satélites
function updateGlobe(satellites,antenaparticles) {
    let particles = [];

    for (const key in satellites) {
        const sat = satellites[key];
        particles.push({
            lat: sat.position.lat,
            lng: sat.position.long,
            altitude: sat.altitude/6371, 
            name: sat.name,                
            satellite_id: sat.satellite_id,
            color: "green",
        });
    }
    globe.particlesData([particles]);
    globe.particlesSize(2);
    globe.particleLabel(p => p.name); 
    globe.particleAltitude(p => p.altitude);
}

function Arcos(arcsdata,site_lat,site_lon,deblat,deblon,sat_id){
  arcsdata.push({
    startLat: site_lat,
    startLng: site_lon,
    endLat: deblat,
    endLng: deblon,
    color: "Red",
    name: sat_id,
    
  });

  globe.arcsData(arcsdata);
  globe.arcColor(p=>p.color);
  globe.arcStroke(() => 1.2);
}

function launchsites(sites){
  const launchparticles = sites.map(site => ({
    lat: site.location.lat,
    lng: site.location.long,
    altitude:0.05,
    name: site.name,
    color: "orange",
    station_id: site.station_id
  }));
  const puntos = [...antenaparticles,...launchparticles];
  globe.pointsData(puntos);
  globe.pointLabel(p => p.name);       
  globe.pointAltitude(p => p.altitude);
  globe.pointColor(p => p.color);  
}

let tablaInicializada = false;
let filtroPaisSeleccionado = "";
let filtroMisionSeleccionada = "";

function actualizarinfopanel(satellites) {
  const infopanel = document.getElementById("infoPanel");

  if (!tablaInicializada) {
    infopanel.innerHTML = '<h2>Satélites en Órbita</h2>';

    const filterDiv = document.createElement("div");
    filterDiv.id = "filters";
    filterDiv.innerHTML = `
      <label>Filtrar por país:</label>
      <select id="filterCountry"><option value="">Todos</option></select>
      <label>Filtrar por misión:</label>
      <select id="filterMission"><option value="">Todas</option></select>
    `;
    infopanel.appendChild(filterDiv);

    const table = document.createElement("table");
    table.className = "satellite-table";
    table.id = "tablaSat";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Id</th>
          <th>País</th>
          <th>Misión</th>
          <th>Nombre</th>
          <th>Fecha lanzamiento</th>
          <th>Tipo</th>
          <th>Potencia</th>
          <th>Vida útil</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    infopanel.appendChild(table);
    document.getElementById("filterCountry").addEventListener("change", e => {
      filtroPaisSeleccionado = e.target.value;
      actualizarinfopanel(satellites);
    });
    document.getElementById("filterMission").addEventListener("change", e => {
      filtroMisionSeleccionada = e.target.value;
      actualizarinfopanel(satellites);
    });

    tablaInicializada = true;
  }

  const filterCountry = document.getElementById("filterCountry");
  const filterMission = document.getElementById("filterMission");

  const paises = new Set();
  const misiones = new Set();

  const satelitesEnOrbita = Object.values(satellites).filter(s => s.status === "in-orbit");

  satelitesEnOrbita.forEach(s => {
    if (s.organization?.country?.country_code) {
      paises.add(s.organization.country.country_code);
    }
    if (s.mission) {
      misiones.add(s.mission);
    }
  });

  const prevPais = filtroPaisSeleccionado;
  const prevMision = filtroMisionSeleccionada;

  filterCountry.innerHTML = '<option value="">Todos</option>';
  [...paises].forEach(code => {
    filterCountry.innerHTML += `<option value="${code}" ${code === prevPais ? 'selected' : ''}>${code}</option>`;
  });

  filterMission.innerHTML = '<option value="">Todas</option>';
  [...misiones].forEach(mission => {
    filterMission.innerHTML += `<option value="${mission}" ${mission === prevMision ? 'selected' : ''}>${mission}</option>`;
  });

  const filtered = satelitesEnOrbita.filter(sat => {
    const matchPais = !prevPais || sat.organization?.country?.country_code === prevPais;
    const matchMision = !prevMision || sat.mission === prevMision;
    return matchPais && matchMision;
  });

  filtered.sort((a, b) => a.altitude - b.altitude);

  const tbody = document.querySelector("#tablaSat tbody");
  tbody.innerHTML = "";

  filtered.forEach(sat => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sat.satellite_id}</td>
      <td>
        ${sat.organization?.country?.country_code ? 
          `<img src="https://flagcdn.com/w40/${sat.organization.country.country_code.toLowerCase()}.png" 
               alt="Flag of ${sat.organization.country.name}" width="30">` : 
          `<img src="https://flagcdn.com/w40/unknown.png" alt="Desconocido" width="30">`}
      </td>
      <td>${sat.mission || "N/A"}</td>
      <td>${sat.name || "N/A"}</td>
      <td>${sat.launch_date || "N/A"}</td>
      <td>${sat.type || "N/A"}</td>
      <td>${sat.power || "N/A"}</td>
      <td>${sat.lifespan || "N/A"}</td>
    `;
    tbody.appendChild(row);
  });
}

function Botonalcance() {
  const controlsDiv = document.getElementById("controls");

  const button = document.createElement("button");
  button.id = "BotonAlcance";
  button.textContent = "Mostrar zonas de cobertura";
  
  
  showingRings = false;

  button.addEventListener("click", () => {
    showingRings = !showingRings; 

    if (showingRings) {
      button.textContent = "Ocultar zonas de cobertura";
      MostrarAlcance(satellites);
    } else {
      button.textContent = "Mostrar zonas de cobertura";
      OcultarAlcance();
    }
  });

  controlsDiv.appendChild(button);
}

function MostrarAlcance(satellites) {
  let rings = [];

  for (const key in satellites) {
    const sat = satellites[key];

    if (sat.status === "in-orbit") {
      rings.push({
        lat: sat.position.lat,
        lng: sat.position.long,
        altitude: sat.altitude / 6371,
        maxradius: sat.power / 111,
        satellite_id: sat.satellite_id,
      });
    }
  }

  globe.ringsData(rings);
  globe.ringMaxRadius(p=>p.maxradius);
  globe.ringPropagationSpeed(20);
  globe.ringRepeatPeriod(100);
}

function OcultarAlcance() {
  globe.ringsData([]); 
}
const socket = new WebSocket('wss://tarea-2.2025-1.tallerdeintegracion.cl/connect');


window.onload = () => {
  Botonalcance();
};

globe.onParticleClick((particle) => {
  const satelite = satellites[particle.satellite_id];
  if (satelite) {
    MostrarInformacionSatelite(satelite);
  }
});

function MostrarInformacionSatelite(sat) {
  const infoTextElement = document.getElementById("infoTextSatelite");
  const infoDiv = document.getElementById("informacionSatelite");

  let html = `
    <h3>Satélite: ${sat.name}</h3>
    <p><strong>ID:</strong> ${sat.satellite_id}</p>
    <p><strong>Misión:</strong> ${sat.mission || "N/A"}</p>
    <p><strong>Organización:</strong> ${sat.organization?.name || "Desconocida"}</p>
    <p><strong>País:</strong> ${sat.organization?.country?.name || "Desconocido"}</p>
    <p><strong>Tipo:</strong> ${sat.type || "N/A"}</p>
    <p><strong>Potencia:</strong> ${sat.power || "N/A"}</p>
    <p><strong>Orbital period:</strong> ${sat.orbital_period || "N/A"}</p>
    <p><strong>Vida útil:</strong> ${sat.lifespan || "N/A"}</p>
    <p><strong>Origen lanzamiento:</strong> ${sat.launchsite_origin || "N/A"}</p>
    <p><strong>Fecha de lanzamiento:</strong> ${sat.launch_date || "N/A"}</p>
    <p><strong>Posición actual:</strong> (${sat.position.lat.toFixed(2)}, ${sat.position.long.toFixed(2)})</p>
    <p><strong>Altitud:</strong> ${sat.altitude || "N/A"}</p>
    <p><strong>Status:</strong> ${sat.status || "N/A"}</p>
    
  `;

  infoTextElement.innerHTML = html;
  infoDiv.style.display = "block"; 
  


  const closeBtn = infoDiv.querySelector(".close-btn");
  closeBtn.onclick = function() {
    infoDiv.style.display = "none";
  }

  window.onclick = function(event) {
    if (event.target === infoDiv) {
      infoDiv.style.display = "none";
    }
  }
}



globe.onPointClick((point) => {
  const clickedAntenna = antenas.find(antena => 
    antena.lat === point.lat && antena.lng === point.lng
  );

  if (clickedAntenna) {
    MostrarInformacionAntena(clickedAntenna);
  } 
  else {
    if (point.station_id) {
      const clickedCentro = sitios[point.station_id];

      if (clickedCentro) {
        MostrarInformacioncentro(clickedCentro);
      } else {
        console.log("No se encontró un sitio con el station_id:", point.station_id);
      }
    } else {
      console.log("El punto no tiene station_id asociado");
    }
  }
});

function MostrarInformacioncentro(centro) {
  const infoTextElement = document.getElementById("infoTextcentro");
  const infoDiv = document.getElementById("informacioncentro");

  let html = `
  <h3>Centro: ${centro.name}</h3>
  <p><strong>ID:</strong> ${centro.station_id}</p>
  <p><strong>País:</strong> ${centro.country?.name || "Desconocido"}</p>
  <p><strong>Ubicación:</strong> (${centro.location.lat.toFixed(2)}, ${centro.location.long.toFixed(2)})</p>
  <p><strong>Fecha de establecimiento:</strong> ${centro.date || "N/A"}</p>
  <p><strong>Descripción:</strong> ${centro.content || "Sin información disponible"}</p>
`;

  infoTextElement.innerHTML = html;
  infoDiv.style.display = "block"; 
  

 
  const closeBtn = infoDiv.querySelector(".close-btn");
  closeBtn.onclick = function() {
    infoDiv.style.display = "none";
  }

 
  window.onclick = function(event) {
    if (event.target === infoDiv) {
      infoDiv.style.display = "none";
    }
  }
}

function MostrarInformacionAntena(antena) {
  const infoTextElement = document.getElementById("infoText");
  const infoDiv = document.getElementById("informacionAntena");

  let cercanos = [];
  let cobertura = 0;
  for (const key in satellites) {
    if (satellites[key].status === "in-orbit") {
      let satelite = satellites[key];
      const R = 6371; 
      
      
      let lat1 = parseFloat(satelite.position.lat);
      let lon1 = parseFloat(satelite.position.long);
      let lat2 = parseFloat(antena.lat);
      let lon2 = parseFloat(antena.lng);

      const rad = Math.PI / 180;
      const dLat = (lat2 - lat1) * rad;
      const dLon = (lon2 - lon1) * rad;

     
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distancia = R * c;

      
      if (distancia <= satelite.power) {
        let porcentaje = distancia/satelite.power;
        let sumar = 1-porcentaje;
        cobertura = cobertura + sumar;
        cercanos.push(satelite);
      }
    }
  }

  cobertura = cobertura * 100
  cobertura = cobertura.toFixed(2)

  let info = `
  <strong>Nombre:</strong> ${antena.name}<br>
  <strong>Latitud:</strong> ${antena.lat}<br>
  <strong>Longitud:</strong> ${antena.lng}<br>
  <br>
  <strong>Esta antena recibe una señal de:</strong> ${cobertura}%<br>
  <br>
  <strong>Satellites cercanos:</strong>
`;

  if (cercanos.length === 0) {
    info += "No hay satélites cercanos en este momento.";
  } else {
    info += "<ul>";
    cercanos.forEach(sat => {
      info += `<li>${sat.name}</li>`;
    });
    info += "</ul>";
  }

  infoTextElement.innerHTML = info;


  infoDiv.style.display = "block";

  const closeBtn = document.querySelector(".close-btn");
  closeBtn.onclick = function() {
    infoDiv.style.display = "none";
  }


  window.onclick = function(event) {
    if (event.target === infoDiv) {
      infoDiv.style.display = "none";
    }
  }
}

function agregaralchat(mensaje, emisor, fecha, level) {
  const chatMessages = document.getElementById("chat-messages");

  const nuevoMensaje = document.createElement("div");
  nuevoMensaje.classList.add("mensaje-chat");

  
  if (emisor === "Cristobal Iturriaga"){
    nuevoMensaje.innerHTML = `
     <br><span style="color: blue; font-size: 12px;">[${fecha}]</span><br>
      <br><span style="color: green; font-size: 12px;">YO: ${mensaje}</span><br>
    `;
  }
  else if (level === "warn"){
    nuevoMensaje.innerHTML = `
    <strong>${emisor}</strong> 
    <span style="color: blue; font-size: 12px;">[${fecha}]</span><br>
    <span style="color: red;">${mensaje}</span>
  `;
  }
  else {
  nuevoMensaje.innerHTML = `
    <strong>${emisor}</strong> <span style="color: blue; font-size: 12px;">[${fecha}]</span><br>
    ${mensaje}
  `;
  }
 
  chatMessages.appendChild(nuevoMensaje);

  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById("chat-send").addEventListener("click", () => {
  const input = document.getElementById("chat-input");
  const mensaje = input.value.trim();

  if (mensaje !== "") {
    const emisor = "Cristobal Iturriaga"; 
    const fecha = new Date().toLocaleString();
    const level = "info";
    const egg = false;

  
    agregaralchat(mensaje, emisor, fecha, level);

    if (typeof socket !== "undefined") {
      socket.send(JSON.stringify({
        type: "COMM",
        message:{
          station_id: "Cristobal Iturriaga",
          name: "Cristobal Iturriaga",
          level: "info",
          date: new Date(),
          content: mensaje,
        }
      }));
    }
    input.value = "";

    let corte = mensaje.substring(0, 8);
    let corte_2 = mensaje.substring(0,6);
    let resto = mensaje.substring(9).trim();
    if (corte === "/destroy"){
      socket.send(JSON.stringify({type: "DESTROY",
        satellite_id: resto
      }));

    }
    else if (corte_2 === "/power"){
      let argumentos = resto.split(" ");
      let satellite_id = argumentos[0];
      let power = argumentos[1];
      if (satellites[satellite_id].power > power){
        socket.send(JSON.stringify({type: "CHANGE-POWER",
          amount: power,
          direction: "DOWN",
        }));
      }
      else {
        socket.send(JSON.stringify({type: "CHANGE-POWER",
          amount: power,
          direction: "UP",
        }));
      }
    }
  }
});


socket.onopen = () => {
  console.log('Conexión establecida con el websocket');
  socket.send(JSON.stringify({
    type: "AUTH",
    name: "Cristobal Iturriaga",
    student_number: "19625596"
  }));
  actualizarinfopanel(satellites);

};
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "POSITION_UPDATE"){
      if (update){
          console.log(data);
          Object.values(satellites).forEach(sat => {
          const id = sat.satellite_id;
          socket.send(JSON.stringify({
            type: "SATELLITE-STATUS",
            satellite_id: id
          }));
        });
      }
    }

    if (data.type === "AUTH"){
        console.log ("AUTH");
        socket.send(JSON.stringify({ type: "SATELLITES" }));
        socket.send(JSON.stringify({ type: "LAUNCHSITES"}));

    }
  
    if (data.type === "SATELLITES") {
        console.log ("SATELLITES");
      data.satellites.forEach(satellite => {
        socket.send(JSON.stringify({type: "SATELLITE-STATUS",
            satellite_id: satellite
          }));
      });
    }

    if (data.type === "SATELLITE-STATUS") {
        console.log ("SATELLITE-STATUS");
        let satellite = data.satellite;
        satellites[satellite.satellite_id] = satellite;
        
        updateGlobe(satellites,antenaparticles);
        actualizarinfopanel(satellites);
        const boton = document.getElementById("BotonAlcance");
        if (boton && boton.textContent === "Ocultar zonas de cobertura") {
     
          MostrarAlcance(satellites);
        }


    }

    if (data.type === "LAUNCHSITES"){
        let sites = data.launchsites;
        launchsites(sites);
        sitios = Object.fromEntries(sites.map(site => [site.station_id, site]));
        

    }

    if (data.type === "LAUNCH") {
      let sat_id = data.satellite_id;
      let site_id = data.launchsite_id;
      let deblat = data.debris_site.lat;
      let deblon = data.debris_site.long;
      
    
      if (sitios[site_id]) {
        let site_lat = sitios[site_id].location.lat;
        let site_lon = sitios[site_id].location.long;

        if (warnings){
          globe.pointOfView({ lat: site_lat, lng: site_lon, altitude: 2 }, 1000)
          document.getElementById("lanzamiento").style.display = "block";

          document.getElementById("satelliteInfo").innerHTML = `
          <strong>Satélite:</strong> ${sat_id} <br>
          <strong>Coordenadas:</strong> (${site_lat},${site_lon}) <br>
        `;

   
        setTimeout(() => {
          document.getElementById("lanzamiento").style.display = "none";
        }, 2000);
        }
        setTimeout(() => {
          Arcos(arcsdata,site_lat,site_lon,deblat,deblon,sat_id);
        }, 3000);

      } else {
        console.warn(`No se encontró sitio para el ID: ${site_id}`);
      }
    }

    if (data.type === "IN-ORBIT"){
      let ide = data.satellite_id;
      let altitude = data.altitude;
      socket.send(JSON.stringify({type: "SATELLITE-STATUS",
        satellite_id: ide
      }));

      arcsdata = arcsdata.filter(arc => arc.name !== ide);
      globe.arcsData(arcsdata); 
    }

    if (data.type === "COMM") {
      let mensaje = "Mensaje con formato erroneo (diferente al enunciado)";
      let emisor = "Desconocido";
      let fecha = new Date();
      let level = "warn";
      let egg = false;
    
      if (data.easter_egg) {
        mensaje = data.message;
        emisor = data.satellite_id;
        fecha = new Date();
        level = "info";
        egg = true;
      } else {
        mensaje = data.content;
        emisor = data.station_id;
        fecha = data.date;
        level = data.level;
        egg = false;
      }
    
      agregaralchat(mensaje, emisor, fecha, level);
    }

    if (data.type === "DEORBITING"){
      let sat_id = data.satellite_id;
      delete satellites[sat_id];
      socket.send(JSON.stringify({type: "SATELLITE-STATUS",satellite_id: sat_id}))

    }
    
    if (data.type === "POWER-DOWN"){
      console.log("powerdownnnnnnnnn")
      let sat_id = data.satellite_id;
      let amount = data.amount;
      console.log(satellites[sat_id].power)
      console.log(amount);
      satellites[sat_id].power = satellites[sat_id].power - amount;
      socket.send(JSON.stringify({type: "SATELLITE-STATUS",
              satellite_id: sat_id}));
      console.log(satellites[sat_id].power)

    }

    if (data.type === "POWER-UP"){
      console.log("powerUUPPPPPPP")
      let sat_id = data.satellite_id;
      let amount = data.amount;
      console.log(satellites[sat_id].power)
      console.log(amount);
      satellites[sat_id].power = satellites[sat_id].power + amount;
      socket.send(JSON.stringify({type: "SATELLITE-STATUS",
              satellite_id: sat_id}));
      console.log(satellites[sat_id].power)

    }
    if (data.type === "CATASTROPHIC-FAILURE"){
      console.log("FALLAAAAAAAAA");
      let sat_id = data.satellite_id;
      if (warnings){
        document.getElementById("FALLA").style.display = "block";

        document.getElementById("satelliteInform").innerHTML = `
        <strong>Satélite:</strong> ${sat_id} <br>
        <strong>Ha sufrido una falla catastrofica</strong> 
      `;

 
      setTimeout(() => {
        document.getElementById("FALLA").style.display = "none";
      }, 20000);
      }
      setTimeout(() => {
      
        socket.send(JSON.stringify({type: "SATELLITE-STATUS",
          satellite_id: sat_id}));
      }, 3000);
    }

  };

socket.onerror = (error) => {
  console.error('Error en la conexión:', error);
};

socket.onclose = () => {
  console.log('Conexión Websocket cerrada');
};