let ranges = [
  { name: "Past hour", feed: "all_hour" },
  { name: "Past day", feed: "all_day" },
  { name: "Past week", feed: "all_week" }
];

let currentRange = ranges[1];
let earthquakes = [];
let selectedId = "";
let secondsLeft = 60;

let slider = document.querySelector("#mag-slider");

for (let i = 0; i < ranges.length; i++) {
  let button = document.createElement("button");
  button.textContent = ranges[i].name;
  if (ranges[i] == currentRange) {
    button.className = "selected";
  }
  button.addEventListener("click", function () {
    currentRange = ranges[i];
    let buttons = document.querySelectorAll("#range-buttons button");
    for (let j = 0; j < buttons.length; j++) {
      buttons[j].className = "";
    }
    button.className = "selected";
    getEarthquakes();
  });
  document.querySelector("#range-buttons").appendChild(button);
}

drawGrid();

function drawGrid() {
  let grid = document.querySelector("#grid");

  for (let lat = -60; lat <= 60; lat = lat + 30) {
    let line = document.createElement("div");
    line.className = "grid-line";
    if (lat == 0) {
      line.className = "grid-line equator";
    }
    line.style.left = "0";
    line.style.width = "100%";
    line.style.height = "1px";
    line.style.top = (90 - lat) / 180 * 100 + "%";
    grid.appendChild(line);

    let label = document.createElement("span");
    label.className = "grid-label";
    label.textContent = lat + "°";
    label.style.left = "0";
    label.style.top = (90 - lat) / 180 * 100 + "%";
    grid.appendChild(label);
  }

  for (let lon = -120; lon <= 120; lon = lon + 60) {
    let line = document.createElement("div");
    line.className = "grid-line";
    line.style.top = "0";
    line.style.height = "100%";
    line.style.width = "1px";
    line.style.left = (lon + 180) / 360 * 100 + "%";
    grid.appendChild(line);
  }
}

async function getEarthquakes() {
  let apiURL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/" + currentRange.feed + ".geojson";

  document.querySelector("#updated").textContent = "Loading...";

  try {
    const response = await fetch(apiURL);
    if (!response.ok) {
      throw new Error("Request failed");
    }
    const data = await response.json();
    console.log(data);

    earthquakes = [];
    for (let i = 0; i < data.features.length; i++) {
      let feature = data.features[i];
      if (feature.properties.mag != null) {
        earthquakes.push({
          id: feature.id,
          mag: feature.properties.mag,
          place: feature.properties.place,
          time: feature.properties.time,
          url: feature.properties.url,
          lon: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
          depth: feature.geometry.coordinates[2]
        });
      }
    }

    showEverything();
    secondsLeft = 60;
  } catch (error) {
    console.error("Error:", error);
    document.querySelector("#updated").textContent = "Could not load earthquakes. (" + error.message + ")";
  }
}

slider.addEventListener("input", function () {
  showEverything();
});

window.addEventListener("resize", function () {
  showEverything();
});

function showEverything() {
  let minimum = Number(slider.value);
  if (minimum == 0) {
    document.querySelector("#mag-label").textContent = "all";
  } else {
    document.querySelector("#mag-label").textContent = minimum + " and above";
  }

  let visible = [];
  for (let i = 0; i < earthquakes.length; i++) {
    if (earthquakes[i].mag >= minimum) {
      visible.push(earthquakes[i]);
    }
  }

  drawQuakes(visible);
  showStats(visible);
  showList(visible);
}

function depthClass(depth) {
  if (depth < 70) {
    return "shallow";
  } else if (depth < 300) {
    return "middle";
  } else {
    return "deep";
  }
}

function minutesAgo(time) {
  return Math.round((Date.now() - time) / 60000);
}

function timeText(time) {
  let minutes = minutesAgo(time);
  if (minutes < 60) {
    return minutes + " min ago";
  } else if (minutes < 1440) {
    return Math.round(minutes / 60) + " h ago";
  } else {
    return Math.round(minutes / 1440) + " days ago";
  }
}

