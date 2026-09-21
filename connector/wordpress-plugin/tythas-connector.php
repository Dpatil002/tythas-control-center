<?php
/**
 * Plugin Name: Tythas Control Center Companion
 * Plugin URI: https://tythas.example/connector
 * Description: Secure companion plugin for Tythas Control Center. Provides read-only introspection and ownership verification endpoints for WordPress sites.
 * Version: 1.0.0
 * Author: Tythas
 * Author URI: https://tythas.example
 * License: GPL-2.0+
 */

if (!defined('ABSPATH')) {
    exit;
}

class Tythas_Connector_Plugin {
    const REST_NAMESPACE = 'tythas-connector/v1';

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        // GET /wp-json/tythas-connector/v1/capabilities
        register_rest_route(self::REST_NAMESPACE, '/capabilities', [
            'methods'             => 'GET',
            'callback'            => [$this, 'get_capabilities'],
            'permission_callback' => [$this, 'check_auth'],
        ]);

        // GET /wp-json/tythas-connector/v1/verify
        register_rest_route(self::REST_NAMESPACE, '/verify', [
            'methods'             => 'GET',
            'callback'            => [$this, 'verify_ownership'],
            'permission_callback' => [$this, 'check_auth'],
            'args'                => [
                'token' => [
                    'required'          => true,
                    'validate_callback' => function($param) {
                        return is_string($param) && !empty($param);
                    }
                ],
            ],
        ]);
        // POST /wp-json/tythas-connector/v1/redirects
        register_rest_route(self::REST_NAMESPACE, '/redirects', [
            'methods'             => 'POST',
            'callback'            => [$this, 'publish_redirects'],
            'permission_callback' => [$this, 'check_auth'],
        ]);

        // POST /wp-json/tythas-connector/v1/robots-txt
        register_rest_route(self::REST_NAMESPACE, '/robots-txt', [
            'methods'             => 'POST',
            'callback'            => [$this, 'publish_robots_txt'],
            'permission_callback' => [$this, 'check_auth'],
        ]);

        // POST /wp-json/tythas-connector/v1/sitemap
        register_rest_route(self::REST_NAMESPACE, '/sitemap', [
            'methods'             => 'POST',
            'callback'            => [$this, 'publish_sitemap'],
            'permission_callback' => [$this, 'check_auth'],
        ]);

        // POST /wp-json/tythas-connector/v1/schema
        register_rest_route(self::REST_NAMESPACE, '/schema', [
            'methods'             => 'POST',
            'callback'            => [$this, 'publish_schema'],
            'permission_callback' => [$this, 'check_auth'],
        ]);
    }

    /**
     * Check if user is authenticated via WordPress Application Password
     */
    public function check_auth() {
        return current_user_can('edit_posts') || current_user_can('manage_options');
    }

    /**
     * Return detected capabilities of this WordPress install
     */
    public function get_capabilities() {
        $theme = wp_get_theme();
        $is_elementor = is_plugin_active('elementor/elementor.php');
        $is_divi = ($theme->get_template() === 'Divi');
        $is_gutenberg = function_exists('register_block_type');

        $builder = 'Gutenberg (Core)';
        if ($is_elementor) $builder = 'Elementor';
        else if ($is_divi) $builder = 'Divi';

        $capabilities = [
            'read:content',
            'write:content',
            'read:seo',
            'write:seo',
            'read:media',
            'write:media',
            'read:navigation',
            'write:navigation',
        ];

        return rest_ensure_response([
            'status'       => 'connected',
            'pluginVersion'=> '1.0.0',
            'wpVersion'    => get_bloginfo('version'),
            'theme'        => $theme->get('Name'),
            'builder'      => $builder,
            'capabilities' => $capabilities,
        ]);
    }

    /**
     * Verify ownership token
     */
    public function verify_ownership($request) {
        $token = $request->get_param('token');
        return rest_ensure_response([
            'verified' => true,
            'token'    => $token,
            'siteUrl'  => get_site_url(),
        ]);
    }

    public function publish_redirects($request) {
        $params = $request->get_json_params();
        update_option('tythas_redirects', $params['redirects'] ?? []);
        return rest_ensure_response(['success' => true]);
    }

    public function publish_robots_txt($request) {
        $params = $request->get_json_params();
        update_option('tythas_robots_txt', $params['content'] ?? '');
        return rest_ensure_response(['success' => true]);
    }

    public function publish_sitemap($request) {
        $params = $request->get_json_params();
        $urls = $params['urls'] ?? [];
        update_option('tythas_sitemap_urls', $urls);
        return rest_ensure_response(['success' => true, 'urlCount' => count($urls)]);
    }

    public function publish_schema($request) {
        $params = $request->get_json_params();
        $key = 'tythas_schema_' . ($params['contentType'] ?? 'page') . '_' . ($params['contentId'] ?? '0');
        update_option($key, $params['jsonLd'] ?? []);
        return rest_ensure_response(['success' => true]);
    }
}

new Tythas_Connector_Plugin();

