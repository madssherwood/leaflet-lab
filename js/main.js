//create Leaflet Map -- function called upon when page loads
//create variable 'map' to pass to other functions
//set center of map and zoom
//write credentials to use map 'attribution', 'id', 'accessToken'
function createMap() {
    var map = L.map('map', {
        center: [30, 0],
        zoom: 2
    });
    L.tileLayer('https://api.mapbox.com/styles/v1/madssherwood/ck1fsz1na4j3w1cnz1z0ap9jr/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFkc3NoZXJ3b29kIiwiYSI6ImNqa3QzYWpwZDAxaXEzcHBhdzB0ZDJodDUifQ.ouDo-FRnnz4VA4NMMzWqOg', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a> & Madison Sherwood-Walter',
        maxZoom: 10,
        minZoom: 2,
        id: 'madssherwood/ck1fsz1na4j3w1cnz1z0ap9jr',
        accessToken: 'pk.eyJ1IjoibWFkc3NoZXJ3b29kIiwiYSI6ImNqa3QzYWpwZDAxaXEzcHBhdzB0ZDJodDUifQ.ouDo-FRnnz4VA4NMMzWqOg'
    }).addTo(map);
    //call getData function
    getData(map);
}; 
    
//pull data from referenced geojson file 
//call processData function and pass returned array to create symbols and sequence controls
function getData(map) {
    $.ajax("data/CO2Emissions.geojson", {
        dataType: "json",
        success: function (response) {
            var attributes = processData(response);
            createControls(map, attributes);
            createSymbols(response, map, attributes);
        }
    });
};

//use passed geojson data 'data' to add attribute names to the array 'attributes'
//return array to getData function
function processData(data) {
    var attributes = [];
    var properties = data.features[0].properties;
    for (var attribute in properties) {
        if (attribute.indexOf("Ton") > -1){
            attributes.push(attribute);
        };
    };   
    return attributes;
};

//create the reverse timestep button, the range-slider, set the range-slider attributes, then the forward timestep button
//create the index variable
//set the button function so when clicked, the slider will move accordingly and change the index value
//call updateSymbols and updateTitle to update the title, features, and popups of the map based on the index value (timestep) chosen
//create the metric tons and percentage buttons
//set the button functions so when clicked, the button becomes active (for css rules) and the other becomes inactive 
//set the button functions so when each is clicked, the global variable contentType changes its value
//if Metric Tons, contentType is set to 0 and the metric tons data is displayed in each feature's popup
//if Percentage, contentType is set to 1 and the global percentage data is displayed in each feature's popup
//updateSymbol is called in order to remove each popup and redisplay it with the appropriate data
function createControls(map, attributes) {
    $('#slider').append('<button class = "buttons" id="reverse"><<</button>');
    $('#slider').append('<input class="range-slider" type="range">');
    $('.range-slider').attr({
        max: 7,
        min: 0,
        value: 0,
        step: 1,
        showValue: true
    });
    $('#slider').append('<button class = "buttons" id="forward">>></button>');
    var index = $('.range-slider').val();
    $('.buttons').click(function() {
        if ($(this).attr('id') == 'forward') {
            index++;
            index = index > 7 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse') {
            index--;
            index = index < 0 ? 7 : index;
        }
        $('.range-slider').val(index);
        updateSymbols(map, attributes[index]);
        updateTitle(map, attributes[index]);  
    });
    $('.range-slider').on('input', function(){
        var index = $(this).val();
        updateSymbols(map, attributes[index]);
        updateTitle(map, attributes[index]);
    });
    $('#toggle').append('<button class = "toggle" id="tons">Metric Tons</button>');
    $('#toggle').append('<button class = "toggle" id="percent">Percentage</button>');
    $('.toggle').click(function() {
        $('.toggle').removeClass('active').addClass('inactive');
        $(this).removeClass('inactive').addClass('active');
        if ($(this).attr('id') == 'tons') {
            contentType = 0;
        } else if ($(this).attr('id') == 'percent') {
            contentType = 1;
        }
        updateSymbols(map, attributes[index]);
    }); 
};

