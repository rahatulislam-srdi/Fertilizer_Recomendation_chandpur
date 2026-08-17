const map = L.map('map').setView([23.2333, 90.6667], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const northArrow = L.control({ position: 'topright' });
northArrow.onAdd = function () {
    const div = L.DomUtil.create('div', 'north-arrow-control');
    div.innerHTML = `<span style="font-size:16px; display:block; line-height:1;">⬆</span><span style="font-size:10px; color:#64748b;">N</span>`;
    return div;
};
northArrow.addTo(map);

let currentMode = 'old';
let currentLayerKey = null;
let geojsonData = null;
let geojsonLayer = null;
let activeChartInstance = null;
let selectedFeature = null; // Full feature object
let legendControl = null;
let layerMap = new Map();

const nutrientRanges = {
    'Nitrogen': [
        { label: 'Very Low (0.01 - 0.09)', max: 0.09, color: '#d73027' },
        { label: 'Low (0.091 - 0.18)', max: 0.18, color: '#f46d43' },
        { label: 'Moderate (0.181 - 0.27)', max: 0.27, color: '#fee08b' },
        { label: 'Optimum (0.271 - 0.36)', max: 0.36, color: '#d9ef8b' },
        { label: 'High (0.361 - 0.45)', max: 0.45, color: '#66bd63' },
        { label: 'Very High (> 0.45)', max: Infinity, color: '#1a9850' }
    ],
    'Phosphorus': [
        { label: 'Very Low (0.01 - 5.25)', max: 5.25, color: '#d73027' },
        { label: 'Low (5.26 - 10.5)', max: 10.5, color: '#f46d43' },
        { label: 'Moderate (10.51 - 15.75)', max: 15.75, color: '#fee08b' },
        { label: 'Optimum (15.76 - 21.0)', max: 21.0, color: '#d9ef8b' },
        { label: 'High (21.1 - 26.25)', max: 26.25, color: '#66bd63' },
        { label: 'Very High (> 26.25)', max: Infinity, color: '#1a9850' }
    ],
    'Potassium': [
        { label: 'Very Low (0.01 - 0.09)', max: 0.09, color: '#d73027' },
        { label: 'Low (0.091 - 0.18)', max: 0.18, color: '#f46d43' },
        { label: 'Moderate (0.181 - 0.27)', max: 0.27, color: '#fee08b' },
        { label: 'Optimum (0.271 - 0.36)', max: 0.36, color: '#d9ef8b' },
        { label: 'High (0.361 - 0.45)', max: 0.45, color: '#66bd63' },
        { label: 'Very High (> 0.45)', max: Infinity, color: '#1a9850' }
    ],
    'Sulphur': [
        { label: 'Very Low (0.01 - 7.5)', max: 7.5, color: '#d73027' },
        { label: 'Low (7.51 - 15.0)', max: 15.0, color: '#f46d43' },
        { label: 'Moderate (15.1 - 22.5)', max: 22.5, color: '#fee08b' },
        { label: 'Optimum (22.51 - 30.0)', max: 30.0, color: '#d9ef8b' },
        { label: 'High (30.1 - 37.5)', max: 37.5, color: '#66bd63' },
        { label: 'Very High (> 37.5)', max: Infinity, color: '#1a9850' }
    ],
    'Zinc': [
        { label: 'Very Low (0.01 - 0.45)', max: 0.45, color: '#d73027' },
        { label: 'Low (0.451 - 0.9)', max: 0.9, color: '#f46d43' },
        { label: 'Moderate (0.91 - 1.35)', max: 1.35, color: '#fee08b' },
        { label: 'Optimum (1.351 - 1.8)', max: 1.8, color: '#d9ef8b' },
        { label: 'High (1.801 - 2.25)', max: 2.25, color: '#66bd63' },
        { label: 'Very High (> 2.25)', max: Infinity, color: '#1a9850' }
    ],
    'Boron': [
        { label: 'Very Low (0.01 - 0.15)', max: 0.15, color: '#d73027' },
        { label: 'Low (0.151 - 0.3)', max: 0.3, color: '#f46d43' },
        { label: 'Moderate (0.301 - 0.45)', max: 0.45, color: '#fee08b' },
        { label: 'Optimum (0.451 - 0.6)', max: 0.6, color: '#d9ef8b' },
        { label: 'High (0.601 - 0.75)', max: 0.75, color: '#66bd63' },
        { label: 'Very High (> 0.75)', max: Infinity, color: '#1a9850' }
    ],
    'Calcium': [
        { label: 'Very Low (0.01 - 1.5)', max: 1.5, color: '#d73027' },
        { label: 'Low (1.51 - 3.0)', max: 3.0, color: '#f46d43' },
        { label: 'Moderate (3.01 - 4.5)', max: 4.5, color: '#fee08b' },
        { label: 'Optimum (4.51 - 6.0)', max: 6.0, color: '#d9ef8b' },
        { label: 'High (6.01 - 7.5)', max: 7.5, color: '#66bd63' },
        { label: 'Very High (> 7.5)', max: Infinity, color: '#1a9850' }
    ],
    'Magnesium': [
        { label: 'Very Low (0.01 - 0.375)', max: 0.375, color: '#d73027' },
        { label: 'Low (0.376 - 0.75)', max: 0.75, color: '#f46d43' },
        { label: 'Moderate (0.751 - 1.125)', max: 1.125, color: '#fee08b' },
        { label: 'Optimum (1.1256 - 1.5)', max: 1.5, color: '#d9ef8b' },
        { label: 'High (1.501 - 1.875)', max: 1.875, color: '#66bd63' },
        { label: 'Very High (> 1.875)', max: Infinity, color: '#1a9850' }
    ],
    'pH': [
        { label: 'Extremely Acidic (0 - 4.5)', max: 4.5, color: '#a50026' },
        { label: 'Highly Acidic (4.51 - 5.5)', max: 5.5, color: '#d73027' },
        { label: 'Slightly Acidic (5.51 - 6.5)', max: 6.5, color: '#fee08b' },
        { label: 'Neutral (6.6 - 7.3)', max: 7.3, color: '#1a9850' },
        { label: 'Slightly Alkaline (7.4 - 8.4)', max: 8.4, color: '#67a9cf' },
        { label: 'Highly Alkaline (8.5 - 9.0)', max: 9.0, color: '#02818a' },
        { label: 'Extremely Alkaline (> 9.0)', max: Infinity, color: '#014636' }
    ],
    'OM': [
        { label: 'Extremely Low (0 - 1.0)', max: 1.0, color: '#d73027' },
        { label: 'Low (1.01 - 1.7)', max: 1.7, color: '#f46d43' },
        { label: 'Moderate (1.71 - 3.4)', max: 3.4, color: '#fee08b' },
        { label: 'High (3.41 - 5.5)', max: 5.5, color: '#66bd63' },
        { label: 'Extremely High (> 5.5)', max: Infinity, color: '#1a9850' }
    ],
    'Texture': [
        { label: 'Clay (1)', val: 1, color: '#8c510a' },
        { label: 'Clay Loam (2)', val: 2, color: '#d8b365' },
        { label: 'Loam (3)', val: 3, color: '#5ab4ac' },
        { label: 'Sandy Loam (4)', val: 4, color: '#01665e' }
    ]
};

// Comprehensive Crops List
const cropCategories = {
    grains: [
        { id: 'boro_hyv', name: 'Boro Rice (HYV / উফশী বোরো)', N: 160, P: 25, K: 80, S: 15, Zn: 3, B: 1 },
        { id: 'boro_hybrid', name: 'Boro Rice (Hybrid / হাইব্রিড বোরো)', N: 180, P: 30, K: 90, S: 18, Zn: 3.5, B: 1 },
        { id: 'aman_hyv', name: 'T. Aman Rice (HYV / উফশী আমন)', N: 90, P: 15, K: 50, S: 10, Zn: 1.5, B: 0 },
        { id: 'aman_hybrid', name: 'T. Aman Rice (Hybrid / হাইব্রিড আমন)', N: 110, P: 20, K: 60, S: 12, Zn: 2, B: 0.5 },
        { id: 'aus_hyv', name: 'Aus Rice (HYV / উফশী আউশ)', N: 80, P: 12, K: 40, S: 8, Zn: 1, B: 0 },
        { id: 'wheat', name: 'Wheat (গম)', N: 120, P: 30, K: 70, S: 15, Zn: 2.5, B: 1 },
        { id: 'maize_hybrid', name: 'Maize (Hybrid / ভুট্টা)', N: 220, P: 50, K: 100, S: 25, Zn: 5, B: 1.5 },
        { id: 'kaon', name: 'Cheena / Kaon (চীনা / কাউন)', N: 50, P: 10, K: 25, S: 6, Zn: 1, B: 0 }
    ],
    vegetables: [
        { id: 'potato', name: 'Potato (আলু)', N: 180, P: 40, K: 140, S: 20, Zn: 4, B: 1.5 },
        { id: 'sweet_potato', name: 'Sweet Potato (মিষ্টি আলু)', N: 80, P: 20, K: 90, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'brinjal', name: 'Brinjal (বেগুন)', N: 150, P: 45, K: 100, S: 18, Zn: 3, B: 1.5 },
        { id: 'tomato', name: 'Tomato (টমেটো)', N: 140, P: 40, K: 110, S: 16, Zn: 3, B: 1.2 },
        { id: 'cabbage', name: 'Cabbage (বাঁধাকপি)', N: 160, P: 50, K: 120, S: 20, Zn: 4, B: 1.5 },
        { id: 'cauliflower', name: 'Cauliflower (ফুলকপি)', N: 170, P: 55, K: 125, S: 22, Zn: 4, B: 2.0 },
        { id: 'radish', name: 'Radish (মুলা)', N: 100, P: 25, K: 70, S: 12, Zn: 2, B: 1.0 },
        { id: 'carrot', name: 'Carrot (গাজর)', N: 110, P: 30, K: 80, S: 12, Zn: 2, B: 1.0 },
        { id: 'okra', name: 'Okra / Lady\'s Finger (ঢেঁড়শ)', N: 100, P: 25, K: 60, S: 10, Zn: 2, B: 1.0 },
        { id: 'pointed_gourd', name: 'Pointed Gourd (পটল)', N: 120, P: 30, K: 80, S: 12, Zn: 2, B: 1.0 },
        { id: 'bitter_gourd', name: 'Bitter Gourd (করলা / উচ্ছে)', N: 110, P: 30, K: 70, S: 12, Zn: 2, B: 1.0 },
        { id: 'bottle_gourd', name: 'Bottle Gourd (লাউ)', N: 90, P: 25, K: 60, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'pumpkin', name: 'Pumpkin (মিষ্টি কুমড়া)', N: 85, P: 25, K: 60, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'cucumber', name: 'Cucumber (শসা)', N: 100, P: 30, K: 70, S: 10, Zn: 2, B: 1.0 },
        { id: 'ridge_gourd', name: 'Ridge Gourd (ঝিঙ্গা)', N: 90, P: 25, K: 60, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'yardlong_bean', name: 'Yardlong Bean (বরবটি)', N: 40, P: 25, K: 35, S: 8, Zn: 1.5, B: 0.8 },
        { id: 'country_bean', name: 'Country Bean (শিম)', N: 30, P: 25, K: 30, S: 8, Zn: 1.5, B: 0.8 },
        { id: 'red_amaranth', name: 'Red Amaranth (লাল শাক)', N: 70, P: 15, K: 40, S: 8, Zn: 1, B: 0.5 },
        { id: 'spinach', name: 'Spinach (পালং শাক)', N: 80, P: 20, K: 50, S: 10, Zn: 1, B: 0.5 }
    ],
    pulses: [
        { id: 'lentil', name: 'Lentil (মসুর ডাল)', N: 25, P: 20, K: 20, S: 10, Zn: 1.5, B: 1.0 },
        { id: 'chickpea', name: 'Chickpea (ছোলা)', N: 20, P: 20, K: 20, S: 10, Zn: 1.5, B: 1.0 },
        { id: 'mungbean', name: 'Mungbean (মুগ ডাল)', N: 20, P: 18, K: 20, S: 8, Zn: 1.5, B: 0.8 },
        { id: 'blackgram', name: 'Blackgram (মাষকলাই)', N: 20, P: 18, K: 20, S: 8, Zn: 1.5, B: 0.8 },
        { id: 'cowpea', name: 'Cowpea (ফেলন ডাল)', N: 20, P: 20, K: 20, S: 8, Zn: 1.5, B: 0.8 },
        { id: 'grasspea', name: 'Grasspea / Khesari (খেসারী ডাল)', N: 15, P: 18, K: 15, S: 8, Zn: 1.0, B: 0.5 }
    ],
    oils: [
        { id: 'mustard', name: 'Mustard (সরিষা)', N: 100, P: 30, K: 60, S: 20, Zn: 2, B: 1 },
        { id: 'sesame', name: 'Sesame (তিল)', N: 60, P: 20, K: 35, S: 12, Zn: 1.5, B: 0.8 },
        { id: 'groundnut', name: 'Groundnut (চীনাবাদাম)', N: 30, P: 30, K: 40, S: 20, Zn: 2, B: 1.2 },
        { id: 'sunflower', name: 'Sunflower (সূর্যমুখী)', N: 100, P: 35, K: 70, S: 18, Zn: 2.5, B: 1.5 },
        { id: 'soybean', name: 'Soybean (সয়াবিন)', N: 30, P: 35, K: 45, S: 15, Zn: 2, B: 1.0 }
    ],
    fibers: [
        { id: 'deshi_jute', name: 'Deshi Jute (দেশী পাট)', N: 80, P: 10, K: 35, S: 8, Zn: 1, B: 0.5 },
        { id: 'tossa_jute', name: 'Tossa Jute (তোষা পাট)', N: 90, P: 10, K: 40, S: 8, Zn: 1, B: 0.5 },
        { id: 'cotton', name: 'Cotton (তুলা)', N: 120, P: 35, K: 80, S: 15, Zn: 2.5, B: 1.2 },
        { id: 'kenaf', name: 'Kenaf / Mesta (মেস্তা)', N: 75, P: 10, K: 30, S: 8, Zn: 1, B: 0.5 }
    ],
    spices: [
        { id: 'onion', name: 'Onion (পেঁয়াজ)', N: 110, P: 40, K: 90, S: 20, Zn: 3, B: 1.2 },
        { id: 'garlic', name: 'Garlic (রসুন)', N: 120, P: 45, K: 100, S: 22, Zn: 3, B: 1.2 },
        { id: 'ginger', name: 'Ginger (আদা)', N: 140, P: 50, K: 120, S: 20, Zn: 3.5, B: 1.5 },
        { id: 'turmeric', name: 'Turmeric (হলুদ)', N: 130, P: 45, K: 110, S: 20, Zn: 3, B: 1.5 },
        { id: 'chili', name: 'Chili (মরিচ)', N: 100, P: 35, K: 70, S: 15, Zn: 2.5, B: 1.0 },
        { id: 'coriander', name: 'Coriander (ধনিয়া)', N: 50, P: 20, K: 30, S: 10, Zn: 1.0, B: 0.5 }
    ],
    fruits: [
        { id: 'watermelon', name: 'Watermelon (তরমুজ)', N: 130, P: 35, K: 90, S: 15, Zn: 2, B: 1 },
        { id: 'banana', name: 'Banana (কলা)', N: 200, P: 60, K: 250, S: 25, Zn: 4, B: 2.0 },
        { id: 'papaya', name: 'Papaya (পেঁপে)', N: 160, P: 50, K: 180, S: 20, Zn: 3, B: 1.5 },
        { id: 'mango', name: 'Mango (আম - ফলন্ত গাছ)', N: 150, P: 40, K: 120, S: 15, Zn: 3, B: 1.5 },
        { id: 'guava', name: 'Guava (পেয়ারা)', N: 120, P: 35, K: 100, S: 12, Zn: 2.5, B: 1.0 },
        { id: 'pineapple', name: 'Pineapple (আনারস)', N: 180, P: 40, K: 200, S: 20, Zn: 3, B: 1.5 },
        { id: 'citrus', name: 'Citrus / Lemon (লেবু)', N: 100, P: 30, K: 80, S: 12, Zn: 2, B: 1.0 },
        { id: 'litchi', name: 'Litchi (লিচু)', N: 140, P: 40, K: 120, S: 15, Zn: 2.5, B: 1.2 }
    ],
    cash_flowers: [
        { id: 'sugarcane', name: 'Sugarcane (আখ)', N: 160, P: 45, K: 100, S: 25, Zn: 4, B: 1.5 },
        { id: 'tobacco', name: 'Tobacco (তামাক)', N: 90, P: 35, K: 100, S: 15, Zn: 2, B: 1.0 },
        { id: 'betel_leaf', name: 'Betel Leaf (পান)', N: 110, P: 35, K: 75, S: 12, Zn: 2, B: 1.0 },
        { id: 'marigold', name: 'Marigold (গাঁদা)', N: 80, P: 25, K: 50, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'rose', name: 'Rose (গোলাপ)', N: 90, P: 30, K: 60, S: 12, Zn: 2, B: 1.0 },
        { id: 'tuberose', name: 'Tuberose (রজনীগন্ধা)', N: 100, P: 35, K: 70, S: 15, Zn: 2, B: 1.0 }
    ]
};

function getPropValueByName(props, possibleNames) {
    if (!props) return null;
    for (let propKey in props) {
        if (possibleNames.includes(propKey.toLowerCase().trim())) {
            return props[propKey];
        }
    }
    return null;
}

function getUpazilaName(props) {
    return getPropValueByName(props, ['thaname', 'thana', 'upazila', 'upazila_name', 'upz_name']) || 'Unknown Upazila';
}

function getUnionName(props) {
    return getPropValueByName(props, ['uniname', 'uni_name', 'union', 'union_name']) || 'Unknown Union';
}

function getMauzaName(props) {
    return getPropValueByName(props, ['mauzname', 'mauza_name', 'mauza', 'mauz_name']) || 'Unknown Mauza';
}

// Mauza Area Calculation & Extraction
function getMauzaArea(feature) {
    if (!feature || !feature.properties) return 'N/A';
    const props = feature.properties;
    
    // Check property attributes for Area
    const areaVal = getPropValueByName(props, ['area_acre', 'area', 'shape_area', 'area_ha', 'area_sqkm', 'acre', 'hectare']);
    if (areaVal !== null && !isNaN(parseFloat(areaVal)) && parseFloat(areaVal) > 0) {
        return `${parseFloat(areaVal).toFixed(2)} Acre`;
    }

    // Geodesic Polygon Area Calculation fallback
    try {
        if (feature.geometry) {
            const layer = L.geoJSON(feature);
            let totalAreaSqM = 0;
            layer.eachLayer(l => {
                if (l.getLatLngs) {
                    let latLngs = l.getLatLngs();
                    let points = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
                    if (Array.isArray(points[0])) points = points[0];
                    
                    if (points.length >= 3) {
                        let area = 0;
                        const RAD = Math.PI / 180;
                        const R = 6378137;
                        for (let i = 0; i < points.length; i++) {
                            let p1 = points[i];
                            let p2 = points[(i + 1) % points.length];
                            area += (p2.lng * RAD - p1.lng * RAD) * (2 + Math.sin(p1.lat * RAD) + Math.sin(p2.lat * RAD));
                        }
                        totalAreaSqM += Math.abs(area * R * R / 2);
                    }
                }
            });

            if (totalAreaSqM > 0) {
                const acres = totalAreaSqM * 0.000247105;
                return `${acres.toFixed(2)} Acre (${(totalAreaSqM / 10000).toFixed(2)} Ha)`;
            }
        }
    } catch (e) {
        console.error("Area Calculation Error:", e);
    }
    return 'N/A';
}

function getPossiblePropNames(key, mode) {
    if (!key) return [];
    const isOld = mode === 'old';
    if (key === 'Texture') return isOld ? ['texture_ol', 'texture_old', 'texture_o'] : ['texture_ne', 'texture_new', 'texture_n'];
    if (key === 'pH') return isOld ? ['ph_old', 'ph_ol', 'ph_o', 'ph'] : ['ph_new', 'ph_ne', 'ph_n'];
    if (key === 'Potassium') return isOld ? ['potassium_old', 'potassium_ol', 'k_old', 'k_ol', 'k_o'] : ['potassium_new', 'potassium_ne', 'k_new', 'k_n'];
    if (key === 'Sulphur' || key === 'Sulfur') return isOld ? ['sulfur_old', 'sulfur_ol', 'sulphur_old', 's_old'] : ['sulfur_new', 'sulfur_ne', 'sulphur_ne', 's_new'];
    
    const baseKey = key.toLowerCase();
    return isOld ? [`${baseKey}_old`, `${baseKey}_ol`, `${baseKey}_o`] : [`${baseKey}_new`, `${baseKey}_ne`, `${baseKey}_n`];
}

function getFeatureValue(feature, key, mode) {
    if (!feature || !feature.properties || !key) return null;
    const possibleNames = getPossiblePropNames(key, mode);
    const props = feature.properties;
    
    for (let propKey in props) {
        if (possibleNames.includes(propKey.toLowerCase().trim())) {
            let val = props[propKey];
            if (val === null || val === undefined || val === '' || val === 0 || val === '0') return null;
            if (key === 'Texture' && typeof val === 'string') {
                let str = val.toLowerCase().trim();
                if (str.includes('clay loam') || str === '2') return 2;
                if (str.includes('clay') || str === '1') return 1;
                if (str.includes('sandy loam') || str === '4') return 4;
                if (str.includes('loam') || str === '3') return 3;
            }
            let num = parseFloat(val);
            return isNaN(num) ? null : num;
        }
    }
    return null;
}

function getColor(val, key) {
    if (val === null || val === undefined || !key) return null;
    if (nutrientRanges[key]) {
        const ranges = nutrientRanges[key];
        if (key === 'Texture') {
            let found = ranges.find(r => r.val === val);
            return found ? found.color : '#bf812d';
        }
        for (let i = 0; i < ranges.length; i++) {
            if (val <= ranges[i].max) return ranges[i].color;
        }
        return ranges[ranges.length - 1].color;
    }
    return '#999999';
}

function style(feature) {
    if (!currentLayerKey) {
        return { fillColor: '#3388ff', weight: 0.8, opacity: 0.6, color: '#2b5c8f', fillOpacity: 0.2 };
    }
    const val = getFeatureValue(feature, currentLayerKey, currentMode);
    const color = getColor(val, currentLayerKey);

    if (color === null) {
        return { fillColor: 'transparent', fillOpacity: 0, weight: 0.5, color: '#ccc', opacity: 0.3 };
    }
    return { fillColor: color, weight: 1, opacity: 0.8, color: '#ffffff', fillOpacity: 0.85 };
}

function calculateFertilizer(feature, cropObj) {
    if (!cropObj || !feature) return null;

    const nVal = getFeatureValue(feature, 'Nitrogen', currentMode) || 0.1;
    const pVal = getFeatureValue(feature, 'Phosphorus', currentMode) || 10;
    const kVal = getFeatureValue(feature, 'Potassium', currentMode) || 0.15;
    const sVal = getFeatureValue(feature, 'Sulphur', currentMode) || 10;
    const znVal = getFeatureValue(feature, 'Zinc', currentMode) || 0.8;
    const bVal = getFeatureValue(feature, 'Boron', currentMode) || 0.2;

    const nDef = Math.max(0, cropObj.N - (nVal * 500));
    const pDef = Math.max(0, cropObj.P - (pVal * 1.5));
    const kDef = Math.max(0, cropObj.K - (kVal * 400));
    const sDef = Math.max(0, cropObj.S - (sVal * 0.8));
    const znDef = Math.max(0, cropObj.Zn - (znVal * 2.0));
    const bDef = Math.max(0, cropObj.B - (bVal * 2.0));

    const factor = 4.0468;

    return {
        urea: Math.round((nDef / 0.46) * factor),
        tsp: Math.round((pDef / 0.20) * factor),
        mop: Math.round((kDef / 0.50) * factor),
        gypsum: Math.round((sDef / 0.18) * factor),
        zincSulfate: Math.round((znDef / 0.36) * factor),
        boricAcid: Math.round((bDef / 0.17) * factor)
    };
}

function updateFertilizerTable() {
    const fertTable = document.getElementById('fertTable');
    const cropSelect = document.getElementById('cropSelect');
    const cropCategorySelect = document.getElementById('cropCategorySelect');
    
    if (!fertTable) return;
    if (!selectedFeature) {
        fertTable.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#888;">Select a mauza on map</td></tr>`;
        return;
    }

    const selectedCategory = cropCategorySelect ? cropCategorySelect.value : '';
    const selectedCropId = cropSelect ? cropSelect.value : '';

    if (!selectedCategory || !selectedCropId) {
        fertTable.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#888;">Select crop category & crop</td></tr>`;
        return;
    }

    const cropList = cropCategories[selectedCategory] || [];
    const cropObj = cropList.find(c => c.id === selectedCropId);

    const rec = calculateFertilizer(selectedFeature, cropObj);
    if (!rec) return;

    fertTable.innerHTML = `
        <tr><td>Urea:</td><td><b>${rec.urea}</b> g/dec</td></tr>
        <tr><td>TSP:</td><td><b>${rec.tsp}</b> g/dec</td></tr>
        <tr><td>MoP:</td><td><b>${rec.mop}</b> g/dec</td></tr>
        <tr><td>Gypsum:</td><td><b>${rec.gypsum}</b> g/dec</td></tr>
        <tr><td>Zinc Sulfate:</td><td><b>${rec.zincSulfate}</b> g/dec</td></tr>
        <tr><td>Boric Acid:</td><td><b>${rec.boricAcid}</b> g/dec</td></tr>
    `;
}

function selectFeatureOnMap(layer, feature) {
    if (geojsonLayer) geojsonLayer.resetStyle();
    
    if (layer && layer.setStyle) {
        layer.setStyle({
            weight: 3,
            color: '#000000',
            fillOpacity: 0.95
        });
    }

    selectedFeature = feature;
    updateSidebarTable(feature);
    updateFertilizerTable();
    updateSidebarChart();
}

function onEachFeature(feature, layer) {
    const upazilaName = getUpazilaName(feature.properties);
    const unionName = getUnionName(feature.properties);
    const mauzaName = getMauzaName(feature.properties);
    
    layerMap.set(`${upazilaName}_${unionName}_${mauzaName}`, layer);

    layer.on('click', function () {
        selectFeatureOnMap(layer, feature);
        
        const upazilaSelect = document.getElementById('upazilaSelect');
        const unionSelect = document.getElementById('unionSelect');
        const mauzaSelect = document.getElementById('mauzaSelect');

        if (upazilaSelect) upazilaSelect.value = upazilaName;
        populateUnionDropdown(upazilaName);
        if (unionSelect) unionSelect.value = unionName;
        populateMauzaDropdown(upazilaName, unionName);
        if (mauzaSelect) mauzaSelect.value = mauzaName;
    });
}

function populateUpazilaDropdown() {
    const upazilaSelect = document.getElementById('upazilaSelect');
    if (!upazilaSelect || !geojsonData) return;

    const upazilas = new Set();
    geojsonData.features.forEach(f => {
        const upz = getUpazilaName(f.properties);
        if (upz && upz !== 'Unknown Upazila') upazilas.add(upz);
    });

    upazilaSelect.innerHTML = '<option value="">-- Select Upazila --</option>';
    Array.from(upazilas).sort().forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        upazilaSelect.appendChild(opt);
    });
}

