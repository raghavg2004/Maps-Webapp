const apiKey = "aTl05qc2xYjPcX3mqqaQMAc2sNzskh_502E0Y4d-DdE"; // Replace with your actual API key
// Initialize platform
const platform = new H.service.Platform({
    apikey: apiKey
});

// Create default layers
const defaultLayers = platform.createDefaultLayers();
const map = new H.Map(
    document.getElementById("mapContainer"),
    defaultLayers.vector.normal.map,
    {
        zoom: 14,
        center: { lat: 30.7333, lng: 76.7794 } // Default to Chandigarh
    }
);
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
const ui = H.ui.UI.createDefault(map, defaultLayers);

let userLocation = null;
let routeLine = null;
let navigationEnabled = false;

// Get user's current location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Center map to user's location
            map.setCenter(userLocation);

            // Add a marker for user's location
            const userMarker = new H.map.Marker(userLocation);
            map.addObject(userMarker);

            // Set default origin to user's location
            document.getElementById("origin").value = `${userLocation.lat}, ${userLocation.lng}`;
        },
        (error) => {
            console.error("Error fetching user's location:", error);
            alert("Unable to fetch current location. Default location will be used.");
        }
    );
} else {
    alert("Geolocation is not supported by your browser.");
}
// Function to geocode location (either address or coordinates)
async function geocode(location) {
    const geocoder = platform.getSearchService();
    return new Promise((resolve, reject) => {
        // Check if location is already in lat, lng format
        const coords = location.split(",");
        if (coords.length === 2) {
            const lat = parseFloat(coords[0].trim());
            const lng = parseFloat(coords[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) {
                // If valid coordinates, return them directly
                resolve({ lat, lng });
                return;
            }
        }

        // Otherwise, geocode the address
        geocoder.geocode(
            { q: location },
            (result) => {
                if (result.items.length > 0) {
                    resolve(result.items[0].position); // Return first result
                } else {
                    reject("No results found");
                }
            },
            (error) => reject(error)
        );
    });
}

// Function to calculate and display the route
function calculateRoute(origin, destination) {
    const router = platform.getRoutingService(null, 8);

    const routeRequestParams = {
        routingMode: "fast",
        transportMode: "car",
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        return: "polyline,turnByTurnActions,actions,instructions"
    };

    router.calculateRoute(routeRequestParams, (result) => {
        if (result.routes.length) {
            const route = result.routes[0];
            const lineString = H.geo.LineString.fromFlexiblePolyline(route.sections[0].polyline);

            // Clear existing objects
            map.getObjects().forEach((obj) => map.removeObject(obj));

            // Display the route on the map
            routeLine = new H.map.Polyline(lineString, {
                style: { strokeColor: "green", lineWidth: 5 }
            });
            map.addObject(routeLine);

            // Add markers for origin and destination
            const originMarker = new H.map.Marker(origin);
            const destinationMarker = new H.map.Marker(destination);
            map.addObject(originMarker);
            map.addObject(destinationMarker);

            // Zoom to fit the route
            map.getViewModel().setLookAtData({
                bounds: routeLine.getBoundingBox()
            });

            // Enable Start Navigation button
            document.getElementById("startNav").disabled = false;
        }
    }, (error) => {
        console.error("Error calculating route:", error);
    });
}

// Event listener for search button
document.getElementById("searchButton").addEventListener("click", async () => {
    const originInput = document.getElementById("origin").value;
    const destinationInput = document.getElementById("destination").value;

    try {
        const originCoords = await geocode(originInput);
        const destinationCoords = await geocode(destinationInput);

        calculateRoute(originCoords, destinationCoords);
    } catch (error) {
        console.error("Error finding location:", error);
        alert("Unable to find one or both locations. Please try again.");
    }
});

// Start navigation
document.getElementById("startNav").addEventListener("click", () => {
    if (!routeLine) {
        alert("Please search for a route first.");
        return;
    }

    navigationEnabled = true;
    document.getElementById("startNav").disabled = true;
    document.getElementById("stopNav").disabled = false;

    // Simulated navigation (move marker along the route)
    const lineString = routeLine.getGeometry();
    const points = lineString.getLatLngAltArray();
    let index = 0;

    const interval = setInterval(() => {
        if (!navigationEnabled || index >= points.length) {
            clearInterval(interval);
            return;
        }

        const [lat, lng] = points.slice(index, index + 2);
        const marker = new H.map.Marker({ lat, lng });
        map.addObject(marker);
        map.setCenter({ lat, lng });

        index += 3; // Adjust speed of navigation by changing step size
    }, 1000);
});

// Stop navigation
document.getElementById("stopNav").addEventListener("click", () => {
    navigationEnabled = false;
    document.getElementById("startNav").disabled = false;
    document.getElementById("stopNav").disabled = true;
});
