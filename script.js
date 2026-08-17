const map = L.map('map').setView([23.2333, 90.6667], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const northArrow = L.control({ position: 'topright' });
northArrow.onAdd = function () {
    const div = L.DomUtil.create('div', 'north-arrow-control');
    div.innerHTML = `
        <span class="north-arrow-icon">⬆</span>
        <span class="north-text">N</span>
    `;
    return div;
};
northArrow.addTo(map);

let currentMode = 'old';
let currentLayerKey = null;
let geojsonData = null;
let geojsonLayer = null;
let activeChartInstance = null;
let selectedFeatureProps = null;
let legendControl = null;

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

const cropCategories = {
    grains: [
        { id: 'boro', name: 'Boro Rice (HYV)', N: 160, P: 25, K: 80, S: 15, Zn: 3, B: 1 },
        { id: 'aman', name: 'T. Aman Rice (HYV)', N: 90, P: 15, K: 50, S: 10, Zn: 1.5, B: 0 },
        { id: 'aus', name: 'Aus Rice (HYV)', N: 80, P: 12, K: 40, S: 8, Zn: 1, B: 0 },
        { id: 'wheat', name: 'Wheat', N: 120, P: 30, K: 70, S: 15, Zn: 2.5, B: 1 },
        { id: 'maize', name: 'Maize (Hybrid)', N: 220, P: 50, K: 100, S: 25, Zn: 5, B: 1.5 }
    ],
    vegetables: [
        { id: 'brinjal', name: 'Brinjal (বেগুন)', N: 150, P: 45, K: 100, S: 18, Zn: 3, B: 1.5 },
        { id: 'tomato', name: 'Tomato (টমেটো)', N: 140, P: 40, K: 110, S: 16, Zn: 3, B: 1.2 },
        { id: 'cabbage', name: 'Cabbage (বাঁধাকপি)', N: 160, P: 50, K: 120, S: 20, Zn: 4, B: 1.5 },
        { id: 'cauliflower', name: 'Cauliflower (ফুলকপি)', N: 170, P: 55, K: 125, S: 22, Zn: 4, B: 2.0 },
        { id: 'potato', name: 'Potato (আলু)', N: 180, P: 40, K: 140, S: 20, Zn: 4, B: 1.5 },
        { id: 'radish', name: 'Radish (মুলা)', N: 120, P: 30, K: 80, S: 12, Zn: 2, B: 1.0 },
        { id: 'carrot', name: 'Carrot (গাজর)', N: 110, P: 35, K: 90, S: 14, Zn: 2, B: 1.2 },
        { id: 'ladyfinger', name: 'Okra (ঢেঁড়স)', N: 100, P: 30, K: 60, S: 12, Zn: 2, B: 1.0 },
        { id: 'bitter_gourd', name: 'Bitter Gourd (করলা)', N: 110, P: 35, K: 75, S: 14, Zn: 2, B: 1.0 },
        { id: 'pointed_gourd', name: 'Pointed Gourd (পটল)', N: 120, P: 40, K: 80, S: 15, Zn: 2.5, B: 1.0 },
        { id: 'bottle_gourd', name: 'Bottle Gourd (লাউ)', N: 100, P: 30, K: 70, S: 12, Zn: 2, B: 1.0 },
        { id: 'sweet_gourd', name: 'Sweet Gourd (মিষ্টি কুমড়া)', N: 90, P: 30, K: 70, S: 12, Zn: 2, B: 1.0 },
        { id: 'ridge_gourd', name: 'Ridge Gourd (ঝিঙ্গা)', N: 90, P: 25, K: 60, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'snake_gourd', name: 'Snake Gourd (চিচিঙ্গা)', N: 90, P: 25, K: 60, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'cucumber', name: 'Cucumber (শসা)', N: 100, P: 30, K: 70, S: 12, Zn: 2, B: 1.0 },
        { id: 'country_bean', name: 'Country Bean (শিম)', N: 40, P: 30, K: 40, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'yard_long_bean', name: 'Yard Long Bean (বরবটি)', N: 50, P: 30, K: 45, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'red_amaranth', name: 'Red Amaranth (লালশাক)', N: 60, P: 15, K: 40, S: 8, Zn: 1, B: 0.5 },
        { id: 'stem_amaranth', name: 'Stem Amaranth (ডাটা শাক)', N: 80, P: 20, K: 50, S: 10, Zn: 1.5, B: 0.5 },
        { id: 'spinach', name: 'Spinach (পালং শাক)', N: 70, P: 20, K: 45, S: 10, Zn: 1.5, B: 0.5 },
        { id: 'pui_shak', name: 'Indian Spinach (পুঁই শাক)', N: 90, P: 25, K: 60, S: 12, Zn: 2, B: 0.8 }
    ],
    pulses: [
        { id: 'lentil', name: 'Lentil (মসুর)', N: 25, P: 20, K: 20, S: 10, Zn: 1.5, B: 1.0 },
        { id: 'chickpea', name: 'Chickpea (ছোলা)', N: 20, P: 20, K: 20, S: 10, Zn: 1.5, B: 1.0 },
        { id: 'mungbean', name: 'Mungbean (মুগ)', N: 20, P: 18, K: 15, S: 8, Zn: 1.0, B: 0.8 },
        { id: 'blackgram', name: 'Black Gram (মাষকলাই)', N: 20, P: 18, K: 15, S: 8, Zn: 1.0, B: 0.8 },
        { id: 'khesari', name: 'Grass Pea (খেসারী)', N: 15, P: 15, K: 15, S: 6, Zn: 1.0, B: 0.5 },
        { id: 'cowpea', name: 'Cowpea (ফেলন)', N: 20, P: 20, K: 20, S: 8, Zn: 1.0, B: 0.8 },
        { id: 'pigeonpea', name: 'Pigeon Pea (অড়হর)', N: 25, P: 25, K: 25, S: 10, Zn: 1.5, B: 1.0 }
    ],
    fibers: [
        { id: 'jute', name: 'Jute (Deshi/Tossa)', N: 90, P: 10, K: 40, S: 8, Zn: 1, B: 0.5 },
        { id: 'cotton', name: 'Cotton', N: 150, P: 35, K: 90, S: 18, Zn: 3, B: 1.2 }
    ],
    oils: [
        { id: 'mustard', name: 'Mustard (সরিষা)', N: 100, P: 30, K: 60, S: 20, Zn: 2, B: 1 },
        { id: 'sunflower', name: 'Sunflower (সূর্যমুখী)', N: 120, P: 35, K: 70, S: 22, Zn: 3, B: 1.5 },
        { id: 'sesame', name: 'Sesame (তিলে)', N: 60, P: 20, K: 30, S: 12, Zn: 1, B: 0.5 },
        { id: 'groundnut', name: 'Groundnut (চিনাবাদাম)', N: 30, P: 35, K: 50, S: 20, Zn: 2, B: 1 }
    ],
    fruits: [
        { id: 'watermelon', name: 'Watermelon (তরমুজ)', N: 130, P: 35, K: 90, S: 15, Zn: 2, B: 1 },
        { id: 'banana', name: 'Banana (কলার প্রতি গাছ/বছর)', N: 250, P: 60, K: 300, S: 30, Zn: 5, B: 2 },
        { id: 'papaya', name: 'Papaya (পেঁপে)', N: 150, P: 50, K: 150, S: 20, Zn: 3, B: 1.5 }
    ],
    flowers: [
        { id: 'marigold', name: 'Marigold (গাঁদা)', N: 80, P: 25, K: 50, S: 10, Zn: 1.5, B: 0.8 },
        { id: 'rose', name: 'Rose (গোলাপ)', N: 100, P: 40, K: 80, S: 15, Zn: 2, B: 1 },
        { id: 'tuberose', name: 'Tuberose (রজনীগন্ধা)', N: 120, P: 45, K: 90, S: 15, Zn: 2, B: 1 }
    ]
};

function getPossiblePropNames(key, mode) {
    if (!key) return [];
    const isOld = mode === 'old';
    
    if (key === 'Texture') {
        return isOld ? ['texture_ol', 'texture_old', 'texture_o'] : ['texture_ne', 'texture_new', 'texture_n'];
    }
    if (key === 'pH') {
        return isOld ? ['ph_old', 'ph_ol', 'ph_o', 'ph'] : ['ph_new', 'ph_ne', 'ph_n'];
    }
    if (key === 'Potassium') {
        return isOld ? ['potassium_old', 'potassium_ol', 'k_old', 'k_ol', 'k_o'] : ['potassium_new', 'potassium_ne', 'k_new', 'k_ne', 'k_n'];
    }
    if (key === 'Sulphur' || key === 'Sulfur') {
        return isOld 
            ? ['sulfur_old', 'sulfur_ol', 'sulphur_old', 'sulphur_ol', 's_old', 's_ol', 's_o'] 
            : ['sulfur_new', 'sulfur_ne', 'sulphur_ne', 's_new', 's_ne', 's_n'];
    }

    const baseKey = key.toLowerCase();
    return isOld ? [`${baseKey}_old`, `${baseKey}_ol`, `${baseKey}_o`] : [`${baseKey}_new`, `${baseKey}_ne`, `${baseKey}_n`];
}

function getFeatureValue(feature, key, mode) {
    if (!feature || !feature.properties || !key) return null;
    
    const possibleNames = getPossiblePropNames(key, mode);
    const props = feature.properties;
    
    for (let propKey in props) {
        let cleanPropKey = propKey.toLowerCase().trim();
        
        if (possibleNames.includes(cleanPropKey)) {
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
        return {
            fillColor: '#3388ff',
            weight: 0.8,
            opacity: 0.6,
            color: '#2b5c8f',
            fillOpacity: 0.2
        };
    }

    const val = getFeatureValue(feature, currentLayerKey, currentMode);
    const color = getColor(val, currentLayerKey);

    if (color === null) {
        return { fillColor: 'transparent', fillOpacity: 0, weight: 0.5, color: '#ccc', opacity: 0.3 };
    }

    return { fillColor: color, weight: 1, opacity: 0.8, color: '#ffffff', fillOpacity: 0.85 };
}

function calculateFertilizer(feature, cropObj) {
    if (!cropObj) return null;

    const nVal = getFeatureValue(feature, 'Nitrogen', currentMode) || 0.1;
    const pVal = getFeatureValue(feature, 'Phosphorus', currentMode) || 10;
    const kVal = getFeatureValue(feature, 'Potassium', currentMode) || 0.15;
    const sVal = getFeatureValue(feature, 'Sulphur', currentMode) || 10;
    const znVal = getFeatureValue(feature, 'Zinc', currentMode) || 0.8;
    const bVal = getFeatureValue(feature, 'Boron', currentMode) || 0.2;

    const nSupply = nVal * 500;
    const pSupply = pVal * 1.5;
    const kSupply = kVal * 400;
    const sSupply = sVal * 0.8;
    const znSupply = znVal * 2.0;
    const bSupply = bVal * 2.0;

    const nDef = Math.max(0, cropObj.N - nSupply);
    const pDef = Math.max(0, cropObj.P - pSupply);
    const kDef = Math.max(0, cropObj.K - kSupply);
    const sDef = Math.max(0, cropObj.S - sSupply);
    const znDef = Math.max(0, cropObj.Zn - znSupply);
    const bDef = Math.max(0, cropObj.B - bSupply);

    const factor = 4.0468;

    const urea = Math.round((nDef / 0.46) * factor);
    const tsp = Math.round((pDef / 0.20) * factor);
    const mop = Math.round((kDef / 0.50) * factor);
    const gypsum = Math.round((sDef / 0.18) * factor);
    const zincSulfate = Math.round((znDef / 0.36) * factor);
    const boricAcid = Math.round((bDef / 0.17) * factor);

    return { urea, tsp, mop, gypsum, zincSulfate, boricAcid };
}

function updateFertilizerTable() {
    const fertTable = document.getElementById('fertTable');
    const cropSelect = document.getElementById('cropSelect');
    const cropCategorySelect = document.getElementById('cropCategorySelect');
    
    if (!fertTable) return;

    if (!selectedFeatureProps) {
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

    const rec = calculateFertilizer(selectedFeatureProps, cropObj);
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

function onEachFeature(feature, layer) {
    layer.on('click', function () {
        if (geojsonLayer) geojsonLayer.resetStyle();
        
        layer.setStyle({
            weight: 3,
            color: '#000000',
            fillOpacity: 0.95
        });

        selectedFeatureProps = feature;
        updateSidebarTable(feature.properties);
        updateFertilizerTable();
        updateSidebarChart();
    });
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
        div.innerHTML = `<h4>${currentLayerKey} Category</h4>`;

        if (nutrientRanges[currentLayerKey]) {
            nutrientRanges[currentLayerKey].forEach(item => {
                div.innerHTML += `
                    <div class="legend-item">
                        <i class="legend-color" style="background: ${item.color};"></i>
                        <span>${item.label}</span>
                    </div>`;
            });
        }

        div.innerHTML += `
            <div class="legend-item" style="margin-top: 6px; border-top: 1px solid #ddd; padding-top: 4px;">
                <i class="legend-color" style="background: transparent; border: 1px dashed #999;"></i>
                <span>No Data / Blank</span>
            </div>`;

        return div;
    };

    legendControl.addTo(map);
}

function updateSidebarTable(props) {
    const table = document.getElementById('propsTable');
    if (!table) return;

    const divName = props.divname || props.DIVNAME || 'N/A';
    const distName = props.distname || props.DISTNAME || 'N/A';
    const thanaName = props.THANAME || props.thananame || props.thana || 'N/A';
    const uniName = props.uniname || props.UNINAME || 'N/A';
    const mauzaName = props.mauzname || props.MAUZNAME || 'N/A';
    
    let rawArea = props.area || props.AREA || props.Area || props.Shape_Area || props.shape_area;
    let areaVal = 'N/A';
    
    if (rawArea) {
        let numArea = parseFloat(rawArea);
        areaVal = !isNaN(numArea) ? `${numArea.toFixed(2)} sq km` : `${rawArea}`;
    }

    table.innerHTML = `
        <tr><td>Mauza:</td><td><b>${mauzaName}</b></td></tr>
        <tr><td>Division:</td><td>${divName}</td></tr>
        <tr><td>District:</td><td>${distName}</td></tr>
        <tr><td>Thana:</td><td>${thanaName}</td></tr>
        <tr><td>Union:</td><td>${uniName}</td></tr>
        <tr><td>Area:</td><td>${areaVal}</td></tr>
    `;
}

function updateSidebarChart() {
    const ctx = document.getElementById('sidebarChart');
    if (!ctx || !selectedFeatureProps || !currentLayerKey) return;

    const oldVal = getFeatureValue(selectedFeatureProps, currentLayerKey, 'old');
    const newVal = getFeatureValue(selectedFeatureProps, currentLayerKey, 'new');

    if (activeChartInstance) {
        activeChartInstance.destroy();
    }

    activeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Old Map', 'New Map'],
            datasets: [{
                label: `${currentLayerKey} Value`,
                data: [oldVal || 0, newVal || 0],
                backgroundColor: ['#e74c3c', '#27ae60'],
                borderColor: ['#c0392b', '#219150'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${currentLayerKey} (Old vs New)`,
                    color: '#333',
                    font: { size: 12, weight: 'bold' }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderLayer() {
    if (!geojsonData) return;
    if (geojsonLayer) map.removeLayer(geojsonLayer);

    geojsonLayer = L.geoJSON(geojsonData, {
        style: style,
        onEachFeature: onEachFeature
    }).addTo(map);

    updateLegend();

    if (selectedFeatureProps) {
        updateSidebarChart();
        updateFertilizerTable();
    }
}

window.addEventListener('resize', function() {
    if (map) {
        setTimeout(function() {
            map.invalidateSize();
        }, 200);
    }
});

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function() {
        map.invalidateSize();
    }, 300);

    const layerSelect = document.getElementById('layerSelect');
    if (layerSelect) {
        layerSelect.addEventListener('change', function(e) {
            currentLayerKey = e.target.value;
            renderLayer();
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

        cropSelect.addEventListener('change', function() {
            updateFertilizerTable();
        });
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
                    badge.innerText = 'Showing: NEW MAP';
                    badge.className = 'status-badge old-badge';
                }
            }
            renderLayer();
        });
    }

    fetch('Chandpur.geojson')
        .then(response => {
            if (!response.ok) throw new Error('Chandpur.geojson File Not Found!');
            return response.json();
        })
        .then(data => {
            geojsonData = data;
            renderLayer();
            if (geojsonLayer) map.fitBounds(geojsonLayer.getBounds());
        })
        .catch(error => {
            console.error('Error:', error);
        });
});