function populateUnionDropdown(selectedUpazila) {
    const unionSelect = document.getElementById('unionSelect');
    const mauzaSelect = document.getElementById('mauzaSelect');
    if (!unionSelect) return;

    unionSelect.innerHTML = '<option value="">-- Select Union --</option>';
    if (mauzaSelect) {
        mauzaSelect.innerHTML = '<option value="">-- Select Mauza --</option>';
        mauzaSelect.disabled = true;
    }

    if (!selectedUpazila) {
        unionSelect.disabled = true;
        return;
    }

    const unions = new Set();
    geojsonData.features.forEach(f => {
        if (getUpazilaName(f.properties) === selectedUpazila) {
            const uName = getUnionName(f.properties);
            if (uName && uName !== 'Unknown Union') unions.add(uName);
        }
    });

    Array.from(unions).sort().forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        unionSelect.appendChild(opt);
    });
    unionSelect.disabled = false;
}

function populateMauzaDropdown(selectedUpazila, selectedUnion) {
    const mauzaSelect = document.getElementById('mauzaSelect');
    if (!mauzaSelect) return;

    mauzaSelect.innerHTML = '<option value="">-- Select Mauza --</option>';
    if (!selectedUnion) {
        mauzaSelect.disabled = true;
        return;
    }

    const mauzas = [];
    geojsonData.features.forEach(f => {
        if (getUpazilaName(f.properties) === selectedUpazila && getUnionName(f.properties) === selectedUnion) {
            mauzas.push(getMauzaName(f.properties));
        }
    });

    mauzas.sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        mauzaSelect.appendChild(opt);
    });
    mauzaSelect.disabled = false;
}

