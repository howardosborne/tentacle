google.charts.load("current", {packages:["table",'line', 'corechart', 'controls']});

var prices_data;

function loadData() {
    var output = {};
    var product_code = document.getElementById('product_code').value;
    var tariff_code = document.getElementById('tariff_code').value;
    var outgoing_product_code = document.getElementById('outgoing_product_code').value;
    var outgoing_tariff_code = document.getElementById('outgoing_tariff_code').value;

    prices_data = new google.visualization.DataTable();

    var from = new Date()
    from.setDate(from.getDate()-30)
    var date_from = from.toISOString().substring(0,10)
    var period_from = date_from + "T00:00Z"

    var prices_url = "https://api.octopus.energy/v1/products/" + product_code + "/electricity-tariffs/" + tariff_code + "/standard-unit-rates/?period_from=" + period_from + "&page_size=10000"
    var export_prices_url = "https://api.octopus.energy/v1/products/" + outgoing_product_code + "/electricity-tariffs/" + outgoing_tariff_code + "/standard-unit-rates/?period_from=" + period_from + "&page_size=10000"

    var xhttp = new XMLHttpRequest();
    //get input prices
    xhttp.open("GET", prices_url, false);
    xhttp.send();	
    response = JSON.parse(xhttp.response);
    for (i=0; i<response.results.length; i++) {
        //process the timestamp
        var timestamp = new Date(response.results[i]["valid_from"]).toLocaleString();
        output[timestamp] = response.results[i];
    }
    //get export prices
    xhttp.open("GET", export_prices_url, false);
    //xhttp.setRequestHeader("Authorization", "Basic " + btoa(api_key) + ":");
    xhttp.send();	
    response = JSON.parse(xhttp.response);
    for (i=0; i<response.results.length; i++) {
        //process the timestamp
        var timestamp = new Date(response.results[i]["valid_from"]).toLocaleString();
        output[timestamp]["export_value_inc_vat"] = response.results[i]["value_inc_vat"];
        output[timestamp]["margin"] = (output[timestamp]["value_inc_vat"] - output[timestamp]["export_value_inc_vat"]).toFixed(2)
    }

    prices_data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    prices_data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    prices_data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    prices_data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });

    var formatter = new Intl.NumberFormat('en-UK', {style: 'currency', currency: 'GBP'});

    Object.entries(output).forEach(function([key, item]) {
        prices_data.addRow([new Date (item["valid_from"]),
          {v: Number(item["value_inc_vat"]), f: formatter.format(Number(item["value_inc_vat"])/100)},
          {v: Number(item["export_value_inc_vat"]), f: formatter.format(Number(item["export_value_inc_vat"])/100)},
          {v: Number(item["margin"]), f: formatter.format(Number(item["margin"])/100)}
        ]);      
    });



    var prices_view = new google.visualization.DataView(prices_data);
    prices_view.setRows(prices_data.getFilteredRows([{column: 0, minValue: new Date()}]));

    var upcomingPricesLineChart = new google.visualization.LineChart(document.getElementById('upcoming_prices_chart_div'));
    upcomingPricesLineChart.draw(prices_view);

    var upcomingPricesTable = new google.visualization.Table(document.getElementById('upcoming_prices_table_div'));
    upcomingPricesTable.draw(prices_view, {showRowNumber: false});    


 }
 
 function setCookie(cname, cvalue) {
  const d = new Date();
  d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
  let expires = "expires="+d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function saveSettings(){
	setCookie("product_code", document.getElementById('product_code').value)
	setCookie("tariff_code", document.getElementById('tariff_code').value)
	setCookie("outgoing_product_code", document.getElementById('outgoing_product_code').value)
	setCookie("outgoing_tariff_code", document.getElementById('outgoing_tariff_code').value)
}
function downloadData(){	
  var headers = "timestamp,import_price,export_price,margin,imported,exported,net_import,import_value,export_value,net_value\n";
  var csvFormattedDataTable = google.visualization.dataTableToCsv(data);
  var encodedUri = 'data:application/csv;charset=utf-8,' + encodeURIComponent(headers) + encodeURIComponent(csvFormattedDataTable);
  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "energy_usage_and_cost_summary.csv");
  document.body.appendChild(link);
  link.click();
}

function checkSettings(){
	if(getCookie("api_key") == ""){
		alert("set the settings before getting data");
	}
	else{
		document.getElementById('product_code').value = getCookie("product_code");
		document.getElementById('tariff_code').value = getCookie("tariff_code");
		document.getElementById('outgoing_product_code').value = getCookie("outgoing_product_code");
		document.getElementById('outgoing_tariff_code').value = getCookie("outgoing_tariff_code");
		loadData();
	}
}
