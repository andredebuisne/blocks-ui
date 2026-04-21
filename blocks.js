const Blocks = (() => {
    const defaults = {
        chart: {
            background: 'transparent',
            foreColor: '#fff',
            toolbar: { show: true, tools: { download: false} },
            zoom: { enabled: true, type: 'x' }
        },
        stroke: { width: 1 },
        grid: { borderColor: '#444' },
        tooltip: { theme: 'dark' },
        legend: { show: true, labels: { colors: '#fff' } },
        xaxis: {
            tickAmount: 10,
            labels: { style: { colors: '#aaa' }, rotate: -45, hideOverlappingLabels: true },
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

    const ready = Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/apexcharts'),
        loadScript('https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js')
    ]);

    function parseRows(rows, xKey, yKeys, limit, type) {
        const data = limit ? rows.slice(0, limit) : rows;

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
                data: data.map(r => ({ x: String(r[xKey]), y: r[key] == null ? null : +r[key] }))
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
        return ready.then(() => new Promise((resolve, reject) => {
            fetchRows(src, dataType, (err, rows) => err ? reject(err) : resolve(rows));
        }));
    }

    function chart(selector, opts = {}) {
        return ready.then(() => {
            const el = document.querySelector(selector);
            if (!el) return null;

            const type = opts.type || 'line';
            const isPie = PIE_TYPES.includes(type);
            const isXY  = XY_TYPES.includes(type);
            const legendOpts = typeof opts.legend === 'object' ? opts.legend : {};

            function render(result) {
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
                        : { ...defaults.xaxis, type: 'category', ...(result.categories && result.categories.length ? { categories: result.categories } : {}), ...(opts.xaxis || {}) };
                }

                const instance = new ApexCharts(el, cfg);
                instance.render();
                return instance;
            }

            if (opts.src) {
                return new Promise((resolve, reject) => {
                    fetchRows(opts.src, opts.dataType || 'json', (err, rows) => {
                        if (err) { console.error('Blocks: failed to load', opts.src, err); reject(err); return; }
                        resolve(render(parseRows(rows, opts.xKey, opts.yKeys, opts.limit, type)));
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
        poll();
        const timer = setInterval(poll, interval);
        return { stop: () => clearInterval(timer), refresh: poll };
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        initNavbar();
        initSidebar();
    });

    return { chart, load, healthcheck, initTabs, initNavbar, initSidebar };
})();
