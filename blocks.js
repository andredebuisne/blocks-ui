const Blocks = (() => {
    const defaults = {
        chart: { background: 'transparent', foreColor: '#fff', toolbar: { show: false }, zoom: { enabled: true } },
        stroke: { width: 1 },
        grid: { borderColor: '#444' },
        tooltip: { theme: 'dark' },
        legend: { show: true, labels: { colors: '#fff' } },
        xaxis: { labels: { style: { colors: '#aaa' } }, axisBorder: { color: '#555' }, axisTicks: { color: '#555' } },
        yaxis: { labels: { style: { colors: '#aaa' } } },
        colors: ['#f6c45e', '#d18f01', '#fbd176', '#888']
    };

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

    function parseRows(rows, xKey, yKeys) {
        const keys = yKeys || Object.keys(rows[0]).filter(k => k !== xKey && typeof rows[0][k] === 'number');
        return {
            categories: rows.map(r => r[xKey]),
            series: keys.map(key => ({
                name: key.replace(/_/g, ' '),
                data: rows.map(r => r[key] == null ? null : +r[key])
            }))
        };
    }

    function loadData(src, dataType, xKey, yKeys, cb) {
        if (dataType === 'csv') {
            Papa.parse(src, {
                download: true, header: true, dynamicTyping: true,
                complete: ({ data }) => cb(null, parseRows(data.filter(r => r[xKey]), xKey, yKeys)),
                error: cb
            });
        } else {
            fetch(src)
                .then(r => r.json())
                .then(json => {
                    const rows = Array.isArray(json) ? json : (json.data || Object.values(json)[0]);
                    cb(null, parseRows(rows, xKey, yKeys));
                })
                .catch(cb);
        }
    }

    function chart(selector, opts = {}) {
        return ready.then(() => {
            const el = document.querySelector(selector);
            if (!el) return null;

            function render(categories, series) {
                const legendOpts = typeof opts.legend === 'object' ? opts.legend : {};
                const cfg = {
                    chart: { ...defaults.chart, type: opts.type || 'line', height: opts.height || 300 },
                    stroke: { ...defaults.stroke, ...(opts.stroke || {}) },
                    grid: { ...defaults.grid, ...(opts.grid || {}) },
                    tooltip: { ...defaults.tooltip, ...(opts.tooltip || {}) },
                    legend: { ...defaults.legend, show: opts.legend !== false, ...legendOpts },
                    xaxis: { ...defaults.xaxis, categories, ...(opts.xaxis || {}) },
                    yaxis: { ...defaults.yaxis, ...(opts.yaxis || {}) },
                    colors: opts.colors || defaults.colors,
                    series
                };
                const instance = new ApexCharts(el, cfg);
                instance.render();
                return instance;
            }

            if (opts.src) {
                return new Promise((resolve, reject) => {
                    loadData(opts.src, opts.dataType || 'json', opts.xKey, opts.yKeys, (err, result) => {
                        if (err) { console.error('Blocks: failed to load', opts.src, err); reject(err); return; }
                        resolve(render(result.categories, result.series));
                    });
                });
            }

            return render(opts.categories || [], opts.series || []);
        });
    }

    function initTabs() {
        document.querySelectorAll('.tabs').forEach(tabsEl => {
            const parent = tabsEl.parentElement;
            const tabs = tabsEl.querySelectorAll('.tab');

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

    document.addEventListener('DOMContentLoaded', initTabs);

    return { chart, initTabs };
})();
