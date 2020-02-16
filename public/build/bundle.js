
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.18.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/WeatherWidget.svelte generated by Svelte v3.18.2 */

    const file = "src/WeatherWidget.svelte";

    // (34:0) {#if $weatherData}
    function create_if_block(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let t1_value = /*$locationData*/ ctx[3].city + "";
    	let t1;
    	let t2;
    	let t3_value = /*$locationData*/ ctx[3].region_code + "";
    	let t3;
    	let t4;
    	let div1;
    	let p;
    	let t5_value = Math.round(/*$weatherData*/ ctx[2].main.temp) + "";
    	let t5;
    	let t6;
    	let t7;
    	let img;
    	let img_src_value;
    	let t8;
    	let div2;
    	let t9;
    	let t10_value = Math.round(/*$weatherData*/ ctx[2].main.feels_like) + "";
    	let t10;
    	let t11;
    	let t12;
    	let div3;
    	let t13;
    	let t14_value = Math.round(/*$weatherData*/ ctx[2].wind.speed) + "";
    	let t14;
    	let t15;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text("Weather in ");
    			t1 = text(t1_value);
    			t2 = text(", ");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			p = element("p");
    			t5 = text(t5_value);
    			t6 = text("ºF");
    			t7 = space();
    			img = element("img");
    			t8 = space();
    			div2 = element("div");
    			t9 = text("Feels like ");
    			t10 = text(t10_value);
    			t11 = text("ºF");
    			t12 = space();
    			div3 = element("div");
    			t13 = text("Wind speed: ");
    			t14 = text(t14_value);
    			t15 = text(" mph");
    			attr_dev(div0, "class", "location svelte-1h2hypl");
    			add_location(div0, file, 35, 4, 633);
    			add_location(p, file, 39, 8, 770);
    			if (img.src !== (img_src_value = `http://openweathermap.org/img/wn/${/*$weatherData*/ ctx[2].weather[0].icon}@2x.png`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "ok so remind me again why i need to add alt text");
    			attr_dev(img, "class", "svelte-1h2hypl");
    			add_location(img, file, 40, 8, 824);
    			attr_dev(div1, "class", "weather svelte-1h2hypl");
    			add_location(div1, file, 38, 4, 740);
    			attr_dev(div2, "class", "subtext svelte-1h2hypl");
    			add_location(div2, file, 42, 4, 980);
    			attr_dev(div3, "class", "subtext svelte-1h2hypl");
    			add_location(div3, file, 45, 4, 1081);
    			attr_dev(div4, "class", "weather-widget svelte-1h2hypl");
    			add_location(div4, file, 34, 0, 600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			append_dev(div1, p);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(div1, t7);
    			append_dev(div1, img);
    			append_dev(div4, t8);
    			append_dev(div4, div2);
    			append_dev(div2, t9);
    			append_dev(div2, t10);
    			append_dev(div2, t11);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			append_dev(div3, t13);
    			append_dev(div3, t14);
    			append_dev(div3, t15);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$locationData*/ 8 && t1_value !== (t1_value = /*$locationData*/ ctx[3].city + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$locationData*/ 8 && t3_value !== (t3_value = /*$locationData*/ ctx[3].region_code + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$weatherData*/ 4 && t5_value !== (t5_value = Math.round(/*$weatherData*/ ctx[2].main.temp) + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*$weatherData*/ 4 && img.src !== (img_src_value = `http://openweathermap.org/img/wn/${/*$weatherData*/ ctx[2].weather[0].icon}@2x.png`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*$weatherData*/ 4 && t10_value !== (t10_value = Math.round(/*$weatherData*/ ctx[2].main.feels_like) + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*$weatherData*/ 4 && t14_value !== (t14_value = Math.round(/*$weatherData*/ ctx[2].wind.speed) + "")) set_data_dev(t14, t14_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(34:0) {#if $weatherData}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let if_block = /*$weatherData*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$weatherData*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $weatherData,
    		$$unsubscribe_weatherData = noop,
    		$$subscribe_weatherData = () => ($$unsubscribe_weatherData(), $$unsubscribe_weatherData = subscribe(weatherData, $$value => $$invalidate(2, $weatherData = $$value)), weatherData);

    	let $locationData,
    		$$unsubscribe_locationData = noop,
    		$$subscribe_locationData = () => ($$unsubscribe_locationData(), $$unsubscribe_locationData = subscribe(locationData, $$value => $$invalidate(3, $locationData = $$value)), locationData);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_weatherData());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_locationData());
    	let { weatherData } = $$props;
    	validate_store(weatherData, "weatherData");
    	$$subscribe_weatherData();
    	let { locationData } = $$props;
    	validate_store(locationData, "locationData");
    	$$subscribe_locationData();
    	const writable_props = ["weatherData", "locationData"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WeatherWidget> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("weatherData" in $$props) $$subscribe_weatherData($$invalidate(0, weatherData = $$props.weatherData));
    		if ("locationData" in $$props) $$subscribe_locationData($$invalidate(1, locationData = $$props.locationData));
    	};

    	$$self.$capture_state = () => {
    		return {
    			weatherData,
    			locationData,
    			$weatherData,
    			$locationData
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("weatherData" in $$props) $$subscribe_weatherData($$invalidate(0, weatherData = $$props.weatherData));
    		if ("locationData" in $$props) $$subscribe_locationData($$invalidate(1, locationData = $$props.locationData));
    		if ("$weatherData" in $$props) weatherData.set($weatherData = $$props.$weatherData);
    		if ("$locationData" in $$props) locationData.set($locationData = $$props.$locationData);
    	};

    	return [weatherData, locationData, $weatherData, $locationData];
    }

    class WeatherWidget extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { weatherData: 0, locationData: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeatherWidget",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*weatherData*/ ctx[0] === undefined && !("weatherData" in props)) {
    			console.warn("<WeatherWidget> was created without expected prop 'weatherData'");
    		}

    		if (/*locationData*/ ctx[1] === undefined && !("locationData" in props)) {
    			console.warn("<WeatherWidget> was created without expected prop 'locationData'");
    		}
    	}

    	get weatherData() {
    		throw new Error("<WeatherWidget>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weatherData(value) {
    		throw new Error("<WeatherWidget>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get locationData() {
    		throw new Error("<WeatherWidget>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set locationData(value) {
    		throw new Error("<WeatherWidget>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var js_cookie = createCommonjsModule(function (module, exports) {
    (function (factory) {
    	var registeredInModuleLoader;
    	{
    		module.exports = factory();
    		registeredInModuleLoader = true;
    	}
    	if (!registeredInModuleLoader) {
    		var OldCookies = window.Cookies;
    		var api = window.Cookies = factory();
    		api.noConflict = function () {
    			window.Cookies = OldCookies;
    			return api;
    		};
    	}
    }(function () {
    	function extend () {
    		var i = 0;
    		var result = {};
    		for (; i < arguments.length; i++) {
    			var attributes = arguments[ i ];
    			for (var key in attributes) {
    				result[key] = attributes[key];
    			}
    		}
    		return result;
    	}

    	function decode (s) {
    		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
    	}

    	function init (converter) {
    		function api() {}

    		function set (key, value, attributes) {
    			if (typeof document === 'undefined') {
    				return;
    			}

    			attributes = extend({
    				path: '/'
    			}, api.defaults, attributes);

    			if (typeof attributes.expires === 'number') {
    				attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
    			}

    			// We're using "expires" because "max-age" is not supported by IE
    			attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

    			try {
    				var result = JSON.stringify(value);
    				if (/^[\{\[]/.test(result)) {
    					value = result;
    				}
    			} catch (e) {}

    			value = converter.write ?
    				converter.write(value, key) :
    				encodeURIComponent(String(value))
    					.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

    			key = encodeURIComponent(String(key))
    				.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
    				.replace(/[\(\)]/g, escape);

    			var stringifiedAttributes = '';
    			for (var attributeName in attributes) {
    				if (!attributes[attributeName]) {
    					continue;
    				}
    				stringifiedAttributes += '; ' + attributeName;
    				if (attributes[attributeName] === true) {
    					continue;
    				}

    				// Considers RFC 6265 section 5.2:
    				// ...
    				// 3.  If the remaining unparsed-attributes contains a %x3B (";")
    				//     character:
    				// Consume the characters of the unparsed-attributes up to,
    				// not including, the first %x3B (";") character.
    				// ...
    				stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
    			}

    			return (document.cookie = key + '=' + value + stringifiedAttributes);
    		}

    		function get (key, json) {
    			if (typeof document === 'undefined') {
    				return;
    			}

    			var jar = {};
    			// To prevent the for loop in the first place assign an empty array
    			// in case there are no cookies at all.
    			var cookies = document.cookie ? document.cookie.split('; ') : [];
    			var i = 0;

    			for (; i < cookies.length; i++) {
    				var parts = cookies[i].split('=');
    				var cookie = parts.slice(1).join('=');

    				if (!json && cookie.charAt(0) === '"') {
    					cookie = cookie.slice(1, -1);
    				}

    				try {
    					var name = decode(parts[0]);
    					cookie = (converter.read || converter)(cookie, name) ||
    						decode(cookie);

    					if (json) {
    						try {
    							cookie = JSON.parse(cookie);
    						} catch (e) {}
    					}

    					jar[name] = cookie;

    					if (key === name) {
    						break;
    					}
    				} catch (e) {}
    			}

    			return key ? jar[key] : jar;
    		}

    		api.set = set;
    		api.get = function (key) {
    			return get(key, false /* read as raw */);
    		};
    		api.getJSON = function (key) {
    			return get(key, true /* read as json */);
    		};
    		api.remove = function (key, attributes) {
    			set(key, '', extend(attributes, {
    				expires: -1
    			}));
    		};

    		api.defaults = {};

    		api.withConverter = init;

    		return api;
    	}

    	return init(function () {});
    }));
    });

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var colorName = {
    	"aliceblue": [240, 248, 255],
    	"antiquewhite": [250, 235, 215],
    	"aqua": [0, 255, 255],
    	"aquamarine": [127, 255, 212],
    	"azure": [240, 255, 255],
    	"beige": [245, 245, 220],
    	"bisque": [255, 228, 196],
    	"black": [0, 0, 0],
    	"blanchedalmond": [255, 235, 205],
    	"blue": [0, 0, 255],
    	"blueviolet": [138, 43, 226],
    	"brown": [165, 42, 42],
    	"burlywood": [222, 184, 135],
    	"cadetblue": [95, 158, 160],
    	"chartreuse": [127, 255, 0],
    	"chocolate": [210, 105, 30],
    	"coral": [255, 127, 80],
    	"cornflowerblue": [100, 149, 237],
    	"cornsilk": [255, 248, 220],
    	"crimson": [220, 20, 60],
    	"cyan": [0, 255, 255],
    	"darkblue": [0, 0, 139],
    	"darkcyan": [0, 139, 139],
    	"darkgoldenrod": [184, 134, 11],
    	"darkgray": [169, 169, 169],
    	"darkgreen": [0, 100, 0],
    	"darkgrey": [169, 169, 169],
    	"darkkhaki": [189, 183, 107],
    	"darkmagenta": [139, 0, 139],
    	"darkolivegreen": [85, 107, 47],
    	"darkorange": [255, 140, 0],
    	"darkorchid": [153, 50, 204],
    	"darkred": [139, 0, 0],
    	"darksalmon": [233, 150, 122],
    	"darkseagreen": [143, 188, 143],
    	"darkslateblue": [72, 61, 139],
    	"darkslategray": [47, 79, 79],
    	"darkslategrey": [47, 79, 79],
    	"darkturquoise": [0, 206, 209],
    	"darkviolet": [148, 0, 211],
    	"deeppink": [255, 20, 147],
    	"deepskyblue": [0, 191, 255],
    	"dimgray": [105, 105, 105],
    	"dimgrey": [105, 105, 105],
    	"dodgerblue": [30, 144, 255],
    	"firebrick": [178, 34, 34],
    	"floralwhite": [255, 250, 240],
    	"forestgreen": [34, 139, 34],
    	"fuchsia": [255, 0, 255],
    	"gainsboro": [220, 220, 220],
    	"ghostwhite": [248, 248, 255],
    	"gold": [255, 215, 0],
    	"goldenrod": [218, 165, 32],
    	"gray": [128, 128, 128],
    	"green": [0, 128, 0],
    	"greenyellow": [173, 255, 47],
    	"grey": [128, 128, 128],
    	"honeydew": [240, 255, 240],
    	"hotpink": [255, 105, 180],
    	"indianred": [205, 92, 92],
    	"indigo": [75, 0, 130],
    	"ivory": [255, 255, 240],
    	"khaki": [240, 230, 140],
    	"lavender": [230, 230, 250],
    	"lavenderblush": [255, 240, 245],
    	"lawngreen": [124, 252, 0],
    	"lemonchiffon": [255, 250, 205],
    	"lightblue": [173, 216, 230],
    	"lightcoral": [240, 128, 128],
    	"lightcyan": [224, 255, 255],
    	"lightgoldenrodyellow": [250, 250, 210],
    	"lightgray": [211, 211, 211],
    	"lightgreen": [144, 238, 144],
    	"lightgrey": [211, 211, 211],
    	"lightpink": [255, 182, 193],
    	"lightsalmon": [255, 160, 122],
    	"lightseagreen": [32, 178, 170],
    	"lightskyblue": [135, 206, 250],
    	"lightslategray": [119, 136, 153],
    	"lightslategrey": [119, 136, 153],
    	"lightsteelblue": [176, 196, 222],
    	"lightyellow": [255, 255, 224],
    	"lime": [0, 255, 0],
    	"limegreen": [50, 205, 50],
    	"linen": [250, 240, 230],
    	"magenta": [255, 0, 255],
    	"maroon": [128, 0, 0],
    	"mediumaquamarine": [102, 205, 170],
    	"mediumblue": [0, 0, 205],
    	"mediumorchid": [186, 85, 211],
    	"mediumpurple": [147, 112, 219],
    	"mediumseagreen": [60, 179, 113],
    	"mediumslateblue": [123, 104, 238],
    	"mediumspringgreen": [0, 250, 154],
    	"mediumturquoise": [72, 209, 204],
    	"mediumvioletred": [199, 21, 133],
    	"midnightblue": [25, 25, 112],
    	"mintcream": [245, 255, 250],
    	"mistyrose": [255, 228, 225],
    	"moccasin": [255, 228, 181],
    	"navajowhite": [255, 222, 173],
    	"navy": [0, 0, 128],
    	"oldlace": [253, 245, 230],
    	"olive": [128, 128, 0],
    	"olivedrab": [107, 142, 35],
    	"orange": [255, 165, 0],
    	"orangered": [255, 69, 0],
    	"orchid": [218, 112, 214],
    	"palegoldenrod": [238, 232, 170],
    	"palegreen": [152, 251, 152],
    	"paleturquoise": [175, 238, 238],
    	"palevioletred": [219, 112, 147],
    	"papayawhip": [255, 239, 213],
    	"peachpuff": [255, 218, 185],
    	"peru": [205, 133, 63],
    	"pink": [255, 192, 203],
    	"plum": [221, 160, 221],
    	"powderblue": [176, 224, 230],
    	"purple": [128, 0, 128],
    	"rebeccapurple": [102, 51, 153],
    	"red": [255, 0, 0],
    	"rosybrown": [188, 143, 143],
    	"royalblue": [65, 105, 225],
    	"saddlebrown": [139, 69, 19],
    	"salmon": [250, 128, 114],
    	"sandybrown": [244, 164, 96],
    	"seagreen": [46, 139, 87],
    	"seashell": [255, 245, 238],
    	"sienna": [160, 82, 45],
    	"silver": [192, 192, 192],
    	"skyblue": [135, 206, 235],
    	"slateblue": [106, 90, 205],
    	"slategray": [112, 128, 144],
    	"slategrey": [112, 128, 144],
    	"snow": [255, 250, 250],
    	"springgreen": [0, 255, 127],
    	"steelblue": [70, 130, 180],
    	"tan": [210, 180, 140],
    	"teal": [0, 128, 128],
    	"thistle": [216, 191, 216],
    	"tomato": [255, 99, 71],
    	"turquoise": [64, 224, 208],
    	"violet": [238, 130, 238],
    	"wheat": [245, 222, 179],
    	"white": [255, 255, 255],
    	"whitesmoke": [245, 245, 245],
    	"yellow": [255, 255, 0],
    	"yellowgreen": [154, 205, 50]
    };

    var isArrayish = function isArrayish(obj) {
    	if (!obj || typeof obj === 'string') {
    		return false;
    	}

    	return obj instanceof Array || Array.isArray(obj) ||
    		(obj.length >= 0 && (obj.splice instanceof Function ||
    			(Object.getOwnPropertyDescriptor(obj, (obj.length - 1)) && obj.constructor.name !== 'String')));
    };

    var simpleSwizzle = createCommonjsModule(function (module) {



    var concat = Array.prototype.concat;
    var slice = Array.prototype.slice;

    var swizzle = module.exports = function swizzle(args) {
    	var results = [];

    	for (var i = 0, len = args.length; i < len; i++) {
    		var arg = args[i];

    		if (isArrayish(arg)) {
    			// http://jsperf.com/javascript-array-concat-vs-push/98
    			results = concat.call(results, slice.call(arg));
    		} else {
    			results.push(arg);
    		}
    	}

    	return results;
    };

    swizzle.wrap = function (fn) {
    	return function () {
    		return fn(swizzle(arguments));
    	};
    };
    });

    var colorString = createCommonjsModule(function (module) {
    /* MIT license */



    var reverseNames = {};

    // create a list of reverse color names
    for (var name in colorName) {
    	if (colorName.hasOwnProperty(name)) {
    		reverseNames[colorName[name]] = name;
    	}
    }

    var cs = module.exports = {
    	to: {},
    	get: {}
    };

    cs.get = function (string) {
    	var prefix = string.substring(0, 3).toLowerCase();
    	var val;
    	var model;
    	switch (prefix) {
    		case 'hsl':
    			val = cs.get.hsl(string);
    			model = 'hsl';
    			break;
    		case 'hwb':
    			val = cs.get.hwb(string);
    			model = 'hwb';
    			break;
    		default:
    			val = cs.get.rgb(string);
    			model = 'rgb';
    			break;
    	}

    	if (!val) {
    		return null;
    	}

    	return {model: model, value: val};
    };

    cs.get.rgb = function (string) {
    	if (!string) {
    		return null;
    	}

    	var abbr = /^#([a-f0-9]{3,4})$/i;
    	var hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
    	var rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
    	var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
    	var keyword = /(\D+)/;

    	var rgb = [0, 0, 0, 1];
    	var match;
    	var i;
    	var hexAlpha;

    	if (match = string.match(hex)) {
    		hexAlpha = match[2];
    		match = match[1];

    		for (i = 0; i < 3; i++) {
    			// https://jsperf.com/slice-vs-substr-vs-substring-methods-long-string/19
    			var i2 = i * 2;
    			rgb[i] = parseInt(match.slice(i2, i2 + 2), 16);
    		}

    		if (hexAlpha) {
    			rgb[3] = Math.round((parseInt(hexAlpha, 16) / 255) * 100) / 100;
    		}
    	} else if (match = string.match(abbr)) {
    		match = match[1];
    		hexAlpha = match[3];

    		for (i = 0; i < 3; i++) {
    			rgb[i] = parseInt(match[i] + match[i], 16);
    		}

    		if (hexAlpha) {
    			rgb[3] = Math.round((parseInt(hexAlpha + hexAlpha, 16) / 255) * 100) / 100;
    		}
    	} else if (match = string.match(rgba)) {
    		for (i = 0; i < 3; i++) {
    			rgb[i] = parseInt(match[i + 1], 0);
    		}

    		if (match[4]) {
    			rgb[3] = parseFloat(match[4]);
    		}
    	} else if (match = string.match(per)) {
    		for (i = 0; i < 3; i++) {
    			rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
    		}

    		if (match[4]) {
    			rgb[3] = parseFloat(match[4]);
    		}
    	} else if (match = string.match(keyword)) {
    		if (match[1] === 'transparent') {
    			return [0, 0, 0, 0];
    		}

    		rgb = colorName[match[1]];

    		if (!rgb) {
    			return null;
    		}

    		rgb[3] = 1;

    		return rgb;
    	} else {
    		return null;
    	}

    	for (i = 0; i < 3; i++) {
    		rgb[i] = clamp(rgb[i], 0, 255);
    	}
    	rgb[3] = clamp(rgb[3], 0, 1);

    	return rgb;
    };

    cs.get.hsl = function (string) {
    	if (!string) {
    		return null;
    	}

    	var hsl = /^hsla?\(\s*([+-]?(?:\d*\.)?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
    	var match = string.match(hsl);

    	if (match) {
    		var alpha = parseFloat(match[4]);
    		var h = (parseFloat(match[1]) + 360) % 360;
    		var s = clamp(parseFloat(match[2]), 0, 100);
    		var l = clamp(parseFloat(match[3]), 0, 100);
    		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);

    		return [h, s, l, a];
    	}

    	return null;
    };

    cs.get.hwb = function (string) {
    	if (!string) {
    		return null;
    	}

    	var hwb = /^hwb\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
    	var match = string.match(hwb);

    	if (match) {
    		var alpha = parseFloat(match[4]);
    		var h = ((parseFloat(match[1]) % 360) + 360) % 360;
    		var w = clamp(parseFloat(match[2]), 0, 100);
    		var b = clamp(parseFloat(match[3]), 0, 100);
    		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
    		return [h, w, b, a];
    	}

    	return null;
    };

    cs.to.hex = function () {
    	var rgba = simpleSwizzle(arguments);

    	return (
    		'#' +
    		hexDouble(rgba[0]) +
    		hexDouble(rgba[1]) +
    		hexDouble(rgba[2]) +
    		(rgba[3] < 1
    			? (hexDouble(Math.round(rgba[3] * 255)))
    			: '')
    	);
    };

    cs.to.rgb = function () {
    	var rgba = simpleSwizzle(arguments);

    	return rgba.length < 4 || rgba[3] === 1
    		? 'rgb(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ')'
    		: 'rgba(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ', ' + rgba[3] + ')';
    };

    cs.to.rgb.percent = function () {
    	var rgba = simpleSwizzle(arguments);

    	var r = Math.round(rgba[0] / 255 * 100);
    	var g = Math.round(rgba[1] / 255 * 100);
    	var b = Math.round(rgba[2] / 255 * 100);

    	return rgba.length < 4 || rgba[3] === 1
    		? 'rgb(' + r + '%, ' + g + '%, ' + b + '%)'
    		: 'rgba(' + r + '%, ' + g + '%, ' + b + '%, ' + rgba[3] + ')';
    };

    cs.to.hsl = function () {
    	var hsla = simpleSwizzle(arguments);
    	return hsla.length < 4 || hsla[3] === 1
    		? 'hsl(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%)'
    		: 'hsla(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%, ' + hsla[3] + ')';
    };

    // hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
    // (hwb have alpha optional & 1 is default value)
    cs.to.hwb = function () {
    	var hwba = simpleSwizzle(arguments);

    	var a = '';
    	if (hwba.length >= 4 && hwba[3] !== 1) {
    		a = ', ' + hwba[3];
    	}

    	return 'hwb(' + hwba[0] + ', ' + hwba[1] + '%, ' + hwba[2] + '%' + a + ')';
    };

    cs.to.keyword = function (rgb) {
    	return reverseNames[rgb.slice(0, 3)];
    };

    // helpers
    function clamp(num, min, max) {
    	return Math.min(Math.max(min, num), max);
    }

    function hexDouble(num) {
    	var str = num.toString(16).toUpperCase();
    	return (str.length < 2) ? '0' + str : str;
    }
    });
    var colorString_1 = colorString.to;
    var colorString_2 = colorString.get;

    var conversions = createCommonjsModule(function (module) {
    /* MIT license */


    // NOTE: conversions should only return primitive values (i.e. arrays, or
    //       values that give correct `typeof` results).
    //       do not use box values types (i.e. Number(), String(), etc.)

    var reverseKeywords = {};
    for (var key in colorName) {
    	if (colorName.hasOwnProperty(key)) {
    		reverseKeywords[colorName[key]] = key;
    	}
    }

    var convert = module.exports = {
    	rgb: {channels: 3, labels: 'rgb'},
    	hsl: {channels: 3, labels: 'hsl'},
    	hsv: {channels: 3, labels: 'hsv'},
    	hwb: {channels: 3, labels: 'hwb'},
    	cmyk: {channels: 4, labels: 'cmyk'},
    	xyz: {channels: 3, labels: 'xyz'},
    	lab: {channels: 3, labels: 'lab'},
    	lch: {channels: 3, labels: 'lch'},
    	hex: {channels: 1, labels: ['hex']},
    	keyword: {channels: 1, labels: ['keyword']},
    	ansi16: {channels: 1, labels: ['ansi16']},
    	ansi256: {channels: 1, labels: ['ansi256']},
    	hcg: {channels: 3, labels: ['h', 'c', 'g']},
    	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
    	gray: {channels: 1, labels: ['gray']}
    };

    // hide .channels and .labels properties
    for (var model in convert) {
    	if (convert.hasOwnProperty(model)) {
    		if (!('channels' in convert[model])) {
    			throw new Error('missing channels property: ' + model);
    		}

    		if (!('labels' in convert[model])) {
    			throw new Error('missing channel labels property: ' + model);
    		}

    		if (convert[model].labels.length !== convert[model].channels) {
    			throw new Error('channel and label counts mismatch: ' + model);
    		}

    		var channels = convert[model].channels;
    		var labels = convert[model].labels;
    		delete convert[model].channels;
    		delete convert[model].labels;
    		Object.defineProperty(convert[model], 'channels', {value: channels});
    		Object.defineProperty(convert[model], 'labels', {value: labels});
    	}
    }

    convert.rgb.hsl = function (rgb) {
    	var r = rgb[0] / 255;
    	var g = rgb[1] / 255;
    	var b = rgb[2] / 255;
    	var min = Math.min(r, g, b);
    	var max = Math.max(r, g, b);
    	var delta = max - min;
    	var h;
    	var s;
    	var l;

    	if (max === min) {
    		h = 0;
    	} else if (r === max) {
    		h = (g - b) / delta;
    	} else if (g === max) {
    		h = 2 + (b - r) / delta;
    	} else if (b === max) {
    		h = 4 + (r - g) / delta;
    	}

    	h = Math.min(h * 60, 360);

    	if (h < 0) {
    		h += 360;
    	}

    	l = (min + max) / 2;

    	if (max === min) {
    		s = 0;
    	} else if (l <= 0.5) {
    		s = delta / (max + min);
    	} else {
    		s = delta / (2 - max - min);
    	}

    	return [h, s * 100, l * 100];
    };

    convert.rgb.hsv = function (rgb) {
    	var rdif;
    	var gdif;
    	var bdif;
    	var h;
    	var s;

    	var r = rgb[0] / 255;
    	var g = rgb[1] / 255;
    	var b = rgb[2] / 255;
    	var v = Math.max(r, g, b);
    	var diff = v - Math.min(r, g, b);
    	var diffc = function (c) {
    		return (v - c) / 6 / diff + 1 / 2;
    	};

    	if (diff === 0) {
    		h = s = 0;
    	} else {
    		s = diff / v;
    		rdif = diffc(r);
    		gdif = diffc(g);
    		bdif = diffc(b);

    		if (r === v) {
    			h = bdif - gdif;
    		} else if (g === v) {
    			h = (1 / 3) + rdif - bdif;
    		} else if (b === v) {
    			h = (2 / 3) + gdif - rdif;
    		}
    		if (h < 0) {
    			h += 1;
    		} else if (h > 1) {
    			h -= 1;
    		}
    	}

    	return [
    		h * 360,
    		s * 100,
    		v * 100
    	];
    };

    convert.rgb.hwb = function (rgb) {
    	var r = rgb[0];
    	var g = rgb[1];
    	var b = rgb[2];
    	var h = convert.rgb.hsl(rgb)[0];
    	var w = 1 / 255 * Math.min(r, Math.min(g, b));

    	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

    	return [h, w * 100, b * 100];
    };

    convert.rgb.cmyk = function (rgb) {
    	var r = rgb[0] / 255;
    	var g = rgb[1] / 255;
    	var b = rgb[2] / 255;
    	var c;
    	var m;
    	var y;
    	var k;

    	k = Math.min(1 - r, 1 - g, 1 - b);
    	c = (1 - r - k) / (1 - k) || 0;
    	m = (1 - g - k) / (1 - k) || 0;
    	y = (1 - b - k) / (1 - k) || 0;

    	return [c * 100, m * 100, y * 100, k * 100];
    };

    /**
     * See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
     * */
    function comparativeDistance(x, y) {
    	return (
    		Math.pow(x[0] - y[0], 2) +
    		Math.pow(x[1] - y[1], 2) +
    		Math.pow(x[2] - y[2], 2)
    	);
    }

    convert.rgb.keyword = function (rgb) {
    	var reversed = reverseKeywords[rgb];
    	if (reversed) {
    		return reversed;
    	}

    	var currentClosestDistance = Infinity;
    	var currentClosestKeyword;

    	for (var keyword in colorName) {
    		if (colorName.hasOwnProperty(keyword)) {
    			var value = colorName[keyword];

    			// Compute comparative distance
    			var distance = comparativeDistance(rgb, value);

    			// Check if its less, if so set as closest
    			if (distance < currentClosestDistance) {
    				currentClosestDistance = distance;
    				currentClosestKeyword = keyword;
    			}
    		}
    	}

    	return currentClosestKeyword;
    };

    convert.keyword.rgb = function (keyword) {
    	return colorName[keyword];
    };

    convert.rgb.xyz = function (rgb) {
    	var r = rgb[0] / 255;
    	var g = rgb[1] / 255;
    	var b = rgb[2] / 255;

    	// assume sRGB
    	r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
    	g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
    	b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

    	var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
    	var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
    	var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

    	return [x * 100, y * 100, z * 100];
    };

    convert.rgb.lab = function (rgb) {
    	var xyz = convert.rgb.xyz(rgb);
    	var x = xyz[0];
    	var y = xyz[1];
    	var z = xyz[2];
    	var l;
    	var a;
    	var b;

    	x /= 95.047;
    	y /= 100;
    	z /= 108.883;

    	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
    	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
    	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

    	l = (116 * y) - 16;
    	a = 500 * (x - y);
    	b = 200 * (y - z);

    	return [l, a, b];
    };

    convert.hsl.rgb = function (hsl) {
    	var h = hsl[0] / 360;
    	var s = hsl[1] / 100;
    	var l = hsl[2] / 100;
    	var t1;
    	var t2;
    	var t3;
    	var rgb;
    	var val;

    	if (s === 0) {
    		val = l * 255;
    		return [val, val, val];
    	}

    	if (l < 0.5) {
    		t2 = l * (1 + s);
    	} else {
    		t2 = l + s - l * s;
    	}

    	t1 = 2 * l - t2;

    	rgb = [0, 0, 0];
    	for (var i = 0; i < 3; i++) {
    		t3 = h + 1 / 3 * -(i - 1);
    		if (t3 < 0) {
    			t3++;
    		}
    		if (t3 > 1) {
    			t3--;
    		}

    		if (6 * t3 < 1) {
    			val = t1 + (t2 - t1) * 6 * t3;
    		} else if (2 * t3 < 1) {
    			val = t2;
    		} else if (3 * t3 < 2) {
    			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
    		} else {
    			val = t1;
    		}

    		rgb[i] = val * 255;
    	}

    	return rgb;
    };

    convert.hsl.hsv = function (hsl) {
    	var h = hsl[0];
    	var s = hsl[1] / 100;
    	var l = hsl[2] / 100;
    	var smin = s;
    	var lmin = Math.max(l, 0.01);
    	var sv;
    	var v;

    	l *= 2;
    	s *= (l <= 1) ? l : 2 - l;
    	smin *= lmin <= 1 ? lmin : 2 - lmin;
    	v = (l + s) / 2;
    	sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

    	return [h, sv * 100, v * 100];
    };

    convert.hsv.rgb = function (hsv) {
    	var h = hsv[0] / 60;
    	var s = hsv[1] / 100;
    	var v = hsv[2] / 100;
    	var hi = Math.floor(h) % 6;

    	var f = h - Math.floor(h);
    	var p = 255 * v * (1 - s);
    	var q = 255 * v * (1 - (s * f));
    	var t = 255 * v * (1 - (s * (1 - f)));
    	v *= 255;

    	switch (hi) {
    		case 0:
    			return [v, t, p];
    		case 1:
    			return [q, v, p];
    		case 2:
    			return [p, v, t];
    		case 3:
    			return [p, q, v];
    		case 4:
    			return [t, p, v];
    		case 5:
    			return [v, p, q];
    	}
    };

    convert.hsv.hsl = function (hsv) {
    	var h = hsv[0];
    	var s = hsv[1] / 100;
    	var v = hsv[2] / 100;
    	var vmin = Math.max(v, 0.01);
    	var lmin;
    	var sl;
    	var l;

    	l = (2 - s) * v;
    	lmin = (2 - s) * vmin;
    	sl = s * vmin;
    	sl /= (lmin <= 1) ? lmin : 2 - lmin;
    	sl = sl || 0;
    	l /= 2;

    	return [h, sl * 100, l * 100];
    };

    // http://dev.w3.org/csswg/css-color/#hwb-to-rgb
    convert.hwb.rgb = function (hwb) {
    	var h = hwb[0] / 360;
    	var wh = hwb[1] / 100;
    	var bl = hwb[2] / 100;
    	var ratio = wh + bl;
    	var i;
    	var v;
    	var f;
    	var n;

    	// wh + bl cant be > 1
    	if (ratio > 1) {
    		wh /= ratio;
    		bl /= ratio;
    	}

    	i = Math.floor(6 * h);
    	v = 1 - bl;
    	f = 6 * h - i;

    	if ((i & 0x01) !== 0) {
    		f = 1 - f;
    	}

    	n = wh + f * (v - wh); // linear interpolation

    	var r;
    	var g;
    	var b;
    	switch (i) {
    		default:
    		case 6:
    		case 0: r = v; g = n; b = wh; break;
    		case 1: r = n; g = v; b = wh; break;
    		case 2: r = wh; g = v; b = n; break;
    		case 3: r = wh; g = n; b = v; break;
    		case 4: r = n; g = wh; b = v; break;
    		case 5: r = v; g = wh; b = n; break;
    	}

    	return [r * 255, g * 255, b * 255];
    };

    convert.cmyk.rgb = function (cmyk) {
    	var c = cmyk[0] / 100;
    	var m = cmyk[1] / 100;
    	var y = cmyk[2] / 100;
    	var k = cmyk[3] / 100;
    	var r;
    	var g;
    	var b;

    	r = 1 - Math.min(1, c * (1 - k) + k);
    	g = 1 - Math.min(1, m * (1 - k) + k);
    	b = 1 - Math.min(1, y * (1 - k) + k);

    	return [r * 255, g * 255, b * 255];
    };

    convert.xyz.rgb = function (xyz) {
    	var x = xyz[0] / 100;
    	var y = xyz[1] / 100;
    	var z = xyz[2] / 100;
    	var r;
    	var g;
    	var b;

    	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
    	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
    	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

    	// assume sRGB
    	r = r > 0.0031308
    		? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    		: r * 12.92;

    	g = g > 0.0031308
    		? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    		: g * 12.92;

    	b = b > 0.0031308
    		? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    		: b * 12.92;

    	r = Math.min(Math.max(0, r), 1);
    	g = Math.min(Math.max(0, g), 1);
    	b = Math.min(Math.max(0, b), 1);

    	return [r * 255, g * 255, b * 255];
    };

    convert.xyz.lab = function (xyz) {
    	var x = xyz[0];
    	var y = xyz[1];
    	var z = xyz[2];
    	var l;
    	var a;
    	var b;

    	x /= 95.047;
    	y /= 100;
    	z /= 108.883;

    	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
    	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
    	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

    	l = (116 * y) - 16;
    	a = 500 * (x - y);
    	b = 200 * (y - z);

    	return [l, a, b];
    };

    convert.lab.xyz = function (lab) {
    	var l = lab[0];
    	var a = lab[1];
    	var b = lab[2];
    	var x;
    	var y;
    	var z;

    	y = (l + 16) / 116;
    	x = a / 500 + y;
    	z = y - b / 200;

    	var y2 = Math.pow(y, 3);
    	var x2 = Math.pow(x, 3);
    	var z2 = Math.pow(z, 3);
    	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
    	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
    	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

    	x *= 95.047;
    	y *= 100;
    	z *= 108.883;

    	return [x, y, z];
    };

    convert.lab.lch = function (lab) {
    	var l = lab[0];
    	var a = lab[1];
    	var b = lab[2];
    	var hr;
    	var h;
    	var c;

    	hr = Math.atan2(b, a);
    	h = hr * 360 / 2 / Math.PI;

    	if (h < 0) {
    		h += 360;
    	}

    	c = Math.sqrt(a * a + b * b);

    	return [l, c, h];
    };

    convert.lch.lab = function (lch) {
    	var l = lch[0];
    	var c = lch[1];
    	var h = lch[2];
    	var a;
    	var b;
    	var hr;

    	hr = h / 360 * 2 * Math.PI;
    	a = c * Math.cos(hr);
    	b = c * Math.sin(hr);

    	return [l, a, b];
    };

    convert.rgb.ansi16 = function (args) {
    	var r = args[0];
    	var g = args[1];
    	var b = args[2];
    	var value = 1 in arguments ? arguments[1] : convert.rgb.hsv(args)[2]; // hsv -> ansi16 optimization

    	value = Math.round(value / 50);

    	if (value === 0) {
    		return 30;
    	}

    	var ansi = 30
    		+ ((Math.round(b / 255) << 2)
    		| (Math.round(g / 255) << 1)
    		| Math.round(r / 255));

    	if (value === 2) {
    		ansi += 60;
    	}

    	return ansi;
    };

    convert.hsv.ansi16 = function (args) {
    	// optimization here; we already know the value and don't need to get
    	// it converted for us.
    	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
    };

    convert.rgb.ansi256 = function (args) {
    	var r = args[0];
    	var g = args[1];
    	var b = args[2];

    	// we use the extended greyscale palette here, with the exception of
    	// black and white. normal palette only has 4 greyscale shades.
    	if (r === g && g === b) {
    		if (r < 8) {
    			return 16;
    		}

    		if (r > 248) {
    			return 231;
    		}

    		return Math.round(((r - 8) / 247) * 24) + 232;
    	}

    	var ansi = 16
    		+ (36 * Math.round(r / 255 * 5))
    		+ (6 * Math.round(g / 255 * 5))
    		+ Math.round(b / 255 * 5);

    	return ansi;
    };

    convert.ansi16.rgb = function (args) {
    	var color = args % 10;

    	// handle greyscale
    	if (color === 0 || color === 7) {
    		if (args > 50) {
    			color += 3.5;
    		}

    		color = color / 10.5 * 255;

    		return [color, color, color];
    	}

    	var mult = (~~(args > 50) + 1) * 0.5;
    	var r = ((color & 1) * mult) * 255;
    	var g = (((color >> 1) & 1) * mult) * 255;
    	var b = (((color >> 2) & 1) * mult) * 255;

    	return [r, g, b];
    };

    convert.ansi256.rgb = function (args) {
    	// handle greyscale
    	if (args >= 232) {
    		var c = (args - 232) * 10 + 8;
    		return [c, c, c];
    	}

    	args -= 16;

    	var rem;
    	var r = Math.floor(args / 36) / 5 * 255;
    	var g = Math.floor((rem = args % 36) / 6) / 5 * 255;
    	var b = (rem % 6) / 5 * 255;

    	return [r, g, b];
    };

    convert.rgb.hex = function (args) {
    	var integer = ((Math.round(args[0]) & 0xFF) << 16)
    		+ ((Math.round(args[1]) & 0xFF) << 8)
    		+ (Math.round(args[2]) & 0xFF);

    	var string = integer.toString(16).toUpperCase();
    	return '000000'.substring(string.length) + string;
    };

    convert.hex.rgb = function (args) {
    	var match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
    	if (!match) {
    		return [0, 0, 0];
    	}

    	var colorString = match[0];

    	if (match[0].length === 3) {
    		colorString = colorString.split('').map(function (char) {
    			return char + char;
    		}).join('');
    	}

    	var integer = parseInt(colorString, 16);
    	var r = (integer >> 16) & 0xFF;
    	var g = (integer >> 8) & 0xFF;
    	var b = integer & 0xFF;

    	return [r, g, b];
    };

    convert.rgb.hcg = function (rgb) {
    	var r = rgb[0] / 255;
    	var g = rgb[1] / 255;
    	var b = rgb[2] / 255;
    	var max = Math.max(Math.max(r, g), b);
    	var min = Math.min(Math.min(r, g), b);
    	var chroma = (max - min);
    	var grayscale;
    	var hue;

    	if (chroma < 1) {
    		grayscale = min / (1 - chroma);
    	} else {
    		grayscale = 0;
    	}

    	if (chroma <= 0) {
    		hue = 0;
    	} else
    	if (max === r) {
    		hue = ((g - b) / chroma) % 6;
    	} else
    	if (max === g) {
    		hue = 2 + (b - r) / chroma;
    	} else {
    		hue = 4 + (r - g) / chroma + 4;
    	}

    	hue /= 6;
    	hue %= 1;

    	return [hue * 360, chroma * 100, grayscale * 100];
    };

    convert.hsl.hcg = function (hsl) {
    	var s = hsl[1] / 100;
    	var l = hsl[2] / 100;
    	var c = 1;
    	var f = 0;

    	if (l < 0.5) {
    		c = 2.0 * s * l;
    	} else {
    		c = 2.0 * s * (1.0 - l);
    	}

    	if (c < 1.0) {
    		f = (l - 0.5 * c) / (1.0 - c);
    	}

    	return [hsl[0], c * 100, f * 100];
    };

    convert.hsv.hcg = function (hsv) {
    	var s = hsv[1] / 100;
    	var v = hsv[2] / 100;

    	var c = s * v;
    	var f = 0;

    	if (c < 1.0) {
    		f = (v - c) / (1 - c);
    	}

    	return [hsv[0], c * 100, f * 100];
    };

    convert.hcg.rgb = function (hcg) {
    	var h = hcg[0] / 360;
    	var c = hcg[1] / 100;
    	var g = hcg[2] / 100;

    	if (c === 0.0) {
    		return [g * 255, g * 255, g * 255];
    	}

    	var pure = [0, 0, 0];
    	var hi = (h % 1) * 6;
    	var v = hi % 1;
    	var w = 1 - v;
    	var mg = 0;

    	switch (Math.floor(hi)) {
    		case 0:
    			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
    		case 1:
    			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
    		case 2:
    			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
    		case 3:
    			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
    		case 4:
    			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
    		default:
    			pure[0] = 1; pure[1] = 0; pure[2] = w;
    	}

    	mg = (1.0 - c) * g;

    	return [
    		(c * pure[0] + mg) * 255,
    		(c * pure[1] + mg) * 255,
    		(c * pure[2] + mg) * 255
    	];
    };

    convert.hcg.hsv = function (hcg) {
    	var c = hcg[1] / 100;
    	var g = hcg[2] / 100;

    	var v = c + g * (1.0 - c);
    	var f = 0;

    	if (v > 0.0) {
    		f = c / v;
    	}

    	return [hcg[0], f * 100, v * 100];
    };

    convert.hcg.hsl = function (hcg) {
    	var c = hcg[1] / 100;
    	var g = hcg[2] / 100;

    	var l = g * (1.0 - c) + 0.5 * c;
    	var s = 0;

    	if (l > 0.0 && l < 0.5) {
    		s = c / (2 * l);
    	} else
    	if (l >= 0.5 && l < 1.0) {
    		s = c / (2 * (1 - l));
    	}

    	return [hcg[0], s * 100, l * 100];
    };

    convert.hcg.hwb = function (hcg) {
    	var c = hcg[1] / 100;
    	var g = hcg[2] / 100;
    	var v = c + g * (1.0 - c);
    	return [hcg[0], (v - c) * 100, (1 - v) * 100];
    };

    convert.hwb.hcg = function (hwb) {
    	var w = hwb[1] / 100;
    	var b = hwb[2] / 100;
    	var v = 1 - b;
    	var c = v - w;
    	var g = 0;

    	if (c < 1) {
    		g = (v - c) / (1 - c);
    	}

    	return [hwb[0], c * 100, g * 100];
    };

    convert.apple.rgb = function (apple) {
    	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
    };

    convert.rgb.apple = function (rgb) {
    	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
    };

    convert.gray.rgb = function (args) {
    	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
    };

    convert.gray.hsl = convert.gray.hsv = function (args) {
    	return [0, 0, args[0]];
    };

    convert.gray.hwb = function (gray) {
    	return [0, 100, gray[0]];
    };

    convert.gray.cmyk = function (gray) {
    	return [0, 0, 0, gray[0]];
    };

    convert.gray.lab = function (gray) {
    	return [gray[0], 0, 0];
    };

    convert.gray.hex = function (gray) {
    	var val = Math.round(gray[0] / 100 * 255) & 0xFF;
    	var integer = (val << 16) + (val << 8) + val;

    	var string = integer.toString(16).toUpperCase();
    	return '000000'.substring(string.length) + string;
    };

    convert.rgb.gray = function (rgb) {
    	var val = (rgb[0] + rgb[1] + rgb[2]) / 3;
    	return [val / 255 * 100];
    };
    });
    var conversions_1 = conversions.rgb;
    var conversions_2 = conversions.hsl;
    var conversions_3 = conversions.hsv;
    var conversions_4 = conversions.hwb;
    var conversions_5 = conversions.cmyk;
    var conversions_6 = conversions.xyz;
    var conversions_7 = conversions.lab;
    var conversions_8 = conversions.lch;
    var conversions_9 = conversions.hex;
    var conversions_10 = conversions.keyword;
    var conversions_11 = conversions.ansi16;
    var conversions_12 = conversions.ansi256;
    var conversions_13 = conversions.hcg;
    var conversions_14 = conversions.apple;
    var conversions_15 = conversions.gray;

    /*
    	this function routes a model to all other models.

    	all functions that are routed have a property `.conversion` attached
    	to the returned synthetic function. This property is an array
    	of strings, each with the steps in between the 'from' and 'to'
    	color models (inclusive).

    	conversions that are not possible simply are not included.
    */

    function buildGraph() {
    	var graph = {};
    	// https://jsperf.com/object-keys-vs-for-in-with-closure/3
    	var models = Object.keys(conversions);

    	for (var len = models.length, i = 0; i < len; i++) {
    		graph[models[i]] = {
    			// http://jsperf.com/1-vs-infinity
    			// micro-opt, but this is simple.
    			distance: -1,
    			parent: null
    		};
    	}

    	return graph;
    }

    // https://en.wikipedia.org/wiki/Breadth-first_search
    function deriveBFS(fromModel) {
    	var graph = buildGraph();
    	var queue = [fromModel]; // unshift -> queue -> pop

    	graph[fromModel].distance = 0;

    	while (queue.length) {
    		var current = queue.pop();
    		var adjacents = Object.keys(conversions[current]);

    		for (var len = adjacents.length, i = 0; i < len; i++) {
    			var adjacent = adjacents[i];
    			var node = graph[adjacent];

    			if (node.distance === -1) {
    				node.distance = graph[current].distance + 1;
    				node.parent = current;
    				queue.unshift(adjacent);
    			}
    		}
    	}

    	return graph;
    }

    function link(from, to) {
    	return function (args) {
    		return to(from(args));
    	};
    }

    function wrapConversion(toModel, graph) {
    	var path = [graph[toModel].parent, toModel];
    	var fn = conversions[graph[toModel].parent][toModel];

    	var cur = graph[toModel].parent;
    	while (graph[cur].parent) {
    		path.unshift(graph[cur].parent);
    		fn = link(conversions[graph[cur].parent][cur], fn);
    		cur = graph[cur].parent;
    	}

    	fn.conversion = path;
    	return fn;
    }

    var route = function (fromModel) {
    	var graph = deriveBFS(fromModel);
    	var conversion = {};

    	var models = Object.keys(graph);
    	for (var len = models.length, i = 0; i < len; i++) {
    		var toModel = models[i];
    		var node = graph[toModel];

    		if (node.parent === null) {
    			// no possible conversion, or this node is the source model.
    			continue;
    		}

    		conversion[toModel] = wrapConversion(toModel, graph);
    	}

    	return conversion;
    };

    var convert = {};

    var models = Object.keys(conversions);

    function wrapRaw(fn) {
    	var wrappedFn = function (args) {
    		if (args === undefined || args === null) {
    			return args;
    		}

    		if (arguments.length > 1) {
    			args = Array.prototype.slice.call(arguments);
    		}

    		return fn(args);
    	};

    	// preserve .conversion property if there is one
    	if ('conversion' in fn) {
    		wrappedFn.conversion = fn.conversion;
    	}

    	return wrappedFn;
    }

    function wrapRounded(fn) {
    	var wrappedFn = function (args) {
    		if (args === undefined || args === null) {
    			return args;
    		}

    		if (arguments.length > 1) {
    			args = Array.prototype.slice.call(arguments);
    		}

    		var result = fn(args);

    		// we're assuming the result is an array here.
    		// see notice in conversions.js; don't use box types
    		// in conversion functions.
    		if (typeof result === 'object') {
    			for (var len = result.length, i = 0; i < len; i++) {
    				result[i] = Math.round(result[i]);
    			}
    		}

    		return result;
    	};

    	// preserve .conversion property if there is one
    	if ('conversion' in fn) {
    		wrappedFn.conversion = fn.conversion;
    	}

    	return wrappedFn;
    }

    models.forEach(function (fromModel) {
    	convert[fromModel] = {};

    	Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
    	Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

    	var routes = route(fromModel);
    	var routeModels = Object.keys(routes);

    	routeModels.forEach(function (toModel) {
    		var fn = routes[toModel];

    		convert[fromModel][toModel] = wrapRounded(fn);
    		convert[fromModel][toModel].raw = wrapRaw(fn);
    	});
    });

    var colorConvert = convert;

    var _slice = [].slice;

    var skippedModels = [
    	// to be honest, I don't really feel like keyword belongs in color convert, but eh.
    	'keyword',

    	// gray conflicts with some method names, and has its own method defined.
    	'gray',

    	// shouldn't really be in color-convert either...
    	'hex'
    ];

    var hashedModelKeys = {};
    Object.keys(colorConvert).forEach(function (model) {
    	hashedModelKeys[_slice.call(colorConvert[model].labels).sort().join('')] = model;
    });

    var limiters = {};

    function Color(obj, model) {
    	if (!(this instanceof Color)) {
    		return new Color(obj, model);
    	}

    	if (model && model in skippedModels) {
    		model = null;
    	}

    	if (model && !(model in colorConvert)) {
    		throw new Error('Unknown model: ' + model);
    	}

    	var i;
    	var channels;

    	if (obj == null) { // eslint-disable-line no-eq-null,eqeqeq
    		this.model = 'rgb';
    		this.color = [0, 0, 0];
    		this.valpha = 1;
    	} else if (obj instanceof Color) {
    		this.model = obj.model;
    		this.color = obj.color.slice();
    		this.valpha = obj.valpha;
    	} else if (typeof obj === 'string') {
    		var result = colorString.get(obj);
    		if (result === null) {
    			throw new Error('Unable to parse color from string: ' + obj);
    		}

    		this.model = result.model;
    		channels = colorConvert[this.model].channels;
    		this.color = result.value.slice(0, channels);
    		this.valpha = typeof result.value[channels] === 'number' ? result.value[channels] : 1;
    	} else if (obj.length) {
    		this.model = model || 'rgb';
    		channels = colorConvert[this.model].channels;
    		var newArr = _slice.call(obj, 0, channels);
    		this.color = zeroArray(newArr, channels);
    		this.valpha = typeof obj[channels] === 'number' ? obj[channels] : 1;
    	} else if (typeof obj === 'number') {
    		// this is always RGB - can be converted later on.
    		obj &= 0xFFFFFF;
    		this.model = 'rgb';
    		this.color = [
    			(obj >> 16) & 0xFF,
    			(obj >> 8) & 0xFF,
    			obj & 0xFF
    		];
    		this.valpha = 1;
    	} else {
    		this.valpha = 1;

    		var keys = Object.keys(obj);
    		if ('alpha' in obj) {
    			keys.splice(keys.indexOf('alpha'), 1);
    			this.valpha = typeof obj.alpha === 'number' ? obj.alpha : 0;
    		}

    		var hashedKeys = keys.sort().join('');
    		if (!(hashedKeys in hashedModelKeys)) {
    			throw new Error('Unable to parse color from object: ' + JSON.stringify(obj));
    		}

    		this.model = hashedModelKeys[hashedKeys];

    		var labels = colorConvert[this.model].labels;
    		var color = [];
    		for (i = 0; i < labels.length; i++) {
    			color.push(obj[labels[i]]);
    		}

    		this.color = zeroArray(color);
    	}

    	// perform limitations (clamping, etc.)
    	if (limiters[this.model]) {
    		channels = colorConvert[this.model].channels;
    		for (i = 0; i < channels; i++) {
    			var limit = limiters[this.model][i];
    			if (limit) {
    				this.color[i] = limit(this.color[i]);
    			}
    		}
    	}

    	this.valpha = Math.max(0, Math.min(1, this.valpha));

    	if (Object.freeze) {
    		Object.freeze(this);
    	}
    }

    Color.prototype = {
    	toString: function () {
    		return this.string();
    	},

    	toJSON: function () {
    		return this[this.model]();
    	},

    	string: function (places) {
    		var self = this.model in colorString.to ? this : this.rgb();
    		self = self.round(typeof places === 'number' ? places : 1);
    		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
    		return colorString.to[self.model](args);
    	},

    	percentString: function (places) {
    		var self = this.rgb().round(typeof places === 'number' ? places : 1);
    		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
    		return colorString.to.rgb.percent(args);
    	},

    	array: function () {
    		return this.valpha === 1 ? this.color.slice() : this.color.concat(this.valpha);
    	},

    	object: function () {
    		var result = {};
    		var channels = colorConvert[this.model].channels;
    		var labels = colorConvert[this.model].labels;

    		for (var i = 0; i < channels; i++) {
    			result[labels[i]] = this.color[i];
    		}

    		if (this.valpha !== 1) {
    			result.alpha = this.valpha;
    		}

    		return result;
    	},

    	unitArray: function () {
    		var rgb = this.rgb().color;
    		rgb[0] /= 255;
    		rgb[1] /= 255;
    		rgb[2] /= 255;

    		if (this.valpha !== 1) {
    			rgb.push(this.valpha);
    		}

    		return rgb;
    	},

    	unitObject: function () {
    		var rgb = this.rgb().object();
    		rgb.r /= 255;
    		rgb.g /= 255;
    		rgb.b /= 255;

    		if (this.valpha !== 1) {
    			rgb.alpha = this.valpha;
    		}

    		return rgb;
    	},

    	round: function (places) {
    		places = Math.max(places || 0, 0);
    		return new Color(this.color.map(roundToPlace(places)).concat(this.valpha), this.model);
    	},

    	alpha: function (val) {
    		if (arguments.length) {
    			return new Color(this.color.concat(Math.max(0, Math.min(1, val))), this.model);
    		}

    		return this.valpha;
    	},

    	// rgb
    	red: getset('rgb', 0, maxfn(255)),
    	green: getset('rgb', 1, maxfn(255)),
    	blue: getset('rgb', 2, maxfn(255)),

    	hue: getset(['hsl', 'hsv', 'hsl', 'hwb', 'hcg'], 0, function (val) { return ((val % 360) + 360) % 360; }), // eslint-disable-line brace-style

    	saturationl: getset('hsl', 1, maxfn(100)),
    	lightness: getset('hsl', 2, maxfn(100)),

    	saturationv: getset('hsv', 1, maxfn(100)),
    	value: getset('hsv', 2, maxfn(100)),

    	chroma: getset('hcg', 1, maxfn(100)),
    	gray: getset('hcg', 2, maxfn(100)),

    	white: getset('hwb', 1, maxfn(100)),
    	wblack: getset('hwb', 2, maxfn(100)),

    	cyan: getset('cmyk', 0, maxfn(100)),
    	magenta: getset('cmyk', 1, maxfn(100)),
    	yellow: getset('cmyk', 2, maxfn(100)),
    	black: getset('cmyk', 3, maxfn(100)),

    	x: getset('xyz', 0, maxfn(100)),
    	y: getset('xyz', 1, maxfn(100)),
    	z: getset('xyz', 2, maxfn(100)),

    	l: getset('lab', 0, maxfn(100)),
    	a: getset('lab', 1),
    	b: getset('lab', 2),

    	keyword: function (val) {
    		if (arguments.length) {
    			return new Color(val);
    		}

    		return colorConvert[this.model].keyword(this.color);
    	},

    	hex: function (val) {
    		if (arguments.length) {
    			return new Color(val);
    		}

    		return colorString.to.hex(this.rgb().round().color);
    	},

    	rgbNumber: function () {
    		var rgb = this.rgb().color;
    		return ((rgb[0] & 0xFF) << 16) | ((rgb[1] & 0xFF) << 8) | (rgb[2] & 0xFF);
    	},

    	luminosity: function () {
    		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
    		var rgb = this.rgb().color;

    		var lum = [];
    		for (var i = 0; i < rgb.length; i++) {
    			var chan = rgb[i] / 255;
    			lum[i] = (chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4);
    		}

    		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    	},

    	contrast: function (color2) {
    		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
    		var lum1 = this.luminosity();
    		var lum2 = color2.luminosity();

    		if (lum1 > lum2) {
    			return (lum1 + 0.05) / (lum2 + 0.05);
    		}

    		return (lum2 + 0.05) / (lum1 + 0.05);
    	},

    	level: function (color2) {
    		var contrastRatio = this.contrast(color2);
    		if (contrastRatio >= 7.1) {
    			return 'AAA';
    		}

    		return (contrastRatio >= 4.5) ? 'AA' : '';
    	},

    	isDark: function () {
    		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
    		var rgb = this.rgb().color;
    		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    		return yiq < 128;
    	},

    	isLight: function () {
    		return !this.isDark();
    	},

    	negate: function () {
    		var rgb = this.rgb();
    		for (var i = 0; i < 3; i++) {
    			rgb.color[i] = 255 - rgb.color[i];
    		}
    		return rgb;
    	},

    	lighten: function (ratio) {
    		var hsl = this.hsl();
    		hsl.color[2] += hsl.color[2] * ratio;
    		return hsl;
    	},

    	darken: function (ratio) {
    		var hsl = this.hsl();
    		hsl.color[2] -= hsl.color[2] * ratio;
    		return hsl;
    	},

    	saturate: function (ratio) {
    		var hsl = this.hsl();
    		hsl.color[1] += hsl.color[1] * ratio;
    		return hsl;
    	},

    	desaturate: function (ratio) {
    		var hsl = this.hsl();
    		hsl.color[1] -= hsl.color[1] * ratio;
    		return hsl;
    	},

    	whiten: function (ratio) {
    		var hwb = this.hwb();
    		hwb.color[1] += hwb.color[1] * ratio;
    		return hwb;
    	},

    	blacken: function (ratio) {
    		var hwb = this.hwb();
    		hwb.color[2] += hwb.color[2] * ratio;
    		return hwb;
    	},

    	grayscale: function () {
    		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
    		var rgb = this.rgb().color;
    		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
    		return Color.rgb(val, val, val);
    	},

    	fade: function (ratio) {
    		return this.alpha(this.valpha - (this.valpha * ratio));
    	},

    	opaquer: function (ratio) {
    		return this.alpha(this.valpha + (this.valpha * ratio));
    	},

    	rotate: function (degrees) {
    		var hsl = this.hsl();
    		var hue = hsl.color[0];
    		hue = (hue + degrees) % 360;
    		hue = hue < 0 ? 360 + hue : hue;
    		hsl.color[0] = hue;
    		return hsl;
    	},

    	mix: function (mixinColor, weight) {
    		// ported from sass implementation in C
    		// https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
    		if (!mixinColor || !mixinColor.rgb) {
    			throw new Error('Argument to "mix" was not a Color instance, but rather an instance of ' + typeof mixinColor);
    		}
    		var color1 = mixinColor.rgb();
    		var color2 = this.rgb();
    		var p = weight === undefined ? 0.5 : weight;

    		var w = 2 * p - 1;
    		var a = color1.alpha() - color2.alpha();

    		var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
    		var w2 = 1 - w1;

    		return Color.rgb(
    				w1 * color1.red() + w2 * color2.red(),
    				w1 * color1.green() + w2 * color2.green(),
    				w1 * color1.blue() + w2 * color2.blue(),
    				color1.alpha() * p + color2.alpha() * (1 - p));
    	}
    };

    // model conversion methods and static constructors
    Object.keys(colorConvert).forEach(function (model) {
    	if (skippedModels.indexOf(model) !== -1) {
    		return;
    	}

    	var channels = colorConvert[model].channels;

    	// conversion methods
    	Color.prototype[model] = function () {
    		if (this.model === model) {
    			return new Color(this);
    		}

    		if (arguments.length) {
    			return new Color(arguments, model);
    		}

    		var newAlpha = typeof arguments[channels] === 'number' ? channels : this.valpha;
    		return new Color(assertArray(colorConvert[this.model][model].raw(this.color)).concat(newAlpha), model);
    	};

    	// 'static' construction methods
    	Color[model] = function (color) {
    		if (typeof color === 'number') {
    			color = zeroArray(_slice.call(arguments), channels);
    		}
    		return new Color(color, model);
    	};
    });

    function roundTo(num, places) {
    	return Number(num.toFixed(places));
    }

    function roundToPlace(places) {
    	return function (num) {
    		return roundTo(num, places);
    	};
    }

    function getset(model, channel, modifier) {
    	model = Array.isArray(model) ? model : [model];

    	model.forEach(function (m) {
    		(limiters[m] || (limiters[m] = []))[channel] = modifier;
    	});

    	model = model[0];

    	return function (val) {
    		var result;

    		if (arguments.length) {
    			if (modifier) {
    				val = modifier(val);
    			}

    			result = this[model]();
    			result.color[channel] = val;
    			return result;
    		}

    		result = this[model]().color[channel];
    		if (modifier) {
    			result = modifier(result);
    		}

    		return result;
    	};
    }

    function maxfn(max) {
    	return function (v) {
    		return Math.max(0, Math.min(max, v));
    	};
    }

    function assertArray(val) {
    	return Array.isArray(val) ? val : [val];
    }

    function zeroArray(arr, length) {
    	for (var i = 0; i < length; i++) {
    		if (typeof arr[i] !== 'number') {
    			arr[i] = 0;
    		}
    	}

    	return arr;
    }

    var color = Color;

    function timeMark(hour, min) {
        // 24 hour time converted to a number between 0 and 1, 1 being 11:59 pm
        return hour / 24 + min / 24 / 60;
    }

    class Theme {
        constructor(at, bottom, top, textColor) {
            this.time = at;
            this.bottom = bottom;
            this.top = top;
            this.textColor = textColor;
        }
    }

    const themes = [];

    themes.push(
        new Theme(
            timeMark(0, 0),
            color("#131420"),
            color("#0F131B"),
            color("#688C85")
        )
    ); // midnight
    themes.push(
        new Theme(
            timeMark(3, 0),
            color("#131420"),
            color("#0F131B"),
            color("#688C85")
        )
    ); // 3am
    themes.push(
        new Theme(
            timeMark(8, 0),
            color("#D89EBC"),
            color("#DEAE87"),
            color("#FFE8E8")
        )
    ); // morning
    themes.push(
        new Theme(
            timeMark(12, 0),
            color("#D8BD9E"),
            color("#87B0DE"),
            color("#FFFBEB")
        )
    ); // noon
    themes.push(
        new Theme(
            timeMark(15, 0),
            color("#AC7989"),
            color("#FF9292"),
            color("#FFDFD4")
        )
    ); // afternoon
    themes.push(
        new Theme(
            timeMark(19, 0),
            color("#595D87"),
            color("#EFBCE8"),
            color("#DAEFFA")
        )
    ); // evening
    themes.push(
        new Theme(
            timeMark(22, 0),
            color("#0A0B17"),
            color("#35253E"),
            color("#5C566F")
        )
    ); // night

    function findNearestBefore(time) {
        for (let i = 0; i < themes.length; i++) {
            let bg = themes[i];
            if (time < bg.time) {
                return themes[i - 1];
            }
        }
        return themes[themes.length - 1];
    }

    function findNearestAfter(time) {
        for (let i = 0; i < themes.length; i++) {
            let bg = themes[i];
            if (time < bg.time) {
                return themes[i];
            }
        }
        return themes[0];
    }

    function _mod(a, b) {
        // modulo operator but with slightly modified behaviour for negative numbers
        if (a >= 0) {
            return a % b;
        }
        return b - (-a % b);
    }

    function lerp(v0, v1, t) {
        return v0 * (1 - t) + v1 * t;
    }

    function hueInterpol(start, end, t) {
        // linear interpolate forward between start and end, assuming ability to wrap from 360 back to 0

        if (end < start) {
            return hueInterpol(end, start, 1-t);
        }

        if (end - start < 360 - end + start) {
            return start + (end - start) * t;
        } else {
            return start - (360 - end + start) * t;
        }
    }

    function reverseTimeInterp(start, end, time) {
        if (start > end) {
            return _mod(time - start, 1) / (1 - start + end);
        } else {
            return (time - start) / (end - start);
        }
    }

    function hsvInterp(start, end, t) {
        return new color({
            h: hueInterpol(start.hue(), end.hue(), t),
            s: lerp(start.saturationv(), end.saturationv(), t),
            v: lerp(start.value(), end.value(), t)
        });
    }

    function getTheme(time) {
        let previous = findNearestBefore(time);
        let next = findNearestAfter(time);
        let t = reverseTimeInterp(previous.time, next.time, time);
        let bottom = hsvInterp(previous.bottom, next.bottom, t);
        let top = hsvInterp(previous.top, next.top, t);
        return {
            bgGradient: `linear-gradient(0deg, ${bottom.string()} 0%, ${top.string()} 100%)`,
            textColor: hsvInterp(previous.textColor, next.textColor, t).string()
        };
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$1 = "src/App.svelte";

    function create_fragment$1(ctx) {
    	let div6;
    	let div4;
    	let div2;
    	let div0;
    	let t0_value = getTimeString(/*time*/ ctx[0]) + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = get12hrSuffix(/*time*/ ctx[0]).toLowerCase() + "";
    	let t2;
    	let t3;
    	let div3;
    	let t4_value = getDateString(/*time*/ ctx[0]).toLowerCase() + "";
    	let t4;
    	let t5;
    	let t6;
    	let div5;
    	let button0;
    	let t8;
    	let button1;
    	let current;
    	let dispose;

    	const weatherwidget = new WeatherWidget({
    			props: {
    				weatherData: /*weatherData*/ ctx[2],
    				locationData: /*locationData*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div3 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			create_component(weatherwidget.$$.fragment);
    			t6 = space();
    			div5 = element("div");
    			button0 = element("button");
    			button0.textContent = "Fullscreen";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Prevent Sleep";
    			attr_dev(div0, "class", "time svelte-tjdein");
    			add_location(div0, file$1, 141, 3, 2804);
    			attr_dev(div1, "class", "ampm svelte-tjdein");
    			add_location(div1, file$1, 142, 3, 2853);
    			add_location(div2, file$1, 140, 2, 2795);
    			attr_dev(div3, "class", "date svelte-tjdein");
    			add_location(div3, file$1, 144, 2, 2924);
    			attr_dev(div4, "class", "date-time svelte-tjdein");
    			set_style(div4, "color", /*theme*/ ctx[1].textColor);
    			add_location(div4, file$1, 139, 1, 2736);
    			attr_dev(button0, "class", "svelte-tjdein");
    			add_location(button0, file$1, 149, 2, 3105);
    			attr_dev(button1, "class", "svelte-tjdein");
    			add_location(button1, file$1, 150, 2, 3192);
    			attr_dev(div5, "class", "footer svelte-tjdein");
    			add_location(div5, file$1, 148, 1, 3082);
    			attr_dev(div6, "class", "bg svelte-tjdein");
    			set_style(div6, "background", /*theme*/ ctx[1].bgGradient);
    			add_location(div6, file$1, 138, 0, 2679);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, t4);
    			append_dev(div6, t5);
    			mount_component(weatherwidget, div6, null);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, button0);
    			append_dev(div5, t8);
    			append_dev(div5, button1);
    			current = true;

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*time*/ 1) && t0_value !== (t0_value = getTimeString(/*time*/ ctx[0]) + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*time*/ 1) && t2_value !== (t2_value = get12hrSuffix(/*time*/ ctx[0]).toLowerCase() + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*time*/ 1) && t4_value !== (t4_value = getDateString(/*time*/ ctx[0]).toLowerCase() + "")) set_data_dev(t4, t4_value);

    			if (!current || dirty & /*theme*/ 2) {
    				set_style(div4, "color", /*theme*/ ctx[1].textColor);
    			}

    			if (!current || dirty & /*theme*/ 2) {
    				set_style(div6, "background", /*theme*/ ctx[1].bgGradient);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(weatherwidget.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(weatherwidget.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_component(weatherwidget);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function normTime(time) {
    	// current time (Date object) converted to a number between 0 and 1, 1 being 11:59 pm
    	return time.getHours() / 24 + time.getMinutes() / 24 / 60;
    }

    function getWeather(callback) {
    	let r = new Request("api/weather");

    	fetch(r).then(resp => {
    		resp.json().then(json => callback(json));
    	});
    }

    function getTimeString(time) {
    	return time.format("h:MM");
    }

    function get12hrSuffix(time) {
    	return time.format("TT");
    }

    function getDateString(time) {
    	return time.toLocaleDateString("en-US", {
    		weekday: "long",
    		month: "long",
    		day: "numeric"
    	});
    }

    function _get_debug_time_string(_debug_time) {
    	let hrs = Math.floor(_debug_time * 24);
    	let mins = Math.floor(_debug_time % (1 / 24) * 60 * 24);
    	return (hrs < 10 ? "0" : "") + hrs + ":" + (mins < 10 ? "0" : "") + mins;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	window._nt = normTime;
    	let time = new Date();
    	let weatherData = writable(null);
    	let locationData = writable(null);

    	onMount(() => {
    		const clockInterval = setInterval(
    			() => {
    				$$invalidate(0, time = new Date());
    			},
    			500
    		);

    		const dateRefreshInterval = setInterval(
    			() => {
    				$$invalidate(0, time = new Date());
    			},
    			60 * 1000
    		);

    		getWeather(resp => {
    			locationData.set(resp[0]);
    			weatherData.set(resp[1]);
    		});

    		setInterval(
    			() => {
    				$$invalidate(4, _debug_time += 0.002);
    				$$invalidate(4, _debug_time = _debug_time % 1);
    			},
    			50
    		);

    		return () => {
    			clearInterval(clockInterval);
    		};
    	});

    	let _debug_time = 0;

    	const click_handler = function () {
    		document.body.requestFullscreen();
    	};

    	const click_handler_1 = function () {
    		sleep.prevent();
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("weatherData" in $$props) $$invalidate(2, weatherData = $$props.weatherData);
    		if ("locationData" in $$props) $$invalidate(3, locationData = $$props.locationData);
    		if ("_debug_time" in $$props) $$invalidate(4, _debug_time = $$props._debug_time);
    		if ("theme" in $$props) $$invalidate(1, theme = $$props.theme);
    		if ("_debug_time_string" in $$props) _debug_time_string = $$props._debug_time_string;
    	};

    	let theme;
    	let _debug_time_string;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*time*/ 1) {
    			 $$invalidate(1, theme = getTheme(normTime(time)));
    		}

    		if ($$self.$$.dirty & /*_debug_time*/ 16) {
    			 _debug_time_string = _get_debug_time_string(_debug_time);
    		}
    	};

    	return [
    		time,
    		theme,
    		weatherData,
    		locationData,
    		_debug_time,
    		_debug_time_string,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