//create proportional symbols for first time step attributes[0]
//pass the feature to createCircle and return the layer to getData
function createSymbols(data, map, attributes) {
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return createCircle(feature, latlng, attributes);
        }
    }).addTo(map);
};

//create the markers for each data point in the feature layer
//set marker attributes
//set each feature's marker radius by passing the value to calcRadius
//the map is only meant to show the top 15 carbon emitting countries so the values of countries beyond those 16 have a zero value
//to avoid creating a popup, an 'if' conditional statement is used to only create popups for features with values
//interactive events are set so that when the user hovers over the point, the popup appears
function createCircle(feature, latlng, attributes) {
    var attribute = attributes[0];
    var attValue = Number(feature.properties[attribute]);
    var options = {
        fillColor: "#fed98e",
        fillOpacity: 0.7,
        color: "#cc4c02",
        opacity: 0.8,
        weight: 0.8,
        };     
    options.radius = calcRadius(attValue);
    var layer = L.circleMarker(latlng, options);
    if (attValue > 1) {
        createPopup(feature, attribute, layer);
    };
    layer.on({
        mouseover: function() {
            this.openPopup();
        },
        mouseout: function() {
            this.closePopup();
        }
    });
    return layer;
};

//the value of each feature is passed and adjusted by a 0.001 scale to make each feature radius proportional to its value
//the radius value is returned to createCircle
function calcRadius(attValue) {
    var scaleFactor = 0.001;
    var area = attValue * scaleFactor;
    var radius = Math.sqrt(area / Math.PI);
    return radius;
};

//a global variable is created to track which type of data the user wishes to display
var contentType = 0;

//popupContent holds the content for each feature's popup
//create year variable to hold value for year of the data (without 'Tons_' as is in the name of the attribute)
//run thousandSeparator on the feature values to present the data for carbon emissions in metric tons in a readable manner
//create a dictionary with data year as the key and the total global carbon emission (in metric tons) as the value
//calculate the percentage that each feature's carbon emissions are of the global total
//to make this percentage value readable, use toFixed(2) to round the values to the hundreth's decimal place
//check the global variable contentType (which shows which type of data the user wishes to display)
//if 0, add the metric tons content to the popup
//if 1, add the percentage of global total content to the popup
//bind the popup to each feature
function createPopup(feature, attribute, layer) {
    var popupContent = "<p><b>Country:</b> " + feature.properties.Country + "</p>";
    var year = attribute.split("_")[1];
    var labelTons = thousandSeparator(Math.round(feature.properties[attribute]));
    function thousandSeparator(x){
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    var dict = {
        1975: 16853532,
        1985: 19864139,
        1995: 23120435,
        2005: 29490014,
        2010: 33472891,
        2012: 35837591,
        2013: 35837591,
        2014: 36138285
    };
    var value = (feature.properties[attribute] / dict[year])*100;   
    var labelPercent = value.toFixed(2);
    if (contentType === 0) {
        popupContent += "<p><b>Carbon Emissions in " + year + ":</b> " + labelTons + " metric tons</p>";
    } else if (contentType === 1) {
        popupContent += "<p><b>Percent of Global Carbon Emissions in " + year + ": </b>" + labelPercent + "%</p>";
    };   
    layer.bindPopup(popupContent, {
        offset: new L.Point(0, -10)}
    );    
};

//update the title of the map based on the year attribute of the current timestep
function updateTitle(map, attribute) {
    var div = document.getElementById("title");
    div.innerHTML = "Top 15 Carbon Emitters by Country: " + attribute.slice(5);  
};

//this function is called when the timestep or data type is changed by the user
//the radius of each feature is recalculated based on the new timestep's carbon emission value
//any existing popup is removed
//for any feature with data (greater than 1, meaning it is in the top 15 carbon emitting countries)
//a new popup is created with createPopup
function updateSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            var props = layer.feature.properties;
            var radius = calcRadius(props[attribute]);
            layer.setRadius(radius); 
            layer.unbindPopup();
            if (props[attribute] > 1) {
                createPopup(layer.feature, attribute, layer);
            };
        };
    });
};

//call createMap function when document has loaded
$(document).ready(createMap);    