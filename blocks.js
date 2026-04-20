const Blocks = (() => {
    const defaults = {
        chart: {
            background: 'transparent',
            foreColor: '#fff',
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        stroke: { width: 1 },
        grid: { borderColor: '#444' },
        tooltip: { theme: 'dark' },
        legend: { labels: { colors: '#fff' } },
        xaxis: {
            labels: { style: { colors: '#aaa' } },
            axisBorder: { color: '#555' },
            axisTicks: { color: '#555' }
        },
        yaxis: { labels: { style: { colors: '#aaa' } } },
        colors: ['#f6c45e', '#d18f01', '#fbd176', '#888']
    };

    function chart(selector, opts = {}) {
        const options = {
            chart: { ...defaults.chart, height: opts.height || 300, type: opts.type || 'line' },
            stroke: { ...defaults.stroke, ...(opts.stroke || {}) },
            grid: { ...defaults.grid, ...(opts.grid || {}) },
            tooltip: { ...defaults.tooltip, ...(opts.tooltip || {}) },
            legend: { ...defaults.legend, ...(opts.legend || {}) },
            xaxis: { ...defaults.xaxis, categories: opts.categories || [], ...(opts.xaxis || {}) },
            yaxis: { ...defaults.yaxis, ...(opts.yaxis || {}) },
            colors: opts.colors || defaults.colors,
            series: opts.series || []
        };

        const el = document.querySelector(selector);
        if (!el) return null;
        const instance = new ApexCharts(el, options);
        instance.render();
        return instance;
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
