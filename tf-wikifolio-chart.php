<?php
/*
Plugin Name: TF-wikifolio-Chart
Plugin URI: http://TrendFollowing.de/wikifolio-chart-plugin/
Description: Ein kleines Plugin welches Shortcodes zum einbinden von wikifolio Charts bereitstellt.
Author: cspiegl
Author URI: http://TrendFollowing.de/
License: GPLv2 or later
Version: 0.1
*/

defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

function tfwcShortCode($atts, $content = null) {

  $data = shortcode_atts(array(
    "name-display" => null,
    "name" => null, // must be something like: 6fe7be5c-73eb-46fd-a888-f78d57beae03
    "date-from" => null,
    "date-to" => null,
    "last-days" => null,
  ), $atts);
  $data = array(
    "nameDisplay" => $data["name-display"],
    "name" => $data["name"],
    "dateFrom" => $data["date-from"],
    "dateTo" => $data["date-to"],
    "lastDays" => $data["last-days"],
  );
  foreach ($data as $key => $value) {
    if ($data[$key] && $data[$key] != null) $dataJson[$key] = $value;
  }
  $dataJson = json_encode($dataJson);
  return "<div class='tfwc-outer-container'><canvas class='tfwc-canvas' data-tfwc-options='$dataJson' style='width:100%;height:100%'></canvas></div>";
}
add_shortcode("tfwc", "tfwcShortCode");
add_shortcode("tf-wikifolio-chart", "tfwcShortCode");

function tfwcEnqueScripts() {
  wp_register_script('momentjs', plugins_url('moment.min.js', __FILE__), array('jquery'),'1', true);
  wp_register_script('chartjs', plugins_url('Chart.min.js', __FILE__), array('jquery'),'1', true);
  wp_register_script('tfwc-core', plugins_url('tfwc.js', __FILE__), array('jquery', 'momentjs', 'chartjs'),'1', true);
  wp_enqueue_script('momentjs');
  wp_enqueue_script('chartjs');
  wp_enqueue_script('tfwc-core');
}
add_action('wp_enqueue_scripts', 'tfwcEnqueScripts');

function tfwcProxy(WP_REST_Request $request) {
  $key = $request['key'];
  $cache_file = 'tfwc_' . $key . '.cache';
  $cache_dir = plugin_dir_path( __FILE__ );
  $cache_path = $cache_dir . '/' . $cache_file;
  $response_body = "";
  if (file_exists($cache_path) && (filemtime($cache_path) > (time() - 60 * 60))) {
     // Cache file is less than one hour old.
     // Don't bother refreshing, just use the file as-is.
     $response_body = file_get_contents($cache_path);
  } else {
     // Our cache is out-of-date, so load the data from our remote server,
     // and also save it over our cache for next time.
     $url = 'https://www.wikifolio.com/umbraco/surface/chart/getchartdata';
     $file = file_get_contents($url);
     $args = array(
        'method' => 'POST',
        'timeout' => '5',
        'httpversion' => 1.0,
        'blocking' => true,
        'body' => array(
          'wikifolioID' => $key,
          'duration' => -1,
          'chartingPeriod' => 4
        ),
        'headers' => array(
          "Cache-Control" => "no-cache"
        )
      );

      $response = wp_remote_post($url, $args);

      if (is_wp_error($response)) {
        $error_message = $response->get_error_message();
        echo "Something went wrong: $error_message";
        return;
      }
      file_put_contents($cache_path, $response['body'], LOCK_EX);
      $response_body = $response['body'];
  }
  return new WP_REST_Response(json_decode($response_body), 200 );
}

function tfwcRegisterAPI() {
  register_rest_route('tfwc/v1', '/proxy', array(
    'methods' => 'GET',
    'callback' => 'tfwcProxy',
    'args' => array(
      'key' => array(
        'required' => true,
      ),
    ),
  ));
}
add_action('rest_api_init', 'tfwcRegisterAPI');