function updateLegend() {
    if (legendControl) {
        map.removeControl(legendControl);
        legendControl = null;
    }

    if (!currentLayerKey) return;

    legendControl = L.control({ position: 'bottomright' });
    legendControl.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = `<h4>${currentLayerKey}</h4>`;

        if (nutrientRanges[currentLayerKey]) {
            nutrientRanges[currentLayerKey].forEach(item => {
                div.innerHTML += `
                    <div class="legend-item">
                        <i class="legend-color" style="background: ${item.color};"></i>
                        <span>${item.label}</span>
                    </div>`;
            });
        }
        return div;
    };
    legendControl.addTo(map);
}

function updateSidebarTable(feature) {
    const table = document.getElementById('propsTable');
    if (!table || !feature) return;

    const props = feature.properties;
    table.innerHTML = `
        <tr><td>Mauza:</td><td><b>${getMauzaName(props)}</b></td></tr>
        <tr><td>Area:</td><td><b>${getMauzaArea(feature)}</b></td></tr>
        <tr><td>Union:</td><td>${getUnionName(props)}</td></tr>
        <tr><td>Upazila:</td><td>${getUpazilaName(props)}</td></tr>
        <tr><td>District:</td><td>${getPropValueByName(props, ['distname', 'district']) || 'N/A'}</td></tr>
    `;
}

