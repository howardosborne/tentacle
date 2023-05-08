google.charts.load("current", {packages:["table",'line', 'corechart', 'controls']});
//google.charts.setOnLoadCallback(loadData); 

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

    var from = new Date()
    from.setDate(from.getDate()-7)
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
          daily_info[day_timestamp]["consumption"] = 0
          daily_info[day_timestamp]["consumption_cost"] = 0
          daily_info[day_timestamp]["export"] = 0
          daily_info[day_timestamp]["export_earnings"] = 0
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
        output[timestamp]["consumption"] = response.results[i]["consumption"]
        output[timestamp]["consumption_cost"] = (response.results[i]["consumption"] * output[timestamp]["value_inc_vat"]).toFixed(2)
        var day_timestamp = response.results[i]["interval_start"].substring(0,10)
        daily_info[day_timestamp]["consumption"]  += Number(response.results[i]["consumption"])
        daily_info[day_timestamp]["consumption_cost"]  += Number((response.results[i]["consumption"] * output[timestamp]["value_inc_vat"]))
        console.log(daily_info[day_timestamp])
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
        output[timestamp]["export"] = response.results[i]["consumption"]
        output[timestamp]["export_earnings"] = (response.results[i]["consumption"] * output[timestamp]["export_value_inc_vat"]).toFixed(2)
        var day_timestamp = response.results[i]["interval_start"].substring(0,10)
        daily_info[day_timestamp]["export"]  += Number(response.results[i]["consumption"])
        daily_info[day_timestamp]["export_earnings"]  += Number(response.results[i]["consumption"] * output[timestamp]["value_inc_vat"])
        console.log(daily_info[day_timestamp])
    }

    var prices_data = new google.visualization.DataTable();
    prices_data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    prices_data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    prices_data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    prices_data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });

    var daily_prices_data = new google.visualization.DataTable();
    daily_prices_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_prices_data.addColumn({ type: 'number', id: 'import_price', label : 'Import Price'});
    daily_prices_data.addColumn({ type: 'number', id: 'export_price', label : 'Export Price' });
    daily_prices_data.addColumn({ type: 'number', id: 'margin', label : 'Margin' });

    var data = new google.visualization.DataTable();
    data.addColumn({ type: 'datetime', id: 'timestamp', label : 'Time'});
    data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    data.addColumn({ type: 'number', id: 'imported_cost', label : 'Imported Cost' });
    data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    data.addColumn({ type: 'number', id: 'exported_cost', label : 'Exported Value' });  
  
    var daily_data = new google.visualization.DataTable();
    daily_data.addColumn({ type: 'date', id: 'timestamp', label : 'Day'});
    daily_data.addColumn({ type: 'number', id: 'imported', label : 'Imported' });
    daily_data.addColumn({ type: 'number', id: 'imported_cost', label : 'Imported Cost' });
    daily_data.addColumn({ type: 'number', id: 'exported', label : 'Exported' });
    daily_data.addColumn({ type: 'number', id: 'exported_cost', label : 'Exported Value' });    
    var formatter = new Intl.NumberFormat('en-UK', {style: 'currency', currency: 'GBP'});
    //for each day need sum of costs
    Object.entries(output).forEach(function([key, item]) {
        if ("export_earnings" in item){
            data.addRow([new Date (item["valid_from"]),
                Number(item["consumption"]),
                {v: Number(item["consumption_cost"]), f: formatter.format(Number(item["consumption_cost"])/100)},
                Number(item["export"]) * -1,
                {v: Number(item["export_earnings"]) * -1, f: formatter.format(Number(item["export_earnings"])/100)}
            ]);
                       
        }
        prices_data.addRow([new Date (item["valid_from"]),
          {v: Number(item["value_inc_vat"]), f: formatter.format(Number(item["value_inc_vat"])/100)},
          {v: Number(item["export_value_inc_vat"]), f: formatter.format(Number(item["export_value_inc_vat"])/100)},
          {v: Number(item["margin"]), f: formatter.format(Number(item["margin"])/100)}
        ]);               
    });

    Object.entries(daily_info).forEach(function([key, item]) {
      if ("export_earnings" in item){ 
        daily_data.addRow([new Date (key),
          Number(item["consumption"]),
          {v: Number(item["consumption_cost"]), f: formatter.format(Number(item["consumption_cost"])/100)},
          Number(item["export"]) * -1,
          {v: Number(item["export_earnings"]) * -1, f: formatter.format(Number(item["export_earnings"])/100)}
        ]); 
      }
      else{
        daily_prices_data.addRow([new Date (key),
          {v: Number(item["value_inc_vat"])/48, f: formatter.format(Number(item["value_inc_vat"])/4800)},
          {v: Number(item["export_value_inc_vat"])/48, f: formatter.format(Number(item["export_value_inc_vat"])/4800)}
        ]);
      }
    }); 

    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate()-1)

