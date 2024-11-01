jQuery(document).ready(function($){
  $canvases = $(".tfwc-canvas");
  $.tfwc = {};

  $.tfwc.drawGraph = function(results, dataFromDIV) {
    $canvas = dataFromDIV.$canvas;
    timestamps = [];
    values = [];
    inside = false;
    for (var i = results.Timestamps.length - 1; i >= 0; i--) {
      if ((moment(results.Timestamps[i])).isBetween(dataFromDIV.dateFrom.clone().subtract(1, 'day'), dataFromDIV.dateTo.clone().add(1, 'day'), 'day')) {
        timestamps.push(results.Timestamps[i]);
        values.push(results.Values[i]);
        inside = true;
      } else if (inside === true) {
        break;
      }
    }
    var yAxesTickMagicToggle = false;
    dataForGraph = {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [{
          label: dataFromDIV.nameDisplay,
          fill: false,
          borderColor: 'rgba(148,195,0,1)',
          pointBorderWidth: false,
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'transparent',
          tension: 0.05,
          data: values,
        }],
      },
      options: {
        responsive: true,
        legend: {
          display: false,
          position: 'bottom',
          fontFamily: "Calibri, Candara, Segoe, 'Segoe UI', Optima, -apple-system, '.SFNSText-Regular', 'San Francisco', 'Oxygen', 'Ubuntu', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif",
          fontStyle: "300",
        },
        hover: {
          mode: 'label'
        },
        scales: {
          xAxes: [{
            display: true,
            type: 'time',
            time: {
              round: 'day',
              displayFormats: {
                'millisecond': 'SSS [ms]',
                'second': 'h:mm:ss a', // 11:20:01 AM
                'minute': 'h:mm:ss a', // 11:20:01 AM
                'hour': 'DD.MM.YY', // Sept 4, 5PM
                'day': 'DD.MM.YY', // Sep 4 2015
                'week': 'DD.MM.YY', // Week 46, or maybe "[W]WW - YYYY" ?
                'month': 'MMM YY', // Sept 2015
                'quarter': '[Q]Q YY', // Q3
                'year': 'YYYY', // 2015
              },
              tooltipFormat: 'DD.MM.YY'
            },
            ticks: {
              fontFamily: "Calibri, Candara, Segoe, 'Segoe UI', Optima, -apple-system, '.SFNSText-Regular', 'San Francisco', 'Oxygen', 'Ubuntu', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif",
              fontStyle: "300",
              maxRotation: 15,
              autoSkip: true,
            },
          }],
          yAxes: [{
            display: true,
            type: 'linear',
            beforeBuildTicks: function(scale) {
              if (scale.ticks) {
                var ticks = scale.ticksAsNumbers;
                for (var i = ticks.length - 1; i >= 0; i--) {
                  if (ticks[i] !== Math.floor(ticks[i])) {
                    // if the ticks contain one non integer value, then show all the data with one comma place
                    yAxesTickMagicToggle = true;
                    break;
                  }
                }
              }
            },
            ticks: {
              fontFamily: "Calibri, Candara, Segoe, 'Segoe UI', Optima, -apple-system, '.SFNSText-Regular', 'San Francisco', 'Oxygen', 'Ubuntu', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif",
              fontStyle: "300",
              callback: function(tickValue, index, ticks) {
                if (yAxesTickMagicToggle == true) {
                  tickValue = tickValue.toFixed(1);
                }
                return tickValue;
              }
            },
          }]
        },
        title: {
          display: (dataFromDIV.nameDisplay && dataFromDIV.nameDisplay !== null) ? true : false,
          text: dataFromDIV.nameDisplay,
          fontFamily: "Calibri, Candara, Segoe, 'Segoe UI', Optima, -apple-system, '.SFNSText-Regular', 'San Francisco', 'Oxygen', 'Ubuntu', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif",
          fontStyle: "600",
        }
      }
    };
    var ctx = $canvas.get(0).getContext("2d");
    myLine = new Chart(ctx, dataForGraph);
  }

  $.tfwc.createCache = function(requestFunction) {
    var cache = {};
    return function(key, callback) {
      if (!cache[key]) {
        cache[key] = $.Deferred(function(defer) {
          requestFunction(defer, key);
        }).promise();
      }
      return cache[key].done(callback);
    };
  };

  $.tfwc.cachedGetJSON = $.tfwc.createCache(function(defer, url) {
      $.ajax({
        type: 'GET',
        url: url,
      }).then(defer.resolve, defer.reject);
  });

  $.each($canvases, function(index) {
    $canvas = $(this);
    var dataFromDIV = {
      nameDisplay: '',
      name: '',
      dateFrom: null,
      dateTo: new Date(),
      lastDays: 30,
      $canvas: $canvas,
    }
    $.extend(dataFromDIV, $canvas.data('tfwcOptions'));
    dataFromDIV.dateTo = moment(new Date(dataFromDIV.dateTo));
    if (dataFromDIV.dateFrom && dataFromDIV !== "") {
      dataFromDIV.dateFrom = moment(new Date(dataFromDIV.dateFrom));
    }
    dataFromDIV.lastDays = parseInt(dataFromDIV.lastDays);
    if (!dataFromDIV.dateFrom && dataFromDIV.lastDays) {
      dataFromDIV.dateFrom = dataFromDIV.dateTo.clone().subtract(dataFromDIV.lastDays, 'days');
    }

    var url = '/wp-json/tfwc/v1/proxy?key=' + dataFromDIV.name;
    $.tfwc.cachedGetJSON(url).then(function(results){
      $.tfwc.drawGraph(results, dataFromDIV)
    }, function(results){
      console.error('Requesting data for graph failed.');
    });


  });
});
