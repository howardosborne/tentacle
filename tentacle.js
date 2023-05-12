google.charts.load("current", {packages:["table",'line', 'corechart', 'controls']});

var prices_data, data, consumption_data, cost_data;
var daily_prices_data, daily_data, daily_consumption_data, daily_cost_data;

function loadData() {
    var output = {}
    var daily_info = {}
    var api_key = document.getElementById('api_key').value
    var product_code = document.getElementById('product_code').value
    var tariff_code = document.getElementById('tariff_code').value
    var outgoing_product_code = document.getElementById('outgoing_product_code').value
    var outgoing_tariff_code = document.getElementById('outgoing_tariff_code').value
    var input_mpan = document.getElementById('input_mpan').value
    var outgoing_mpan = document.getElementById('outgoing_mpan').value
    var serial = document.getElementById('serial').value

    prices_data = new google.visualization.DataTable();
    daily_prices_data = new google.visualization.DataTable();
    data = new google.visualization.DataTable();
    consumption_data = new google.visualization.DataTable();
    cost_data = new google.visualization.DataTable();
    daily_data = new google.visualization.DataTable();
    daily_consumption_data = new google.visualization.DataTable();
    daily_cost_data = new google.visualization.DataTable();

    var from = new Date()
    from.setDate(from.getDate()-28)
    var date_from = from.toISOString().substring(0,10)
    var period_from = date_from + "T00:00Z"

    //var account_url = "https://api.octopus.energy/v1/accounts/" + account + "/"
    var prices_url = "https://api.octopus.energy/v1/products/" + product_code + "/electricity-tariffs/" + tariff_code + "/standard-unit-rates/?period_from=" + period_from + "&page_size=10000"
    var export_prices_url = "https://api.octopus.energy/v1/products/" + outgoing_product_code + "/electricity-tariffs/" + outgoing_tariff_code + "/standard-unit-rates/?period_from=" + period_from + "&page_size=10000"
    var imported_url = "https://api.octopus.energy/v1/electricity-meter-points/" + input_mpan + "/meters/" + serial + "/consumption/?period_from=" + period_from + "&page_size=10000"
    var exported_url = "https://api.octopus.energy/v1/electricity-meter-points/" + outgoing_mpan + "/meters/" + serial + "/consumption/?period_from=" + period_from + "&page_size=10000"

    var xhttp = new XMLHttpRequest();
    //get input prices
    xhttp.open("GET", prices_url, false);
    //xhttp.setRequestHeader("Authorization", "Basic " + btoa(api_key) + ":");
    xhttp.send();	
    response = JSON.parse(xhttp.response);
    for (i=0; i<response.results.length; i++) {
        //process the timestamp
        var timestamp = new Date(response.results[i]["valid_from"]).toLocaleString();
        output[timestamp] = response.results[i];
        var day_timestamp = response.results[i]["valid_from"].substring(0,10)
        if (day_timestamp in daily_info){
          daily_info[day_timestamp]["value_inc_vat"] += Number(response.results[i]["value_inc_vat"])
        }
        else{
          daily_info[day_timestamp] = {}
          daily_info[day_timestamp]["value_inc_vat"] = Number(response.results[i]["value_inc_vat"])
          daily_info[day_timestamp]["export_value_inc_vat"] = 0
          daily_info[day_timestamp]["imported"] = 0
          daily_info[day_timestamp]["import_value"] = 0
          daily_info[day_timestamp]["exported"] = 0
          daily_info[day_timestamp]["export_value"] = 0		  
        }
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
        var day_timestamp = response.results[i]["valid_from"].substring(0,10)
        daily_info[day_timestamp]["export_value_inc_vat"] += Number(response.results[i]["value_inc_vat"])
     }
    //get imported energy
    xhttp.open("GET", imported_url, false);
    xhttp.setRequestHeader("Authorization", "Basic " + btoa(api_key) + ":");
    xhttp.send();	
    response = JSON.parse(xhttp.response);
    for (i=0; i<response.results.length; i++) {
        //process the timestamp
        var timestamp = new Date(response.results[i]["interval_start"]).toLocaleString();
        //    if timestamp in output:
        output[timestamp]["imported"] = response.results[i]["consumption"]
        output[timestamp]["import_value"] = (response.results[i]["consumption"] * output[timestamp]["value_inc_vat"]).toFixed(2)
        var day_timestamp = response.results[i]["interval_start"].substring(0,10)
        daily_info[day_timestamp]["imported"]  += Number(response.results[i]["consumption"])
        daily_info[day_timestamp]["import_value"]  += Number((response.results[i]["consumption"] * output[timestamp]["value_inc_vat"]))
    }    
    
    //get exported energy
    xhttp.open("GET", exported_url, false);
    xhttp.setRequestHeader("Authorization", "Basic " + btoa(api_key) + ":");
    xhttp.send();	
    response = JSON.parse(xhttp.response);
    for (i=0; i<response.results.length; i++) {
        //process the timestamp
        var timestamp = new Date(response.results[i]["interval_start"]).toLocaleString();
        //    if timestamp in output:
        output[timestamp]["exported"] = response.results[i]["consumption"]
        output[timestamp]["export_value"] = (response.results[i]["consumption"] * output[timestamp]["export_value_inc_vat"]).toFixed(2)
        var day_timestamp = response.results[i]["interval_start"].substring(0,10)
        daily_info[day_timestamp]["exported"]  += Number(response.results[i]["consumption"])
        daily_info[day_timestamp]["export_value"]  += Number(response.results[i]["consumption"] * output[timestamp]["value_inc_vat"])
    }

    prices_data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    prices_data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    prices_data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    prices_data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });

    daily_prices_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_prices_data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    daily_prices_data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    daily_prices_data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });

    data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });	
    data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    data.addColumn({ type: 'number', id: 'net_energy_imported', label : 'Net energy imported' });  
    data.addColumn({ type: 'number', id: 'imported_cost', label : 'Import cost' });
    data.addColumn({ type: 'number', id: 'exported_cost', label : 'Export value' });
    data.addColumn({ type: 'number', id: 'net_cost', label : 'Net cost' });
	
    consumption_data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    consumption_data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    consumption_data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    consumption_data.addColumn({ type: 'number', id: 'net_energy_imported', label : 'Net energy imported' });  

    cost_data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    cost_data.addColumn({ type: 'number', id: 'imported_cost', label : 'Import cost' });
    cost_data.addColumn({ type: 'number', id: 'exported_cost', label : 'Export value' });
    cost_data.addColumn({ type: 'number', id: 'net_cost', label : 'Net cost' });

    
    daily_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    daily_data.addColumn({ type: 'number', id: 'imported_cost', label : 'Imported Cost' });
    daily_data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    daily_data.addColumn({ type: 'number', id: 'exported_cost', label : 'Exported Value' });    

    daily_consumption_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_consumption_data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    daily_consumption_data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    daily_consumption_data.addColumn({ type: 'number', id: 'net_energy_imported', label : 'Net energy imported' });  

    daily_cost_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_cost_data.addColumn({ type: 'number', id: 'imported_cost', label : 'Import cost' });
    daily_cost_data.addColumn({ type: 'number', id: 'exported_cost', label : 'Export value' });
    daily_cost_data.addColumn({ type: 'number', id: 'net_cost', label : 'Net cost' });

    var formatter = new Intl.NumberFormat('en-UK', {style: 'currency', currency: 'GBP'});

    Object.entries(output).forEach(function([key, item]) {
        if ("export_value" in item){
            consumption_data.addRow([new Date (item["valid_from"]),
                Number(item["imported"]),
                Number(item["exported"]) * -1,
                Number(item["imported"]) - Number(item["exported"])
            ]);
            cost_data.addRow([new Date (item["valid_from"]),
                {v: Number(item["import_value"]), f: formatter.format(Number(item["import_value"])/100)},
                {v: Number(item["export_value"]) * -1, f: formatter.format(Number(item["export_value"])/100)},
                {v: Number(item["import_value"]) - Number(item["export_value"]), f: formatter.format(Number(item["import_value"]) - Number(item["export_value"])/100)}
            ]);
        }
        prices_data.addRow([new Date (item["valid_from"]),
          {v: Number(item["value_inc_vat"]), f: formatter.format(Number(item["value_inc_vat"])/100)},
          {v: Number(item["export_value_inc_vat"]), f: formatter.format(Number(item["export_value_inc_vat"])/100)},
          {v: Number(item["margin"]), f: formatter.format(Number(item["margin"])/100)}
        ]);      
		data.addRow([new Date (item["valid_from"]),
      Number(item["value_inc_vat"]),
      Number(item["export_value_inc_vat"]),
      Number(item["margin"]),
      Number(item["imported"]),
      Number(item["exported"]),
      Number(item["imported"]) - Number(item["exported"]),
		  Number(item["import_value"]),
      Number(item["export_value"]),
      Number(item["import_value"]) - Number(item["export_value"])		 
        ]);	
    });


    Object.entries(daily_info).forEach(function([key, item]) {
      if ("export_value" in item){ 
        daily_consumption_data.addRow([new Date (key),
                Number(item["imported"]),
                Number(item["exported"]) * -1,
                Number(item["imported"]) - Number(item["exported"])
            ]);
        daily_cost_data.addRow([new Date (key),
                {v: Number(item["import_value"]), f: formatter.format(Number(item["import_value"])/100)},
                {v: Number(item["export_value"]) * -1, f: formatter.format(Number(item["export_value"])/100)},
                {v: Number(item["import_value"]) - Number(item["export_value"]), f: formatter.format((Number(item["import_value"]) - Number(item["export_value"]))/100)}
            ]);       
      }
      else{
        daily_prices_data.addRow([new Date (key),
          {v: Number(item["value_inc_vat"])/48, f: formatter.format(Number(item["value_inc_vat"])/4800)},
          {v: Number(item["export_value_inc_vat"])/48, f: formatter.format(Number(item["export_value_inc_vat"])/4800)},
          {v: Number(item["margin"]), f: formatter.format(Number(item["margin"])/100)}
        ]);
      }
    }); 

    var usageOptions = {
      chart: {title: 'Usage', 'height':800},
      series: {
        // Gives each series an axis name that matches the Y-axis below.
          0: {targetAxisIndex: 0, type: 'bars'},
          1: {targetAxisIndex: 0, type: 'bars'},
          2: {targetAxisIndex: 0, type: 'bars'}         
      },
      vAxes: {0: {title: 'Usage (kWh)'}}
    };    
  
    var costOptions = {
      chart: {title: 'Cost','height':800},
      series: {
          0: {targetAxisIndex: 0, type: 'bars'},
          1: {targetAxisIndex: 0, type: 'bars'},
          2: {targetAxisIndex: 0, type: 'bars'}         
      },
      vAxes: {0: {title: 'Cost (pence)'}}
    };

    var latestCostChart = new google.visualization.ComboChart(document.getElementById('daily_cost_chart_div'));
    latestCostChart.draw(daily_cost_data, costOptions);

    var table = new google.visualization.Table(document.getElementById('daily_cost_table_div'));
    table.draw(daily_cost_data, {showRowNumber: false, width: '100%', height: '100%'}); 

    var latestUsageChart = new google.visualization.ComboChart(document.getElementById('daily_consumption_chart_div'));
    latestUsageChart.draw(daily_consumption_data, usageOptions);    

    var table = new google.visualization.Table(document.getElementById('daily_consumption_table_div'));
    table.draw(daily_consumption_data, {showRowNumber: false, width: '100%', height: '100%'});   

    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate()-1)

    var prices_view = new google.visualization.DataView(prices_data);
    prices_view.setRows(prices_data.getFilteredRows([{column: 0, minValue: new Date()}]));

    var upcomingPricesLineChart = new google.visualization.LineChart(document.getElementById('upcoming_prices_chart_div'));
    upcomingPricesLineChart.draw(prices_view);

    var upcomingPricesTable = new google.visualization.Table(document.getElementById('upcoming_prices_table_div'));
    upcomingPricesTable.draw(prices_view, {showRowNumber: false});    

    var prices_dashboard = new google.visualization.Dashboard(document.getElementById('prices_dashboard_div'));
 
    var pricesRangeSlider = new google.visualization.ControlWrapper({
          'controlType': 'ChartRangeFilter',
          'containerId': 'prices_filter_div',
          'options': {'filterColumnLabel': 'Time'}
    });
    var pricesLineChart  = new google.visualization.ChartWrapper({
          'chartType': 'ComboChart',
          'containerId': 'prices_chart_div',
          'options': {
            chart: {title: 'prices', 'height':800},
            series: {
              0: {axis: 'cost', type: 'line'},
              1: {axis: 'cost', type: 'line'},          
              2: {axis: 'cost', type: 'line'}
            },
            axes: {y: {cost: {label: 'Cost (pence)'}}}
          }
    });        

    prices_dashboard.bind(pricesRangeSlider, pricesLineChart);
    prices_dashboard.draw(prices_data);

    var dashboard = new google.visualization.Dashboard(document.getElementById('dashboard_div'));
 
    var rangeSlider = new google.visualization.ControlWrapper({
          'controlType': 'ChartRangeFilter',
          'containerId': 'usage_filter_div',
          'options': {'filterColumnLabel': 'Time'}
    });
    var lineChart  = new google.visualization.ChartWrapper({
          'chartType': 'ComboChart',
          'containerId': 'usage_chart_div',
          'options': {
            chart: {title: 'Usage', 'height':800},
            series: {
              // Gives each series an axis name that matches the Y-axis below.
                0: {targetAxisIndex: 0, type: 'line'},
                1: {targetAxisIndex: 0, type: 'line'},
                2: {targetAxisIndex: 0, type: 'line'}
            },
            vAxes: {0: {title: 'Usage (kWh)'}}
          }
        });        

      dashboard.bind(rangeSlider, lineChart);
      dashboard.draw(consumption_data);

    var table = new google.visualization.Table(document.getElementById('full_table'));
    table.draw(consumption_data, {showRowNumber: false});
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
	setCookie("api_key", document.getElementById('api_key').value)
	setCookie("product_code", document.getElementById('product_code').value)
	setCookie("tariff_code", document.getElementById('tariff_code').value)
	setCookie("outgoing_product_code", document.getElementById('outgoing_product_code').value)
	setCookie("outgoing_tariff_code", document.getElementById('outgoing_tariff_code').value)
	setCookie("input_mpan", document.getElementById('input_mpan').value)
	setCookie("outgoing_mpan", document.getElementById('outgoing_mpan').value)
	setCookie("serial", document.getElementById('serial').value)
}
function downloadData(){	
  var headers = "timestamp,import_price,export_price,margin,imported,exported,net_import,import_value,export_value,net_value\n";
  var csvFormattedDataTable = google.visualization.dataTableToCsv(data);
  var encodedUri = 'data:application/csv;charset=utf-8,' + headers+ encodeURIComponent(csvFormattedDataTable);
  this.href = encodedUri;
  this.download = "summary.csv";
  this.target = '_blank';
}

function checkSettings(){
	if(getCookie("api_key") == ""){
		alert("set the settings before getting data");
	}
	else{
		document.getElementById('api_key').value = getCookie("api_key");
		document.getElementById('product_code').value = getCookie("product_code");
		document.getElementById('tariff_code').value = getCookie("tariff_code");
		document.getElementById('outgoing_product_code').value = getCookie("outgoing_product_code");
		document.getElementById('outgoing_tariff_code').value = getCookie("outgoing_tariff_code");
		document.getElementById('input_mpan').value = getCookie("input_mpan");
		document.getElementById('outgoing_mpan').value = getCookie("outgoing_mpan");
		document.getElementById('serial').value = getCookie("serial");
		loadData();
	}
}