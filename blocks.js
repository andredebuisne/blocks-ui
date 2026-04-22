const Blocks = (() => {
    const defaults = {
        chart: {
            background: 'transparent',
            foreColor: '#fff',
            toolbar: {
                show: true,
                tools: { download: false, selection: false, zoom: true, zoomin: false, zoomout: false, pan: true, reset: true }
            },
            zoom: { enabled: true, type: 'x' },
            animations: { enabled: false }
        },
        stroke: { width: 1 },
        grid: { borderColor: '#444' },
        tooltip: { theme: 'dark' },
        legend: {
            show: true,
            labels: { colors: '#fff' },
            position: 'top',
            horizontalAlign: 'left',
            floating: true,
            offsetY: -4,
            itemMargin: { horizontal: 6, vertical: 4 }
        },
        xaxis: {
            tickAmount: 10,
            labels: { style: { colors: '#aaa' }, rotate: 0, hideOverlappingLabels: true },
            axisBorder: { color: '#555' },
            axisTicks: { color: '#555' }
        },
        yaxis: { labels: { style: { colors: '#aaa' } } },
        dataLabels: { enabled: false },
        colors: ['#f6c45e', '#d18f01', '#fbd176', '#888', '#e07b39', '#6ab187']
    };

    const PIE_TYPES = ['pie', 'donut'];
    const XY_TYPES  = ['scatter', 'heatmap'];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function loadStyle(href) {
        return new Promise(resolve => {
            if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
            const l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = href; l.onload = resolve;
            document.head.appendChild(l);
        });
    }

    let _apexReady, _papaReady, _mapReady;
    function apexReady() { return _apexReady || (_apexReady = loadScript('https://cdn.jsdelivr.net/npm/apexcharts')); }
    function papaReady() { return _papaReady || (_papaReady = loadScript('https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js')); }
    function mapReady()  { return _mapReady  || (_mapReady  = Promise.all([
        loadScript('https://unpkg.com/maplibre-gl@^5.6.2/dist/maplibre-gl.js'),
        loadStyle('https://unpkg.com/maplibre-gl@^5.6.2/dist/maplibre-gl.css')
    ])); }

    function parseRows(rows, xKey, yKeys, limit, type, xType) {
        const data = limit ? rows.slice(0, limit) : rows;
        const toX = xType === 'datetime'
            ? v => new Date(v).getTime()
            : v => String(v);

        if (XY_TYPES.includes(type)) {
            const key = yKeys ? yKeys[0] : Object.keys(data[0]).find(k => k !== xKey && typeof data[0][k] === 'number');
            return {
                series: [{
                    name: key.replace(/_/g, ' '),
                    data: data
                        .map(r => [+r[xKey], +r[key]])
                        .filter(([x, y]) => !isNaN(x) && !isNaN(y))
                }]
            };
        }

        if (PIE_TYPES.includes(type)) {
            const key = yKeys ? yKeys[0] : Object.keys(data[0]).find(k => k !== xKey && typeof data[0][k] === 'number');
            return {
                labels: data.map(r => String(r[xKey])),
                series: data.map(r => r[key] == null ? 0 : +r[key])
            };
        }

        const keys = yKeys || Object.keys(data[0]).filter(k => k !== xKey && typeof data[0][k] === 'number');
        return {
            series: keys.map(key => ({
                name: key.replace(/_/g, ' '),
                data: data.map(r => ({ x: toX(r[xKey]), y: r[key] == null ? null : +r[key] }))
            }))
        };
    }

    function fetchRows(src, dataType, cb) {
        if (dataType === 'csv') {
            Papa.parse(src, {
                download: true, header: true, dynamicTyping: true,
                complete: ({ data }) => cb(null, data.filter(r => Object.values(r).some(v => v != null && v !== ''))),
                error: cb
            });
        } else {
            fetch(src)
                .then(r => r.json())
                .then(json => cb(null, Array.isArray(json) ? json : (json.data || Object.values(json)[0])))
                .catch(cb);
        }
    }

    function load(src, dataType) {
        const deps = dataType === 'csv' ? papaReady() : Promise.resolve();
        return deps.then(() => new Promise((resolve, reject) => {
            fetchRows(src, dataType, (err, rows) => err ? reject(err) : resolve(rows));
        }));
    }

    function chart(selector, opts = {}) {
        const el = document.querySelector(selector);
        if (!el) return Promise.resolve(null);
        el.innerHTML = '<div class="blocks-loading">Loading…</div>';

        const deps = opts.src
            ? Promise.all([apexReady(), papaReady()])
            : apexReady();
        return deps.then(() => {

            const type = opts.type || 'line';
            const isPie = PIE_TYPES.includes(type);
            const isXY  = XY_TYPES.includes(type);
            const legendOpts = typeof opts.legend === 'object' ? opts.legend : {};

            function render(result) {
                el.innerHTML = '';
                const cfg = {
                    chart: { ...defaults.chart, type, height: opts.height || 300 },
                    tooltip: { ...defaults.tooltip, ...(opts.tooltip || {}) },
                    legend: { ...defaults.legend, show: opts.legend !== false, ...legendOpts },
                    dataLabels: { ...defaults.dataLabels, ...(opts.dataLabels || {}) },
                    colors: opts.colors || defaults.colors,
                    series: result.series
                };

                if (isPie) {
                    cfg.labels = result.labels || opts.labels || [];
                } else {
                    cfg.stroke = { ...defaults.stroke, ...(opts.stroke || {}) };
                    cfg.grid   = { ...defaults.grid,   ...(opts.grid   || {}) };
                    cfg.yaxis  = { ...defaults.yaxis,  ...(opts.yaxis  || {}) };
                    cfg.xaxis  = isXY
                        ? { ...defaults.xaxis, ...(opts.xaxis || {}) }
                        : { ...defaults.xaxis, type: opts.xType || 'category', ...(result.categories && result.categories.length ? { categories: result.categories } : {}), ...(opts.xaxis || {}) };
                }

                const instance = new ApexCharts(el, cfg);
                instance.render();
                return instance;
            }

            if (opts.src) {
                return new Promise((resolve, reject) => {
                    fetchRows(opts.src, opts.dataType || 'json', (err, rows) => {
                        if (err) { console.error('Blocks: failed to load', opts.src, err); reject(err); return; }
                        resolve(render(parseRows(rows, opts.xKey, opts.yKeys, opts.limit, type, opts.xType)));
                    });
                });
            }

            return render({
                series:     opts.series     || [],
                categories: opts.categories || [],
                labels:     opts.labels     || []
            });
        });
    }

    function metric(selector, opts = {}) {
        const el = document.querySelector(selector);
        if (!el) return;
        const numEl = el.querySelector('.number');
        if (!numEl) return;

        async function refresh() {
            try {
                const res = await fetch(opts.src, { cache: 'no-store' });
                const json = await res.json();
                const value = opts.key
                    ? opts.key.split('.').reduce((o, k) => o?.[k], json)
                    : json;
                const formatted = opts.format ? opts.format(value) : value;
                const unitEl = numEl.querySelector('.number-unit');
                numEl.innerHTML = formatted + (unitEl ? ' ' + unitEl.outerHTML : '');
            } catch (e) {
                console.error('Blocks.metric: failed to load', opts.src, e);
            }
        }

        refresh();
        if (opts.interval) {
            const timer = setInterval(refresh, opts.interval);
            return { stop: () => clearInterval(timer), refresh };
        }
        return { refresh };
    }

    function initTabs() {
        document.querySelectorAll('.tabs').forEach(tabsEl => {
            const parent = tabsEl.parentElement;
            const tabs   = tabsEl.querySelectorAll('.tab');

            function activate(tab) {
                const targetId = tab.getAttribute('href').replace('#', '');
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                const target = parent.querySelector('#' + targetId);
                if (target) target.classList.add('active');
            }

            const initial = tabsEl.querySelector('.tab.active') || tabs[0];
            if (initial) activate(initial);

            tabs.forEach(tab => {
                tab.addEventListener('click', e => {
                    e.preventDefault();
                    activate(tab);
                });
            });
        });
    }

    function initNavbar() {
        document.querySelectorAll('.navbar-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const links = btn.closest('.navbar').querySelector('.navbar-links');
                if (links) links.classList.toggle('open');
            });
        });
    }

    function initSidebar() {
        document.querySelectorAll('[data-toggle-sidebar]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.querySelector(btn.dataset.toggleSidebar);
                if (target) target.classList.toggle('collapsed');
            });
        });
    }

    function healthcheck(checks, interval) {
        interval = interval || 30000;
        const endpoints = (Array.isArray(checks) ? checks : [checks])
            .map(c => typeof c === 'string' ? { url: c, name: c } : c);
        const results = endpoints.map(e => ({ ...e, up: null }));

        const el = document.createElement('div');
        el.className = 'hc-status';

        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const toggle = navbar.querySelector('.navbar-toggle');
            toggle ? navbar.insertBefore(el, toggle) : navbar.appendChild(el);
        } else {
            Object.assign(el.style, { position: 'fixed', top: '8px', right: '8px', zIndex: 200 });
            document.body.appendChild(el);
        }

        async function poll() {
            await Promise.all(results.map(async r => {
                try {
                    const res = await fetch(r.url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
                    r.up = res.ok;
                } catch { r.up = false; }
            }));
            render();
        }

        function render() {
            const up = results.filter(r => r.up === true).length;
            const total = results.length;
            const allUp = up === total;
            const pending = results.some(r => r.up === null);
            const state = pending ? '' : (allUp ? 'up' : 'down');
            const label = total === 1
                ? (pending ? '&hellip;' : allUp ? 'OK' : 'DOWN')
                : (pending ? '&hellip;' : `${up}/${total}`);

            el.innerHTML = `<span class="hc-dot ${state}"></span><span class="hc-label">${label}</span>`
                + (total > 1 ? `<div class="hc-popup">${
                    results.map(r => `<div class="hc-row">
                        <span class="hc-dot ${r.up === null ? '' : r.up ? 'up' : 'down'}"></span>
                        <span>${r.name}</span>
                    </div>`).join('')
                }</div>` : '');
        }

        render();
        const timer = setInterval(poll, interval);
        setTimeout(poll, 3000);
        return { stop: () => clearInterval(timer), refresh: poll };
    }

    function statuses(selector, items = []) {
        const el = document.querySelector(selector);
        if (!el) return;

        const rows = items.map(({ label, status, bg, color }) =>
            `<tr>
                <th scope="row">${label}</th>
                <td style="background:${bg || ''};color:${color || '#fff'};text-align:center;font-weight:bold;padding:4px 8px">${status || ''}</td>
            </tr>`
        ).join('');

        el.innerHTML = `<table class="status-heatmap"><tbody>${rows}</tbody></table>`;
    }

    function domReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    domReady(() => {
        initTabs();
        initNavbar();
        initSidebar();
    });

    function map(selector, opts = {}) {
        const el = document.getElementById(selector) || document.querySelector(selector);
        if (el) el.innerHTML = '<div class="blocks-loading">Loading map…</div>';

        return mapReady().then(() => {
            if (el) el.innerHTML = '';
            const _map = new maplibregl.Map({
                container: selector,
                cooperativeGestures: true,
                style: opts.style || 'https://tiles.openfreemap.org/styles/positron',
                center: opts.center || [-73.99175394815153, 40.70688351792593],
                zoom: opts.zoom || 10,
            });

            const queue = [];
            _map.on('load', () => queue.forEach(fn => fn()));

            function whenLoaded(fn) {
                _map.loaded() ? fn() : queue.push(fn);
            }

            // Default controls
            whenLoaded(() => {
                if (opts.navigation !== false)
                    _map.addControl(new maplibregl.NavigationControl(), 'top-right');
                if (opts.geolocate !== false)
                    _map.addControl(new maplibregl.GeolocateControl({
                        positionOptions: { enableHighAccuracy: true },
                        trackUserLocation: true
                    }), 'top-right');
            });

            const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });

            function buildPopupHtml(properties, fields) {
                const entries = fields
                    ? fields.map(f => [f, properties[f]]).filter(([, v]) => v != null)
                    : Object.entries(properties).filter(([, v]) => v != null);
                return '<div class="map-popup">' +
                    entries.map(([k, v]) =>
                        `<div class="map-popup-row">` +
                        `<span class="map-popup-key">${k}</span>` +
                        `<span class="map-popup-val">${v}</span>` +
                        `</div>`
                    ).join('') +
                    '</div>';
            }

            function attachPopup(id, fields) {
                _map.on('mouseenter', id, e => {
                    if (!e.features.length) return;
                    _map.getCanvas().style.cursor = 'pointer';
                    popup.setLngLat(e.lngLat)
                        .setHTML(buildPopupHtml(e.features[0].properties, fields))
                        .addTo(_map);
                });
                _map.on('mouseleave', id, () => {
                    _map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            }

            function makeLegend(title, items, legendOpts = {}) {
                let visible = legendOpts.visible || false;
                let _container;
                return {
                    onAdd(m) {
                        _container = document.createElement('div');
                        _container.className = 'maplibregl-ctrl blocks-legend';
                        _container.style.display = visible ? 'block' : 'none';
                        _container.innerHTML =
                            `<div class="blocks-legend-title">${title}</div>` +
                            items.map(item =>
                                `<div class="blocks-legend-item">` +
                                `<span class="blocks-legend-dot${item.pulse ? ' legend-pulse' : ''}" style="background:${item.color}"></span>` +
                                `<span>${item.label}</span>` +
                                `</div>`
                            ).join('');
                        return _container;
                    },
                    onRemove() { _container.parentNode.removeChild(_container); },
                    toggle() {
                        visible = !visible;
                        _container.style.display = visible ? 'block' : 'none';
                    }
                };
            }

            function makeLayerFilter(title, layers, filterOpts = {}) {
                let visible = filterOpts.visible || false;
                const legend = filterOpts.legend || null;
                return {
                    onAdd(m) {
                        const el = document.createElement('div');
                        el.className = 'maplibregl-ctrl maplibregl-ctrl-group blocks-layer-filter' + (visible ? ' active' : '');
                        el.textContent = title;
                        el.addEventListener('click', () => {
                            visible = !visible;
                            el.classList.toggle('active', visible);
                            const vis = visible ? 'visible' : 'none';
                            layers.forEach(l => m.setLayoutProperty(l, 'visibility', vis));
                            if (legend) legend.toggle();
                        });
                        this._el = el;
                        return el;
                    },
                    onRemove() { this._el.parentNode.removeChild(this._el); }
                };
            }

            const wrapper = {
                addSource(id, config) {
                    whenLoaded(() => _map.addSource(id, config));
                    return wrapper;
                },
                addLine(id, config = {}) {
                    const layer = {
                        id,
                        type: 'line',
                        source: config.source,
                        layout: { visibility: config.visible === false ? 'none' : 'visible' },
                        paint: {
                            'line-color': config.color || '#738ffa',
                            'line-width': config.width || 2
                        }
                    };
                    if (config.sourceLayer) layer['source-layer'] = config.sourceLayer;
                    whenLoaded(() => {
                        _map.addLayer(layer);
                        if (config.popup !== false)
                            attachPopup(id, config.popupProperties || null);
                    });
                    return wrapper;
                },
                addLegend(title, items, legendOpts = {}) {
                    const legend = makeLegend(title, items, legendOpts);
                    whenLoaded(() => _map.addControl(legend, legendOpts.position || 'top-left'));
                    return legend;
                },
                addLayerFilter(title, layers, filterOpts = {}) {
                    whenLoaded(() => _map.addControl(makeLayerFilter(title, layers, filterOpts), filterOpts.position || 'top-right'));
                    return wrapper;
                }
            };

            return wrapper;
        });
    }

    return { chart, load, metric, healthcheck, statuses, initTabs, initNavbar, initSidebar, map };
})();