function drawQuakes(list) {
  let layer = document.querySelector("#quakes");
  layer.innerHTML = "";

  let scale = document.querySelector("#map").offsetWidth / 1000;

  for (let i = list.length - 1; i >= 0; i--) {
    let quake = list[i];
    let dot = document.createElement("div");

    let size = (quake.mag * quake.mag * 1.2 + 4) * scale;
    if (size > 60 * scale) {
      size = 60 * scale;
    }
    if (size < 3) {
      size = 3;
    }

    dot.className = "quake " + depthClass(quake.depth);
    if (minutesAgo(quake.time) < 60) {
      dot.className = dot.className + " pulse";
    }
    if (quake.id == selectedId) {
      dot.className = dot.className + " selected-quake";
    }

    dot.id = "dot-" + quake.id;
    dot.style.width = size + "px";
    dot.style.height = size + "px";
    dot.style.left = (quake.lon + 180) / 360 * 100 + "%";
    dot.style.top = (90 - quake.lat) / 180 * 100 + "%";
    dot.title = "M" + quake.mag + ", " + quake.place;

    dot.addEventListener("click", function () {
      selectQuake(quake);
    });

    layer.appendChild(dot);
  }
}

function showStats(list) {
  document.querySelector("#total").textContent = list.length;

  if (list.length == 0) {
    document.querySelector("#strongest").textContent = "--";
    document.querySelector("#average").textContent = "--";
    document.querySelector("#recent").textContent = "--";
    document.querySelector("#strongest-place").textContent = "";
    return;
  }

  let strongest = list[0];
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total = total + list[i].mag;
    if (list[i].mag > strongest.mag) {
      strongest = list[i];
    }
  }

  document.querySelector("#strongest").textContent = "M" + strongest.mag.toFixed(1);
  document.querySelector("#average").textContent = (total / list.length).toFixed(1);
  document.querySelector("#recent").textContent = timeText(list[0].time);
  document.querySelector("#strongest-place").textContent = "(" + strongest.place + ", " + timeText(strongest.time) + ")";
}

function showList(list) {
  let table = document.querySelector("#list");
  table.innerHTML = "";

  let amount = list.length;
  if (amount > 50) {
    amount = 50;
  }

  for (let i = 0; i < amount; i++) {
    let quake = list[i];

    let row = document.createElement("tr");
    row.innerHTML = "<td>" + quake.mag.toFixed(1) + "</td>" +
      "<td>" + quake.place + "</td>" +
      "<td>" + timeText(quake.time) + "</td>";

    row.addEventListener("click", function () {
      selectQuake(quake);
    });
    table.appendChild(row);
  }
}

function selectQuake(quake) {
  let old = document.querySelector(".selected-quake");
  if (old != null) {
    old.className = old.className.replace(" selected-quake", "");
  }

  selectedId = quake.id;
  let dot = document.querySelector("#dot-" + quake.id);
  if (dot != null) {
    dot.className = dot.className + " selected-quake";
  }

  let date = new Date(quake.time);

  document.querySelector("#details").innerHTML =
    "<p>Magnitude " + quake.mag.toFixed(1) + ", " + quake.place + "</p>" +
    "<p>Time: " + date.toLocaleString() + " (" + timeText(quake.time) + ")</p>" +
    "<p>Depth: " + quake.depth.toFixed(1) + " km</p>" +
    "<p><a href='" + quake.url + "' target='_blank'>View on the USGS website</a></p>";
}

setInterval(function () {
  secondsLeft = secondsLeft - 1;
  if (secondsLeft <= 0) {
    getEarthquakes();
  } else {
    document.querySelector("#updated").textContent = "Next update in " + secondsLeft + " seconds.";
  }
}, 1000);

getEarthquakes();