/*    var usageOptions = {
      chart: {
        title: 'Usage'
      },
      series: {
        // Gives each series an axis name that matches the Y-axis below.
          0: {axis: 'usage', type: 'bars'},
          2: {axis: 'usage', type: 'bars'},
          1: {axis: 'cost', type: 'steppedArea'},          
          3: {axis: 'cost', type: 'steppedArea'}
      },
      axes: {
        y: {
          usage: {label: 'Usage (kWh)'},
          cost: {label: 'Cost (pence)'}
        }
      }
    };    
  

    var latestUsageChart = new google.visualization.ComboChart(document.getElementById('summary_usage_chart_div'));
    latestUsageChart.draw(daily_data, usageOptions);    
*/
  var usageOptions = {
    chart: {
      title: 'Usage'
    },
    series: {
      // Gives each series an axis name that matches the Y-axis below.
        0: {axis: 'usage'},
        1: {axis: 'cost'},          
        2: {axis: 'usage'},
        3: {axis: 'cost'}
    },
    axes: {
      y: {
        usage: {label: 'Usage (kWh)'},
        cost: {label: 'Cost (pence)'}
      }
    }
  };    


  var latestUsageChart = new google.visualization.Line(document.getElementById('summary_usage_chart_div'));
  latestUsageChart.draw(daily_data, usageOptions);  

  var table = new google.visualization.Table(document.getElementById('summary_usage_table_div'));
    table.draw(daily_data, {showRowNumber: false, width: '100%', height: '100%'});   

    // Create a dashboard.
    var prices_dashboard = new google.visualization.Dashboard(document.getElementById('prices_dashboard_div'));
 
    // Create a range slider, passing some options
        var pricesRangeSlider = new google.visualization.ControlWrapper({
          'controlType': 'ChartRangeFilter',
          'containerId': 'prices_filter_div',
          'options': {
            'filterColumnLabel': 'Time'
          }
        });
        var pricesLineChart  = new google.visualization.ChartWrapper({
          'chartType': 'ComboChart',
          'containerId': 'prices_chart_div',
          'options': {
            chart: {title: 'prices'},
            series: {
            // Gives each series an axis name that matches the Y-axis below.      
            0: {axis: 'import', type: 'line'},
            1: {axis: 'export', type: 'line'},          
            2: {axis: 'margin', type: 'line'}
            },
            axes: {
                // Adds labels to each axis; they don't have to match the axis names.
                y: {
                cost: {label: 'Cost (pence)'},
                }
            }
            }
        });        

      prices_dashboard.bind(pricesRangeSlider, pricesLineChart);
      prices_dashboard.draw(prices_data);

        // Create a dashboard.
        var dashboard = new google.visualization.Dashboard(document.getElementById('dashboard_div'));
 
        // Create a range slider, passing some options
        var rangeSlider = new google.visualization.ControlWrapper({
          'controlType': 'ChartRangeFilter',
          'containerId': 'usage_filter_div',
          'options': {
            'filterColumnLabel': 'Time'
          }
        });
        var lineChart  = new google.visualization.ChartWrapper({
          'chartType': 'ComboChart',
          'containerId': 'usage_chart_div',
          'options': {
            chart: {title: 'Cost vs Usage'},
            //width: '100%', height: 500,
            series: {
                // Gives each series an axis name that matches the Y-axis below.      
                0: {axis: 'usage', type: 'line'},
                1: {axis: 'cost', type: 'steppedArea'},          
                2: {axis: 'usage', type: 'line'},
                3: {axis: 'cost', type: 'steppedArea'}
            },
            axes: {
                // Adds labels to each axis; they don't have to match the axis names.
                y: {
                usage: {label: 'Usage (kWh)'},
                cost: {label: 'Cost (pence)'}
                }
            }
            }
        });        

      dashboard.bind(rangeSlider, lineChart);
      dashboard.draw(data);

    var table = new google.visualization.Table(document.getElementById('full_table'));
    table.draw(data, {showRowNumber: false, width: '100%', height: '100%'});
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