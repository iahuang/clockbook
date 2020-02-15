
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
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    class Weather {
        constructor() {
            this.conditionCache = null;
            this.hasLocation = false;
            this.weatherData = writable(null);
        }
        
        findLocation(onResolve) {
            navigator.geolocation.getCurrentPosition((pos=>{
                this.lat = pos.coords.latitude;
                this.lon = pos.coords.longitude;
                onResolve();
            }).bind(this));
            this.hasLocation = true;
        }

        run(apiKey) {
            this.apiKey = apiKey;
            this.findLocation(()=>{
                this.getConditions();
                setInterval(this.getConditions, 2*60*1000);
            });

        }

        getConditions() {
            let url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.lat}&lon=${this.lon}&appid=${this.apiKey}&units=imperial`;
            const request = new Request(url);
            var a = fetch(request).then(resp => {
                resp.json().then((data => {
                    this.weatherData.update(previousData=>data);
                    window.weatherData = data;
                    console.log(this);
                }).bind(this));
            });
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

    /* src/Welcome.svelte generated by Svelte v3.18.2 */
    const file = "src/Welcome.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let t0;
    	let a;
    	let t2;
    	let input;
    	let t3;
    	let br0;
    	let t4;
    	let br1;
    	let t5;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			t0 = text("Since the weather API runs from your browser, you will need an API key, which you can obtain here: ");
    			a = element("a");
    			a.textContent = "here";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			br0 = element("br");
    			t4 = text("\n        You will only need to perform this process one\n        ");
    			br1 = element("br");
    			t5 = space();
    			button = element("button");
    			button.textContent = "submit";
    			attr_dev(a, "href", "https://openweathermap.org/home/sign_up");
    			add_location(a, file, 27, 107, 631);
    			add_location(p, file, 26, 8, 520);
    			attr_dev(input, "placeholder", "API key");
    			add_location(input, file, 29, 8, 711);
    			add_location(br0, file, 30, 8, 774);
    			add_location(br1, file, 32, 8, 842);
    			add_location(button, file, 33, 8, 855);
    			attr_dev(div0, "class", "box svelte-1q3qlz3");
    			add_location(div0, file, 25, 4, 494);
    			attr_dev(div1, "class", "overlay svelte-1q3qlz3");
    			add_location(div1, file, 24, 0, 468);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(div0, t2);
    			append_dev(div0, input);
    			set_input_value(input, /*apiKeyInput*/ ctx[1]);
    			append_dev(div0, t3);
    			append_dev(div0, br0);
    			append_dev(div0, t4);
    			append_dev(div0, br1);
    			append_dev(div0, t5);
    			append_dev(div0, button);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    				listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*apiKeyInput*/ 2 && input.value !== /*apiKeyInput*/ ctx[1]) {
    				set_input_value(input, /*apiKeyInput*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
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
    	let { onSetApiKey } = $$props;
    	let apiKeyInput;
    	const writable_props = ["onSetApiKey"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Welcome> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		apiKeyInput = this.value;
    		$$invalidate(1, apiKeyInput);
    	}

    	const click_handler = function () {
    		onSetApiKey(apiKeyInput);
    	};

    	$$self.$set = $$props => {
    		if ("onSetApiKey" in $$props) $$invalidate(0, onSetApiKey = $$props.onSetApiKey);
    	};

    	$$self.$capture_state = () => {
    		return { onSetApiKey, apiKeyInput };
    	};

    	$$self.$inject_state = $$props => {
    		if ("onSetApiKey" in $$props) $$invalidate(0, onSetApiKey = $$props.onSetApiKey);
    		if ("apiKeyInput" in $$props) $$invalidate(1, apiKeyInput = $$props.apiKeyInput);
    	};

    	return [onSetApiKey, apiKeyInput, input_input_handler, click_handler];
    }

    class Welcome extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { onSetApiKey: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Welcome",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*onSetApiKey*/ ctx[0] === undefined && !("onSetApiKey" in props)) {
    			console.warn("<Welcome> was created without expected prop 'onSetApiKey'");
    		}
    	}

    	get onSetApiKey() {
    		throw new Error("<Welcome>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onSetApiKey(value) {
    		throw new Error("<Welcome>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/WeatherWidget.svelte generated by Svelte v3.18.2 */

    const file$1 = "src/WeatherWidget.svelte";

    // (25:0) {#if weatherData}
    function create_if_block(ctx) {
    	let div3;
    	let div0;
    	let t0_value = Math.round(/*weatherData*/ ctx[0].main.temp) + "";
    	let t0;
    	let t1;
    	let t2_value = /*weatherData*/ ctx[0].weather[0].main + "";
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let t5_value = Math.round(/*weatherData*/ ctx[0].main.feels_like) + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let t8;
    	let t9_value = Math.round(/*weatherData*/ ctx[0].wind.speed) + "";
    	let t9;
    	let t10;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("ºF / ");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			t4 = text("Feels like ");
    			t5 = text(t5_value);
    			t6 = text("ºF");
    			t7 = space();
    			div2 = element("div");
    			t8 = text("Wind speed: ");
    			t9 = text(t9_value);
    			t10 = text(" mph");
    			attr_dev(div0, "class", "weather svelte-wpwr8i");
    			add_location(div0, file$1, 26, 4, 471);
    			attr_dev(div1, "class", "subtext svelte-wpwr8i");
    			add_location(div1, file$1, 29, 4, 586);
    			attr_dev(div2, "class", "subtext svelte-wpwr8i");
    			add_location(div2, file$1, 32, 4, 686);
    			attr_dev(div3, "class", "weather-widget svelte-wpwr8i");
    			add_location(div3, file$1, 25, 0, 438);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, t4);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, t8);
    			append_dev(div2, t9);
    			append_dev(div2, t10);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*weatherData*/ 1 && t0_value !== (t0_value = Math.round(/*weatherData*/ ctx[0].main.temp) + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*weatherData*/ 1 && t2_value !== (t2_value = /*weatherData*/ ctx[0].weather[0].main + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*weatherData*/ 1 && t5_value !== (t5_value = Math.round(/*weatherData*/ ctx[0].main.feels_like) + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*weatherData*/ 1 && t9_value !== (t9_value = Math.round(/*weatherData*/ ctx[0].wind.speed) + "")) set_data_dev(t9, t9_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:0) {#if weatherData}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*weatherData*/ ctx[0] && create_if_block(ctx);

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
    			if (/*weatherData*/ ctx[0]) {
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { weather } = $$props; // weather instance
    	let weatherData;

    	const unsubscribe = weather.weatherData.subscribe(value => {
    		$$invalidate(0, weatherData = value);
    	});

    	const writable_props = ["weather"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WeatherWidget> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("weather" in $$props) $$invalidate(1, weather = $$props.weather);
    	};

    	$$self.$capture_state = () => {
    		return { weather, weatherData };
    	};

    	$$self.$inject_state = $$props => {
    		if ("weather" in $$props) $$invalidate(1, weather = $$props.weather);
    		if ("weatherData" in $$props) $$invalidate(0, weatherData = $$props.weatherData);
    	};

    	return [weatherData, weather];
    }

    class WeatherWidget extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { weather: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WeatherWidget",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*weather*/ ctx[1] === undefined && !("weather" in props)) {
    			console.warn("<WeatherWidget> was created without expected prop 'weather'");
    		}
    	}

    	get weather() {
    		throw new Error("<WeatherWidget>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weather(value) {
    		throw new Error("<WeatherWidget>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.18.2 */
    const file$2 = "src/App.svelte";

    // (97:1) {#if !weather.apiKey}
    function create_if_block$1(ctx) {
    	let current;

    	const welcome = new Welcome({
    			props: { onSetApiKey: /*onSetApiKey*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(welcome.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(welcome, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(welcome.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(welcome.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(welcome, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(97:1) {#if !weather.apiKey}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div4;
    	let div0;
    	let t0_value = getTimeString(/*time*/ ctx[0]) + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = get12hrSuffix(/*time*/ ctx[0]) + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4_value = getDateString(/*time*/ ctx[0]) + "";
    	let t4;
    	let t5;
    	let t6;
    	let div3;
    	let button0;
    	let t8;
    	let button1;
    	let t10;
    	let current;
    	let dispose;

    	const weatherwidget = new WeatherWidget({
    			props: { weather: /*weather*/ ctx[1] },
    			$$inline: true
    		});

    	let if_block = !/*weather*/ ctx[1].apiKey && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			create_component(weatherwidget.$$.fragment);
    			t6 = space();
    			div3 = element("div");
    			button0 = element("button");
    			button0.textContent = "Fullscreen";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Reset API key";
    			t10 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "time svelte-136kir6");
    			add_location(div0, file$2, 88, 1, 1500);
    			attr_dev(div1, "class", "ampm svelte-136kir6");
    			add_location(div1, file$2, 89, 1, 1547);
    			attr_dev(div2, "class", "date svelte-136kir6");
    			add_location(div2, file$2, 90, 1, 1594);
    			attr_dev(button0, "class", "svelte-136kir6");
    			add_location(button0, file$2, 93, 2, 1715);
    			attr_dev(button1, "class", "svelte-136kir6");
    			add_location(button1, file$2, 94, 2, 1803);
    			attr_dev(div3, "class", "footer svelte-136kir6");
    			add_location(div3, file$2, 92, 1, 1692);
    			attr_dev(div4, "class", "bg svelte-136kir6");
    			add_location(div4, file$2, 87, 0, 1482);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, t4);
    			append_dev(div4, t5);
    			mount_component(weatherwidget, div4, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, button0);
    			append_dev(div3, t8);
    			append_dev(div3, button1);
    			append_dev(div4, t10);
    			if (if_block) if_block.m(div4, null);
    			current = true;

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*time*/ 1) && t0_value !== (t0_value = getTimeString(/*time*/ ctx[0]) + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*time*/ 1) && t2_value !== (t2_value = get12hrSuffix(/*time*/ ctx[0]) + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*time*/ 1) && t4_value !== (t4_value = getDateString(/*time*/ ctx[0]) + "")) set_data_dev(t4, t4_value);
    			const weatherwidget_changes = {};
    			if (dirty & /*weather*/ 2) weatherwidget_changes.weather = /*weather*/ ctx[1];
    			weatherwidget.$set(weatherwidget_changes);

    			if (!/*weather*/ ctx[1].apiKey) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div4, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(weatherwidget.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(weatherwidget.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(weatherwidget);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
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

    function instance$2($$self, $$props, $$invalidate) {
    	sleep.prevent();
    	let time = new Date();
    	let weather = new Weather();
    	let key = js_cookie.get("apiKey");

    	if (key) {
    		weather.run(key);
    	}

    	onMount(() => {
    		const interval = setInterval(
    			() => {
    				$$invalidate(0, time = new Date());
    			},
    			1000
    		);

    		return () => {
    			clearInterval(interval);
    		};
    	});

    	function onSetApiKey(key) {
    		js_cookie.set("apiKey", key);
    		weather.run(key);
    	}

    	const click_handler = function () {
    		document.body.requestFullscreen();
    	};

    	const click_handler_1 = function () {
    		$$invalidate(1, weather.apiKey = null, weather);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("time" in $$props) $$invalidate(0, time = $$props.time);
    		if ("weather" in $$props) $$invalidate(1, weather = $$props.weather);
    		if ("key" in $$props) key = $$props.key;
    	};

    	return [time, weather, onSetApiKey, key, click_handler, click_handler_1];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
