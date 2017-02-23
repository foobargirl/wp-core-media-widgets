<?php
/**
 * Plugin Name: WP Media Widget
 * Version: 0.1.0
 * Description: Adding images to your widget areas is a common, yet currently incredibly tedious task -- you need to upload it in your media library, find the url, copy the url, and then manually add an image tag inside of a text widget. That's a lot to ask for a beginner user to do. We should include a default image widget in core to make this task easier.
 * Author: WordPress.org
 * Plugin URI: https://core.trac.wordpress.org/ticket/32417
 * Domain Path: /languages
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 */

/**
 * Register widget scripts.
 *
 * @param WP_Scripts $scripts
 */
function wp32417_default_scripts( WP_Scripts $scripts ) {
	$scripts->add( 'wp-media-widget', plugin_dir_url( __FILE__ ) . 'wp-media-widget.js', array( 'jquery', 'media-models', 'media-views', 'wp-mediaelement' ) );
}
add_action( 'wp_default_scripts', 'wp32417_default_scripts' );

/**
 * Register widget styles.
 *
 * @param WP_Styles $styles
 */
function wp32417_default_styles( WP_Styles $styles ) {
	$styles->add( 'wp-media-widget', plugin_dir_url( __FILE__ ) . 'wp-media-widget.css', array( 'media-views' ) );
}
add_action( 'wp_default_styles', 'wp32417_default_styles' );

/**
 * Register widget.
 */
function wp32417_widgets_init() {
	require_once( __DIR__ . '/class-wp-widget-media.php' );
	register_widget( 'WP_Widget_Media' );
}
add_action( 'widgets_init', 'wp32417_widgets_init' );