// Chart Fix: Always shows chart on dropdown or click
function updateSidebarChart() {
    const ctx = document.getElementById('sidebarChart');
    if (!ctx || !selectedFeature) return;

    if (activeChartInstance) {
        activeChartInstance.destroy();
    }

    if (currentLayerKey) {
        // Single Nutrient Comparison
        const oldVal = getFeatureValue(selectedFeature, currentLayerKey, 'old') || 0;
        const newVal = getFeatureValue(selectedFeature, currentLayerKey, 'new') || 0;

        activeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Old Map', 'New Map'],
                datasets: [{
                    label: currentLayerKey,
                    data: [oldVal, newVal],
                    backgroundColor: ['#e74c3c', '#27ae60']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } else {
        // Multi-nutrient Comparison Overview when no layer is explicitly selected
        const keyNutrients = ['Nitrogen', 'Phosphorus', 'Potassium', 'pH', 'OM'];
        const oldVals = keyNutrients.map(n => getFeatureValue(selectedFeature, n, 'old') || 0);
        const newVals = keyNutrients.map(n => getFeatureValue(selectedFeature, n, 'new') || 0);

        activeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['N', 'P', 'K', 'pH', 'OM'],
                datasets: [
                    { label: 'Old Map', data: oldVals, backgroundColor: '#e74c3c' },
                    { label: 'New Map', data: newVals, backgroundColor: '#27ae60' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

function renderLayer() {
    if (!geojsonData) return;
    if (geojsonLayer) map.removeLayer(geojsonLayer);

    layerMap.clear();
    geojsonLayer = L.geoJSON(geojsonData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    updateLegend();
}

document.addEventListener("DOMContentLoaded", function () {
    const upazilaSelect = document.getElementById('upazilaSelect');
    const unionSelect = document.getElementById('unionSelect');
    const mauzaSelect = document.getElementById('mauzaSelect');

    if (upazilaSelect) {
        upazilaSelect.addEventListener('change', function () {
            populateUnionDropdown(this.value);
        });
    }

    if (unionSelect) {
        unionSelect.addEventListener('change', function () {
            populateMauzaDropdown(upazilaSelect.value, this.value);
        });
    }

    if (mauzaSelect) {
        mauzaSelect.addEventListener('change', function () {
            const selectedUpazila = upazilaSelect.value;
            const selectedUnion = unionSelect.value;
            const selectedMauza = this.value;
            
            if (selectedUpazila && selectedUnion && selectedMauza) {
                const targetLayer = layerMap.get(`${selectedUpazila}_${selectedUnion}_${selectedMauza}`);
                if (targetLayer) {
                    selectFeatureOnMap(targetLayer, targetLayer.feature);
                    map.fitBounds(targetLayer.getBounds(), { maxZoom: 14 });
                }
            }
        });
    }

    const layerSelect = document.getElementById('layerSelect');
    if (layerSelect) {
        layerSelect.addEventListener('change', function(e) {
            currentLayerKey = e.target.value;
            renderLayer();
            updateSidebarChart(); // Re-render chart on layer change
        });
    }

    const cropCategorySelect = document.getElementById('cropCategorySelect');
    const cropSelect = document.getElementById('cropSelect');

    if (cropCategorySelect && cropSelect) {
        cropCategorySelect.addEventListener('change', function() {
            const cat = this.value;
            cropSelect.innerHTML = '<option value="">-- Select Crop --</option>';

            if (cat && cropCategories[cat]) {
                cropSelect.disabled = false;
                cropCategories[cat].forEach(crop => {
                    const opt = document.createElement('option');
                    opt.value = crop.id;
                    opt.textContent = crop.name;
                    cropSelect.appendChild(opt);
                });
            } else {
                cropSelect.disabled = true;
            }
            updateFertilizerTable();
        });

        cropSelect.addEventListener('change', updateFertilizerTable);
    }

    const shiftBtn = document.getElementById('shiftBtn');
    if (shiftBtn) {
        shiftBtn.addEventListener('click', function() {
            const badge = document.getElementById('modeBadge');
            if (currentMode === 'old') {
                currentMode = 'new';
                this.innerText = 'Shift to OLD Map';
                if (badge) {
                    badge.innerText = 'Showing: NEW MAP';
                    badge.className = 'status-badge new-badge';
                }
            } else {
                currentMode = 'old';
                this.innerText = 'Shift to NEW Map';
                if (badge) {
                    badge.innerText = 'Showing: OLD MAP';
                    badge.className = 'status-badge old-badge';
                }
            }
            renderLayer();
            updateSidebarChart();
            updateFertilizerTable();
        });
    }

    fetch('Chandpur.geojson')
        .then(res => res.json())
        .then(data => {
            geojsonData = data;
            renderLayer();
            populateUpazilaDropdown();
            if (geojsonLayer) map.fitBounds(geojsonLayer.getBounds());
        })
        .catch(err => console.error(err));
});
